import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserService } from '../services/userService.js';
import prisma from '../config/database.js';

const generateToken = (id) => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};


export const register = async (req, res) => {
    try {
        const {
            email,
            password,
            name,
            nickname,
            dateOfBirth,
            gender,
            educationLevel,
            dataAnalysisConsent,
            emergencyContacts,
            mostImportantReasons,
        } = req.body;

        // Check if user already exists
        const existingUser = await UserService.findByEmail(email);
        if (existingUser) {
            return res
                .status(400)
                .json({ message: 'User already exists with this email' });
        }

        if (Array.isArray(emergencyContacts) && emergencyContacts.length > 3) {
            return res.status(400).json({
                message: 'Emergency contacts can be at most 3.',
            });
        }

        const uuid = crypto.randomUUID();

        const normalizedEmergencyContacts = Array.isArray(emergencyContacts)
            ? emergencyContacts.slice(0, 3).map((contact, index) => ({
                  ...contact,
                  sortOrder: index + 1,
              }))
            : undefined;

        const user = await UserService.createUser({
            userId: uuid,
            email,
            password,
            name,
            nickname: nickname || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender: gender || 'unknown',
            educationLevel: educationLevel || 0,
            dataAnalysisConsent: dataAnalysisConsent ?? false,
            emergencyContacts: normalizedEmergencyContacts,
        });

        const reasonContent =
            typeof mostImportantReasons === 'string'
                ? mostImportantReasons.trim()
                : '';
        if (reasonContent) {
            await prisma.reason.create({
                data: {
                    userId: user.id,
                    title: '最重要的一段話',
                    content: reasonContent,
                },
            });
        }

        res.status(201).json({
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and include password
        const user = await UserService.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials, user does not exists.' });
        }

        // Check password
        const isMatch = await UserService.comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials, Wrong password!' });
        }

        // Update last login timestamp
        await UserService.updateLastLogin(user.id);

        // Generate token
        const token = generateToken(user.id);
        res.json({
            message: 'Login successful',
            success: true,
            token,
            userData: {
                userId: user.userId,
                email: user.email,
                name: user.name,
                nickname: user.nickname,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                educationLevel: user.educationLevel,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { name, email, newPassword } = req.body || {};

        // Basic field validation
        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof newPassword !== 'string' ||
            !name.trim() ||
            !email.trim() ||
            !newPassword
        ) {
            return res.status(400).json({
                success: false,
                message: '缺少必要欄位',
                code: 'INVALID_REQUEST',
            });
        }

        // Minimal password policy — keep aligned with frontend rule (>=8)
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: '密碼長度需至少 8 個字元',
                code: 'WEAK_PASSWORD',
            });
        }

        const user = await UserService.findByEmail(email.trim());

        // Verify identity by matching name (trimmed, exact match).
        // We deliberately return the SAME response for "user not found" and
        // "name mismatch" so the endpoint cannot be abused for email enumeration.
        if (!user || user.name !== name.trim()) {
            return res.status(400).json({
                success: false,
                message: '姓名或電子郵件不正確',
                code: 'RESET_FAILED',
            });
        }

        await UserService.updateUser(user.id, { password: newPassword });

        return res.status(200).json({
            success: true,
            message: '密碼已更新',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || '伺服器發生錯誤',
            code: 'INTERNAL_ERROR',
        });
    }
};

export default {
    register,
    login,
    resetPassword,
};
