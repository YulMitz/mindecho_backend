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
            firstName,
            lastName,
            nickname,
            avatar,
            dateOfBirth,
            gender,
            educationLevel,
            emergencyContactName,
            emergencyContactPhone,
            supportContactName,
            supportContactInfo,
            familyContactName,
            familyContactInfo,
        } = req.body;

        // Build update data object only with provided fields
        const updateData = {};
        if (email !== undefined) updateData.email = email;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (nickname !== undefined) updateData.nickname = nickname;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
        if (gender !== undefined) updateData.gender = gender;
        if (educationLevel !== undefined) updateData.educationLevel = educationLevel;
        if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName;
        if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone;
        if (supportContactName !== undefined) updateData.supportContactName = supportContactName;
        if (supportContactInfo !== undefined) updateData.supportContactInfo = supportContactInfo;
        if (familyContactName !== undefined) updateData.familyContactName = familyContactName;
        if (familyContactInfo !== undefined) updateData.familyContactInfo = familyContactInfo;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: 'Nothing to update. Provide at least one field to update.',
            });
        }

        const updatedUser = await UserService.updateUser(req.user.id, updateData);

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
