// Script to fix styling issues
if (typeof window !== 'undefined' && document) {
  console.log('Applying emergency style fixes...');
  
  function addStyleFix() {
    // Create a style element for critical CSS
    const style = document.createElement('style');
    style.textContent = `
      /* Core TailwindCSS utilities needed for layout */
      .flex { display: flex !important; }
      .items-center { align-items: center !important; }
      .justify-center { justify-content: center !important; }
      .justify-between { justify-content: space-between !important; }
      .flex-col { flex-direction: column !important; }
      .w-full { width: 100% !important; }
      .max-w-7xl { max-width: 80rem !important; }
      .mx-auto { margin-left: auto !important; margin-right: auto !important; }
      .my-4 { margin-top: 1rem !important; margin-bottom: 1rem !important; }
      .space-y-4 > * + * { margin-top: 1rem !important; }
      .p-4 { padding: 1rem !important; }
      .px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
      .py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
      .bg-white { background-color: #ffffff !important; }
      .bg-gray-50 { background-color: #f9fafb !important; }
      .rounded { border-radius: 0.25rem !important; }
      .shadow { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06) !important; }
      .text-gray-800 { color: #1f2937 !important; }
      
      /* Navigation specific styles */
      nav { 
        background-color: #ffffff !important;
        box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1) !important;
      }
      
      /* Card specific styles */
      .card, .news-card {
        background-color: #ffffff !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06) !important;
        padding: 1.25rem !important;
        margin-bottom: 1rem !important;
      }
      
      /* Form styles */
      input, button, select, textarea {
        font-family: inherit !important;
      }
      
      input[type="text"], input[type="email"], input[type="password"] {
        width: 100% !important;
        padding: 0.5rem 0.75rem !important;
        border: 1px solid #d1d5db !important;
        border-radius: 0.375rem !important;
      }
      
      button {
        padding: 0.5rem 1rem !important;
        background-color: #3b82f6 !important;
        color: white !important;
        border-radius: 0.375rem !important;
        font-weight: 500 !important;
      }
      
      /* Animations */
      .animate-spin {
        animation: spin 1s linear infinite !important;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg) !important; }
      }
    `;
    document.head.appendChild(style);
    
    // Try to load the emergency-fix.css file again
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = '/emergency-fix.css';
    document.head.appendChild(linkElement);
    
    console.log('Emergency style fixes applied');
  }
  
  // Run immediately
  addStyleFix();
  
  // Also run when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addStyleFix);
  }
  
  // Run again after everything is loaded
  window.addEventListener('load', addStyleFix);
}

export default {};