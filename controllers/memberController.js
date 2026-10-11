import { Member, Family, User } from '../models/index.js';
import { recalculateVillageStats } from '../services/statsService.js';

// @desc    Search and filter community members
// @route   GET /api/members
export const getMembers = async (req, res, next) => {
    try {
        const {
            villageId,
            familyId,
            atak,
            search,
            occupationCategory,
            workCity,
            gender,
            isHead,
            maritalStatus,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { verificationStatus: 'approved', isAlive: true };

        if (villageId) filter.villageId = villageId;
        if (familyId) filter.familyId = familyId;
        if (atak) {
            filter.$or = [{ 'atak.gu': atak }, { 'atak.en': new RegExp(atak, 'i') }];
        }
        if (occupationCategory) filter['occupation.category'] = occupationCategory;
        if (workCity) filter['occupation.workCity'] = new RegExp(workCity, 'i');
        if (gender) filter['gender.key'] = gender.toLowerCase();
        if (isHead !== undefined) filter.isFamilyHead = isHead === 'true';
        if (maritalStatus) filter['maritalStatus.key'] = maritalStatus;

        if (search) {
            const isNumeric = !isNaN(search);
            const searchConditions = [
                { 'fullName.gu': new RegExp(search, 'i') },
                { 'fullName.en': new RegExp(search, 'i') },
                { mobileNumber: new RegExp(search, 'i') },
                { 'atak.gu': new RegExp(search, 'i') },
                { 'atak.en': new RegExp(search, 'i') },
                { 'occupation.title': new RegExp(search, 'i') },
                { 'education.qualification': new RegExp(search, 'i') }
            ];
            if (isNumeric) {
                searchConditions.push({ serialNumber: Number(search) });
                searchConditions.push({ houseNumber: Number(search) });
            }

            if (filter.$or) {
                filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
                delete filter.$or;
            } else {
                filter.$or = searchConditions;
            }
        }

        const skip = (Number(page) - 1) * Number(limit);
        const members = await Member.find(filter)
            .populate('familyId', 'houseNumber address primaryMobile kuldevi')
            .populate('villageId', 'name slug taluka district')
            .sort({ serialNumber: 1, houseNumber: 1, memberOrder: 1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Member.countDocuments(filter);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            count: members.length,
            data: members
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single member details
// @route   GET /api/members/:id
export const getMemberById = async (req, res, next) => {
    try {
        const member = await Member.findById(req.params.id)
            .populate('familyId')
            .populate('villageId', 'name slug taluka district state');

        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        res.status(200).json({ success: true, data: member });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new member
// @route   POST /api/members
export const createMember = async (req, res, next) => {
    try {
        const { villageId, familyId, isFamilyHead } = req.body;

        // Role check
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(villageId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only create members in your assigned village'
            });
        }

        if (req.user?.role === 'member') {
            const userFamilyId = req.user.familyId ? String(req.user.familyId) : null;
            if (!userFamilyId || userFamilyId !== String(familyId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: You can only add members to your own family'
                });
            }
        }

        const family = await Family.findById(familyId);
        if (!family) {
            return res.status(400).json({ success: false, message: 'Referenced family does not exist' });
        }

        let serialNumber = req.body.serialNumber;
        if (!serialNumber || Number(serialNumber) <= 0) {
            const highestMember = await Member.findOne({
                villageId: family.villageId,
                serialNumber: { $exists: true, $ne: null }
            }).sort({ serialNumber: -1 });

            serialNumber = (highestMember && typeof highestMember.serialNumber === 'number' && highestMember.serialNumber > 0)
                ? highestMember.serialNumber + 1
                : 1;
        }

        const memberData = {
            ...req.body,
            serialNumber: Number(serialNumber),
            villageId: family.villageId,
            familyId: family._id,
            houseNumber: family.houseNumber,
            atak: family.atak,
            verificationStatus: 'approved'
        };

        const member = await Member.create(memberData);

        // Update family members count and head if needed
        family.totalMembersCount = (family.totalMembersCount || 0) + 1;
        if (isFamilyHead || !family.headMemberId) {
            family.headMemberId = member._id;
        }

        const allFamMembers = await Member.find({ familyId: family._id, serialNumber: { $exists: true, $ne: null } });
        const nums = allFamMembers.map(m => m.serialNumber).filter(n => typeof n === 'number' && n > 0);
        if (nums.length > 0) {
            family.serialNumberRange = {
                start: Math.min(...nums),
                end: Math.max(...nums)
            };
        }
        await family.save();

        // Recalculate village stats (which also verifies all salang kram)
        await recalculateVillageStats(family.villageId);

        res.status(201).json({ success: true, data: member });
    } catch (error) {
        next(error);
    }
};

// @desc    Update an existing member
// @route   PUT /api/members/:id
export const updateMember = async (req, res, next) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        // Role check
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(member.villageId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only edit members in your assigned village'
            });
        }

        if (req.user?.role === 'member') {
            const userFamilyId = req.user.familyId ? String(req.user.familyId) : null;
            if (!userFamilyId || userFamilyId !== String(member.familyId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: You can only edit members of your own family'
                });
            }
        }

        const updates = { ...req.body };
        if (req.user?.role === 'member') {
            delete updates.villageId;
            delete updates.familyId;
            delete updates.houseNumber;
            delete updates.verificationStatus;
        }

        Object.assign(member, updates);
        await member.save();

        if (req.body.isFamilyHead) {
            await Family.findByIdAndUpdate(member.familyId, { headMemberId: member._id });
        }

        // Recalculate village stats
        await recalculateVillageStats(member.villageId);

        res.status(200).json({ success: true, data: member });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a member
// @route   DELETE /api/members/:id
export const deleteMember = async (req, res, next) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        // Role check
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(member.villageId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only delete members in your assigned village'
            });
        }

        if (req.user?.role === 'member') {
            const userFamilyId = req.user.familyId ? String(req.user.familyId) : null;
            if (!userFamilyId || userFamilyId !== String(member.familyId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: You can only delete members of your own family'
                });
            }
        }

        const villageId = member.villageId;
        const familyId = member.familyId;

        await Member.findByIdAndDelete(member._id);
        await User.deleteMany({ memberId: member._id });

        // Update family members count
        const family = await Family.findById(familyId);
        if (family) {
            family.totalMembersCount = Math.max(0, (family.totalMembersCount || 1) - 1);
            if (String(family.headMemberId) === String(member._id)) {
                // Find next member in family to set as head
                const nextHead = await Member.findOne({ familyId, isAlive: true });
                family.headMemberId = nextHead ? nextHead._id : null;
            }
            await family.save();
        }

        // Recalculate village stats
        await recalculateVillageStats(villageId);

        res.status(200).json({ success: true, message: 'Member deleted successfully' });
    } catch (error) {
        next(error);
    }
};
