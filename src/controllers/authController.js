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
            emergencyContacts,
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

        const contactList = Array.isArray(emergencyContacts) ? emergencyContacts : [];
        if (contactList.length < 1 || contactList.length > 3) {
            return res.status(400).json({
                message: 'Emergency contacts must be between 1 and 3.',
            });
        }

        for (const contact of contactList) {
            const hasName = typeof contact?.name === 'string' && contact.name.trim().length > 0;
            const hasRelation = typeof contact?.relation === 'string' && contact.relation.trim().length > 0;
            const hasContactInfo = typeof contact?.contactInfo === 'string' && contact.contactInfo.trim().length > 0;
            if (!hasName || !hasRelation || !hasContactInfo) {
                return res.status(400).json({
                    message: 'Each emergency contact must include name, relation, and contactInfo.',
                });
            }
        }

        const firstEmergency = contactList[0];
        const normalizeOptional = (value, fallback = '') => {
            if (value === null || value === undefined || value === '') {
                return fallback;
            }
            return value;
        };

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
            emergencyContactName: firstEmergency?.name || null,
            emergencyContactPhone: firstEmergency?.contactInfo || null,
            emergencyContacts: contactList.map((contact, index) => ({
                name: contact.name.trim(),
                relation: contact.relation.trim(),
                contactInfo: contact.contactInfo.trim(),
                sortOrder: index + 1,
            })),
            supportContactName: normalizeOptional(supportContactName, firstEmergency?.name || ''),
            supportContactInfo: normalizeOptional(supportContactInfo, firstEmergency?.contactInfo || ''),
            familyContactName: normalizeOptional(familyContactName),
            familyContactInfo: normalizeOptional(familyContactInfo),
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
            success: true,
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
