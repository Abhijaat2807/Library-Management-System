import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestsAPI, issuesAPI, booksAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  BarChart3
} from 'lucide-react';

const LibrarianDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalBooks: 0,
      totalIssued: 0,
      totalOverdue: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      totalFinesCollected: 0,
      todayReturns: 0,
      todayIssues: 0
    },
    recentRequests: [],
    overdueBooks: [],
    recentIssues: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibrarianData();
  }, []);

  const fetchLibrarianData = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple data sources
      const [allRequests, currentIssues, allBooks] = await Promise.all([
        requestsAPI.getLibrarianRequests().catch(() => ({ data: [] })),
        issuesAPI.getCurrentlyIssued().catch(() => ({ data: [] })),
        booksAPI.getAllBooks().catch(() => ({ data: [] }))
      ]);

      const requests = allRequests.data?.requests || allRequests.data || [];
      const issues = currentIssues.data?.issuedBooks || currentIssues.data || [];
      const books = allBooks.data?.books || allBooks.data || [];

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Calculate overdue books
      const overdueBooks = issues.filter(issue => {
        const dueDate = new Date(issue.dueDate);
        return issue.status === 'issued' && today > dueDate;
      });

      // Calculate today's activities
      const todayIssues = issues.filter(issue => {
        const issueDate = new Date(issue.issueDate);
        return issueDate >= todayStart;
      });

      const todayReturns = issues.filter(issue => {
        const returnDate = new Date(issue.returnDate);
        return issue.status === 'returned' && returnDate >= todayStart;
      });

      // Calculate total fines
      const totalFines = issues.reduce((total, issue) => {
        if (issue.status === 'issued' && issue.finePerDay) {
          const dueDate = new Date(issue.dueDate);
          if (today > dueDate) {
            const overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
            return total + (overdueDays * issue.finePerDay);
          }
        }
        return total;
      }, 0);

      const stats = {
        totalBooks: books.length,
        totalIssued: issues.filter(i => i.status === 'issued').length,
        totalOverdue: overdueBooks.length,
        pendingRequests: requests.filter(r => r.status === 'pending').length,
        approvedRequests: requests.filter(r => r.status === 'approved').length,
        totalFinesCollected: totalFines,
        todayReturns: todayReturns.length,
        todayIssues: todayIssues.length
      };

      setDashboardData({
        stats,
        recentRequests: requests.slice(0, 5),
        overdueBooks: overdueBooks.slice(0, 5),
        recentIssues: issues.slice(0, 5)
      });
    } catch (error) {
      console.error('Error fetching librarian dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const getOverdueDays = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    return Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Librarian Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Welcome back, {user?.email?.split('@')[0]}! Here's your library overview</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/books/add')} 
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Book
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/requests')}
            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <FileText className="w-4 h-4 mr-2" />
            Manage Requests
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboardData.stats.totalBooks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Books</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{dashboardData.stats.totalIssued}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Currently Issued</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{dashboardData.stats.pendingRequests}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Pending Requests</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboardData.stats.totalOverdue}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Overdue Books</div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dashboardData.stats.approvedRequests}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Ready to Issue</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">${dashboardData.stats.totalFinesCollected.toFixed(2)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Pending Fines</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{dashboardData.stats.todayIssues}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Issued Today</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{dashboardData.stats.todayReturns}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Returned Today</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(dashboardData.stats.totalOverdue > 0 || dashboardData.stats.pendingRequests > 0) && (
        <Card className="border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Attention Required</h3>
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              {dashboardData.stats.totalOverdue > 0 && (
                <p>• {dashboardData.stats.totalOverdue} overdue books need attention</p>
              )}
              {dashboardData.stats.pendingRequests > 0 && (
                <p>• {dashboardData.stats.pendingRequests} requests awaiting approval</p>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              {dashboardData.stats.totalOverdue > 0 && (
                <Button 
                  size="sm" 
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => navigate('/issues')}
                >
                  View Overdue Books
                </Button>
              )}
              {dashboardData.stats.pendingRequests > 0 && (
                <Button 
                  size="sm" 
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={() => navigate('/requests')}
                >
                  Review Requests
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Requests
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/requests')}
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.recentRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">No recent requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.recentRequests.map((request) => (
                  <div key={request._id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate text-gray-900 dark:text-white">{request.book?.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">by {request.book?.author}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {request.user?.email} • {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Books */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                Overdue Books
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/issues')}
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.overdueBooks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">No overdue books! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.overdueBooks.map((issue) => (
                  <div key={issue._id} className="flex items-start justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate text-gray-900 dark:text-white">{issue.book?.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">by {issue.book?.author}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {issue.user?.email} • Due: {formatDate(issue.dueDate)}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        {getOverdueDays(issue.dueDate)} days overdue
                      </Badge>
                    </div>
                  </div>
                ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => navigate('/books/add')}
            >
              <Plus className="w-4 h-4" />
              Add New Book
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => navigate('/requests')}
            >
              <FileText className="w-4 h-4" />
              Manage Requests
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => navigate('/issues')}
            >
              <BookOpen className="w-4 h-4" />
              Manage Issues
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => navigate('/books')}
            >
              <BarChart3 className="w-4 h-4" />
              View All Books
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LibrarianDashboard;