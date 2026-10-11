import { Router } from 'express';
import {
    getVillages,
    getVillageDetails,
    getVillageStats,
    recalculateStats,
    getVillageAtaks,
    createVillage,
    updateVillage,
    deleteVillage
} from '../controllers/villageController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getVillages);
router.get('/:slugOrId', getVillageDetails);
router.get('/:slugOrId/stats', getVillageStats);
router.get('/:slugOrId/ataks', getVillageAtaks);

router.post('/:slugOrId/recalculate', protect, authorizeRoles('super_admin', 'village_admin'), recalculateStats);
router.post('/', protect, authorizeRoles('super_admin'), createVillage);
router.put('/:id', protect, authorizeRoles('super_admin', 'village_admin'), updateVillage);
router.delete('/:id', protect, authorizeRoles('super_admin'), deleteVillage);

export default router;
