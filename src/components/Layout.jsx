import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSignOut, useUserData } from '@nhost/react';
import { Bars3Icon, XMarkIcon, HomeIcon, UserIcon, BookmarkIcon } from '@heroicons/react/24/outline';

export default function Layout({ children }) {
  const user = useUserData();
  const { signOut } = useSignOut();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-blue-600">NewsDigest</span>
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/dashboard"
                  className={`${isActive('/dashboard') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} 
                    inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                  aria-current={isActive('/dashboard') ? 'page' : undefined}
                >
                  <HomeIcon className="h-5 w-5 mr-1" />
                  Feed
                </Link>
                <Link
                  to="/preferences"
                  className={`${isActive('/preferences') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} 
                    inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                  aria-current={isActive('/preferences') ? 'page' : undefined}
                >
                  <UserIcon className="h-5 w-5 mr-1" />
                  Preferences
                </Link>
                <Link
                  to="/saved"
                  className={`${isActive('/saved') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} 
                    inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                  aria-current={isActive('/saved') ? 'page' : undefined}
                >
                  <BookmarkIcon className="h-5 w-5 mr-1" />
                  Saved
                </Link>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="ml-3 relative">
                <div className="flex items-center space-x-4">
                  {user?.metadata?.firstName && (
                    <span className="text-sm font-medium text-gray-700">
                      Hi, {user.metadata.firstName}
                    </span>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-white bg-gray-100 hover:bg-blue-600 rounded-md transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center sm:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">{isMobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu, show/hide based on menu state */}
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:hidden`} id="mobile-menu">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/dashboard"
              className={`${isActive('/dashboard')
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <HomeIcon className="h-5 w-5 mr-2" />
                Feed
              </div>
            </Link>
            <Link
              to="/preferences"
              className={`${isActive('/preferences')
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Preferences
              </div>
            </Link>
            <Link
              to="/saved"
              className={`${isActive('/saved')
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <BookmarkIcon className="h-5 w-5 mr-2" />
                Saved
              </div>
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  {user?.metadata?.firstName ? (
                    <span className="text-blue-600 font-medium">
                      {user.metadata.firstName.charAt(0)}{user.metadata.lastName?.charAt(0) || ''}
                    </span>
                  ) : (
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  )}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800 truncate max-w-[200px]">
                  {user?.metadata?.firstName ? `${user.metadata.firstName} ${user.metadata.lastName || ''}` : user?.email}
                </div>
                <div className="text-sm font-medium text-gray-500 truncate max-w-[200px]">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-6 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}