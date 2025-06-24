import express from 'express';
import {
  createBookRequest,
  getAllRequests,
  approveBookRequest,
  rejectBookRequest,
  getUserRequests,
  getUserRejectedRequests,
  deleteRequest
} from '../controllers/bookRequestController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// User routes
router.post('/', authenticateToken, authorizeRoles('user'), createBookRequest);
router.get('/my-requests', authenticateToken, authorizeRoles('user'), getUserRequests);
router.get('/my-rejected', authenticateToken, authorizeRoles('user'), getUserRejectedRequests);

// Librarian/Admin routes
router.get('/pending', authenticateToken, authorizeRoles('admin', 'librarian'), getAllRequests);
router.put('/:id/approve', authenticateToken, authorizeRoles('admin', 'librarian'), approveBookRequest);
router.put('/:id/reject', authenticateToken, authorizeRoles('admin', 'librarian'), rejectBookRequest);
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'librarian'), deleteRequest);

export default router;