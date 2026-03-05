import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { UserService } from '../services/userService.js';

const router = express.Router();

router.get('/profile', authenticate, async (req, res) => {
    try {
        const continuousLoginDays = UserService.calculateContinuousLoginDays(req.user.lastLoginAt);

        res.json({
            user: {
                ...req.user,
                continuousLoginDays,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.patch('/profile', authenticate, async (req, res) => {
    try {
        const {
            email,
            name,
            nickname,
            avatar,
            birthYear,
            birthMonth,
            gender,
            educationLevel,
        } = req.body;

        // Build update data object only with provided fields
        const updateData = {};
        if (email !== undefined) updateData.email = email;
        if (name !== undefined) updateData.name = name;
        if (nickname !== undefined) updateData.nickname = nickname;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (birthYear !== undefined) updateData.birthYear = birthYear;
        if (birthMonth !== undefined) updateData.birthMonth = birthMonth;
        if (gender !== undefined) updateData.gender = gender;
        if (educationLevel !== undefined) updateData.educationLevel = educationLevel;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: 'Nothing to update. Provide at least one field to update.',
            });
        }

        const updatedUser = await UserService.updateUser(req.user.id, updateData);
        await UserService.recalculateProgress(req.user.id);

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Upsert a single emergency contact by sortOrder (1–3)
router.put('/profile/emergency-contacts', authenticate, async (req, res) => {
    try {
        const { sortOrder, name, relation, contactInfo } = req.body;

        if (![1, 2, 3].includes(sortOrder)) {
            return res.status(400).json({ message: 'sortOrder must be 1, 2, or 3.' });
        }

        const contact = await UserService.upsertEmergencyContact(req.user.id, {
            sortOrder,
            name,
            relation,
            contactInfo,
        });
        await UserService.recalculateProgress(req.user.id);

        res.status(200).json({ message: 'Emergency contact saved.', contact });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a single emergency contact by sortOrder
router.delete('/profile/emergency-contacts/:sortOrder', authenticate, async (req, res) => {
    try {
        const sortOrder = parseInt(req.params.sortOrder, 10);

        if (![1, 2, 3].includes(sortOrder)) {
            return res.status(400).json({ message: 'sortOrder must be 1, 2, or 3.' });
        }

        await UserService.deleteEmergencyContact(req.user.id, sortOrder);
        await UserService.recalculateProgress(req.user.id);

        res.status(200).json({ message: 'Emergency contact deleted.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
