import BookIssue from '../models/bookIssue.js';
import BookRequest from '../models/bookRequest.js';
import Book from '../models/Book.js';
import User from '../models/User.js';

//@desc Issue book to user (Librarian/Admin only)
export const issueBook = async (req, res) => {
  try {
    const { bookRequestId } = req.body;
    const librarianId = req.user._id;

    
    const bookRequest = await BookRequest.findById(bookRequestId)
      .populate('user book');

    if (!bookRequest) {
      return res.status(404).json({ message: 'Book request not found' });
    }

    if (bookRequest.status !== 'approved') {
      return res.status(400).json({ message: 'Book request is not approved' });
    }

    
    const existingIssue = await BookIssue.findOne({ bookRequest: bookRequestId });
    if (existingIssue) {
      return res.status(400).json({ message: 'Book already issued for this request' });
    }

    
    if (bookRequest.book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No copies available' });
    }

    
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + bookRequest.requestedDuration);

    
    const bookIssue = new BookIssue({
      user: bookRequest.user._id,
      book: bookRequest.book._id,
      bookRequest: bookRequestId,
      issueDate,
      dueDate,
      finePerDay: bookRequest.finePerDay,
      issuedBy: librarianId
    });

    await bookIssue.save();

    
    await Book.findByIdAndUpdate(
      bookRequest.book._id,
      { $inc: { availableCopies: -1 } }
    );

    
    await bookIssue.populate([
      { path: 'user', select: 'email' },
      { path: 'book', select: 'title author genre' },
      { path: 'issuedBy', select: 'email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Book issued successfully',
      bookIssue
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Return book (Librarian/Admin only)
export const returnBook = async (req, res) => {
  try {
    const { id } = req.params; // BookIssue ID
    const librarianId = req.user._id;

    const bookIssue = await BookIssue.findById(id)
      .populate('user book');

    if (!bookIssue) {
      return res.status(404).json({ message: 'Book issue record not found' });
    }

    if (bookIssue.status === 'returned') {
      return res.status(400).json({ message: 'Book already returned' });
    }

    const returnDate = new Date();
    let calculatedFine = 0;

    
    if (returnDate > bookIssue.dueDate) {
      const daysLate = Math.ceil((returnDate - bookIssue.dueDate) / (1000 * 60 * 60 * 24));
      calculatedFine = daysLate * bookIssue.finePerDay;
    }

    
    bookIssue.returnDate = returnDate;
    bookIssue.calculatedFine = calculatedFine;
    bookIssue.status = 'returned';
    bookIssue.returnedBy = librarianId;

    await bookIssue.save();

    
    if (calculatedFine > 0) {
      await User.findByIdAndUpdate(
        bookIssue.user._id,
        { $inc: { pendingFine: calculatedFine } }
      );
    }

    
    await Book.findByIdAndUpdate(
      bookIssue.book._id,
      { $inc: { availableCopies: 1 } }
    );

    res.json({
      success: true,
      message: 'Book returned successfully',
      bookIssue: {
        ...bookIssue.toObject(),
        daysLate: calculatedFine > 0 ? Math.ceil((returnDate - bookIssue.dueDate) / (1000 * 60 * 60 * 24)) : 0,
        calculatedFine
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Get all currently issued books (Librarian/Admin)
export const getCurrentlyIssuedBooks = async (req, res) => {
  try {
    const issuedBooks = await BookIssue.find({ status: 'issued' })
      .populate('user', 'email')
      .populate('book', 'title author genre')
      .populate('issuedBy', 'email')
      .sort({ issueDate: -1 });

    res.json({
      success: true,
      count: issuedBooks.length,
      issuedBooks
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Get overdue books (Librarian/Admin)
export const getOverdueBooks = async (req, res) => {
  try {
    const currentDate = new Date();
    
    const overdueBooks = await BookIssue.find({
      status: 'issued',
      dueDate: { $lt: currentDate }
    })
      .populate('user', 'email pendingFine')
      .populate('book', 'title author genre')
      .sort({ dueDate: 1 });

    
    const overdueWithDetails = overdueBooks.map(issue => ({
      ...issue.toObject(),
      daysOverdue: Math.ceil((currentDate - issue.dueDate) / (1000 * 60 * 60 * 24)),
      projectedFine: Math.ceil((currentDate - issue.dueDate) / (1000 * 60 * 60 * 24)) * issue.finePerDay
    }));

    res.json({
      success: true,
      count: overdueWithDetails.length,
      overdueBooks: overdueWithDetails
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Get user's currently issued books (User)
export const getUserIssuedBooks = async (req, res) => {
  try {
    const userId = req.user._id;

    const issuedBooks = await BookIssue.find({ 
      user: userId, 
      status: 'issued' 
    })
      .populate('book', 'title author genre')
      .sort({ issueDate: -1 });

    const currentDate = new Date();
    const booksWithStatus = issuedBooks.map(issue => ({
      ...issue.toObject(),
      isOverdue: currentDate > issue.dueDate,
      daysUntilDue: Math.ceil((issue.dueDate - currentDate) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      success: true,
      count: booksWithStatus.length,
      issuedBooks: booksWithStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Get user's book history (User)
export const getUserBookHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const bookHistory = await BookIssue.find({ user: userId })
      .populate('book', 'title author genre')
      .sort({ issueDate: -1 });

    res.json({
      success: true,
      count: bookHistory.length,
      bookHistory
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Pay pending fine (User)
export const payFine = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.pendingFine === 0) {
      return res.status(400).json({ message: 'No pending fine to pay' });
    }

    if (amount <= 0 || amount > user.pendingFine) {
      return res.status(400).json({ 
        message: `Invalid amount. Pending fine is $${user.pendingFine}` 
      });
    }

    // Update user's pending fine
    user.pendingFine -= amount;
    await user.save();

    res.json({
      success: true,
      message: 'Fine paid successfully',
      paidAmount: amount,
      remainingFine: user.pendingFine
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};