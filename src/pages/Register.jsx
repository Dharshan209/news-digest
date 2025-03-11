import React, { useState } from 'react';
import { useSignUpEmailPassword, useSignInEmailPassword } from '@nhost/react';
import { Navigate, Link } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, UserIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [redirectToLogin, setRedirectToLogin] = useState(false);
  
  const { signUpEmailPassword, isLoading: isSignUpLoading, isSuccess: isSignUpSuccess, error: signUpError } = useSignUpEmailPassword();
  const { signInEmailPassword, isLoading: isSignInLoading, isSuccess: isSignInSuccess, error: signInError } = useSignInEmailPassword();
  
  const isLoading = isSignUpLoading || isSignInLoading;

  if (isSignUpSuccess && isSignInSuccess) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (redirectToLogin) {
    return <Navigate to="/login" replace />;
  }

  const validateForm = () => {
    const errors = {};
    
    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = 'Password must include at least one uppercase letter, one lowercase letter, and one number';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const result = await signUpEmailPassword(email, password, {
        displayName: `${firstName} ${lastName}`,
        metadata: {
          firstName,
          lastName
        }
      });
      
      if (result.error) {
        console.error("Registration error:", result.error);
      } else {
        // Auto-login after successful registration
        try {
          await signInEmailPassword(email, password);
        } catch (loginErr) {
          console.error("Auto-login error:", loginErr);
          // If auto-login fails, redirect to login page
          setRedirectToLogin(true);
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
    }
  };
  
  const getErrorMessage = () => {
    if (signUpError?.message?.includes('already exists')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    return signUpError?.message || signInError?.message;
  };
  
  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };
  
  const passwordStrength = getPasswordStrength();
  
  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 2) return { label: 'Weak', color: 'text-red-500' };
    if (passwordStrength < 4) return { label: 'Medium', color: 'text-yellow-500' };
    return { label: 'Strong', color: 'text-green-500' };
  };
  
  const { label: strengthLabel, color: strengthColor } = getPasswordStrengthLabel();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {(signUpError || signInError) && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded flex items-start">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">{getErrorMessage()}</p>
                {signUpError?.message?.includes('already exists') && (
                  <p className="mt-1 text-sm">
                    <Link to="/login" className="text-red-700 hover:text-red-800 font-medium">
                      Click here to sign in instead
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (formErrors.firstName) {
                        setFormErrors({...formErrors, firstName: undefined});
                      }
                    }}
                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                      formErrors.firstName ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="John"
                  />
                  {formErrors.firstName && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {formErrors.firstName && (
                  <p className="mt-2 text-sm text-red-600" id="firstName-error">
                    {formErrors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (formErrors.lastName) {
                        setFormErrors({...formErrors, lastName: undefined});
                      }
                    }}
                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                      formErrors.lastName ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Doe"
                  />
                  {formErrors.lastName && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {formErrors.lastName && (
                  <p className="mt-2 text-sm text-red-600" id="lastName-error">
                    {formErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formErrors.email) {
                      setFormErrors({...formErrors, email: undefined});
                    }
                  }}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="you@example.com"
                />
                {formErrors.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {formErrors.email && (
                <p className="mt-2 text-sm text-red-600" id="email-error">
                  {formErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.password) {
                      setFormErrors({...formErrors, password: undefined});
                    }
                  }}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    formErrors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="••••••••"
                />
                {formErrors.password && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {formErrors.password ? (
                <p className="mt-2 text-sm text-red-600" id="password-error">
                  {formErrors.password}
                </p>
              ) : password ? (
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${
                        passwordStrength < 2 ? 'bg-red-500' : 
                        passwordStrength < 4 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} style={{ width: `${Math.min(100, passwordStrength * 25)}%` }}></div>
                    </div>
                    <span className={`ml-2 text-xs font-medium ${strengthColor}`}>{strengthLabel}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be at least 8 characters with uppercase, lowercase, and numbers
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I agree to the{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </a>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </>
                ) : 'Create account'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}