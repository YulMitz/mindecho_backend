import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserService } from '../services/userService.js';

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
            firstName,
            lastName,
            nickname,
            dateOfBirth,
            gender,
            educationLevel,
            supportContactName,
            supportContactInfo,
            familyContactName,
            familyContactInfo
        } = req.body;

        // Check if user already exists
        const existingUser = await UserService.findByEmail(email);
        if (existingUser) {
            return res
                .status(400)
                .json({ message: 'User already exists with this email' });
        }

        // Generate an unique user ID
        const uuid = crypto.randomUUID();

        // Create new user
        const user = await UserService.createUser({
            userId: uuid,
            email,
            password,
            firstName,
            lastName,
            nickname,
            dateOfBirth: new Date(dateOfBirth),
            gender,
            educationLevel,
            supportContactName,
            supportContactInfo,
            familyContactName,
            familyContactInfo,
        });

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
            token,
            userData: {
                userId: user.userId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                nickname: user.nickname,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                educationLevel: user.educationLevel,
                emergencyContactName: user.emergencyContactName,
                emergencyContactPhone: user.emergencyContactPhone,
                supportContactName: user.supportContactName,
                supportContactInfo: user.supportContactInfo,
                familyContactName: user.familyContactName,
                familyContactInfo: user.familyContactInfo,
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default {
    register,
    login,
};
