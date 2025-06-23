import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { booksAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, BookPlus, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const AddBookPage = () => {
  const navigate = useNavigate();
  const { isLibrarian } = useAuth();
  const [loading, setLoading] = useState(false);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
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
    if (!formData.totalCopies || formData.totalCopies < 1) {
      newErrors.totalCopies = 'Total copies must be at least 1';
    }
    if (!formData.availableCopies || formData.availableCopies < 0) {
      newErrors.availableCopies = 'Available copies cannot be negative';
    }
    if (parseInt(formData.availableCopies) > parseInt(formData.totalCopies)) {
      newErrors.availableCopies = 'Available copies cannot exceed total copies';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
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

      console.log('Sending book data:', bookData);
      await booksAPI.createBook(bookData);
      
      // Success - redirect to books page
      navigate('/books', { 
        state: { message: 'Book added successfully!' }
      });
    } catch (error) {
      console.error('Error creating book:', error);
      
      // Handle specific error messages
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'Failed to add book. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      author: '',
      genre: '',
      totalCopies: '',
      availableCopies: ''
    });
    setErrors({});
  };

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
            <BookPlus className="w-6 h-6" />
            Add New Book
          </h1>
          <p className="text-gray-600">Add a new book to the library collection</p>
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
                    Usually same as total copies for new books
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
                    Adding Book...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Add Book
                  </>
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={handleReset}
                disabled={loading}
              >
                Reset
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

export default AddBookPage;