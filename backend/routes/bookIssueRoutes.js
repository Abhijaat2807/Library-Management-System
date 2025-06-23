import express from 'express';
import {
  issueBook,
  returnBook,
  getCurrentlyIssuedBooks,
  getOverdueBooks,
  getUserIssuedBooks,
  getUserBookHistory,
  getUserFines,
  getAllUserFines,
  payFine
} from '../controllers/bookIssueController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Librarian/Admin routes
router.post('/issue', authenticateToken, authorizeRoles('admin', 'librarian'), issueBook);
router.put('/:id/return', authenticateToken, authorizeRoles('admin', 'librarian'), returnBook);
router.get('/currently-issued', authenticateToken, authorizeRoles('admin', 'librarian'), getCurrentlyIssuedBooks);
router.get('/overdue', authenticateToken, authorizeRoles('admin', 'librarian'), getOverdueBooks);
router.get('/all-fines', authenticateToken, authorizeRoles('admin', 'librarian'), getAllUserFines);

// User routes
router.get('/my-books', authenticateToken, authorizeRoles('user'), getUserIssuedBooks);
router.get('/my-history', authenticateToken, authorizeRoles('user'), getUserBookHistory);
router.post('/pay-fine', authenticateToken, authorizeRoles('user'), payFine);
router.get('/my-fines', authenticateToken, getUserFines);

export default router;