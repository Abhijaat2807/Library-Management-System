import Book from '../models/Book.js';

//@desc Get all books (accessible to all users)
export const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({ isDeleted: false }).sort({ createdAt: -1 });
    
    res.json({ 
      success: true,
      count: books.length,
      books 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Search books by title or author (accessible to all users)

export const searchBooks = async (req, res) => {
  try {
    const { search, author } = req.query;
    let filter = { isDeleted: false }; // Only non-deleted books
    
    if (search) {
      filter.title = { $regex: search, $options: 'i' }; // Case-insensitive search
    }
    
    if (author) {
      filter.author = { $regex: author, $options: 'i' };
    }
    
    const books = await Book.find(filter);
    res.json({ 
      success: true,
      count: books.length,
      books 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Add new book (Admin/Librarian only)
export const addBook = async (req, res) => {
  try {
    const { title, author, genre, totalCopies = 1 } = req.body;
    
    const book = new Book({
      title,
      author,
      genre,
      totalCopies,
      availableCopies: totalCopies
    });
    
    await book.save();
    
    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      book
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Edit book (Admin/Librarian only)
export const editBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, genre } = req.body;
    
    const book = await Book.findById(id);
    
    if (!book || book.isDeleted) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    book.title = title || book.title;
    book.author = author || book.author;
    book.genre = genre || book.genre;
    book.updatedAt = new Date();
    
    await book.save();
    
    res.json({
      success: true,
      message: 'Book updated successfully',
      book
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateBookCopies = async (req, res) => {
  try {
    const { id } = req.params;
    const { totalCopies } = req.body;
    
    const book = await Book.findById(id);
    
    if (!book || book.isDeleted) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    const issuedCopies = book.totalCopies - book.availableCopies;
    
    if (totalCopies < issuedCopies) {
      return res.status(400).json({ 
        message: `Cannot reduce copies below ${issuedCopies}. ${issuedCopies} copies are currently issued.` 
      });
    }
    
    book.availableCopies = totalCopies - issuedCopies;
    book.totalCopies = totalCopies;
    
    await book.save();
    
    res.json({
      success: true,
      message: 'Book copies updated successfully',
      book
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Soft delete book (Admin/Librarian only)
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    const book = await Book.findById(id);
    
    if (!book || book.isDeleted) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    book.isDeleted = true;
    book.updatedAt = new Date();
    
    await book.save();
    
    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc Get single book by ID
export const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const book = await Book.findOne({ _id: id, isDeleted: false });
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.json({
      success: true,
      book
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};