import express from 'express';
import { register, login, logout, refresh } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);  // no auth middleware — client sends refreshToken in body
router.post('/logout', logout);    // no auth middleware — client sends refreshToken in body

export default router;
