import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NhostProvider } from '@nhost/react';
import { NhostApolloProvider } from '@nhost/react-apollo';
import { nhost } from './lib/nhost';
import { Toaster } from './components/ui/Toaster';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Preferences from './pages/Preferences';
import ArticleDetail from './pages/ArticleDetail';
import SavedArticles from './pages/SavedArticles';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';

// Context
import { ToastProvider } from './contexts/ToastContext';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading of resources
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-800">Loading NewsDigest...</h2>
        </div>
      </div>
    );
  }

  return (
    <NhostProvider nhost={nhost}>
      <NhostApolloProvider nhost={nhost}>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/preferences"
                element={
                  <ProtectedRoute>
                    <Preferences />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saved"
                element={
                  <ProtectedRoute>
                    <SavedArticles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/article/:id"
                element={
                  <ProtectedRoute>
                    <ArticleDetail />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </Router>
        </ToastProvider>
      </NhostApolloProvider>
    </NhostProvider>
  );
}

export default App;