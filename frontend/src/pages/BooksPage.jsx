import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { booksAPI, requestsAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Eye, Edit, Trash2, BookOpen, BookMarked } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const BooksPage = () => {
  const { isLibrarian } = useAuth();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState(''); // NEW: Availability filter
  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [requestedDuration, setRequestedDuration] = useState(14);

  // Calculate book statistics
  const totalBooks = books.length;
  const availableBooks = books.filter(book => book.isAvailable).length;
  const issuedBooks = books.filter(book => !book.isAvailable).length;

  // Fetch books on component mount
  useEffect(() => {
    fetchBooks();
  }, []);

  // Filter books when search term or filters change
  useEffect(() => {
    filterBooks();
  }, [books, searchTerm, authorFilter, genreFilter, availabilityFilter]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching books...');
      const response = await booksAPI.getAllBooks();
      console.log('Books response:', response);
      
      let booksData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          booksData = response.data;
        } else if (Array.isArray(response.data.books)) {
          booksData = response.data.books;
        } else {
          console.error('Unexpected response structure:', response.data);
          setError('Invalid response format from server');
          return;
        }
      }
      
      setBooks(booksData);
      
      // Extract unique authors and genres for filter dropdowns
      const uniqueAuthors = [...new Set(booksData.map(book => book.author).filter(Boolean))];
      const uniqueGenres = [...new Set(booksData.map(book => book.genre).filter(Boolean))];
      setAuthors(uniqueAuthors);
      setGenres(uniqueGenres);
      
    } catch (error) {
      console.error('Error fetching books:', error);
      setError('Failed to fetch books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    let filtered = books;

    // Search by book name or author
    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by author
    if (authorFilter) {
      filtered = filtered.filter(book => book.author === authorFilter);
    }

    // Filter by genre
    if (genreFilter) {
      filtered = filtered.filter(book => book.genre === genreFilter);
    }

    // NEW: Filter by availability
    if (availabilityFilter) {
      if (availabilityFilter === 'available') {
        filtered = filtered.filter(book => (book.availableCopies || 0) > 0);
      } else if (availabilityFilter === 'issued') {
        filtered = filtered.filter(book => (book.availableCopies || 0) === 0);
      }
    }

    setFilteredBooks(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAuthorFilter('');
    setGenreFilter('');
    setAvailabilityFilter(''); // Clear availability filter
  };

  const handleDeleteBook = async (bookId) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await booksAPI.deleteBook(bookId);
        fetchBooks(); // Refresh books list
      } catch (error) {
        console.error('Error deleting book:', error);
        alert('Failed to delete book');
      }
    }
  };

  const handleRequestBook = async (bookId, duration) => {
    try {
      console.log('=== REQUEST BOOK DEBUG ===');
      console.log('Requesting to issue book:', bookId, 'for', duration, 'days');
      
      const response = await requestsAPI.createRequest(bookId, duration);
      console.log('Request response:', response);
      
      alert(`Book issue request submitted successfully for ${duration} days! Wait for librarian approval.`);
      setShowRequestDialog(false);
      setSelectedBookId(null);
      setRequestedDuration(14);
    } catch (error) {
      console.error('=== REQUEST ERROR ===');
      console.error('Full error:', error);
      
      if (error.response?.status === 401) {
        alert('Error: Please log in again');
      } else if (error.response?.status === 400) {
        alert(`Error: ${error.response.data?.message || 'Bad request'}`);
      } else if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert(`Failed to submit book issue request: ${error.message}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading books...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={fetchBooks}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Books</h1>
          <p className="text-gray-600">
            {isLibrarian() ? 'Manage your library collection' : 'Browse available books'}
          </p>
        </div>
        
        {isLibrarian() && (
          <Button asChild>
            <Link to="/books/add">
              <Plus className="w-4 h-4 mr-2" />
              Add Book
            </Link>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by book name or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Availability Filter */}
        <div className="w-full lg:w-48">
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Books</option>
            <option value="available">Available Only</option>
            <option value="issued">All Issued</option>
          </select>
        </div>
        
        {/* Author Filter */}
        {authors.length > 0 && (
          <div className="w-full lg:w-48">
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Authors</option>
              {authors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>
        )}

        {/* Genre Filter */}
        {genres.length > 0 && (
          <div className="w-full lg:w-48">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Filters Button */}
        {(searchTerm || authorFilter || genreFilter || availabilityFilter) && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {(searchTerm || authorFilter || genreFilter || availabilityFilter) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary">
              Search: "{searchTerm}"
            </Badge>
          )}
          {availabilityFilter && (
            <Badge variant="secondary" className="capitalize">
              {availabilityFilter === 'available' ? 'Available Only' : 'All Issued'}
            </Badge>
          )}
          {authorFilter && (
            <Badge variant="secondary">
              Author: {authorFilter}
            </Badge>
          )}
          {genreFilter && (
            <Badge variant="secondary">
              Genre: {genreFilter}
            </Badge>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {filteredBooks.length} of {books.length} books
        {availabilityFilter === 'available' && (
          <span className="text-green-600 ml-2">• Available books only</span>
        )}
        {availabilityFilter === 'issued' && (
          <span className="text-orange-600 ml-2">• All issued books only</span>
        )}
      </div>

      {/* Books Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map(book=> {
            const availableCopies = book.availableCopies || 0;
            const totalCopies = book.totalCopies || 0;
            const issuedCopies = totalCopies - availableCopies;
            
            return (
              <Card key={book._id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <Badge variant={availableCopies > 0 ? "default" : "secondary"}>
                      {availableCopies > 0 ? 'Available' : 'All Issued'}
                    </Badge>
                    {isLibrarian() && (
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/books/${book._id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/books/${book._id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBook(book._id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{book.title || 'Untitled'}</CardTitle>
                  <p className="text-sm text-gray-600">by {book.author || 'Unknown Author'}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* For Librarians - Show detailed statistics */}
                    {isLibrarian() && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Available:</span>
                            <span className="font-semibold text-green-600">{availableCopies}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-semibold text-blue-600">{totalCopies}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Issued:</span>
                            <span className="font-semibold text-orange-600">{issuedCopies}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Rate:</span>
                            <span className="font-semibold text-gray-700">
                              {totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        {totalCopies > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${(availableCopies / totalCopies) * 100}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {availableCopies} of {totalCopies} copies available
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* For Users - Show simple availability */}
                    {!isLibrarian() && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-900">
                            Copies Available:
                          </span>
                          <span className="text-lg font-bold text-blue-600">
                            {availableCopies}
                          </span>
                        </div>
                        {availableCopies > 0 ? (
                          <p className="text-xs text-blue-700 mt-1">
                            Ready to be borrowed
                          </p>
                        ) : (
                          <p className="text-xs text-red-600 mt-1">
                            All copies are currently issued
                          </p>
                        )}
                      </div>
                    )}

                    {/* Book Details */}
                    <div className="space-y-2">
                      {book.genre && (
                        <Badge variant="outline" className="text-xs">
                          {book.genre}
                        </Badge>
                      )}
                      {book.isbn && <p className="text-sm"><strong>ISBN:</strong> {book.isbn}</p>}
                      {book.publishedYear && <p className="text-sm"><strong>Published:</strong> {book.publishedYear}</p>}
                      {book.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {book.description}
                        </p>
                      )}
                    </div>

                    {/* Request Button for Users - to borrow available books */}
                    {!isLibrarian() && book.availableCopies > 0 && (
                      <Dialog open={showRequestDialog && selectedBookId === book._id} onOpenChange={(open) => {
                        setShowRequestDialog(open);
                        if (!open) {
                          setSelectedBookId(null);
                          setRequestedDuration(14);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBookId(book._id);
                              setShowRequestDialog(true);
                            }}
                            className="text-black border-black hover:bg-black hover:text-white"
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            Request Issue
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white text-black">
                          <DialogHeader>
                            <DialogTitle className="text-black">Request Book Issue</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-black">{book.title}</h4>
                              <p className="text-sm text-gray-600">by {book.author}</p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="duration" className="text-black">Requested Duration (days)</Label>
                              
                              {/* Quick Select Options */}
                              <div className="grid grid-cols-4 gap-2 mb-3">
                                {[7, 14, 21, 30].map(days => (
                                  <Button
                                    key={days}
                                    variant={requestedDuration === days ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setRequestedDuration(days)}
                                    className={requestedDuration === days ? 
                                      "bg-black text-white" : 
                                      "bg-white text-black border-gray-300 hover:bg-gray-100"
                                    }
                                  >
                                    {days}d
                                  </Button>
                                ))}
                              </div>
                              
                              {/* Custom Input */}
                              <div className="space-y-1">
                                <Label className="text-sm text-gray-600">Or enter custom days (1-30):</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="30"
                                  value={requestedDuration}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (value >= 1 && value <= 30) {
                                      setRequestedDuration(value);
                                    } else if (value > 30) {
                                      setRequestedDuration(30);
                                    } else if (value < 1) {
                                      setRequestedDuration(1);
                                    }
                                  }}
                                  placeholder="Enter days (1-30)"
                                  className="bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500">Maximum 30 days allowed</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleRequestBook(book._id, requestedDuration)}
                                className="flex-1 bg-black text-white hover:bg-gray-800"
                                disabled={!requestedDuration || requestedDuration < 1 || requestedDuration > 30}
                              >
                                Submit Request ({requestedDuration} day{requestedDuration !== 1 ? 's' : ''})
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowRequestDialog(false);
                                  setSelectedBookId(null);
                                  setRequestedDuration(14);
                                }}
                                className="bg-white text-black border-gray-300 hover:bg-gray-50"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {searchTerm || authorFilter || genreFilter || availabilityFilter ? 'No books match your search criteria' : 'No books available'}
          </div>
          {(searchTerm || authorFilter || genreFilter || availabilityFilter) && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default BooksPage;