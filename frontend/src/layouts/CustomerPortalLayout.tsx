import { ReactNode } from 'react';

interface CustomerPortalLayoutProps {
  children: ReactNode;
}

/**
 * Customer Portal Layout - Completely isolated from internal workspace
 * No internal navigation, different branding, customer-focused design
 */
export function CustomerPortalLayout({ children }: CustomerPortalLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Customer Portal Header - No internal nav */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo Only - Customer Branding */}
            <div className="flex items-center space-x-3">
              <img 
                src="/logo_dealflow.png" 
                alt="DealFlow360" 
                className="h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-xl font-bold text-white">Customer Portal</h1>
                <p className="text-xs text-gray-400">Review & Negotiate Your Quote</p>
              </div>
            </div>

            {/* Help Link */}
            <div className="text-sm text-gray-300 hover:text-white transition-colors">
              <a href="#" className="flex items-center gap-2">
                <span>❓</span>
                <span>Need Help?</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>

      {/* Customer Portal Footer */}
      <footer className="bg-black/30 backdrop-blur-md border-t border-white/10 mt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <div>
              <p>© 2024 DealFlow360. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
