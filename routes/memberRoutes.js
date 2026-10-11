import { Router } from 'express';
import {
    getMembers,
    getMemberById,
    createMember,
    updateMember,
    deleteMember
} from '../controllers/memberController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getMembers);
router.get('/:id', getMemberById);

router.post('/', protect, authorizeRoles('super_admin', 'village_admin', 'member'), createMember);
router.put('/:id', protect, authorizeRoles('super_admin', 'village_admin', 'member'), updateMember);
router.delete('/:id', protect, authorizeRoles('super_admin', 'village_admin', 'member'), deleteMember);

export default router;
