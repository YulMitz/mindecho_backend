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

export default {
    register,
    login,
};
