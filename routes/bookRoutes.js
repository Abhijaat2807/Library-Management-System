import express from 'express';
import { 
  getAllBooks,
  searchBooks, 
  addBook, 
  editBook, 
  deleteBook, 
  getBookById 
} from '../controllers/bookController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Public routes (accessible to all users)
router.get('/', getAllBooks);              // Get all books
router.get('/search', searchBooks);        // Search/filter books
router.get('/:id', getBookById);           // Get single book

// Protected routes (Admin and Librarian only)
router.post('/', authenticateToken, authorizeRoles('admin', 'librarian'), addBook);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'librarian'), editBook);
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'librarian'), deleteBook);

export default router;