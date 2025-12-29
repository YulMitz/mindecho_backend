import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { UserService } from '../services/userService.js';

const router = express.Router();

router.get('/profile', authenticate, async (req, res) => {
    try {
        res.json({
            user: req.user,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.patch('/profile', authenticate, async (req, res) => {
    try {
        const { user_id, userId, email, firstName, lastName } = req.body;
        const resolvedUserId = userId || user_id;

        if (!resolvedUserId) {
            return res.status(400).json({
                message: 'Missing user_id.',
            });
        }

        if (!email && !firstName && !lastName) {
            return res.status(400).json({
                message: 'Nothing to update. Provide email, firstName, or lastName.',
            });
        }

        const user = await UserService.findByUserId(resolvedUserId);
        if (!user) {
            return res.status(400).json({
                message: 'User not found. Please provide a valid user_id.',
            });
        }

        const updatedUser = await UserService.updateUser(user.id, {
            ...(email ? { email } : {}),
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
        });

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
