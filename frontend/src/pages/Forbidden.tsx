import { useNavigate } from 'react-router-dom';

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="text-center animate-fade-in px-4">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative text-9xl">🚫</div>
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-bold text-white mb-4 tracking-tight">403</h1>
        
        {/* Title */}
        <h2 className="text-3xl font-semibold text-white mb-4">Access Denied</h2>
        
        {/* Description */}
        <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">
          You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
        </p>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            <span className="text-lg">←</span>
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-sm text-gray-400">
          <p>Your current role may not have access to this feature.</p>
          <p className="mt-1">Contact your system administrator to request access.</p>
        </div>
      </div>
    </div>
  );
}
