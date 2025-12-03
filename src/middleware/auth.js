import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService.js';

export const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res
                .status(401)
                .json({ message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await UserService.findById(decoded.id);

        if (!user) {
            return res
                .status(401)
                .json({ message: 'Invalid token or user not found.' });
        }

        if (!user.isActive) {
            return res
                .status(401)
                .json({ message: 'User is inactive.' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
};

export default authenticate;
