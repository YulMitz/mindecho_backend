import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js'; // About to be deprecated
import { UserService } from '../services/userService.js';

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

export const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, dateOfBirth } = req.body;

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
            dateOfBirth: new Date(dateOfBirth),
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

        // Generate token
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            token,
            userData: {
                userId: user.userId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                dateOfBirth: user.dateOfBirth
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
