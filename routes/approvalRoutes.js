import { Router } from 'express';
import {
    getApprovalRequests,
    getPendingRequests,
    submitRequest,
    approveRequest,
    rejectRequest
} from '../controllers/approvalController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Member or Admin can submit a request
router.post('/submit', protect, submitRequest);

// Village Admin and Super Admin can view, approve, and reject
router.get(
    '/',
    protect,
    authorizeRoles('super_admin', 'village_admin'),
    getApprovalRequests
);

router.get(
    '/pending',
    protect,
    authorizeRoles('super_admin', 'village_admin'),
    getPendingRequests
);

router.patch(
    '/:id/approve',
    protect,
    authorizeRoles('super_admin', 'village_admin'),
    approveRequest
);

router.patch(
    '/:id/reject',
    protect,
    authorizeRoles('super_admin', 'village_admin'),
    rejectRequest
);

export default router;
