import express from 'express';
import authenticate from '../middleware/auth.js';
import {
    createReason,
    getReasons,
    getReasonById,
    updateReason,
    deleteReason,
} from '../controllers/reasonController.js';

const router = express.Router();

router.post('/', authenticate, createReason);
router.get('/', authenticate, getReasons);
router.get('/:id', authenticate, getReasonById);
router.patch('/:id', authenticate, updateReason);
router.delete('/:id', authenticate, deleteReason);

export default router;
