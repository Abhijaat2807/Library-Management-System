import React, { useState, useEffect } from 'react';
import { issuesAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Calendar, AlertTriangle, Clock, DollarSign } from 'lucide-react';

const MyIssuesPage = () => {
  const [currentIssues, setCurrentIssues] = useState([]);
  const [bookHistory, setBookHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPayFineDialog, setShowPayFineDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [userPendingFine, setUserPendingFine] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [currentResponse, historyResponse] = await Promise.all([
        issuesAPI.getUserIssues(),
        issuesAPI.getUserHistory()
      ]);

      setCurrentIssues(currentResponse.data.issuedBooks || []);
      setBookHistory(historyResponse.data.bookHistory || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
      setError('Failed to load your issued books');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPendingFine = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/book-issues/my-fines', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const finesData = await response.json();
        setUserPendingFine(finesData.user?.pendingFine || 0);
      }
    } catch (error) {
      console.error('Error fetching user fines:', error);
      setUserPendingFine(0);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUserPendingFine();
  }, []);

  const handlePayFine = async (totalAmount) => {
    try {
      console.log('=== PAYING FULL FINE ===');
      console.log('Total amount to pay:', totalAmount);
      console.log('User stored pending fine:', userPendingFine);
      
      // Use the direct API call with full URL for consistency
      const response = await fetch('http://localhost:5000/api/book-issues/pay-fine', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: totalAmount })
      });

      console.log('Payment response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment error:', errorData);
        alert(`Payment failed: ${errorData.message}`);
        return;
      }

      const result = await response.json();
      console.log('Payment successful:', result);
      
      alert(`Fine payment successful!\n\nAmount Paid: $${totalAmount.toFixed(2)}\nRemaining Fine: $${result.remainingFine.toFixed(2)}\n\nThank you for your payment!`);
      
      setShowPayFineDialog(false);
      
      // Refresh all data
      await fetchData();
      await fetchUserPendingFine();
      
    } catch (error) {
      console.error('Error paying fine:', error);
      alert('Failed to process payment: ' + error.message);
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
    const isOverdue = issue.isOverdue || new Date() > new Date(issue.dueDate);
    
    if (issue.status === 'returned') {
      return <Badge className="bg-green-100 text-green-800">Returned</Badge>;
    }
    
    if (isOverdue) {
      return <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Overdue
      </Badge>;
    }
    
    return <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
      <Clock className="w-3 h-3" />
      Issued
    </Badge>;
  };

  const getDaysInfo = (issue) => {
    const today = new Date();
    const dueDate = new Date(issue.dueDate);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (issue.status === 'returned') {
      // For returned books, show the calculated fine if it exists
      const returnedFine = issue.calculatedFine || 0;
      const finePaidStatus = issue.finePaid ? ' (Paid)' : ' (Unpaid)';
      
      return (
        <div>
          <div>Returned on {formatDate(issue.returnDate)}</div>
          {returnedFine > 0 && (
            <div className={`text-sm font-medium ${issue.finePaid ? 'text-green-600' : 'text-red-600'}`}>
              Fine: ${returnedFine.toFixed(2)}{finePaidStatus}
            </div>
          )}
        </div>
      );
    }

    if (diffDays < 0) {
      // Use the SAME calculation as in the fine card below
      const overdueDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      const currentFine = overdueDays * (issue.finePerDay || 0);
      
      return (
        <div>
          <div className="text-red-600 font-medium">
            {overdueDays} days overdue
          </div>
          {currentFine > 0 && (
            <div className="text-red-600 font-bold">
              Current Fine: ${currentFine.toFixed(2)}
            </div>
          )}
        </div>
      );
    } else if (diffDays === 0) {
      return <div className="text-yellow-600 font-medium">Due today!</div>;
    } else {
      return <div className="text-green-600">{diffDays} days remaining</div>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your issued books...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            My Issued Books
          </h1>
          <p className="text-gray-600">Track your borrowed books and due dates</p>
        </div>

        {/* Pay Fine Button - Only for stored pending fines */}
        {(() => {
          // Only use stored pending fines from user account
          const totalPayableFine = userPendingFine;
          
          // Show pay button only if there are stored pending fines
          if (totalPayableFine > 0) {
            return (
              <Dialog open={showPayFineDialog} onOpenChange={setShowPayFineDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-red-500 hover:bg-red-600 text-white">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay Outstanding Fines (${totalPayableFine.toFixed(2)})
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white text-black">
                  <DialogHeader>
                    <DialogTitle className="text-black">Confirm Fine Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">Payment Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Outstanding fines:</span>
                          <span className="font-medium">${userPendingFine.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between">
                          <span className="font-medium text-gray-800">Total Amount to Pay:</span>
                          <span className="font-bold text-red-600 text-lg">${totalPayableFine.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> You must pay all outstanding fines to continue borrowing books.
                      </p>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      You will pay the full outstanding fine amount. This payment cannot be undone.
                    </p>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handlePayFine(totalPayableFine)}
                        className="flex-1 bg-green-500 text-white hover:bg-green-600"
                      >
                        Confirm Payment (${totalPayableFine.toFixed(2)})
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowPayFineDialog(false)}
                        className="bg-white text-black border-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          }
          return null;
        })()}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Enhanced Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{currentIssues.length}</div>
            <div className="text-sm text-gray-600">Currently Issued</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {currentIssues.filter(issue => issue.isOverdue || new Date() > new Date(issue.dueDate)).length}
            </div>
            <div className="text-sm text-gray-600">Overdue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {bookHistory.filter(issue => issue.status === 'returned').length}
            </div>
            <div className="text-sm text-gray-600">Total Returned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              ${userPendingFine.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Outstanding Fines</div>
            <div className="text-xs text-gray-500">(Must pay to borrow)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              ${bookHistory.reduce((total, issue) => {
                // Only count PAID fines for "Total Paid"
                return total + (issue.finePaid && issue.calculatedFine ? issue.calculatedFine : 0);
              }, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Paid Fines</div>
            <div className="text-xs text-gray-500">(Lifetime)</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('current')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'current'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Current Issues ({currentIssues.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History ({bookHistory.length})
          </button>
        </nav>
      </div>

      {/* Issues List */}
      <div className="grid gap-4">
        {activeTab === 'current' && currentIssues.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No books currently issued</h3>
              <p className="text-gray-600">You don't have any books issued right now.</p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'history' && bookHistory.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No book history</h3>
              <p className="text-gray-600">You haven't borrowed any books yet.</p>
            </CardContent>
          </Card>
        )}

        {(activeTab === 'current' ? currentIssues : bookHistory).map((issue) => {
          // Use CONSISTENT fine calculation
          const today = new Date();
          const dueDate = new Date(issue.dueDate);
          const isOverdue = today > dueDate;
          
          // Use the SAME calculation method as in getDaysInfo
          const overdueDays = isOverdue ? Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
          const currentFine = issue.status === 'returned' 
            ? (issue.calculatedFine || 0) 
            : (isOverdue ? overdueDays * (issue.finePerDay || 0) : 0);

          return (
            <Card key={issue._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      {issue.book?.title || 'Unknown Book'}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      by {issue.book?.author || 'Unknown Author'}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Issued: {formatDate(issue.issueDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due: {formatDate(issue.dueDate)}
                      </div>
                    </div>

                    <div className="mb-3">
                      {getDaysInfo(issue)}
                    </div>

                    {/* Fine Information Section - Now uses consistent calculation */}
                    {currentFine > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-red-800">
                              Fine for this book:
                            </div>
                            <div className="text-lg font-bold text-red-600">
                              ${currentFine.toFixed(2)}
                            </div>
                            {/* Show the calculation breakdown */}
                            {overdueDays > 0 && issue.status !== 'returned' && (
                              <div className="text-xs text-red-600">
                                ({overdueDays} days × ${issue.finePerDay?.toFixed(2)}/day)
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {issue.status === 'returned' ? (
                              <Badge className={issue.finePaid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {issue.finePaid ? 'Paid' : 'Unpaid'}
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Accumulating
                              </Badge>
                            )}
                          </div>
                        </div>
                        {issue.finePerDay > 0 && issue.status !== 'returned' && (
                          <div className="text-xs text-red-600 mt-1">
                            +${issue.finePerDay.toFixed(2)} per day
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right ml-4">
                    {getStatusBadge(issue)}
                    {issue.finePerDay > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Fine Rate: ${issue.finePerDay}/day
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MyIssuesPage;