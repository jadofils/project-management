import { AlertCircle, Lock, Construction } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">404</h1>
        <p className="text-gray-500 mb-1">Page Not Found</p>
        <p className="text-sm text-gray-400">The page you're looking for doesn't exist or has been moved.</p>
      </div>
    </div>
  );
}

export function ForbiddenPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">403</h1>
        <p className="text-gray-500 mb-1">Access Denied</p>
        <p className="text-sm text-gray-400">You don't have permission to view this page. Please contact your administrator if you believe this is a mistake.</p>
      </div>
    </div>
  );
}

export function ComingSoonPage({ feature }: { feature?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Coming Soon</h1>
        <p className="text-gray-500">{feature ? `${feature} is` : 'This feature is'} under development and will be available soon.</p>
      </div>
    </div>
  );
}
