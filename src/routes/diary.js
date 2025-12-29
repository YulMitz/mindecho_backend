import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    postDiaryEntry,
    updateDiaryEntry,
    getDiaryHistory,
    listDiaryEntries,
    getDiaryEntryById,
    updateDiaryEntryById,
    deleteDiaryEntryById,
} from '../controllers/diaryController.js';

const router = express.Router();

/*
   - Responsible for setting up routes for api services on the main page
*/
router.post('/', authenticate, postDiaryEntry);
router.get('/', authenticate, listDiaryEntries);

const warnLegacyDiaryRoute = (req, res, next) => {
    res.set('Deprecation', 'true');
    res.set(
        'Sunset',
        'Wed, 31 Dec 2025 23:59:59 GMT'
    );
    res.set(
        'Link',
        '</api/diary/:id>; rel="successor-version"'
    );
    next();
};

router.post('/updateEntry', authenticate, warnLegacyDiaryRoute, updateDiaryEntry);

// Allow both POST and GET for flexibility
router.post('/getHistory', authenticate, warnLegacyDiaryRoute, getDiaryHistory);
router.get('/getHistory', authenticate, warnLegacyDiaryRoute, getDiaryHistory);

router.get('/:id', authenticate, getDiaryEntryById);
router.patch('/:id', authenticate, updateDiaryEntryById);
router.delete('/:id', authenticate, deleteDiaryEntryById);

export default router;
