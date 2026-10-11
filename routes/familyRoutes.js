import { Router } from 'express';
import {
    getFamilies,
    getMyFamily,
    getFamilyById,
    createFamily,
    updateFamily,
    deleteFamily,
    moveMembers
} from '../controllers/familyController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Member's own family
router.get('/my-family', protect, getMyFamily);

// Move members between families (Admins)
router.post('/move-members', protect, authorizeRoles('super_admin', 'village_admin'), moveMembers);

router.get('/', getFamilies);
router.get('/:id', getFamilyById);

router.post('/', protect, authorizeRoles('super_admin', 'village_admin'), createFamily);
router.put('/:id', protect, authorizeRoles('super_admin', 'village_admin', 'member'), updateFamily);
router.delete('/:id', protect, authorizeRoles('super_admin', 'village_admin'), deleteFamily);

export default router;
