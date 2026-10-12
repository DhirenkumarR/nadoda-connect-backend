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
    getEmailStatus
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

// Super admin routes
router.post('/village-admin', protect, authorizeRoles('super_admin'), createVillageAdmin);
router.get('/users', protect, authorizeRoles('super_admin'), getUsers);
router.patch('/users/:id/role', protect, authorizeRoles('super_admin'), updateUserRole);

export default router;
