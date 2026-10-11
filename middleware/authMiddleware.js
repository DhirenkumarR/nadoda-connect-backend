import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_nadoda_connect_jwt_key';

// Protect middleware: validates JWT token or x-user-id header
export const protect = async (req, res, next) => {
    try {
        let token = null;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await User.findById(decoded.id).populate('assignedVillageId');
                if (user && user.isActive) {
                    req.user = user;
                    return next();
                }
            } catch (err) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized: Invalid or expired token'
                });
            }
        }

        // Fallback for x-user-id header
        const userId = req.headers['x-user-id'];
        if (userId) {
            const user = await User.findById(userId).populate('assignedVillageId');
            if (user && user.isActive) {
                req.user = user;
                return next();
            }
        }

        return res.status(401).json({
            success: false,
            message: 'Not authorized: Please login to access this resource'
        });
    } catch (error) {
        next(error);
    }
};

// Role-based authorization middleware
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Role (${req.user?.role || 'guest'}) is not authorized to access this resource`
            });
        }
        next();
    };
};
