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
    console.log('=== RETURN BOOK CONTROLLER ===');
    console.log('Issue ID:', req.params.id);
    console.log('User:', req.user);

    const issueId = req.params.id;

    // Find the book issue
    const bookIssue = await BookIssue.findById(issueId)
      .populate('book', 'title author')
      .populate('user', 'email pendingFine') // Include pendingFine
      .populate('issuedBy', 'email');

    if (!bookIssue) {
      return res.status(404).json({ message: 'Book issue not found' });
    }

    if (bookIssue.status === 'returned') {
      return res.status(400).json({ message: 'Book is already returned' });
    }

    // Calculate fine if overdue
    const today = new Date();
    const dueDate = new Date(bookIssue.dueDate);
    let calculatedFine = 0;

    console.log('=== DATE COMPARISON ===');
    console.log('Today:', today);
    console.log('Due date:', dueDate);
    console.log('Is overdue?:', today > dueDate);
    console.log('Fine per day:', bookIssue.finePerDay);

    if (today > dueDate && bookIssue.finePerDay > 0) {
      const overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      calculatedFine = overdueDays * bookIssue.finePerDay;

      console.log('=== FINE CALCULATION ===');
      console.log('Overdue days:', overdueDays);
      console.log('Calculated fine:', calculatedFine);
    }

    // Update the book issue
    const updatedIssue = await BookIssue.findByIdAndUpdate(
      issueId,
      {
        status: 'returned',
        returnDate: today,
        calculatedFine: calculatedFine,
        finePaid: calculatedFine === 0,
        returnedBy: req.user.userId
      },
      { new: true }
    ).populate('book', 'title author')
      .populate('user', 'email pendingFine')
      .populate('issuedBy', 'email')
      .populate('returnedBy', 'email');

    // Update user's pending fine if there is a fine
    if (calculatedFine > 0) {
      console.log('=== UPDATING USER PENDING FINE ===');
      console.log('User current pending fine:', bookIssue.user.pendingFine);
      console.log('Adding fine:', calculatedFine);
      
      await User.findByIdAndUpdate(
        bookIssue.user._id,
        {
          $inc: { pendingFine: calculatedFine }
        }
      );
      
      console.log('User pending fine updated');
    }

    // Update book availability
    await Book.findByIdAndUpdate(bookIssue.book._id, {
      $inc: { availableCopies: 1 }
    });

    console.log('=== RETURN SUCCESS ===');
    console.log('Book returned successfully');
    console.log('Fine calculated and added to user account:', calculatedFine);

    const message = calculatedFine > 0 
      ? `Book returned successfully. Fine of $${calculatedFine.toFixed(2)} has been added to user's pending fine balance.`
      : 'Book returned successfully with no fine.';

    res.json({
      success: true,
      message: message,
      bookIssue: updatedIssue,
      fine: {
        amount: calculatedFine,
        status: calculatedFine > 0 ? 'pending' : 'none',
        paid: calculatedFine === 0
      }
    });

  } catch (error) {
    console.error('=== RETURN ERROR ===');
    console.error('Error returning book:', error);
    res.status(500).json({ 
      message: 'Server error while returning book', 
      error: error.message 
    });
  }
};

//@desc Get all currently issued books (Librarian/Admin)
export const getCurrentlyIssuedBooks = async (req, res) => {
  try {
    console.log('=== GET CURRENTLY ISSUED BOOKS ===');
    
    // Get both currently issued books AND returned books with unpaid fines
    const issuedBooks = await BookIssue.find({
      $or: [
        { status: 'issued' }, // Currently issued books
        { status: 'returned', calculatedFine: { $gt: 0 }, finePaid: false } // Returned books with unpaid fines
      ]
    })
    .populate('book', 'title author isbn')
    .populate('user', 'email name')
    .populate('issuedBy', 'email name')
    .populate('returnedBy', 'email name')
    .sort({ issueDate: -1 });

    console.log('Found issued books (including returned with fines):', issuedBooks.length);

    // Also get summary statistics
    const totalCurrentlyIssued = await BookIssue.countDocuments({ status: 'issued' });
    const totalOverdue = await BookIssue.countDocuments({
      status: 'issued',
      dueDate: { $lt: new Date() }
    });

    // Calculate total pending fines from database
    const pendingFinesResult = await BookIssue.aggregate([
      {
        $match: {
          $or: [
            // Current fines from overdue issued books
            { 
              status: 'issued', 
              dueDate: { $lt: new Date() },
              finePerDay: { $gt: 0 }
            },
            // Stored fines from returned books
            { 
              status: 'returned', 
              calculatedFine: { $gt: 0 }, 
              finePaid: false 
            }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalPendingFines: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'returned'] },
                '$calculatedFine', // Use stored fine for returned books
                {
                  $multiply: [
                    '$finePerDay',
                    {
                      $ceil: {
                        $divide: [
                          { $subtract: [new Date(), '$dueDate'] },
                          1000 * 60 * 60 * 24
                        ]
                      }
                    }
                  ]
                } // Calculate current fine for issued books
              ]
            }
          }
        }
      }
    ]);

    const totalPendingFines = pendingFinesResult.length > 0 ? pendingFinesResult[0].totalPendingFines : 0;

    console.log('=== STATISTICS ===');
    console.log('Total currently issued:', totalCurrentlyIssued);
    console.log('Total overdue:', totalOverdue);
    console.log('Total pending fines:', totalPendingFines);

    res.json({
      success: true,
      issuedBooks,
      statistics: {
        totalCurrentlyIssued,
        totalOverdue,
        totalPendingFines,
        totalReturnedWithFines: issuedBooks.filter(book => book.status === 'returned').length
      }
    });

  } catch (error) {
    console.error('Error fetching currently issued books:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
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

// @desc Get user's fines
// @route GET /api/book-issues/my-fines
// @access Private (User)
export const getUserFines = async (req, res) => {
  try {
    console.log('=== GET USER FINES ===');
    console.log('Full req.user object:', req.user);
    
    // Try both possible user ID fields
    const userId = req.user.userId || req.user._id || req.user.id;
    console.log('Using user ID:', userId);
    
    // Get user's current pending fine balance from User model
    const user = await User.findById(userId, 'email pendingFine');
    
    console.log('User found in database:', user);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ 
        success: false,
        message: 'User not found',
        triedUserId: userId,
        tokenData: req.user
      });
    }
    
    console.log('✅ User found - pending fine:', user.pendingFine);
    
    // Get all issues with fines for this user
    const userFines = await BookIssue.find({ 
      user: userId,
      calculatedFine: { $gt: 0 }
    })
    .populate('book', 'title author')
    .populate('issuedBy', 'email')
    .populate('returnedBy', 'email')
    .sort({ returnDate: -1 });

    console.log('Found fine records:', userFines.length);

    const totalPendingFines = userFines
      .filter(issue => !issue.finePaid)
      .reduce((total, issue) => total + issue.calculatedFine, 0);

    const totalPaidFines = userFines
      .filter(issue => issue.finePaid)
      .reduce((total, issue) => total + issue.calculatedFine, 0);

    console.log('Calculated pending fines from BookIssues:', totalPendingFines);
    console.log('User model pending fine:', user.pendingFine);

    res.json({
      success: true,
      user: {
        email: user.email,
        pendingFine: user.pendingFine
      },
      fines: userFines,
      summary: {
        totalPendingFines: user.pendingFine,
        calculatedPendingFines: totalPendingFines,
        totalPaidFines,
        totalFines: totalPendingFines + totalPaidFines,
        totalFineRecords: userFines.length
      }
    });
  } catch (error) {
    console.error('Error fetching user fines:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc Pay fine
// @route POST /api/book-issues/pay-fine
// @access Private (User)
export const payFine = async (req, res) => {
  try {
    console.log('=== PAY FINE ===');
    console.log('Full req.user object:', req.user);
    console.log('Request body:', req.body);
    
    // Try both possible user ID fields
    const userId = req.user.userId || req.user._id || req.user.id;
    console.log('Using user ID:', userId);
    
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Get user's current pending fine
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ 
        success: false,
        message: 'User not found',
        triedUserId: userId,
        tokenData: req.user
      });
    }

    console.log('Current user pending fine:', user.pendingFine);
    console.log('Payment amount:', amount);

    if (amount > user.pendingFine) {
      return res.status(400).json({ 
        message: `Payment amount ($${amount}) exceeds pending fine ($${user.pendingFine})` 
      });
    }

    // Update user's pending fine FIRST
    user.pendingFine -= amount;
    await user.save();

    console.log('New user pending fine after payment:', user.pendingFine);

    // Mark relevant BookIssue records as paid (starting with oldest unpaid fines)
    let remainingPayment = amount;
    const unpaidIssues = await BookIssue.find({
      user: userId,
      calculatedFine: { $gt: 0 },
      finePaid: false
    }).sort({ returnDate: 1 }); // Oldest first

    console.log('Found unpaid issues:', unpaidIssues.length);
    console.log('Unpaid issues:', unpaidIssues.map(issue => ({
      id: issue._id,
      book: issue.book,
      fine: issue.calculatedFine,
      finePaid: issue.finePaid
    })));

    const paidIssues = [];
    
    for (const issue of unpaidIssues) {
      if (remainingPayment <= 0) break;

      if (remainingPayment >= issue.calculatedFine) {
        // Pay this issue completely
        remainingPayment -= issue.calculatedFine;
        issue.finePaid = true;
        issue.paymentDate = new Date();
        await issue.save();
        paidIssues.push(issue);
        
        console.log(`✅ Fully paid issue ${issue._id}: $${issue.calculatedFine}`);
        console.log(`Remaining payment: $${remainingPayment}`);
      } else {
        // Partial payment scenario - shouldn't happen with current logic
        console.log(`⚠️ Partial payment scenario for issue ${issue._id}`);
        break;
      }
    }

    console.log('=== PAYMENT COMPLETE ===');
    console.log('Total issues marked as paid:', paidIssues.length);
    console.log('User new pending fine:', user.pendingFine);

    res.json({
      success: true,
      message: 'Fine paid successfully',
      amountPaid: amount,
      remainingFine: user.pendingFine,
      paidIssuesCount: paidIssues.length,
      paidIssues: paidIssues.map(issue => ({
        id: issue._id,
        book: issue.book,
        fine: issue.calculatedFine
      }))
    });
  } catch (error) {
    console.error('Error processing fine payment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc Get all user fines (Admin/Librarian)
// @route GET /api/book-issues/all-fines
// @access Private (Admin/Librarian)
export const getAllUserFines = async (req, res) => {
  try {
    console.log('=== GET ALL USER FINES (CORRECTED) ===');
    
    // Get ALL users and their stored pending fines (authoritative source)
    const allUsers = await User.find({}, 'email pendingFine');
    console.log('All users found:', allUsers.length);
    
    // Filter users who currently have pending fines > 0
    const usersWithPendingFines = allUsers.filter(user => (user.pendingFine || 0) > 0);
    console.log('Users with current pending fines:', usersWithPendingFines.length);
    
    // Calculate total from stored user pending fines (AUTHORITATIVE)
    const totalStoredPendingFines = usersWithPendingFines.reduce((total, user) => {
      return total + (user.pendingFine || 0);
    }, 0);
    console.log('Total stored pending fines:', totalStoredPendingFines);
    
    // Get all fine records for history and breakdown
    const allFineRecords = await BookIssue.find({ 
      calculatedFine: { $gt: 0 }
    })
    .populate('user', 'email name pendingFine')
    .populate('book', 'title author')
    .populate('issuedBy', 'email name')
    .populate('returnedBy', 'email name')
    .sort({ returnDate: -1 });
    
    console.log('Total fine records found:', allFineRecords.length);

    // Calculate total PAID fines (from BookIssue records where finePaid = true)
    const totalPaidFines = allFineRecords
      .filter(issue => issue.finePaid === true)
      .reduce((total, issue) => total + (issue.calculatedFine || 0), 0);
    console.log('Total paid fines:', totalPaidFines);

    // Group fine records by user for detailed breakdown
    const userFinesSummary = {};
    
    // Add all users who have either current pending fines OR fine history
    allFineRecords.forEach(record => {
      const userId = record.user._id.toString();
      
      if (!userFinesSummary[userId]) {
        userFinesSummary[userId] = {
          user: record.user,
          fineRecords: [],
          pendingFines: record.user.pendingFine || 0, // Use stored pending fine
          paidFines: 0
        };
      }
      
      // Add the fine record for breakdown
      userFinesSummary[userId].fineRecords.push(record);
      
      // Add to paid fines total if this record is paid
      if (record.finePaid === true) {
        userFinesSummary[userId].paidFines += (record.calculatedFine || 0);
      }
    });
    
    // Also add users who currently have pending fines but might not be in the records above
    usersWithPendingFines.forEach(user => {
      const userId = user._id.toString();
      if (!userFinesSummary[userId]) {
        userFinesSummary[userId] = {
          user: user,
          fineRecords: [],
          pendingFines: user.pendingFine || 0,
          paidFines: 0
        };
      }
    });

    console.log('=== CORRECTED BACKEND RESPONSE SUMMARY ===');
    console.log('Total stored pending fines (User model):', totalStoredPendingFines);
    console.log('Total paid fines (BookIssue records):', totalPaidFines);
    console.log('Users in summary:', Object.keys(userFinesSummary).length);
    console.log('Users with current pending fines:', usersWithPendingFines.length);

    // Debug: Log fine records for the first user to check finePaid status
    const firstUserSummary = Object.values(userFinesSummary)[0];
    if (firstUserSummary) {
      console.log('=== FIRST USER FINE RECORDS DEBUG ===');
      console.log('User:', firstUserSummary.user.email);
      console.log('Pending fines:', firstUserSummary.pendingFines);
      console.log('Paid fines:', firstUserSummary.paidFines);
      console.log('Fine records:');
      firstUserSummary.fineRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. Book: ${record.book?.title}, Fine: $${record.calculatedFine}, Paid: ${record.finePaid}`);
      });
    }

    res.json({
      success: true,
      allFines: allFineRecords,
      userFinesSummary: Object.values(userFinesSummary),
      summary: {
        totalPendingFines: totalStoredPendingFines, // Should be $0 if user paid
        totalCollectedFines: totalPaidFines, // Should be $85 if user paid
        totalFines: totalStoredPendingFines + totalPaidFines,
        totalFineRecords: allFineRecords.length,
        usersWithFines: Object.keys(userFinesSummary).length
      }
    });
  } catch (error) {
    console.error('Error fetching all user fines:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};