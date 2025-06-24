import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { issuesAPI } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  BookOpen, 
  Calendar, 
  User, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RotateCcw,
  DollarSign
} from 'lucide-react';

const IssuesManagementPage = () => {
  const { isLibrarian } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingReturn, setProcessingReturn] = useState(null);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [stats, setStats] = useState({
    totalIssued: 0,
    overdue: 0,
    returnedToday: 0,
    totalFines: 0
  });
  const [showFineDetails, setShowFineDetails] = useState(false);
  const [allFinesData, setAllFinesData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Add this state

  useEffect(() => {
    if (isLibrarian()) {
      fetchIssues();
    }
  }, []);

  // Update the fetchIssues function to look for 'issuedBooks' instead of 'issues'
  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await issuesAPI.getCurrentlyIssued();
      console.log('Issues response:', response);
      
      // Handle the response structure - your backend returns 'issuedBooks'
      let issuesData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          issuesData = response.data;
        } else if (response.data.issuedBooks && Array.isArray(response.data.issuedBooks)) {
          issuesData = response.data.issuedBooks; // ✅ This is what your backend returns
        } else if (response.data.issues && Array.isArray(response.data.issues)) {
          issuesData = response.data.issues;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          issuesData = response.data.data;
        }
      }
      
      console.log('Processed issues data:', issuesData);
      setIssues(issuesData);
    } catch (error) {
      console.error('Error fetching issues:', error);
      setError('Failed to load book issues');
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  // Update your handleReturnBook function to refresh all data:
  const handleReturnBook = async (issueId) => {
    try {
      setProcessingReturn(issueId);
      console.log('=== FRONTEND RETURN ===');
      console.log('Returning book with ID:', issueId);
      
      const response = await issuesAPI.returnBook(issueId);
      console.log('=== RETURN RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Fine info:', response.data?.fine);
      
      // Close dialog first
      setShowReturnDialog(false);
      setSelectedIssue(null);
      
      // Show success message
      alert(response.data?.message || 'Book returned successfully!');
      
      // Refresh all data instead of just updating state
      await fetchIssues();
      
    } catch (error) {
      console.error('=== FRONTEND ERROR ===');
      console.error('Error returning book:', error);
      alert(`Failed to return book: ${error.response?.data?.message || error.message}`);
    } finally {
      setProcessingReturn(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (issue) => {
    const today = new Date();
    const dueDate = new Date(issue.dueDate);
    const isOverdue = today > dueDate;

    if (issue.status === 'returned') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Returned
        </Badge>
      );
    }

    if (isOverdue) {
      const overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {overdueDays} days overdue
        </Badge>
      );
    }

    const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 3) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Due in {daysRemaining} days
        </Badge>
      );
    }

    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <Clock className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  const calculateFine = (issue) => {
    const today = new Date();
    const dueDate = new Date(issue.dueDate);
    
    if (today <= dueDate || !issue.finePerDay) {
      return 0;
    }
    
    const overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
    return overdueDays * issue.finePerDay;
  };

  const filteredIssues = useMemo(() => {
    const issuesArray = Array.isArray(issues) ? issues : [];
    
    return issuesArray.filter(issue => {
      const matchesSearch = !searchTerm || 
        issue.book?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.book?.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      const today = new Date();
      const dueDate = new Date(issue.dueDate);
      const isOverdue = today > dueDate;

      switch (statusFilter) {
        case 'active':
          matchesStatus = issue.status === 'issued' && !isOverdue;
          break;
        case 'overdue':
          matchesStatus = issue.status === 'issued' && isOverdue;
          break;
        case 'returned':
          matchesStatus = issue.status === 'returned';
          break;
        default:
          matchesStatus = true;
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [issues, searchTerm, statusFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  // Calculate statistics
  useEffect(() => {
    const calculateStats = async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log('=== CALCULATING STATS FROM ISSUES ===');
      console.log('Total issues:', issues.length);
      
      // Calculate basic stats from issues
      const basicStats = {
        totalIssued: issues.filter(issue => issue.status === 'issued').length,
        overdue: issues.filter(issue => {
          if (issue.status !== 'issued') return false;
          const dueDate = new Date(issue.dueDate);
          return now > dueDate;
        }).length,
        returnedToday: issues.filter(issue => {
          if (issue.status !== 'returned' || !issue.returnDate) return false;
          const returnDate = new Date(issue.returnDate);
          const returnDateOnly = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate());
          return returnDateOnly.getTime() === today.getTime();
        }).length,
        totalFines: 0
      };

      // Use the SAME API call as the View Details dialog
      try {
        console.log('=== FETCHING PENDING FINES (SAME AS DIALOG) ===');
        
        const response = await fetch('http://localhost:5000/api/book-issues/all-fines', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const finesData = await response.json();
          console.log('Fines data for stats:', finesData);
          console.log('Total pending fines from API:', finesData.summary?.totalPendingFines);
          
          // Use the same value that shows in the dialog
          basicStats.totalFines = finesData.summary?.totalPendingFines || 0;
        } else {
          console.error('Failed to fetch fines data, status:', response.status);
          basicStats.totalFines = 0;
        }
      } catch (error) {
        console.error('Error fetching fines data:', error);
        basicStats.totalFines = 0;
      }
      
      console.log('=== FINAL CALCULATED STATS ===');
      console.log('Total issued:', basicStats.totalIssued);
      console.log('Total overdue:', basicStats.overdue);
      console.log('Total pending fines:', basicStats.totalFines);
      
      setStats(basicStats);
    };

    if (Array.isArray(issues) && issues.length >= 0) {
      calculateStats();
    }
  }, [issues, refreshKey]); // Add refreshKey to dependencies

  // Fetch all fines data for the Fine Details dialog
  const fetchAllFinesData = async () => {
    try {
      const response = await issuesAPI.getAllFinesData();
      console.log('All fines data response:', response);
      
      if (response.data) {
        setAllFinesData(response.data);
      } else {
        setAllFinesData(null);
      }
    } catch (error) {
      console.error('Error fetching fines data:', error);
      setAllFinesData(null);
    }
  };

  // Replace your handleViewAllFines function with this direct fetch version:
  const handleViewAllFines = async () => {
    try {
      console.log('=== FETCHING ALL FINES DATA (DIRECT FETCH) ===');
      
      // Clear existing data first to show loading state
      setAllFinesData(null);
      setShowFineDetails(true);
      
      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Direct fetch to the backend API
      const response = await fetch('http://localhost:5000/api/book-issues/all-fines', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const finesData = await response.json();
      console.log('=== DIRECT FETCH FINES DATA ===');
      console.log('All fines response:', finesData);
      console.log('Summary:', finesData.summary);
      
      setAllFinesData(finesData);
    } catch (error) {
      console.error('=== DIRECT FETCH ERROR ===');
      console.error('Error:', error);
      
      let errorMessage = 'Failed to fetch fine details: ';
      if (error.message.includes('401')) {
        errorMessage += 'Authentication failed. Please log in again.';
      } else if (error.message.includes('403')) {
        errorMessage += 'Access denied. Admin/Librarian access required.';
      } else if (error.message.includes('500')) {
        errorMessage += 'Server error. Check backend logs.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
      setShowFineDetails(false);
    }
  };

  if (!isLibrarian()) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Access Denied</h3>
        <p className="text-gray-600">This page is only available for librarians.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading book issues...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <BookOpen className="w-6 h-6" />
          Book Issues Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300">Manage issued books and handle returns</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
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
              className="pl-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Status Filter */}
        <div className="w-full lg:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Issues</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(searchTerm || statusFilter !== 'all') && (
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalIssued}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Currently Issued</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overdue</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.returnedToday}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Returned Today</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${stats.totalFines.toFixed(2)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Fines</div>
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No issues found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'No books are currently issued'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredIssues.map((issue) => (
  <Card key={issue._id}>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">
                {issue.book?.title || 'Unknown Book'}
              </h3>
              <p className="text-gray-600 mb-2">
                by {issue.book?.author || 'Unknown Author'}
              </p>
              
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Issued to: {issue.user?.email || 'Unknown User'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Issue Date: {formatDate(issue.issueDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due Date: {formatDate(issue.dueDate)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Fine Per Day Information */}
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Fine per day: {issue.finePerDay ? `$${issue.finePerDay.toFixed(2)}` : 'No fine'}
                  </div>
                  
                  {/* Current Fine Calculation */}
                  {issue.finePerDay > 0 && (() => {
                    const today = new Date();
                    const dueDate = new Date(issue.dueDate);
                    const isOverdue = today > dueDate;
                    
                    if (isOverdue && issue.status === 'issued') {
                      const overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                      const currentFine = overdueDays * issue.finePerDay;
                      
                      return (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          Current fine: ${currentFine.toFixed(2)} ({overdueDays} days overdue)
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                  
                  {issue.issuedBy && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Issued by: {issue.issuedBy.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              {getStatusBadge(issue)}
              
              {/* Fine per day info (only show if there's a fine and book is issued) */}
              {issue.status === 'issued' && issue.finePerDay > 0 && (
                <div className="mt-2 text-center">
                  <div className="text-xs text-gray-600">
                    Fine: ${issue.finePerDay.toFixed(2)}/day
                  </div>
                  {(() => {
                    const today = new Date();
                    const dueDate = new Date(issue.dueDate);
                    const isOverdue = today > dueDate;
                    
                    if (isOverdue) {
                      const overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                      const currentFine = overdueDays * issue.finePerDay;
                      return (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Current: ${currentFine.toFixed(2)}
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
              
              {/* Return Button for Active Issues */}
              {issue.status === 'issued' && (
                <div className="mt-3">
                  <Dialog open={showReturnDialog && selectedIssue?._id === issue._id} onOpenChange={(open) => {
                    setShowReturnDialog(open);
                    if (!open) {
                      setSelectedIssue(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedIssue(issue);
                          setShowReturnDialog(true);
                        }}
                        disabled={processingReturn === issue._id}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {processingReturn === issue._id ? 'Processing...' : 'Mark as Returned'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white text-black">
                      <DialogHeader>
                        <DialogTitle className="text-black">Return Book</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-black">{issue.book?.title}</h4>
                          <p className="text-sm text-gray-600">Issued to: {issue.user?.email}</p>
                          <p className="text-sm text-gray-600">Due: {formatDate(issue.dueDate)}</p>
                          
                          {/* Fine Information in Return Dialog */}
                          {issue.finePerDay > 0 && (() => {
                            const today = new Date();
                            const dueDate = new Date(issue.dueDate);
                            const isOverdue = today > dueDate;
                            
                            if (isOverdue) {
                              const overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                              const totalFine = overdueDays * issue.finePerDay;
                              
                              return (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-200 mt-2">
                                  <h4 className="font-medium text-red-800 mb-1">⚠️ Overdue Fine</h4>
                                  <p className="text-sm text-red-700">
                                    {overdueDays} days overdue × ${issue.finePerDay.toFixed(2)}/day = <strong>${totalFine.toFixed(2)}</strong>
                                  </p>
                                  <p className="text-xs text-red-600 mt-1">
                                    Fine will be added to user's account
                                  </p>
                                </div>
                              );
                            } else {
                              return (
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200 mt-2">
                                  <h4 className="font-medium text-green-800 mb-1">✅ Returned On Time</h4>
                                  <p className="text-sm text-green-700">No fine applicable</p>
                                </div>
                              );
                            }
                          })()}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleReturnBook(issue._id)}
                            className="flex-1 bg-green-500 text-white hover:bg-green-600"
                            disabled={processingReturn === issue._id}
                          >
                            Confirm Return
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowReturnDialog(false);
                              setSelectedIssue(null);
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
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
))}
        </div>  
      )}

      {/* Fine Details Dialog */}
      <Dialog open={showFineDetails} onOpenChange={setShowFineDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white text-black">
          <DialogHeader>
  <div className="flex justify-between items-center pr-8"> {/* Add right padding to avoid X button */}
    <DialogTitle className="text-black">All User Fines - Detailed Breakdown</DialogTitle>
    <Button
      size="sm"
      variant="outline"
      onClick={handleViewAllFines}
      className="bg-white text-black border-gray-300 hover:bg-gray-50"
    >
      <RotateCcw className="w-4 h-4 mr-2" />
      Refresh
    </Button>
  </div>
</DialogHeader>
          
          {!allFinesData ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading fresh fine data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary - REMOVED Total Collected */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    ${allFinesData.summary?.totalPendingFines?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Total Pending Fines</div>
                  <div className="text-xs text-gray-500">(From User accounts)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {allFinesData.summary?.usersWithFines || 0}
                  </div>
                  <div className="text-sm text-gray-600">Users with Fines</div>
                </div>
              </div>

              {/* Users with Pending Fines */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Users with Pending Fines
                </h3>
                
                {allFinesData.userFinesSummary?.filter(userFine => userFine.pendingFines > 0).map((userFine) => (
                  <div key={userFine.user._id} className="border rounded-lg p-4 bg-red-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-lg">{userFine.user.email}</div>
                        <div className="text-sm text-gray-600">
                          User ID: {userFine.user._id}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-red-600">
                          ${userFine.user.pendingFine?.toFixed(2) || userFine.pendingFines.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">Pending Fine</div>
                      </div>
                    </div>
                    
                    {/* Show fine breakdown from individual books */}
                    {userFine.fineRecords && userFine.fineRecords.length > 0 && (
                      <div className="bg-white rounded p-3 mt-3">
                        <h4 className="font-medium text-sm mb-2">Fine Breakdown by Book:</h4>
                        <div className="space-y-2">
                          {userFine.fineRecords.map((record) => (
                            <div key={record._id} className="flex justify-between items-center text-sm">
                              <div>
                                <div className="font-medium">{record.book?.title || 'Unknown Book'}</div>
                                <div className="text-gray-600">
                                  {record.status === 'returned' ? 'Returned' : 'Still Issued'} 
                                  {record.finePaid ? ' • Paid' : ' • Unpaid'}
                                </div>
                              </div>
                              <div className={`font-medium ${record.finePaid ? 'text-green-600' : 'text-red-600'}`}>
                                ${record.calculatedFine?.toFixed(2) || '0.00'}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="border-t pt-2 mt-2 flex justify-between items-center text-sm">
                          <span className="font-medium">Total unpaid from books:</span>
                          <span className="font-bold text-red-600">
                            ${userFine.fineRecords.reduce((total, record) => 
                              total + (record.finePaid ? 0 : (record.calculatedFine || 0)), 0
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {allFinesData.userFinesSummary?.filter(userFine => userFine.pendingFines > 0).length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2 text-green-800">All Fines Cleared! 🎉</h3>
                    <p>No users currently have pending fines.</p>
                  </div>
                )}
              </div>

              {/* Fine Payment History - Keep but simplified */}
              {allFinesData.userFinesSummary?.filter(userFine => userFine.paidFines > 0).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    Recent Fine Payments
                  </h3>
                  
                  {allFinesData.userFinesSummary?.filter(userFine => userFine.paidFines > 0).map((userFine) => (
                    <div key={`paid-${userFine.user._id}`} className="border rounded-lg p-4 bg-green-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{userFine.user.email}</div>
                          <div className="text-sm text-gray-600">
                            Paid fines for: {userFine.fineRecords?.filter(r => r.finePaid).length || 0} book(s)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            ${userFine.paidFines.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">Total Paid</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>  
  );
};

export default IssuesManagementPage;