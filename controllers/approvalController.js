import { ApprovalRequest, Member, Family } from '../models/index.js';
import { recalculateVillageStats } from '../services/statsService.js';

// @desc    List approval requests with filtering
// @route   GET /api/approvals
export const getApprovalRequests = async (req, res, next) => {
    try {
        const { villageId, entityType, status = 'pending', page = 1, limit = 20 } = req.query;
        const filter = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        // If village admin, restrict to their village
        if (req.user?.role === 'village_admin' && req.user.assignedVillageId._id) {
            filter.villageId = req.user.assignedVillageId._id;
        } else if (villageId) {
            filter.villageId = villageId;
        }

        if (entityType) filter.entityType = entityType;

        const requests = await ApprovalRequest.find(filter)
            .populate('submittedBy', 'name mobileNumber role')
            .populate('villageId', 'name slug')
            .populate('reviewedBy', 'name mobileNumber')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await ApprovalRequest.countDocuments(filter);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            count: requests.length,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get pending requests for Admin Review Dashboard (Convenience alias)
// @route   GET /api/approvals/pending
export const getPendingRequests = async (req, res, next) => {
    req.query.status = 'pending';
    return getApprovalRequests(req, res, next);
};

// @desc    Submit a member or family creation or update request for review
// @route   POST /api/approvals/submit
export const submitRequest = async (req, res, next) => {
    try {
        const { entityType, requestType, targetId, villageId, familyId, payload } = req.body;

        let originalData = null;
        if (requestType === 'update' && targetId) {
            if (entityType === 'Member') {
                const existing = await Member.findById(targetId);
                if (existing) originalData = existing.toObject();
            } else if (entityType === 'Family') {
                const existing = await Family.findById(targetId);
                if (existing) originalData = existing.toObject();
            }
        }

        const newRequest = await ApprovalRequest.create({
            entityType,
            requestType,
            targetId,
            villageId,
            familyId,
            payload,
            originalData,
            status: 'pending',
            submittedBy: req.user?._id || null
        });

        res.status(201).json({
            success: true,
            message: 'Change request submitted for admin review',
            data: newRequest
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve a request (Village Admin or Super Admin)
// @route   PATCH /api/approvals/:id/approve
export const approveRequest = async (req, res, next) => {
    try {
        const request = await ApprovalRequest.findById(req.params.id);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ success: false, message: 'Pending request not found' });
        }

        // Authorization check: village_admin can only approve for their assigned village
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(request.villageId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only approve requests for your assigned village'
            });
        }

        if (request.entityType === 'Member') {
            if (request.requestType === 'create') {
                await Member.create({
                    ...request.payload,
                    villageId: request.villageId,
                    familyId: request.familyId,
                    verificationStatus: 'approved',
                    reviewedBy: req.user?._id,
                    reviewedAt: new Date()
                });
            } else if (request.requestType === 'update' && request.targetId) {
                await Member.findByIdAndUpdate(request.targetId, {
                    ...request.payload,
                    verificationStatus: 'approved',
                    pendingUpdates: null,
                    reviewedBy: req.user?._id,
                    reviewedAt: new Date()
                });
            } else if (request.requestType === 'delete' && request.targetId) {
                await Member.findByIdAndDelete(request.targetId);
            }
        } else if (request.entityType === 'Family') {
            if (request.requestType === 'create') {
                await Family.create({
                    ...request.payload,
                    villageId: request.villageId,
                    verificationStatus: 'approved',
                    reviewedBy: req.user?._id,
                    reviewedAt: new Date()
                });
            } else if (request.requestType === 'update' && request.targetId) {
                await Family.findByIdAndUpdate(request.targetId, {
                    ...request.payload,
                    verificationStatus: 'approved',
                    reviewedBy: req.user?._id,
                    reviewedAt: new Date()
                });
            }
        }

        request.status = 'approved';
        request.reviewedBy = req.user?._id || null;
        request.reviewedAt = new Date();
        request.adminNotes = req.body.adminNotes || null;
        await request.save();

        // Recalculate village statistics in DB
        await recalculateVillageStats(request.villageId);

        res.status(200).json({ success: true, message: 'Request approved successfully', data: request });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject a request with reason
// @route   PATCH /api/approvals/:id/reject
export const rejectRequest = async (req, res, next) => {
    try {
        const { rejectionReason, adminNotes } = req.body;
        const request = await ApprovalRequest.findById(req.params.id);

        if (!request || request.status !== 'pending') {
            return res.status(404).json({ success: false, message: 'Pending request not found' });
        }

        // Authorization check
        if (req.user?.role === 'village_admin' && String(req.user.assignedVillageId._id) !== String(request.villageId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only reject requests for your assigned village'
            });
        }

        request.status = 'rejected';
        request.rejectionReason = rejectionReason || 'Information not verified';
        request.adminNotes = adminNotes || null;
        request.reviewedBy = req.user?._id || null;
        request.reviewedAt = new Date();
        await request.save();

        res.status(200).json({ success: true, message: 'Request rejected', data: request });
    } catch (error) {
        next(error);
    }
};
