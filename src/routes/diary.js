import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    postDiaryEntry,
    updateDiaryEntry,
    getDiaryHistory,
} from '../controllers/diaryController.js';

const router = express.Router();

/*
   - Responsible for setting up routes for api services on the main page
*/
router.post('/', authenticate, postDiaryEntry);

router.post('/updateEntry', authenticate, updateDiaryEntry);

// Allow both POST and GET for flexibility
router.post('/getHistory', authenticate, getDiaryHistory);
router.get('/getHistory', authenticate, getDiaryHistory);

export default router;
