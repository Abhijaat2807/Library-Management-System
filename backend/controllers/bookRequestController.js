import BookRequest from '../models/bookRequest.js';
import Book from '../models/Book.js';
import User from '../models/User.js';

//@desc User creates a book request
export const createBookRequest = async (req, res) => {
  try {
    const { bookId, requestedDuration } = req.body;
    const userId = req.user._id;

    // Check if user has pending fines
    const user = await User.findById(userId);
    if (user.pendingFine > 0) {
      return res.status(400).json({ 
        message: `Cannot request book. You have pending fine of $${user.pendingFine}` 
      });
    }

    // Check if book exists and is available
    const book = await Book.findById(bookId);
    if (!book || book.isDeleted) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No copies available for this book' });
    }

    // Check if user already has a pending request for this book
    const existingRequest = await BookRequest.findOne({
      user: userId,
      book: bookId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'You already have a pending request for this book' 
      });
    }

    // Create book request
    const bookRequest = new BookRequest({
      user: userId,
      book: bookId,
      requestedDuration
    });

    await bookRequest.save();

    // Populate book details for response
    await bookRequest.populate('book', 'title author genre');

    res.status(201).json({
      success: true,
      message: 'Book request created successfully',
      bookRequest
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Get all pending requests (Librarian/Admin only)
export const getAllRequests = async (req, res) => {
  try {
    // Remove the status filter to get ALL requests, not just pending
    const requests = await BookRequest.find({}) // Remove { status: 'pending' }
      .populate('user', 'email')
      .populate('book', 'title author genre totalCopies availableCopies')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Approve book request (Librarian/Admin only)
export const approveBookRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { finePerDay = 0 } = req.body;
    const librarianId = req.user._id;

    const bookRequest = await BookRequest.findById(id).populate('book user');
    
    if (!bookRequest) {
      return res.status(404).json({ message: 'Book request not found' });
    }

    if (bookRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    // Check if user still has pending fines
    if (bookRequest.user.pendingFine > 0) {
      return res.status(400).json({ 
        message: `Cannot approve. User has pending fine of $${bookRequest.user.pendingFine}` 
      });
    }

    // Check if book is still available
    if (bookRequest.book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No copies available for this book' });
    }

    // Update request status
    bookRequest.status = 'approved';
    bookRequest.finePerDay = finePerDay;
    bookRequest.approvedBy = librarianId;
    bookRequest.approvedAt = new Date();

    await bookRequest.save();

    res.json({
      success: true,
      message: 'Book request approved successfully',
      bookRequest
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Reject book request (Librarian/Admin only)
export const rejectBookRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const bookRequest = await BookRequest.findById(id);
    
    if (!bookRequest) {
      return res.status(404).json({ message: 'Book request not found' });
    }

    if (bookRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    bookRequest.status = 'rejected';
    bookRequest.rejectionReason = rejectionReason;

    await bookRequest.save();

    res.json({
      success: true,
      message: 'Book request rejected successfully',
      bookRequest
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Get user's own requests (User only)
export const getUserRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query; // Optional filter by status

    let filter = { user: userId };
    if (status) {
      filter.status = status;
    }

    const requests = await BookRequest.find(filter)
      .populate('book', 'title author genre')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Get rejected requests for user
export const getUserRejectedRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const rejectedRequests = await BookRequest.find({ 
      user: userId, 
      status: 'rejected' 
    })
      .populate('book', 'title author genre')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: rejectedRequests.length,
      rejectedRequests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};