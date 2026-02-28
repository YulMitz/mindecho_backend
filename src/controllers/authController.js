import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserService } from '../services/userService.js';

// Short-lived access token (e.g. 15m)
const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// Long-lived refresh token (e.g. 7d) — signed with a separate secret
const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE,
    });
};

// 1-1: Only email + password required. All other fields are optional.
// 1-2: Returns 409 (not 400) on duplicate email.
// 1-3: Accepts dataAnalysisConsent boolean.
export const register = async (req, res) => {
    try {
        const {
            email,
            password,
            name,
            nickname,
            birthYear,
            birthMonth,
            gender,
            educationLevel,
            dataAnalysisConsent,
        } = req.body;

        // 1-2: Uniqueness check — 409 Conflict on duplicate email
        const existingUser = await UserService.findByEmail(email);
        if (existingUser) {
            return res
                .status(409)
                .json({ message: 'User already exists with this email' });
        }

        const uuid = crypto.randomUUID();

        const user = await UserService.createUser({
            userId: uuid,
            email,
            password,
            name: name || null,
            nickname: nickname || null,
            birthYear: birthYear || null,
            birthMonth: birthMonth || null,
            gender: gender || 'unknown',
            educationLevel: educationLevel || 0,
            dataAnalysisConsent: dataAnalysisConsent ?? false,
        });

        res.status(201).json({
            message: 'User registered successfully',
            user,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 1-4: Login now issues both an accessToken and a refreshToken.
// The refreshToken is persisted in the DB so it can be invalidated on logout.
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await UserService.findByEmail(email);
        if (!user) {
            return res
                .status(401)
                .json({ message: 'Invalid credentials, user does not exist.' });
        }

        const isMatch = await UserService.comparePassword(password, user.password);
        if (!isMatch) {
            return res
                .status(401)
                .json({ message: 'Invalid credentials, wrong password.' });
        }

        await UserService.updateLastLogin(user.id);

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Persist refresh token — expiry matches JWT_REFRESH_EXPIRE (7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await UserService.createRefreshToken(user.id, refreshToken, expiresAt);

        res.json({
            message: 'Login successful',
            success: true,
            accessToken,
            refreshToken,
            userData: {
                userId: user.userId,
                email: user.email,
                name: user.name,
                nickname: user.nickname,
                birthYear: user.birthYear,
                birthMonth: user.birthMonth,
                dataAnalysisConsent: user.dataAnalysisConsent,
                gender: user.gender,
                educationLevel: user.educationLevel,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 1-4: Exchange a valid refresh token for a new access token.
export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token required.' });
        }

        // Verify JWT signature and expiry first
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({ message: 'Refresh token is invalid or expired.' });
        }

        // Then confirm it still exists in DB (i.e. not logged out)
        const stored = await UserService.findRefreshToken(refreshToken);
        if (!stored || stored.expiresAt < new Date()) {
            return res.status(401).json({ message: 'Refresh token has been revoked.' });
        }

        const newAccessToken = generateAccessToken(decoded.id);
        res.json({ accessToken: newAccessToken });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 1-4: Invalidate the refresh token — client should discard both tokens after this.
// The short-lived access token expires on its own.
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            // deleteMany won't throw if token is already gone
            await UserService.deleteRefreshToken(refreshToken);
        }
        res.json({ message: 'Logout successful.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default { register, login, refresh, logout };
