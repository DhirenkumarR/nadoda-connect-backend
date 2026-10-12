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

// @desc    Get all registered users (Super Admin only)
// @route   GET /api/auth/users
export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find().populate('assignedVillageId').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: users.length, data: users });
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


