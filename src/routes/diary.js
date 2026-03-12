import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  postDiaryEntry,
  updateDiaryEntry,
  getDiaryHistory,
  listDiaryEntries,
  deleteDiaryEntry,
  analyzeDiaries,
} from '../controllers/diaryController.js';

const router = express.Router();

/*
   - Responsible for setting up routes for api services on the main page
*/
router.post('/', authenticate, postDiaryEntry);
router.get('/', authenticate, listDiaryEntries);

// Analysis endpoint
router.post('/analysis', authenticate, analyzeDiaries);

// Update diary
router.post('/updateEntry', authenticate, updateDiaryEntry);

// Allow both POST and GET for flexibility
router.post('/getHistory', authenticate, getDiaryHistory);
router.get('/getHistory', authenticate, getDiaryHistory);

// Delete diary entry
router.delete('/:entryId', authenticate, deleteDiaryEntry);

export default router;
