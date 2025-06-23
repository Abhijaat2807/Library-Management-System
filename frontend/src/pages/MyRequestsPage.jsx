import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestsAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, CheckCircle, XCircle, BookOpen, Calendar, Search, AlertCircle } from 'lucide-react';

const MyRequestsPage = () => {
  const { isLibrarian } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!isLibrarian()) {
      fetchMyRequests();
    }
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await requestsAPI.getUserRequests();
      console.log('My requests response:', response);
      
      // Your backend returns { success: true, count: X, requests: [...] }
      const requestsData = response.data?.requests || [];
      
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching my requests:', error);
      setError('Failed to load your requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {status}
          </Badge>
        );
    }
  };

  const filteredRequests = useMemo(() => {
    const requestsArray = Array.isArray(requests) ? requests : [];
    
    return requestsArray.filter(request => {
      const matchesSearch = !searchTerm || 
        request.book?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.book?.author?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  if (isLibrarian()) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Access Denied</h3>
        <p className="text-gray-600">This page is only available for users.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          My Book Requests
        </h1>
        <p className="text-gray-600">View your book borrowing request history</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by book title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Status Filter */}
        <div className="w-full lg:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(searchTerm || statusFilter !== 'all') && (
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="bg-white text-black border-gray-300 hover:bg-gray-50"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{requests.length}</div>
            <div className="text-sm text-gray-600">Total Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {requests.filter(r => r.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No requests found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'You haven\'t made any book requests yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Card key={request._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">
                          {request.book?.title || 'Unknown Book'}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          by {request.book?.author || 'Unknown Author'}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Requested: {formatDate(request.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Duration: {request.requestedDuration} days
                          </div>
                        </div>

                        {/* Additional Info based on status */}
                        {request.status === 'approved' && (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200 mt-3">
                            <h4 className="font-medium text-green-800 mb-1">✅ Request Approved</h4>
                            <p className="text-sm text-green-700">
                              Your request has been approved! You can now collect the book from the library.
                            </p>
                            {request.finePerDay && (
                              <p className="text-xs text-green-600 mt-1">
                                Fine per day: ${request.finePerDay} (applicable after due date)
                              </p>
                            )}
                          </div>
                        )}

                        {request.status === 'rejected' && request.rejectionReason && (
                          <div className="bg-red-50 p-3 rounded-lg border border-red-200 mt-3">
                            <h4 className="font-medium text-red-800 mb-1">❌ Request Rejected</h4>
                            <p className="text-sm text-red-700">
                              <strong>Reason:</strong> {request.rejectionReason}
                            </p>
                          </div>
                        )}

                        {request.status === 'pending' && (
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-3">
                            <h4 className="font-medium text-yellow-800 mb-1">⏳ Awaiting Review</h4>
                            <p className="text-sm text-yellow-700">
                              Your request is being reviewed by the librarian. You'll be notified once it's processed.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRequestsPage;