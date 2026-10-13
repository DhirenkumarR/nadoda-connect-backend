import { Family, Member, User, Village } from '../models/index.js';
import { recalculateVillageStats } from '../services/statsService.js';

// @desc    Get families by village, optionally filtered by atak, city, or search
// @route   GET /api/families
export const getFamilies = async (req, res, next) => {
    try {
        const { villageId, atak, city, search, page = 1, limit = 24 } = req.query;
        const filter = { isActive: true };

        if (villageId) filter.villageId = villageId;
        if (atak) {
            filter.$or = [{ 'atak.gu': atak }, { 'atak.en': new RegExp(atak, 'i') }];
        }
        if (city) {
            filter.$or = [
                { 'address.currentCity.gu': city },
                { 'address.currentCity.en': new RegExp(city, 'i') }
            ];
        }

        if (search) {
            const isNumeric = !isNaN(search);
            const matchedMembers = await Member.find({
                $or: [
                    { 'fullName.gu': new RegExp(search, 'i') },
                    { 'fullName.en': new RegExp(search, 'i') }
                ]
            }).select('familyId').limit(50);
            const memberFamilyIds = matchedMembers.map(m => m.familyId).filter(Boolean);

            const searchConditions = [
                { primaryMobile: new RegExp(search, 'i') },
                { 'atak.gu': new RegExp(search, 'i') },
                { 'atak.en': new RegExp(search, 'i') },
                { 'kuldevi.gu': new RegExp(search, 'i') },
                { 'kuldevi.en': new RegExp(search, 'i') }
            ];
            if (memberFamilyIds.length > 0) {
                searchConditions.push({ _id: { $in: memberFamilyIds } });
            }
            if (isNumeric) {
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
        const families = await Family.find(filter)
            .populate('headMemberId', 'fullName mobileNumber occupation gender age education')
            .populate('villageId', 'name slug taluka district')
            .sort({ houseNumber: 1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Family.countDocuments(filter);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            count: families.length,
            data: families
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single family with all enrolled members
// @route   GET /api/families/:id
export const getFamilyById = async (req, res, next) => {
    try {
        const family = await Family.findById(req.params.id)
            .populate('villageId', 'name slug taluka district')
            .populate('headMemberId');

        if (!family) {
            return res.status(404).json({ success: false, message: 'Family not found' });
        }

        const members = await Member.find({
            familyId: family._id,
            isAlive: true
        }).sort({ memberOrder: 1, serialNumber: 1 });

        res.status(200).json({ success: true, data: { ...family.toObject(), members } });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new family
// @route   POST /api/families
export const createFamily = async (req, res, next) => {
    try {
        const { villageId, houseNumber } = req.body;

        // Role check
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(villageId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only create families in your assigned village'
            });
        }

        // Check if houseNumber already exists in this village
        const existing = await Family.findOne({ villageId, houseNumber });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `House number ${houseNumber} already exists in this village`
            });
        }

        // Fetch village to ensure nativeVillage and currentCity default to this village if not specified
        const villageDoc = await Village.findById(villageId);
        const vGu = villageDoc?.name?.gu || '';
        const vEn = villageDoc?.name?.en || '';

        const incomingAddress = req.body.address || {};
        const nativeVillage = {
            gu: incomingAddress.nativeVillage?.gu || vGu,
            en: incomingAddress.nativeVillage?.en || vEn
        };
        const currentCity = {
            gu: incomingAddress.currentCity?.gu || vGu,
            en: incomingAddress.currentCity?.en || vEn
        };

        const family = await Family.create({
            ...req.body,
            address: {
                ...incomingAddress,
                nativeVillage,
                currentCity
            },
            submittedBy: req.user?._id || null,
            verificationStatus: 'approved'
        });

        // Update stats
        await recalculateVillageStats(villageId);

        res.status(201).json({ success: true, data: family });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged-in member's family and members
// @route   GET /api/families/my-family
export const getMyFamily = async (req, res, next) => {
    try {
        let familyId = req.user?.familyId;

        if (!familyId) {
            // Try to look up by user's mobile number or email in Member directory
            const member = await Member.findOne({
                $or: [
                    { mobileNumber: req.user?.mobileNumber },
                    ...(req.user?.email ? [{ email: req.user.email }] : [])
                ]
            });
            if (member && member.familyId) {
                familyId = member.familyId;
                req.user.familyId = member.familyId;
                req.user.memberId = member._id;
                await req.user.save();
            } else if (req.user?.role === 'super_admin') {
                const defaultFam = await Family.findOne({ houseNumber: 172 }) || await Family.findOne({ isActive: true });
                if (defaultFam) {
                    familyId = defaultFam._id;
                    req.user.familyId = defaultFam._id;
                    await req.user.save();
                } else {
                    return res.status(404).json({
                        success: false,
                        message: 'No family record linked to your account yet.'
                    });
                }
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'No family record linked to your account yet. Please contact your village administrator.'
                });
            }
        }

        const family = await Family.findById(familyId)
            .populate('villageId', 'name slug taluka district')
            .populate('headMemberId');

        if (!family) {
            return res.status(404).json({ success: false, message: 'Family not found' });
        }

        const members = await Member.find({
            familyId: family._id,
            isAlive: true
        }).sort({ memberOrder: 1, serialNumber: 1 });

        res.status(200).json({
            success: true,
            data: {
                ...family.toObject(),
                members
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update family
// @route   PUT /api/families/:id
export const updateFamily = async (req, res, next) => {
    try {
        const family = await Family.findById(req.params.id);
        if (!family) {
            return res.status(404).json({ success: false, message: 'Family not found' });
        }

        // Role check
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(family.villageId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only edit families in your assigned village'
            });
        }

        if (req.user?.role === 'member') {
            const userFamilyId = req.user.familyId ? String(req.user.familyId) : null;
            if (!userFamilyId || userFamilyId !== String(family._id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: You can only edit information for your own family'
                });
            }
        }

        const updates = { ...req.body };
        if (req.user?.role === 'member') {
            delete updates.villageId;
            delete updates.houseNumber;
            delete updates.verificationStatus;
            delete updates.submittedBy;
            delete updates.reviewedBy;
        }

        Object.assign(family, updates);
        await family.save();

        // If atak or isActive changed, recalculate stats
        await recalculateVillageStats(family.villageId);

        res.status(200).json({ success: true, data: family });
    } catch (error) {
        next(error);
    }
};

// @desc    Move members between families or into a new family
// @route   POST /api/families/move-members
export const moveMembers = async (req, res, next) => {
    try {
        const {
            sourceFamilyId,
            memberIds,
            destinationType = 'existing', // 'existing' or 'new'
            targetFamilyId,
            newFamilyData = {}
        } = req.body;

        if (!sourceFamilyId || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Source family ID and at least one member ID are required'
            });
        }

        const sourceFamily = await Family.findById(sourceFamilyId);
        if (!sourceFamily) {
            return res.status(404).json({ success: false, message: 'Source family not found' });
        }

        // Role check for source family
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(sourceFamily.villageId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only move members within your assigned village'
            });
        }

        // Find the members belonging to source family
        const membersToMove = await Member.find({
            _id: { $in: memberIds },
            familyId: sourceFamily._id
        });

        if (membersToMove.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'None of the specified members belong to the source family'
            });
        }

        let targetFamily = null;

        if (destinationType === 'new') {
            // Determine houseNumber
            let assignedHouseNumber = newFamilyData.houseNumber ? Number(newFamilyData.houseNumber) : null;
            if (!assignedHouseNumber) {
                const highest = await Family.findOne({ villageId: sourceFamily.villageId }).sort({ houseNumber: -1 });
                assignedHouseNumber = highest ? (highest.houseNumber + 1) : 1;
            } else {
                const houseExists = await Family.findOne({ villageId: sourceFamily.villageId, houseNumber: assignedHouseNumber });
                if (houseExists) {
                    return res.status(400).json({
                        success: false,
                        message: `House number ${assignedHouseNumber} already exists in this village. Please select a different house number.`
                    });
                }
            }

            // Create target family
            targetFamily = await Family.create({
                villageId: sourceFamily.villageId,
                houseNumber: assignedHouseNumber,
                atak: newFamilyData.atak?.gu ? newFamilyData.atak : sourceFamily.atak,
                kuldevi: newFamilyData.kuldevi?.gu ? newFamilyData.kuldevi : sourceFamily.kuldevi,
                address: newFamilyData.address || sourceFamily.address,
                primaryMobile: newFamilyData.primaryMobile || membersToMove[0]?.mobileNumber || sourceFamily.primaryMobile,
                totalMembersCount: 0,
                submittedBy: req.user?._id || null,
                verificationStatus: 'approved'
            });
        } else {
            // Moving to an existing family
            if (!targetFamilyId) {
                return res.status(400).json({ success: false, message: 'Target family ID is required' });
            }
            if (String(targetFamilyId) === String(sourceFamilyId)) {
                return res.status(400).json({ success: false, message: 'Source and target family cannot be the same' });
            }

            targetFamily = await Family.findById(targetFamilyId);
            if (!targetFamily) {
                return res.status(404).json({ success: false, message: 'Target family not found' });
            }

            // Check village matching & admin role
            if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(targetFamily.villageId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: Target family must be in your assigned village'
                });
            }
        }

        // Move the members
        const movedIds = membersToMove.map(m => m._id);
        await Member.updateMany(
            { _id: { $in: movedIds } },
            {
                $set: {
                    familyId: targetFamily._id,
                    houseNumber: targetFamily.houseNumber,
                    atak: targetFamily.atak
                }
            }
        );

        // Also update any User login records linked to these members
        await User.updateMany(
            { memberId: { $in: movedIds } },
            { $set: { familyId: targetFamily._id } }
        );

        // Update target family count and headMemberId
        const targetActiveMembers = await Member.find({ familyId: targetFamily._id, isAlive: true }).sort({ memberOrder: 1 });
        targetFamily.totalMembersCount = targetActiveMembers.length;
        if (!targetFamily.headMemberId || (newFamilyData.newHeadMemberId && movedIds.map(String).includes(String(newFamilyData.newHeadMemberId)))) {
            const headCandidate = newFamilyData.newHeadMemberId
                ? targetActiveMembers.find(m => String(m._id) === String(newFamilyData.newHeadMemberId))
                : targetActiveMembers[0];
            if (headCandidate) {
                targetFamily.headMemberId = headCandidate._id;
            }
        }
        await targetFamily.save();

        // Update source family count and headMemberId
        const sourceActiveMembers = await Member.find({ familyId: sourceFamily._id, isAlive: true }).sort({ memberOrder: 1 });
        sourceFamily.totalMembersCount = sourceActiveMembers.length;
        if (movedIds.map(String).includes(String(sourceFamily.headMemberId))) {
            sourceFamily.headMemberId = sourceActiveMembers.length > 0 ? sourceActiveMembers[0]._id : null;
        }
        await sourceFamily.save();

        // Recalculate stats
        await recalculateVillageStats(sourceFamily.villageId);
        if (String(sourceFamily.villageId) !== String(targetFamily.villageId)) {
            await recalculateVillageStats(targetFamily.villageId);
        }

        res.status(200).json({
            success: true,
            message: `${membersToMove.length} સભ્યોને સફળતાપૂર્વક ખસેડવામાં આવ્યા છે.`,
            data: {
                movedCount: membersToMove.length,
                sourceFamilyId: sourceFamily._id,
                targetFamilyId: targetFamily._id,
                targetHouseNumber: targetFamily.houseNumber
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete family
// @route   DELETE /api/families/:id
export const deleteFamily = async (req, res, next) => {
    try {
        const family = await Family.findById(req.params.id);
        if (!family) {
            return res.status(404).json({ success: false, message: 'Family not found' });
        }

        // Role check
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(family.villageId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only delete families in your assigned village'
            });
        }

        const villageId = family.villageId;
        await Family.findByIdAndDelete(family._id);
        // Also remove members or deactivate
        await Member.deleteMany({ familyId: family._id });

        await recalculateVillageStats(villageId);

        res.status(200).json({ success: true, message: 'Family and members deleted successfully' });
    } catch (error) {
        next(error);
    }
};
