import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export function Toaster() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-6 w-6 text-red-500" />;
      case 'info':
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-3 z-50 max-w-xs sm:max-w-md w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start p-4 rounded-lg shadow-lg border transition-all transform translate-y-0 opacity-100 ${getBackgroundColor(toast.type)}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="flex-shrink-0 mr-3">
            {getIcon(toast.type)}
          </div>
          <div className={`mr-2 flex-1 ${getTextColor(toast.type)}`}>
            {toast.message}
          </div>
          <button
            type="button"
            className={`flex-shrink-0 ml-1 ${getTextColor(toast.type)} hover:opacity-75 focus:outline-none`}
            onClick={() => removeToast(toast.id)}
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}