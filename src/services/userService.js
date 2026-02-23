import { PrismaClient } from '../../prisma-client/index.js';
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Main user service class
export class UserService {
    // Create a new user with password hashing
    static async createUser(userData) {
        const { password, emergencyContacts, ...otherData } = userData;
        const hashedPassword = await bcrypt.hash(password, 12);
        
        return await prisma.user.create({
            data: { // data determines what to insert/update the into database
                ...otherData,
                password: hashedPassword,
                emergencyContacts: Array.isArray(emergencyContacts) && emergencyContacts.length > 0
                    ? { create: emergencyContacts }
                    : undefined,
            },
            select: { // selection determines what to return from the database
                id: true,
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
                nickname: true,
                avatar: true,
                dateOfBirth: true,
                gender: true,
                educationLevel: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
                supportContactName: true,
                supportContactInfo: true,
                familyContactName: true,
                familyContactInfo: true,
                isActive: true,
                lastLoginAt: true,
                preferences: true,
                emergencyContacts: {
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        relation: true,
                        contactInfo: true,
                        sortOrder: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                createdAt: true,
                updatedAt: true,
                // Exclude password from selections
            }
        });
    }

    // Find user by email (for login)
    static async findByEmail(email) {
        return await prisma.user.findUnique({
            where: { email }, // where to sepecify retrieve condition
            // Include password for autithencation
        });
    }

    // Find user by user ID
    static async findByUserId(userId) {
        return await prisma.user.findUnique({
            where: { userId },
            select: { // selection determines what to return from the database
                id: true,
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
                nickname: true,
                avatar: true,
                dateOfBirth: true,
                gender: true,
                educationLevel: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
                supportContactName: true,
                supportContactInfo: true,
                familyContactName: true,
                familyContactInfo: true,
                isActive: true,
                lastLoginAt: true,
                preferences: true,
                emergencyContacts: {
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        relation: true,
                        contactInfo: true,
                        sortOrder: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                createdAt: true,
                updatedAt: true,
            }
        });
    }

    // Find user by ID (for protected routes)
    static async findById(id) {
        return await prisma.user.findUnique({
            where: { id },
            select: { // selection determines what to return from the database
                id: true,
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
                nickname: true,
                avatar: true,
                dateOfBirth: true,
                gender: true,
                educationLevel: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
                supportContactName: true,
                supportContactInfo: true,
                familyContactName: true,
                familyContactInfo: true,
                isActive: true,
                lastLoginAt: true,
                preferences: true,
                emergencyContacts: {
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        relation: true,
                        contactInfo: true,
                        sortOrder: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                createdAt: true,
                updatedAt: true,
            }
        });
    }

    // Compare password
    static async comparePassword(candidatePassword, hashedPassword) {
        return await bcrypt.compare(candidatePassword, hashedPassword);
    }

    // Update user
    static async updateUser(id, updateData) {
        const { password, ...otherData} = updateData;
        
        const data = { ...otherData }
        if (password) {
            data.password = await bcrypt.hash(password, 12);
        }

        return await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
                nickname: true,
                avatar: true,
                dateOfBirth: true,
                gender: true,
                educationLevel: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
                supportContactName: true,
                supportContactInfo: true,
                familyContactName: true,
                familyContactInfo: true,
                isActive: true,
                lastLoginAt: true,
                preferences: true,
                emergencyContacts: {
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        relation: true,
                        contactInfo: true,
                        sortOrder: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                updatedAt: true,
            }
        });
    }

    // Update last login timestamp
    static async updateLastLogin(id) {
        return await prisma.user.update({
            where: { id },
            data: { lastLoginAt: new Date() },
        });
    }

    // Calculate continuous login days
    static calculateContinuousLoginDays(lastLoginAt) {
        if (!lastLoginAt) return 0;

        const now = new Date();
        const lastLogin = new Date(lastLoginAt);

        // Reset time to midnight for comparison
        now.setHours(0, 0, 0, 0);
        lastLogin.setHours(0, 0, 0, 0);

        const diffTime = now - lastLogin;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // If last login was today or yesterday, count as continuous
        // If it was more than 1 day ago, the streak is broken
        return diffDays <= 1 ? 1 : 0;
    }

    // Delete user
    static async deleteUser(id) {
        return await prisma.user.delete({
            where: { id }
        });
    }
}
