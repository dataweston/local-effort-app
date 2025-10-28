import React from 'react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';

export const CalendarAuthBanner = () => {
  const { user, isAdmin, loading, signInWithGoogle, signOut } = useSupabaseAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Card className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Sign in for full calendar access
            </h3>
            <p className="text-sm text-gray-600">
              You're viewing public events only. Sign in with Google to see all calendar details.
            </p>
          </div>
          <Button
            onClick={signInWithGoogle}
            className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.email}</p>
            <p className="text-sm text-gray-600">
              {isAdmin ? '👑 Admin Access - Viewing all events' : 'Viewing public events'}
            </p>
          </div>
        </div>
        <Button
          onClick={signOut}
          variant="outline"
          size="sm"
          className="border-gray-300"
        >
          Sign out
        </Button>
      </div>
    </Card>
  );
};
