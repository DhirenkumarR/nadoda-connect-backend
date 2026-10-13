import { Router } from 'express';
import authRoutes from './authRoutes.js';
import villageRoutes from './villageRoutes.js';
import familyRoutes from './familyRoutes.js';
import memberRoutes from './memberRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/villages', villageRoutes);
router.use('/families', familyRoutes);
router.use('/members', memberRoutes);

export default router;
