import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Layout from './components/layout/Layout';
import BooksPage from './pages/BooksPage';
import AddBookPage from './pages/AddBookPage';
import EditBookPage from './pages/EditBookPage'; 
import MyRequestsPage from './pages/MyRequestsPage';
import RequestsManagementPage from './pages/RequestsManagementPage';
import MyIssuesPage from './pages/MyIssuesPage';
import IssuesManagementPage from './pages/IssuesManagementPage';
import UserDashboard from './components/UserDashboard';
import LibrarianDashboard from './components/LibrarianDashboard';






const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/auth" />;
};

const Dashboard = () => {
  const { user, isLibrarian } = useAuth();
  
  // For users, show the enhanced dashboard
  if (!isLibrarian()) {
    return <UserDashboard user={user} />;
  }
  
  // For librarians, keep the existing placeholder for now
  return <LibrarianDashboard user={user} />;
};


const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/auth" 
        element={!isAuthenticated ? <AuthPage /> : <Navigate to="/dashboard" />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth"} />} 
      />
      
      {/* Protected Routes with Layout */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/books" element={
        <ProtectedRoute>
          <Layout>
            <BooksPage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/books/add" element={
        <ProtectedRoute>
          <Layout>
            <AddBookPage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/books/:id/edit" element={
        <ProtectedRoute>
          <Layout>
            <EditBookPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      
      <Route path="/issues" element={
        <ProtectedRoute>
          <Layout>
            <IssuesManagementPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/requests" element={
        <ProtectedRoute>
          <Layout>
            <RequestsManagementPage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/my-requests" element={
        <ProtectedRoute>
          <Layout>
            <MyRequestsPage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/my-issues" element={
        <ProtectedRoute>
          <Layout>
            <MyIssuesPage />
          </Layout>
        </ProtectedRoute>
      } />

    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
