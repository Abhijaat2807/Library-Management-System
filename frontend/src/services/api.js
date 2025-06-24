import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api'; // Adjust if different

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  loginLibrarian: (credentials) => api.post('/auth/login', credentials),
};

// Books API calls
export const booksAPI = {
  getAllBooks: () => api.get('/books'),
  getBookById: (id) => api.get(`/books/${id}`),
  createBook: (bookData) => api.post('/books', bookData),
  updateBook: (id, bookData) => {
    console.log('API updateBook called with:', { id, bookData });
    return api.put(`/books/${id}`, bookData);
  },
  deleteBook: (id) => api.delete(`/books/${id}`),
  issueBook: (bookId, userId) => api.post('/books/issue', { bookId, userId }),
};

// Requests API calls
export const requestsAPI = {
  getUserRequests: () => api.get('/book-requests/my-requests'),
  getLibrarianRequests: () => api.get('/book-requests/pending'),
  createRequest: (bookId, requestedDuration = 14) => {
    console.log('API createRequest called with:', { bookId, requestedDuration });
    return api.post('/book-requests', { bookId, requestedDuration });
  },
  approveRequest: (requestId, finePerDay = 0) => {
    console.log('API approveRequest called with:', { requestId, finePerDay });
    return api.put(`/book-requests/${requestId}/approve`, { finePerDay });
  },
  rejectRequest: (requestId, reason) => {
    console.log('API rejectRequest called with:', { requestId, reason });
    // Make sure to send the reason in the correct format your backend expects
    return api.put(`/book-requests/${requestId}/reject`, { 
      reason: reason,
      rejectionReason: reason // Include both just in case
    });
  },
  deleteRequest: async (requestId) => {
    const response = await fetch(`${API_BASE_URL}/book-requests/${requestId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete request');
    }
    
    return response.json();
  }
};

export const issuesAPI = {
  // Librarian endpoints
  issueBook: (bookRequestId) => api.post('/book-issues/issue', { bookRequestId }),
  getCurrentlyIssued: () => api.get('/book-issues/currently-issued'),
  getOverdueBooks: () => api.get('/book-issues/overdue'),
  returnBook: (issueId) => api.put(`/book-issues/${issueId}/return`),
  
  // User endpoints
  getUserIssues: () => api.get('/book-issues/my-books'),
  getUserHistory: () => api.get('/book-issues/my-history'),
  payFine: async (amount) => {
    const response = await fetch('http://localhost:5000/api/book-issues/pay-fine', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: parseFloat(amount) })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },
  getUserFines: () => api.get('/book-issues/my-fines'),
  getAllUserFines: () => api.get('/book-issues/all-fines'),

  // New function to get all fines data
  getAllFinesData: async () => {
    console.log('=== API SERVICE: GET ALL FINES DATA ===');
    try {
      const response = await api.get('/book-issues/all-fines');
      console.log('getAllFinesData API response:', response);
      return response;
    } catch (error) {
      console.error('getAllFinesData API error:', error);
      throw error;
    }
  },
};

// Dashboard API calls
export const dashboardAPI = {
  // User dashboard data
  getUserDashboard: () => api.get('/dashboard/user'),
  
  // Librarian dashboard data
  getLibrarianDashboard: () => api.get('/dashboard/librarian'),
  
  // Quick stats for both
  getQuickStats: () => api.get('/dashboard/stats'),
};

export default api;