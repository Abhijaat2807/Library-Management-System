import express from 'express';
import { register, login, createLibrarian, deleteLibrarian } from '../controllers/authController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.post('/librarian', authenticateToken, authorizeRoles('admin'), createLibrarian);
router.delete('/librarian/delete/:id', authenticateToken, authorizeRoles('admin'), deleteLibrarian);
export default router;