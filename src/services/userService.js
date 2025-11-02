import { PrismaClient } from '../../prisma-client/index.js';
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Main user service class
export class UserService {
    // Create a new user with password hashing
    static async createUser(userData) {
        const { password, ...otherData } = userData;
        const hashedPassword = await bcrypt.hash(password, 12);
        
        return await prisma.user.create({
            data: { // data determines what to insert/update the into database
                ...otherData,
                password: hashedPassword,
            },
            select: { // selection determines what to return from the database
                id: true,
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                isActive: true,
                preferences: true,
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

    // Find user by ID (for protected routes)
    static async findById(id) {
        return await prisma.user.findUnique({
            where: { email },
            select: { // selection determines what to return from the database
                id: true,
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                isActive: true,
                preferences: true,
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
                dateOfBirth: true,
                isActive: true,
                preferences: true,
                updatedAt: true,
            }
        });
    }

    // Delete user
    static async deleteUser(id) {
        return await prisma.user.delete({
            where: { id }
        });
    }
}
