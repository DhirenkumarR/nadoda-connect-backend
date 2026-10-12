import { Router } from 'express';
import {
    login,
    forgotPassword,
    setPassword,
    createVillageAdmin,
    getMe,
    updateProfile,
    getUsers,
    updateUserRole,
    getEmailStatus,
    adminSetUserPassword,
    changePassword,
    getEligibleMembers,
    createUserFromMember
} from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Public auth routes
router.get('/email-status', getEmailStatus);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/set-password', setPassword);

// Protected user routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// User management routes (Super Admin & Village Admin)
router.get('/users', protect, authorizeRoles('super_admin', 'village_admin'), getUsers);
router.get('/eligible-members', protect, authorizeRoles('super_admin', 'village_admin'), getEligibleMembers);
router.post('/users/create-from-member', protect, authorizeRoles('super_admin', 'village_admin'), createUserFromMember);
router.post('/users/:id/set-password', protect, authorizeRoles('super_admin', 'village_admin'), adminSetUserPassword);

// Super admin exclusive routes
router.post('/village-admin', protect, authorizeRoles('super_admin'), createVillageAdmin);
router.patch('/users/:id/role', protect, authorizeRoles('super_admin'), updateUserRole);

export default router;
