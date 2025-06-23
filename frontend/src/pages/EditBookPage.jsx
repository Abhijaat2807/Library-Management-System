import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { booksAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, BookOpen, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const EditBookPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLibrarian } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingBook, setFetchingBook] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genre: '',
    totalCopies: '',
    availableCopies: ''
  });
  const [errors, setErrors] = useState({});

  // Redirect non-librarians
  if (!isLibrarian()) {
    navigate('/books');
    return null;
  }

  // Fetch book data on component mount
  useEffect(() => {
    fetchBook();
  }, [id]);

  const fetchBook = async () => {
  try {
    setFetchingBook(true);
    console.log('Fetching book with ID:', id);
    
    const response = await booksAPI.getBookById(id);
    console.log('Full API Response:', response);
    console.log('Response data:', response.data);
    
    // Check if the response has the book data nested
    let book = response.data;
    
    // If the response has a nested structure like { success: true, book: {...} }
    if (response.data.book) {
      book = response.data.book;
    }
    // If the response has a nested structure like { data: {...} }
    else if (response.data.data) {
      book = response.data.data;
    }
    
    console.log('Extracted book data:', book);
    
    // Check if book data exists
    if (!book || typeof book !== 'object') {
      console.error('No valid book data received');
      setErrors({ fetch: 'No valid book data received' });
      return;
    }
    
    const formDataToSet = {
      title: book.title || '',
      author: book.author || '',
      genre: book.genre || '',
      totalCopies: book.totalCopies?.toString() || '',
      availableCopies: book.availableCopies?.toString() || ''
    };
    
    console.log('Setting form data with:', formDataToSet);
    
    setFormData(formDataToSet);
    
  } catch (error) {
    console.error('Error fetching book:', error);
    console.error('Error response:', error.response);
    
    if (error.response?.status === 404) {
      setErrors({ fetch: 'Book not found' });
    } else {
      setErrors({ fetch: 'Failed to load book details' });
    }
  } finally {
    setFetchingBook(false);
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For number inputs, ensure we store them properly
    let processedValue = value;
    if (name === 'totalCopies' || name === 'availableCopies') {
      // Keep as string but ensure it's a valid number string
      processedValue = value.replace(/[^0-9]/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    console.log(`Changed ${name} to:`, processedValue);
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }
    
    // Convert to numbers for validation
    const totalCopies = parseInt(formData.totalCopies);
    const availableCopies = parseInt(formData.availableCopies);
    
    // Validate total copies
    if (!formData.totalCopies || isNaN(totalCopies) || totalCopies < 1) {
      newErrors.totalCopies = 'Total copies must be at least 1';
    }
    
    // Validate available copies
    if (!formData.availableCopies || isNaN(availableCopies) || availableCopies < 0) {
      newErrors.availableCopies = 'Available copies cannot be negative';
    }
    
    // Check if available copies exceed total copies
    if (!isNaN(totalCopies) && !isNaN(availableCopies) && availableCopies > totalCopies) {
      newErrors.availableCopies = 'Available copies cannot exceed total copies';
    }

    console.log('Validation results:', {
      formData,
      totalCopies,
      availableCopies,
      errors: newErrors
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setLoading(true);
    try {
      // Convert string numbers to integers and clean up data
      const bookData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        genre: formData.genre.trim() || undefined,
        totalCopies: parseInt(formData.totalCopies),
        availableCopies: parseInt(formData.availableCopies)
      };

      console.log('Book ID:', id);
      console.log('Updating book with data:', bookData);
      console.log('Making API call to updateBook...');
      
      const response = await booksAPI.updateBook(id, bookData);
      console.log('Update response:', response);
      
      // Success - redirect to books page
      navigate('/books', { 
        state: { message: 'Book updated successfully!' }
      });
    } catch (error) {
      console.error('Error updating book:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      // Handle specific error messages
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else if (error.response?.status === 404) {
        setErrors({ submit: 'Book not found' });
      } else {
        setErrors({ submit: 'Failed to update book. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    // Reset to original fetched data
    fetchBook();
    setErrors({});
  };

  if (fetchingBook) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading book details...</div>
      </div>
    );
  }

  if (errors.fetch) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{errors.fetch}</div>
        <div className="space-x-4">
          <Button onClick={fetchBook}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link to="/books">Back to Books</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/books">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Books
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Edit Book
          </h1>
          <p className="text-gray-600">Update book information</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Book Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {errors.submit}
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter book title"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  placeholder="Enter author name"
                  className={errors.author ? 'border-red-500' : ''}
                />
                {errors.author && <p className="text-sm text-red-600">{errors.author}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
                placeholder="e.g., Fiction, Science, History"
              />
            </div>

            {/* Copy Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Copy Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalCopies">Total Copies *</Label>
                  <Input
                    id="totalCopies"
                    name="totalCopies"
                    type="number"
                    value={formData.totalCopies}
                    onChange={handleInputChange}
                    placeholder="e.g., 5"
                    min="1"
                    className={errors.totalCopies ? 'border-red-500' : ''}
                  />
                  {errors.totalCopies && <p className="text-sm text-red-600">{errors.totalCopies}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availableCopies">Available Copies *</Label>
                  <Input
                    id="availableCopies"
                    name="availableCopies"
                    type="number"
                    value={formData.availableCopies}
                    onChange={handleInputChange}
                    placeholder="e.g., 5"
                    min="0"
                    max={formData.totalCopies || undefined}
                    className={errors.availableCopies ? 'border-red-500' : ''}
                  />
                  {errors.availableCopies && <p className="text-sm text-red-600">{errors.availableCopies}</p>}
                  <p className="text-xs text-gray-500">
                    Number of copies currently available for lending
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating Book...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Book
                  </>
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={handleReset}
                disabled={loading}
              >
                Reset Changes
              </Button>
              
              <Button 
                type="button" 
                variant="ghost"
                asChild
                disabled={loading}
              >
                <Link to="/books">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditBookPage;