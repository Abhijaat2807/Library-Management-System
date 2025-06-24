import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, requestsAPI, issuesAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';


const UserDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    currentIssues: [],
    recentRequests: [],
    stats: {
      totalBooksRead: 0,
      currentlyIssued: 0,
      pendingRequests: 0,
      overdueBooks: 0,
      totalFines: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('=== USER DASHBOARD: FETCHING DATA ===');
      
      // Fetch user's current issues and requests
      const [userIssues, userRequests] = await Promise.all([
        issuesAPI.getUserIssues().catch((err) => {
          console.error('Error fetching user issues:', err);
          return { data: [] };
        }),
        requestsAPI.getUserRequests().catch((err) => {
          console.error('Error fetching user requests:', err);
          return { data: [] };
        })
      ]);

      // Fetch user's pending fine using the WORKING API
      let userPendingFine = 0;
      try {
        console.log('=== FETCHING USER FINES (WORKING API) ===');
        const response = await fetch('http://localhost:5000/api/book-issues/my-fines', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const finesData = await response.json();
          console.log('Fines API response:', finesData);
          userPendingFine = finesData.user?.pendingFine || 0;
          console.log('User pending fine from API:', userPendingFine);
        } else {
          console.error('Fines API error:', response.status);
        }
      } catch (fineError) {
        console.error('Error fetching user fines:', fineError);
        userPendingFine = 0;
      }

      const currentIssues = userIssues.data?.issuedBooks || userIssues.data || [];
      const recentRequests = userRequests.data?.requests || userRequests.data || [];

      console.log('=== USER DASHBOARD: DATA PROCESSING ===');
      console.log('Current issues:', currentIssues.length);
      console.log('Recent requests:', recentRequests.length);
      console.log('User pending fine (FINAL):', userPendingFine);

      // Calculate stats
      const stats = {
        totalBooksRead: recentRequests.filter(r => r.status === 'returned').length,
        currentlyIssued: currentIssues.filter(i => i.status === 'issued').length,
        pendingRequests: recentRequests.filter(r => r.status === 'pending').length,
        overdueBooks: currentIssues.filter(i => {
          const today = new Date();
          const dueDate = new Date(i.dueDate);
          return i.status === 'issued' && today > dueDate;
        }).length,
        totalFines: userPendingFine // This should now show the correct amount!
      };

      console.log('=== USER DASHBOARD: FINAL STATS ===');
      console.log('Final stats:', stats);

      setDashboardData({
        currentIssues: currentIssues.slice(0, 3),
        recentRequests: recentRequests.slice(0, 3),
        stats
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">Pending</Badge>,
      approved: <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Approved</Badge>,
      rejected: <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Rejected</Badge>,
      issued: <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Issued</Badge>
    };
    return badges[status] || <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{status}</Badge>;
  };

  const getDueDateBadge = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Overdue</Badge>;
    } else if (diffDays <= 3) {
      return <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">Due Soon</Badge>;
    }
    return <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">On Time</Badge>;
  };

  const testFineAPIWithToken = async () => {
    try {
      console.log('=== TESTING FINE API WITH MANUAL TOKEN ===');
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('Token starts with:', token?.substring(0, 20) + '...');
      
      // Use FULL backend URL instead of relative path
      const backendUrl = 'http://localhost:5000'; // Change this to your actual backend URL
      const fullUrl = `${backendUrl}/api/book-issues/my-fines`;
      console.log('Full URL:', fullUrl);
      
      // Manual API call with explicit headers and FULL URL
      const response = await fetch(fullUrl, { // <- Use fullUrl instead of relative path
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      // Get the raw response text first
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      if (!response.ok) {
        console.error('Error response text:', responseText);
        alert(`API Error: ${response.status} - ${responseText.substring(0, 200)}...`);
        return;
      }
      
      // Try to parse as JSON
      try {
        const data = JSON.parse(responseText);
        console.log('Parsed JSON:', data);
        console.log('User pending fine:', data?.user?.pendingFine);
        alert(`Your pending fine: $${data?.user?.pendingFine || 0}`);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        alert(`Response is not JSON. Got: ${responseText.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.error('API Error:', error);
      alert('Network Error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      

      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.email?.split('@')[0]}!</h1>
        <p className="text-gray-600 dark:text-gray-300">Here's your library overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboardData.stats.currentlyIssued}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Currently Reading</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{dashboardData.stats.pendingRequests}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Requests</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{dashboardData.stats.totalBooksRead}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Books Read</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboardData.stats.overdueBooks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overdue Books</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">${dashboardData.stats.totalFines.toFixed(2)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Fines</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(dashboardData.stats.overdueBooks > 0 || dashboardData.stats.totalFines > 0) && (
        <Card className="border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-red-800 dark:text-red-200">Attention Required</h3>
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">
              {dashboardData.stats.overdueBooks > 0 && (
                <p>• You have {dashboardData.stats.overdueBooks} overdue book(s)</p>
              )}
              {dashboardData.stats.totalFines > 0 && (
                <p>• You have ${dashboardData.stats.totalFines.toFixed(2)} in pending fines</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currently Reading */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <BookOpen className="w-5 h-5" />
              Currently Reading
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.currentIssues.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">No books currently issued</p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/books')}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Browse Books
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.currentIssues.map((issue) => (
                  <div key={issue._id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{issue.book?.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">by {issue.book?.author}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Due: {formatDate(issue.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      {getDueDateBadge(issue.dueDate)}
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
                  onClick={() => navigate('/my-issues')}
                >
                  View All Issues
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Clock className="w-5 h-5" />
              Recent Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.recentRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">No recent requests</p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/books')}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Request a Book
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.recentRequests.map((request) => (
                  <div key={request._id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{request.book?.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">by {request.book?.author}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Requested: {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
                  onClick={() => navigate('/my-requests')}
                >
                  View All Requests
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => navigate('/books')}
            >
              <BookOpen className="w-4 h-4" />
              Browse Books
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => navigate('/my-requests')}
            >
              <Clock className="w-4 h-4" />
              My Requests
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => navigate('/my-issues')}
            >
              <Calendar className="w-4 h-4" />
              My Issues
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;