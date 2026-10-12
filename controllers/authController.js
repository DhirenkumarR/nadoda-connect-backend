import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Member, Village } from '../models/index.js';
import { sendOtpEmail } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_nadoda_connect_jwt_key';

// Helper to generate JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, mobileNumber: user.mobileNumber },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// @desc    Login with mobile or email + password
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
    try {
        const { identifier, mobileNumber, email, password } = req.body;
        const lookup = (identifier || mobileNumber || email || '').trim();

        if (!lookup) {
            return res.status(400).json({ success: false, message: 'Mobile number or Email is required' });
        }
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        // Find user by mobile or email
        let user = await User.findOne({
            $or: [
                { mobileNumber: lookup },
                { email: lookup.toLowerCase() }
            ]
        }).select('+passwordHash').populate('assignedVillageId');

        if (!user) {
            // Check if member exists in Member directory (e.g. member email or mobile was updated)
            const memberExists = await Member.findOne({
                $or: [
                    { mobileNumber: lookup },
                    { email: lookup.toLowerCase() }
                ]
            });

            if (memberExists) {
                // Check if user account exists with memberId or previously registered email/mobile
                user = await User.findOne({
                    $or: [
                        { memberId: memberExists._id },
                        ...(memberExists.mobileNumber ? [{ mobileNumber: memberExists.mobileNumber }] : []),
                        ...(memberExists.email ? [{ email: memberExists.email.toLowerCase() }] : [])
                    ]
                }).select('+passwordHash').populate('assignedVillageId');

                if (user) {
                    // Update user's email and mobile to match member
                    if (memberExists.email) user.email = memberExists.email.toLowerCase().trim();
                    if (memberExists.mobileNumber) user.mobileNumber = memberExists.mobileNumber.trim();
                    user.memberId = memberExists._id;
                    await user.save();
                } else {
                    return res.status(400).json({
                        success: false,
                        needsPasswordSetup: true,
                        message: 'Your member profile is registered! Please use "Set Password / Forgot Password" below to activate your account and create your password.'
                    });
                }
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'No registered member or admin account found with this Mobile/Email. Registration is managed strictly by administrators.'
                });
            }
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Your account is deactivated. Please contact an administrator.' });
        }

        // If password is not set yet
        if (!user.isPasswordSet || !user.passwordHash) {
            return res.status(400).json({
                success: false,
                needsPasswordSetup: true,
                message: 'Your account is registered but your password has not been created yet. Please click "Set Password / Forgot Password" to create your password.'
            });
        }

        // Verify password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password. Please check and try again.' });
        }

        // Ensure member is linked to their familyId
        if (user.role === 'member' && !user.familyId) {
            const memberDoc = await Member.findOne({
                $or: [
                    { mobileNumber: user.mobileNumber },
                    ...(user.email ? [{ email: user.email }] : [])
                ]
            });
            if (memberDoc) {
                user.memberId = memberDoc._id;
                user.familyId = memberDoc.familyId;
                if (!user.assignedVillageId) user.assignedVillageId = memberDoc.villageId;
                await user.save();
            }
        }

        // Record login activity
        const now = new Date();
        user.lastLoginAt = now;
        user.lastActiveAt = now;
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        if (ip) user.lastIpAddress = String(ip).split(',')[0].trim();
        if (req.headers['user-agent']) user.lastUserAgent = req.headers['user-agent'];
        await user.save();

        const token = generateToken(user);
        const userObj = user.toObject();
        delete userObj.passwordHash;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            data: userObj
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Initiate password reset / first-time password creation OTP
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
    try {
        const { identifier } = req.body;
        const lookup = (identifier || '').trim();

        if (!lookup) {
            return res.status(400).json({ success: false, message: 'Please enter your registered mobile number or email' });
        }

        const isEmailInput = lookup.includes('@');
        const lookupLower = lookup.toLowerCase();

        // 1. Search Member directory by mobile or email
        let member = await Member.findOne({
            $or: [
                { mobileNumber: lookup },
                { email: lookupLower }
            ]
        });

        // 2. Search User collection by lookup or by linked memberId
        let user = await User.findOne({
            $or: [
                { mobileNumber: lookup },
                { email: lookupLower },
                ...(member ? [{ memberId: member._id }] : [])
            ]
        });

        // If user not found yet, but member was found, look for user by member's other identifiers
        if (!user && member) {
            user = await User.findOne({
                $or: [
                    ...(member.mobileNumber ? [{ mobileNumber: member.mobileNumber }] : []),
                    ...(member.email ? [{ email: member.email.toLowerCase() }] : [])
                ]
            });
        }

        // If user was found, but member wasn't found by lookup, find member via user.memberId / mobileNumber
        if (user && !member) {
            if (user.memberId) {
                member = await Member.findById(user.memberId);
            } else if (user.mobileNumber) {
                member = await Member.findOne({ mobileNumber: user.mobileNumber });
            }
        }

        // If neither user nor member exists
        if (!user && !member) {
            return res.status(404).json({
                success: false,
                message: 'No member record found with this Mobile/Email in the community directory. Only administrators can add members.'
            });
        }

        // 3. Fully synchronize User and Member records
        if (member) {
            if (user) {
                user.memberId = member._id;
                if (member.familyId) user.familyId = member.familyId;
                if (member.villageId && (!user.assignedVillageId || user.role === 'member')) {
                    user.assignedVillageId = member.villageId;
                }

                // Keep user email in sync with Member's latest email!
                if (member.email) {
                    user.email = member.email.toLowerCase().trim();
                } else if (isEmailInput) {
                    user.email = lookupLower;
                    member.email = lookupLower;
                    await member.save();
                }

                // Keep user mobile in sync with Member's latest mobile!
                if (member.mobileNumber) {
                    user.mobileNumber = member.mobileNumber.trim();
                }

                if (member.fullName?.gu || member.fullName?.en) {
                    user.name = member.fullName.gu || member.fullName.en;
                }
                await user.save();
            } else {
                // Create user account linked to member
                user = await User.create({
                    mobileNumber: member.mobileNumber || lookup,
                    email: member.email ? member.email.toLowerCase().trim() : (isEmailInput ? lookupLower : null),
                    name: member.fullName?.gu || member.fullName?.en || 'Community Member',
                    role: 'member',
                    assignedVillageId: member.villageId,
                    memberId: member._id,
                    familyId: member.familyId,
                    isPasswordSet: false
                });
            }
        }

        // 4. Send Email (always uses latest synced email)
        const targetEmail = (user.email || member?.email || (isEmailInput ? lookupLower : null));

        if (!targetEmail) {
            return res.status(400).json({
                success: false,
                message: 'આ સભ્ય ખાતા સાથે કોઈ ઈમેલ નોંધાયેલ નથી. કૃપા કરીને તમારા ગામના એડમિનનો સંપર્ક કરી પ્રોફાઇલમાં ઈમેલ ઉમેરાવો.'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await user.save();

        let emailSent = false;
        let emailError = null;

        try {
            const mailRes = await sendOtpEmail({
                to: targetEmail,
                userName: user.name || 'સભ્ય',
                otp
            });
            if (mailRes && mailRes.sent) {
                emailSent = true;
            }
        } catch (mailErr) {
            emailError = mailErr.message;
            console.error('[Forgot Password] Email delivery error:', mailErr.message);
        }

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'વેરિફિકેશન ઈમેલ મોકલવામાં તકનીકી ખામી આવી છે. કૃપા કરીને થોડીવાર પછી પ્રયાસ કરો અથવા એડમિનનો સંપર્ક કરો.'
            });
        }

        res.status(200).json({
            success: true,
            message: `વેરિફિકેશન કોડ તમારા ઈમેલ (${targetEmail}) પર મોકલી દેવામાં આવ્યો છે. કૃપા કરીને તમારું ઇનબોક્સ ચેક કરો.`,
            mobileNumber: user.mobileNumber,
            email: targetEmail,
            isNewUser: !user.isPasswordSet
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update current user profile (email, name)
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
    try {
        const { email, name } = req.body;
        const updates = {};
        if (email) updates.email = email.toLowerCase().trim();
        if (name) updates.name = name.trim();

        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).populate('assignedVillageId');
        if (user.memberId && email) {
            await Member.findByIdAndUpdate(user.memberId, { email: updates.email });
        }

        res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify OTP and set new password
// @route   POST /api/auth/set-password
export const setPassword = async (req, res, next) => {
    try {
        const { identifier, otp, newPassword } = req.body;
        const lookup = (identifier || '').trim();

        if (!lookup || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Mobile/Email, verification code (OTP), and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        let user = await User.findOne({
            $or: [
                { mobileNumber: lookup },
                { email: lookup.toLowerCase() }
            ]
        }).select('+passwordHash');

        if (!user) {
            const member = await Member.findOne({
                $or: [
                    { mobileNumber: lookup },
                    { email: lookup.toLowerCase() }
                ]
            });
            if (member) {
                user = await User.findOne({
                    $or: [
                        { memberId: member._id },
                        ...(member.mobileNumber ? [{ mobileNumber: member.mobileNumber }] : []),
                        ...(member.email ? [{ email: member.email.toLowerCase() }] : [])
                    ]
                }).select('+passwordHash');
            }
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.resetOtp || user.resetOtp !== String(otp).trim()) {
            return res.status(400).json({ success: false, message: 'Invalid verification code (OTP)' });
        }

        if (user.resetOtpExpires && user.resetOtpExpires < new Date()) {
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
        }

        // Hash password and save
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.isPasswordSet = true;
        user.resetOtp = null;
        user.resetOtpExpires = null;
        await user.save();

        let updatedUser = await User.findById(user._id).populate('assignedVillageId');
        if (updatedUser.role === 'member' && !updatedUser.familyId) {
            const memberDoc = await Member.findOne({
                $or: [
                    { mobileNumber: updatedUser.mobileNumber },
                    ...(updatedUser.email ? [{ email: updatedUser.email }] : [])
                ]
            });
            if (memberDoc) {
                updatedUser.memberId = memberDoc._id;
                updatedUser.familyId = memberDoc.familyId;
                if (!updatedUser.assignedVillageId) updatedUser.assignedVillageId = memberDoc.villageId;
                await updatedUser.save();
                updatedUser = await User.findById(updatedUser._id).populate('assignedVillageId');
            }
        }

        // Record login activity
        const now = new Date();
        updatedUser.lastLoginAt = now;
        updatedUser.lastActiveAt = now;
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        if (ip) updatedUser.lastIpAddress = String(ip).split(',')[0].trim();
        if (req.headers['user-agent']) updatedUser.lastUserAgent = req.headers['user-agent'];
        await updatedUser.save();

        const token = generateToken(updatedUser);

        res.status(200).json({
            success: true,
            message: 'Password created successfully! You are now logged in.',
            token,
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a Village Admin (Super Admin only)
// @route   POST /api/auth/village-admin
export const createVillageAdmin = async (req, res, next) => {
    try {
        const { name, mobileNumber, email, assignedVillageId, initialPassword } = req.body;

        if (!mobileNumber || !assignedVillageId) {
            return res.status(400).json({ success: false, message: 'Mobile number and assigned village are required' });
        }

        const village = await Village.findById(assignedVillageId);
        if (!village) {
            return res.status(404).json({ success: false, message: 'Assigned village not found' });
        }

        let existingUser = await User.findOne({ mobileNumber });
        if (existingUser) {
            existingUser.role = 'village_admin';
            existingUser.assignedVillageId = assignedVillageId;
            if (name) existingUser.name = name;
            if (email) existingUser.email = email.toLowerCase();
            if (initialPassword) {
                const salt = await bcrypt.genSalt(10);
                existingUser.passwordHash = await bcrypt.hash(initialPassword, salt);
                existingUser.isPasswordSet = true;
            }
            await existingUser.save();
            const populated = await User.findById(existingUser._id).populate('assignedVillageId');
            return res.status(200).json({ success: true, message: 'User updated to Village Admin', data: populated });
        }

        let passwordHash = null;
        let isPasswordSet = false;
        if (initialPassword) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(initialPassword, salt);
            isPasswordSet = true;
        }

        const newAdmin = await User.create({
            name: name || `Admin - ${village.name.en}`,
            mobileNumber,
            email: email ? email.toLowerCase() : null,
            role: 'village_admin',
            assignedVillageId,
            passwordHash,
            isPasswordSet
        });

        const populated = await User.findById(newAdmin._id).populate('assignedVillageId');
        res.status(201).json({ success: true, message: 'Village Admin created successfully', data: populated });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user?._id).populate('assignedVillageId');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// @desc    Get registered users (Super Admin can view all, Village Admin views their village members)
// @route   GET /api/auth/users
export const getUsers = async (req, res, next) => {
    try {
        const filter = {};

        // If village admin, only show users belonging to their assigned village
        if (req.user?.role === 'village_admin') {
            const vId = req.user.assignedVillageId?._id || req.user.assignedVillageId;
            if (!vId) {
                return res.status(403).json({ success: false, message: 'No village assigned to this admin account' });
            }
            filter.assignedVillageId = vId;
            filter.role = 'member'; // Village admins manage members
        }

        const users = await User.find(filter)
            .populate('assignedVillageId', 'name slug taluka district')
            .populate('memberId', 'fullName mobileNumber email serialNumber houseNumber')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin sets or resets password directly for a user (Super Admin or Village Admin)
// @route   POST /api/auth/users/:id/set-password
export const adminSetUserPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).json({
                success: false,
                message: 'પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ (Password must be at least 6 characters)'
            });
        }

        const targetUser = await User.findById(id);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Authorization checks for village_admin
        if (req.user?.role === 'village_admin') {
            if (targetUser.role !== 'member') {
                return res.status(403).json({
                    success: false,
                    message: 'ગામ એડમિન ફક્ત સામાન્ય સભ્યોનો પાસવર્ડ સેટ કરી શકે છે (Village admin can only set password for members)'
                });
            }

            const adminVillageId = String(req.user.assignedVillageId?._id || req.user.assignedVillageId || '');
            const targetVillageId = String(targetUser.assignedVillageId?._id || targetUser.assignedVillageId || '');

            if (adminVillageId !== targetVillageId) {
                return res.status(403).json({
                    success: false,
                    message: 'તમે ફક્ત તમારા ફાળવેલ ગામના સભ્યોનો પાસવર્ડ સેટ કરી શકો છો (Forbidden: Not in your assigned village)'
                });
            }
        }

        // Hash new password and save
        const salt = await bcrypt.genSalt(10);
        targetUser.passwordHash = await bcrypt.hash(newPassword.trim(), salt);
        targetUser.isPasswordSet = true;
        targetUser.resetOtp = null;
        targetUser.resetOtpExpires = null;
        await targetUser.save();

        res.status(200).json({
            success: true,
            message: `સભ્ય (${targetUser.name || targetUser.mobileNumber}) માટે નવો પાસવર્ડ સફળતાપૂર્વક સેટ થઈ ગયો છે.`
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password using old password (Any logged in user)
// @route   PUT /api/auth/change-password
export const changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).json({
                success: false,
                message: 'નવો પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ (New password must be at least 6 characters)'
            });
        }

        const user = await User.findById(req.user._id).select('+passwordHash');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // If the user already has a password set, verify oldPassword
        if (user.isPasswordSet && user.passwordHash) {
            if (!oldPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'હાલનો જૂનો પાસવર્ડ દાખલ કરવો જરૂરી છે (Current password is required)'
                });
            }

            const isMatch = await user.matchPassword(oldPassword);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'હાલનો પાસવર્ડ ખોટો છે (Current password is incorrect)'
                });
            }
        }

        // Hash new password and save
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword.trim(), salt);
        user.isPasswordSet = true;
        user.resetOtp = null;
        user.resetOtpExpires = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો છે! (Password changed successfully)'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Assign village admin or update user role (Super Admin only)
// @route   PATCH /api/auth/users/:id/role
export const updateUserRole = async (req, res, next) => {
    try {
        const { role, assignedVillageId } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role, assignedVillageId: assignedVillageId || null },
            { new: true }
        ).populate('assignedVillageId');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// @desc    Check email service configuration status (diagnostics)
// @route   GET /api/auth/email-status
export const getEmailStatus = (req, res) => {
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    const hasBrevo = Boolean(process.env.BREVO_API_KEY);
    const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const hasSmtpPass = Boolean(process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD);

    res.status(200).json({
        success: true,
        activeProvider: hasResend ? 'Resend (HTTPS 443)' : (hasBrevo ? 'Brevo (HTTPS 443)' : (emailUser ? 'Gmail SMTP' : 'None (Credentials missing in environment variables)')),
        hasHttpsApi: hasResend || hasBrevo,
        smtpConfigured: Boolean(emailUser && hasSmtpPass),
        smtpAccount: emailUser ? `${emailUser.slice(0, 3)}***${emailUser.slice(emailUser.indexOf('@'))}` : null
    });
};

// @desc    Get members eligible for user account creation
// @route   GET /api/auth/eligible-members
export const getEligibleMembers = async (req, res, next) => {
    try {
        const { search, villageId, limit = 50 } = req.query;
        const filter = { verificationStatus: 'approved', isAlive: true };

        // Village Admin scope
        if (req.user?.role === 'village_admin') {
            const vId = req.user.assignedVillageId?._id || req.user.assignedVillageId;
            if (!vId) {
                return res.status(403).json({ success: false, message: 'No village assigned to this admin account' });
            }
            filter.villageId = vId;
        } else if (villageId) {
            filter.villageId = villageId;
        }

        if (search) {
            const isNumeric = !isNaN(search);
            const searchConditions = [
                { 'fullName.gu': new RegExp(search, 'i') },
                { 'fullName.en': new RegExp(search, 'i') },
                { mobileNumber: new RegExp(search, 'i') },
                { 'atak.gu': new RegExp(search, 'i') },
                { 'atak.en': new RegExp(search, 'i') }
            ];
            if (isNumeric) {
                searchConditions.push({ serialNumber: Number(search) });
                searchConditions.push({ houseNumber: Number(search) });
            }
            filter.$or = searchConditions;
        }

        const members = await Member.find(filter)
            .populate('villageId', 'name slug taluka district')
            .limit(Number(limit))
            .sort({ serialNumber: 1, createdAt: -1 });

        // Find which members already have user accounts
        const memberIds = members.map(m => m._id);
        const mobileNumbers = members.map(m => m.mobileNumber).filter(Boolean);

        const existingUsers = await User.find({
            $or: [
                { memberId: { $in: memberIds } },
                { mobileNumber: { $in: mobileNumbers } }
            ]
        }).select('_id memberId mobileNumber email role isPasswordSet');

        const userByMemberId = new Map();
        const userByMobile = new Map();

        existingUsers.forEach(u => {
            if (u.memberId) userByMemberId.set(String(u.memberId), u);
            if (u.mobileNumber) userByMobile.set(u.mobileNumber, u);
        });

        const results = members.map(m => {
            const mObj = m.toObject();
            const existingUser = userByMemberId.get(String(m._id)) || (m.mobileNumber ? userByMobile.get(m.mobileNumber) : null);
            return {
                ...mObj,
                hasUserAccount: Boolean(existingUser),
                existingUser: existingUser ? {
                    _id: existingUser._id,
                    role: existingUser.role,
                    isPasswordSet: existingUser.isPasswordSet
                } : null
            };
        });

        res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a User account directly from a Member record (Super Admin or Village Admin)
// @route   POST /api/auth/users/create-from-member
export const createUserFromMember = async (req, res, next) => {
    try {
        const { memberId, password, mobileNumber, email, role, name } = req.body;

        if (!memberId) {
            return res.status(400).json({ success: false, message: 'Member ID is required' });
        }

        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        // Authorization checks for village_admin
        if (req.user?.role === 'village_admin') {
            const adminVillageId = String(req.user.assignedVillageId?._id || req.user.assignedVillageId || '');
            const memberVillageId = String(member.villageId?._id || member.villageId || '');

            if (adminVillageId !== memberVillageId) {
                return res.status(403).json({
                    success: false,
                    message: 'તમે ફક્ત તમારા ફાળવેલ ગામના સભ્યો માટે જ યુઝર એકાઉન્ટ બનાવી શકો છો (You can only create users for members of your assigned village)'
                });
            }
        }

        const targetMobile = (mobileNumber || member.mobileNumber || '').trim();
        if (!targetMobile) {
            return res.status(400).json({
                success: false,
                message: 'મોબાઈલ નંબર જરૂરી છે (Mobile number is required to create a user account)'
            });
        }

        const targetEmail = (email || member.email || '').trim().toLowerCase() || null;
        const targetName = (name || member.fullName?.gu || member.fullName?.en || 'Community Member').trim();
        const targetRole = (req.user?.role === 'super_admin' && role) ? role : 'member';

        // Check if user already exists
        let existingUser = await User.findOne({
            $or: [
                { memberId: member._id },
                { mobileNumber: targetMobile }
            ]
        });

        if (existingUser) {
            // Check if existing user belongs to a different member
            if (existingUser.memberId && String(existingUser.memberId) !== String(member._id)) {
                return res.status(400).json({
                    success: false,
                    message: `આ મોબાઈલ નંબર (${targetMobile}) પહેલેથી અન્ય વપરાશકર્તા (${existingUser.name || 'User'}) સાથે જોડાયેલ છે.`
                });
            }

            // Update existing user credentials and password
            existingUser.memberId = member._id;
            existingUser.familyId = member.familyId;
            existingUser.assignedVillageId = member.villageId;
            existingUser.mobileNumber = targetMobile;
            if (targetEmail) existingUser.email = targetEmail;
            if (targetName) existingUser.name = targetName;
            existingUser.isActive = true;

            if (password && password.trim().length >= 6) {
                const salt = await bcrypt.genSalt(10);
                existingUser.passwordHash = await bcrypt.hash(password.trim(), salt);
                existingUser.isPasswordSet = true;
                existingUser.resetOtp = null;
                existingUser.resetOtpExpires = null;
            }

            await existingUser.save();

            // Sync member mobile & email
            let memberChanged = false;
            if (member.mobileNumber !== targetMobile) {
                member.mobileNumber = targetMobile;
                memberChanged = true;
            }
            if (targetEmail && member.email !== targetEmail) {
                member.email = targetEmail;
                memberChanged = true;
            }
            if (memberChanged) await member.save();

            const populatedUser = await User.findById(existingUser._id)
                .populate('assignedVillageId', 'name slug taluka district')
                .populate('memberId', 'fullName mobileNumber email serialNumber houseNumber');

            return res.status(200).json({
                success: true,
                message: `સભ્ય (${targetName}) નું યુઝર એકાઉન્ટ પહેલેથી હતું, વિગતો અને પાસવર્ડ સફળતાપૂર્વક અપડેટ થઈ ગયા છે.`,
                data: populatedUser
            });
        }

        // New user creation
        let passwordHash = null;
        let isPasswordSet = false;
        if (password && password.trim().length >= 6) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password.trim(), salt);
            isPasswordSet = true;
        }

        const newUser = await User.create({
            name: targetName,
            mobileNumber: targetMobile,
            email: targetEmail,
            role: targetRole,
            assignedVillageId: member.villageId,
            memberId: member._id,
            familyId: member.familyId,
            passwordHash,
            isPasswordSet,
            isActive: true
        });

        // Sync member mobile & email if they were updated/missing
        let memberChanged = false;
        if (member.mobileNumber !== targetMobile) {
            member.mobileNumber = targetMobile;
            memberChanged = true;
        }
        if (targetEmail && member.email !== targetEmail) {
            member.email = targetEmail;
            memberChanged = true;
        }
        if (memberChanged) await member.save();

        const populatedNewUser = await User.findById(newUser._id)
            .populate('assignedVillageId', 'name slug taluka district')
            .populate('memberId', 'fullName mobileNumber email serialNumber houseNumber');

        res.status(201).json({
            success: true,
            message: `સભ્ય (${targetName}) માટે યુઝર એકાઉન્ટ સફળતાપૂર્વક બની ગયું છે!`,
            data: populatedNewUser
        });
    } catch (error) {
        next(error);
    }
};

// Helper to parse clean user-agent details
const parseDevice = (userAgent) => {
    if (!userAgent) return { device: 'Desktop', browser: 'Web Browser', os: 'Unknown' };
    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) device = 'Mobile';
    else if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';

    let browser = 'Chrome';
    if (/edg/i.test(userAgent)) browser = 'Edge';
    else if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
    else if (/safari/i.test(userAgent)) browser = 'Safari';

    let os = 'Windows';
    if (/android/i.test(userAgent)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
    else if (/windows/i.test(userAgent)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
    else if (/linux/i.test(userAgent)) os = 'Linux';

    return { device, browser, os };
};

// @desc    Heartbeat to keep user session marked as active
// @route   POST /api/auth/heartbeat
export const heartbeat = async (req, res) => {
    try {
        if (req.user) {
            const now = new Date();
            const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
            const cleanIp = ip ? String(ip).split(',')[0].trim() : null;
            await User.findByIdAndUpdate(req.user._id, {
                lastActiveAt: now,
                ...(cleanIp ? { lastIpAddress: cleanIp } : {}),
                ...(req.headers['user-agent'] ? { lastUserAgent: req.headers['user-agent'] } : {})
            });
        }
        res.status(200).json({ success: true, timestamp: new Date() });
    } catch (error) {
        res.status(200).json({ success: true });
    }
};

// @desc    Logout user and mark session ended
// @route   POST /api/auth/logout
export const logout = async (req, res) => {
    try {
        if (req.user) {
            await User.findByIdAndUpdate(req.user._id, {
                lastLogoutAt: new Date()
            });
        }
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(200).json({ success: true });
    }
};

// @desc    Get currently logged in users and active sessions (Super Admin only)
// @route   GET /api/auth/active-sessions
export const getActiveSessions = async (req, res, next) => {
    try {
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Fetch users who have either logged in or been active, sorted by recent activity
        const users = await User.find({
            $or: [
                { lastActiveAt: { $ne: null } },
                { lastLoginAt: { $ne: null } }
            ]
        })
            .populate('assignedVillageId', 'name slug taluka district')
            .populate('memberId', 'fullName mobileNumber serialNumber houseNumber')
            .sort({ lastActiveAt: -1, lastLoginAt: -1 })
            .limit(100);

        let onlineCount = 0;
        let activeTodayCount = 0;
        let onlineAdminsCount = 0;

        const sessionList = users.map((u) => {
            const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;
            const lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt) : null;
            const lastLogout = u.lastLogoutAt ? new Date(u.lastLogoutAt) : null;

            // Consider online if active within last 15 minutes AND did not log out after lastActive
            const isOnline = Boolean(
                lastActive &&
                lastActive >= fifteenMinutesAgo &&
                (!lastLogout || lastActive > lastLogout)
            );

            const isActiveToday = Boolean(
                (lastActive && lastActive >= twentyFourHoursAgo) ||
                (lastLogin && lastLogin >= twentyFourHoursAgo)
            );

            if (isOnline) {
                onlineCount++;
                if (u.role === 'super_admin' || u.role === 'village_admin') {
                    onlineAdminsCount++;
                }
            }
            if (isActiveToday) {
                activeTodayCount++;
            }

            const deviceDetails = parseDevice(u.lastUserAgent);

            return {
                _id: u._id,
                name: u.name,
                mobileNumber: u.mobileNumber,
                email: u.email,
                role: u.role,
                isActive: u.isActive,
                isOnline,
                lastLoginAt: u.lastLoginAt,
                lastActiveAt: u.lastActiveAt,
                lastLogoutAt: u.lastLogoutAt,
                lastIpAddress: u.lastIpAddress,
                device: deviceDetails.device,
                browser: deviceDetails.browser,
                os: deviceDetails.os,
                assignedVillage: u.assignedVillageId ? {
                    _id: u.assignedVillageId._id,
                    name: u.assignedVillageId.name,
                    taluka: u.assignedVillageId.taluka
                } : null,
                member: u.memberId ? {
                    _id: u.memberId._id,
                    serialNumber: u.memberId.serialNumber,
                    houseNumber: u.memberId.houseNumber
                } : null
            };
        });

        const totalUsers = await User.countDocuments();

        res.status(200).json({
            success: true,
            stats: {
                onlineCount,
                activeTodayCount,
                onlineAdminsCount,
                totalUsers
            },
            data: sessionList
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Force terminate user session (Super Admin only)
// @route   POST /api/auth/users/:id/terminate-session
export const terminateSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const targetUser = await User.findById(id);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        targetUser.lastLogoutAt = new Date();
        targetUser.lastActiveAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes in past
        await targetUser.save();

        res.status(200).json({
            success: true,
            message: `User (${targetUser.name || targetUser.mobileNumber}) session has been terminated.`
        });
    } catch (error) {
        next(error);
    }
};



