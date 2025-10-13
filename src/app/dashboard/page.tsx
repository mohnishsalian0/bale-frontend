import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Welcome to Bale Inventory!
        </h1>

        {/* <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Your Profile</h2>
          <div className="space-y-2">
            <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> <span className="capitalize">{user.role}</span></p>
            <p><strong>Company ID:</strong> {user.company_id}</p>
            {user.warehouse_id && (
              <p><strong>Warehouse ID:</strong> {user.warehouse_id}</p>
            )}
          </div>
        </div> */}

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            🎉 Authentication Successful!
          </h3>
          <p className="text-green-700">
            You have successfully signed in with Google and your profile has been created.
            The full application features will be built in the next phases.
          </p>
        </div>
      </div>
    </div>
  );
}
