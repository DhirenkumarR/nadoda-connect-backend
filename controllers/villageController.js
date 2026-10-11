import { Village } from '../models/index.js';
import { calculateVillageStats, recalculateVillageStats } from '../services/statsService.js';

// @desc    Get all active villages with summary statistics
// @route   GET /api/villages
export const getVillages = async (req, res, next) => {
    try {
        const villages = await Village.find({ isActive: true }).select(
            'name slug taluka district totalHouses totalMale totalFemale totalMembers registeredAtaks'
        );
        res.status(200).json({ success: true, count: villages.length, data: villages });
    } catch (error) {
        next(error);
    }
};

// @desc    Get village by slug or ID with Atak breakdown
// @route   GET /api/villages/:slugOrId
export const getVillageDetails = async (req, res, next) => {
    try {
        const { slugOrId } = req.params;
        const query = slugOrId.match(/^[0-9a-fA-F]{24}$/)
            ? { _id: slugOrId }
            : { slug: slugOrId.toLowerCase() };

        let village = await Village.findOne(query);
        if (!village) {
            return res.status(404).json({ success: false, message: 'Village not found' });
        }

        // Check if dynamic DB stats should be merged or refreshed
        if (req.query.recalculate === 'true') {
            const result = await recalculateVillageStats(village._id);
            village = result.village;
        }

        res.status(200).json({ success: true, data: village });
    } catch (error) {
        next(error);
    }
};

// @desc    Get comprehensive dynamic DB statistics for a village
// @route   GET /api/villages/:slugOrId/stats
export const getVillageStats = async (req, res, next) => {
    try {
        const { slugOrId } = req.params;
        const query = slugOrId.match(/^[0-9a-fA-F]{24}$/)
            ? { _id: slugOrId }
            : { slug: slugOrId.toLowerCase() };

        const village = await Village.findOne(query);
        if (!village) {
            return res.status(404).json({ success: false, message: 'Village not found' });
        }

        const stats = await calculateVillageStats(village._id);
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};

// @desc    Recalculate and persist village statistics directly from DB
// @route   POST /api/villages/:slugOrId/recalculate
export const recalculateStats = async (req, res, next) => {
    try {
        const { slugOrId } = req.params;
        const query = slugOrId.match(/^[0-9a-fA-F]{24}$/)
            ? { _id: slugOrId }
            : { slug: slugOrId.toLowerCase() };

        const village = await Village.findOne(query);
        if (!village) {
            return res.status(404).json({ success: false, message: 'Village not found' });
        }

        // Authorization check: Super admin or admin of this village
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(village._id)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only manage statistics for your assigned village'
            });
        }

        const result = await recalculateVillageStats(village._id);
        res.status(200).json({
            success: true,
            message: 'Village statistics successfully recalculated from database counts',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Atak list and demographic stats for a village
// @route   GET /api/villages/:slugOrId/ataks
export const getVillageAtaks = async (req, res, next) => {
    try {
        const { slugOrId } = req.params;
        const query = slugOrId.match(/^[0-9a-fA-F]{24}$/)
            ? { _id: slugOrId }
            : { slug: slugOrId.toLowerCase() };

        const village = await Village.findOne(query);
        if (!village) {
            return res.status(404).json({ success: false, message: 'Village not found' });
        }

        const stats = await calculateVillageStats(village._id);
        res.status(200).json({
            success: true,
            count: stats.ataks.length,
            village: { _id: village._id, name: village.name, slug: village.slug },
            data: stats.ataks
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new village (Super Admin only)
// @route   POST /api/villages
export const createVillage = async (req, res, next) => {
    try {
        const village = await Village.create(req.body);
        res.status(201).json({ success: true, data: village });
    } catch (error) {
        next(error);
    }
};

// @desc    Update village details (Super Admin or Assigned Village Admin)
// @route   PUT /api/villages/:id
export const updateVillage = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(id)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only update your assigned village'
            });
        }

        const village = await Village.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!village) {
            return res.status(404).json({ success: false, message: 'Village not found' });
        }

        res.status(200).json({ success: true, data: village });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete village (Super Admin only)
// @route   DELETE /api/villages/:id
export const deleteVillage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const village = await Village.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!village) {
            return res.status(404).json({ success: false, message: 'Village not found' });
        }
        res.status(200).json({ success: true, message: 'Village deactivated successfully' });
    } catch (error) {
        next(error);
    }
};
