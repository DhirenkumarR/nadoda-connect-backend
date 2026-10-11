import { Router } from 'express';
import authRoutes from './authRoutes.js';
import villageRoutes from './villageRoutes.js';
import familyRoutes from './familyRoutes.js';
import memberRoutes from './memberRoutes.js';
import approvalRoutes from './approvalRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/villages', villageRoutes);
router.use('/families', familyRoutes);
router.use('/members', memberRoutes);
router.use('/approvals', approvalRoutes);

export default router;
