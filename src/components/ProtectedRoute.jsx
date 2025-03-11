import { useAuthenticationStatus } from '@nhost/react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to the login page, but save the current location they were trying to access
    return <Navigate 
      to="/login" 
      state={{ from: location.pathname }}
      replace
    />;
  }

  return children;
};

export default ProtectedRoute;