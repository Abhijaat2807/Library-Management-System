import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestsAPI, issuesAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, CheckCircle, XCircle, BookOpen, User, Calendar, Search } from 'lucide-react';

const RequestsManagementPage = () => {
  const { isLibrarian } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingRequest, setProcessingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [finePerDay, setFinePerDay] = useState(0);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRejectRequestId, setSelectedRejectRequestId] = useState(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [selectedIssueRequestId, setSelectedIssueRequestId] = useState(null);
  const [processingIssue, setProcessingIssue] = useState(null);

  useEffect(() => {
    if (isLibrarian()) {
      fetchRequests();
    }
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await requestsAPI.getLibrarianRequests();
      console.log('Librarian requests response:', response);
      console.log('Response data:', response.data);
      
      // Handle different response structures
      let requestsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          requestsData = response.data;
        } else if (response.data.requests && Array.isArray(response.data.requests)) {
          requestsData = response.data.requests;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          requestsData = response.data.data;
        }
      }
      
      console.log('Processed requests data:', requestsData);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      console.error('Error response:', error.response);
      setError('Failed to load requests');
      setRequests([]); // Ensure requests is always an array
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    // Ensure requests is always an array
    const requestsArray = Array.isArray(requests) ? requests : [];
    
    return requestsArray.filter(request => {
      const matchesSearch = !searchTerm || 
        request.book?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.book?.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  const handleApproveRequest = async (requestId, fineAmount) => {
    try {
      console.log('=== APPROVE REQUEST DEBUG ===');
      console.log('Approving request ID:', requestId);
      console.log('Fine per day:', fineAmount);
      
      setProcessingRequest(requestId);
      const response = await requestsAPI.approveRequest(requestId, fineAmount);
      console.log('Approve response:', response);
      
      // Update the request in the list
      setRequests(prev => 
        prev.map(req => 
          req._id === requestId 
            ? { ...req, status: 'approved', finePerDay: fineAmount }
            : req
        )
      );
      
      setShowApproveDialog(false);
      setSelectedRequestId(null);
      setFinePerDay(0);
      alert('Request approved successfully!');
    } catch (error) {
      console.error('=== APPROVE ERROR ===');
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 401) {
        alert('Error: Please log in again');
      } else if (error.response?.status === 403) {
        alert('Error: You don\'t have permission to approve requests');
      } else if (error.response?.status === 404) {
        alert('Error: Request not found');
      } else if (error.response?.status === 400) {
        alert(`Error: ${error.response.data?.message || 'Bad request'}`);
      } else if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert(`Failed to approve request: ${error.message}`);
      }
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId, reason) => {
    try {
      console.log('=== REJECT REQUEST DEBUG ===');
      console.log('Rejecting request ID:', requestId);
      console.log('Rejection reason:', reason);
      console.log('Reason length:', reason?.length);
      console.log('Reason trimmed:', reason?.trim());
      
      // Validate reason before making API call
      if (!reason || !reason.trim()) {
        alert('Please provide a rejection reason');
        return;
      }
      
      setProcessingRequest(requestId);
      const response = await requestsAPI.rejectRequest(requestId, reason.trim());
      console.log('Reject response:', response);
      
      // Update the request in the list
      setRequests(prev => 
        prev.map(req => 
          req._id === requestId 
            ? { ...req, status: 'rejected', rejectionReason: reason.trim() }
            : req
        )
      );
      
      setShowRejectDialog(false);
      setSelectedRejectRequestId(null);
      setRejectionReason('');
      alert('Request rejected successfully');
    } catch (error) {
      console.error('=== REJECT ERROR ===');
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      if (error.response?.status === 401) {
        alert('Error: Please log in again');
      } else if (error.response?.status === 403) {
        alert('Error: You don\'t have permission to reject requests');
      } else if (error.response?.status === 404) {
        alert('Error: Request not found');
      } else if (error.response?.status === 400) {
        alert(`Error: ${error.response.data?.message || 'Bad request - rejection reason might be required'}`);
      } else if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert(`Failed to reject request: ${error.message}`);
      }
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleIssueBook = async (requestId) => {
    try {
      console.log('=== ISSUE BOOK DEBUG ===');
      console.log('Issuing book for request ID:', requestId);
      
      setProcessingIssue(requestId);
      const response = await issuesAPI.issueBook(requestId);
      console.log('Issue response:', response);
      
      // Update the request status to indicate it's been issued
      setRequests(prev => 
        prev.map(req => 
          req._id === requestId 
            ? { ...req, status: 'issued', issuedAt: new Date() }
            : req
        )
      );
      
      setShowIssueDialog(false);
      setSelectedIssueRequestId(null);
      alert('Book issued successfully!');
    } catch (error) {
      console.error('=== ISSUE ERROR ===');
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 401) {
        alert('Error: Please log in again');
      } else if (error.response?.status === 403) {
        alert('Error: You don\'t have permission to issue books');
      } else if (error.response?.status === 404) {
        alert('Error: Request not found');
      } else if (error.response?.status === 400) {
        alert(`Error: ${error.response.data?.message || 'Cannot issue book'}`);
      } else if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert(`Failed to issue book: ${error.message}`);
      }
    } finally {
      setProcessingIssue(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'issued':
        return (
          <Badge className="bg-blue-500 flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            Issued
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  if (!isLibrarian()) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p>Only librarians can access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Book Issue Requests Management
        </h1>
        <p className="text-gray-600">Manage user book borrowing requests</p>
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
              placeholder="Search by book title, author, or user email..."
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
            <option value="issued">Issued</option>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="text-2xl font-bold text-blue-600">
              {requests.filter(r => r.status === 'issued').length}
            </div>
            <div className="text-sm text-gray-600">Issued</div>
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
            <h3 className="text-lg font-medium mb-2">No issue requests found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'No book issue requests have been made yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Card key={request._id}>
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
                        
                        <div className="flex items-center gap-2 mb-3">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Requested by: {request.user?.email || 'Unknown User'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Requested: {formatDate(request.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {getStatusBadge(request.status)}
                        
                        {request.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            {/* Approve Button with Dialog */}
                            <Dialog open={showApproveDialog && selectedRequestId === request._id} onOpenChange={(open) => {
                              setShowApproveDialog(open);
                              if (!open) {
                                setSelectedRequestId(null);
                                setFinePerDay(0);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequestId(request._id);
                                    setShowApproveDialog(true);
                                  }}
                                  disabled={processingRequest === request._id}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {processingRequest === request._id ? 'Processing...' : 'Approve'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white text-black">
                                <DialogHeader>
                                  <DialogTitle className="text-black">Approve Book Request</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium text-black">{request.book.title}</h4>
                                    <p className="text-sm text-gray-600">Requested by: {request.user.email}</p>
                                    <p className="text-sm text-gray-600">Duration: {request.requestedDuration} days</p>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="finePerDay" className="text-black">Fine per day (optional)</Label>
                                    <Input
                                      id="finePerDay"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={finePerDay}
                                      onChange={(e) => setFinePerDay(parseFloat(e.target.value) || 0)}
                                      placeholder="Enter fine amount per day (e.g., 0.50)"
                                      className="bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500">
                                      Fine will be charged per day after the due date (leave 0 for no fine)
                                    </p>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleApproveRequest(request._id, finePerDay)}
                                      className="flex-1 bg-green-500 text-white hover:bg-green-600"
                                      disabled={processingRequest === request._id}
                                    >
                                      Approve Request
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setShowApproveDialog(false);
                                        setSelectedRequestId(null);
                                        setFinePerDay(0);
                                      }}
                                      className="bg-white text-black border-gray-300 hover:bg-gray-50"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* Reject Button with Dialog */}
                            <Dialog open={showRejectDialog && selectedRejectRequestId === request._id} onOpenChange={(open) => {
                              setShowRejectDialog(open);
                              if (!open) {
                                setSelectedRejectRequestId(null);
                                setRejectionReason('');
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRejectRequestId(request._id);
                                    setShowRejectDialog(true);
                                  }}
                                  disabled={processingRequest === request._id}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  {processingRequest === request._id ? 'Processing...' : 'Reject'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white text-black">
                                <DialogHeader>
                                  <DialogTitle className="text-black">Reject Book Request</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium text-black">{request.book.title}</h4>
                                    <p className="text-sm text-gray-600">Requested by: {request.user.email}</p>
                                    <p className="text-sm text-gray-600">Duration: {request.requestedDuration} days</p>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="rejectionReason" className="text-black">Rejection Reason *</Label>
                                    <Textarea
                                      id="rejectionReason"
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      placeholder="Please provide a reason for rejecting this request..."
                                      className="bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                      rows={3}
                                    />
                                    <p className="text-xs text-gray-500">
                                      This reason will be shown to the user
                                    </p>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleRejectRequest(request._id, rejectionReason)}
                                      className="flex-1 bg-red-500 text-white hover:bg-red-600"
                                      disabled={processingRequest === request._id || !rejectionReason.trim()}
                                    >
                                      Reject Request
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setShowRejectDialog(false);
                                        setSelectedRejectRequestId(null);
                                        setRejectionReason('');
                                      }}
                                      className="bg-white text-black border-gray-300 hover:bg-gray-50"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                        
                        {/* NEW: Issue Book Button for Approved Requests */}
                        {request.status === 'approved' && (
                          <div className="mt-3">
                            <Dialog open={showIssueDialog && selectedIssueRequestId === request._id} onOpenChange={(open) => {
                              setShowIssueDialog(open);
                              if (!open) {
                                setSelectedIssueRequestId(null);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedIssueRequestId(request._id);
                                    setShowIssueDialog(true);
                                  }}
                                  disabled={processingIssue === request._id}
                                  className="bg-blue-500 hover:bg-blue-600 text-white"
                                >
                                  <BookOpen className="w-4 h-4 mr-1" />
                                  {processingIssue === request._id ? 'Processing...' : 'Issue Book'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white text-black">
                                <DialogHeader>
                                  <DialogTitle className="text-black">Issue Book</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium text-black">{request.book.title}</h4>
                                    <p className="text-sm text-gray-600">Requested by: {request.user.email}</p>
                                    <p className="text-sm text-gray-600">Duration: {request.requestedDuration} days</p>
                                    {request.finePerDay > 0 && (
                                      <p className="text-sm text-gray-600">Fine per day: ${request.finePerDay}</p>
                                    )}
                                  </div>
                                  
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <h4 className="font-medium text-blue-800 mb-1">📚 Ready to Issue</h4>
                                    <p className="text-sm text-blue-700">
                                      This will create a book issue record and make the book available for collection by the user.
                                    </p>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleIssueBook(request._id)}
                                      className="flex-1 bg-blue-500 text-white hover:bg-blue-600"
                                      disabled={processingIssue === request._id}
                                    >
                                      Confirm Issue
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setShowIssueDialog(false);
                                        setSelectedIssueRequestId(null);
                                      }}
                                      className="bg-white text-black border-gray-300 hover:bg-gray-50"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}

                        {/* Status Information */}
                        {request.status === 'issued' && (
                          <div className="bg-blue-50 p-2 rounded-lg mt-3">
                            <p className="text-xs text-blue-800">
                              ✅ Book issued - Available in Issues Management
                            </p>
                          </div>
                        )}

                        {request.status === 'rejected' && request.rejectionReason && (
                          <p className="text-sm text-red-600 mt-2">
                            Reason: {request.rejectionReason}
                          </p>
                        )}
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

export default RequestsManagementPage;