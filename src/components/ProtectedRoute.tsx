import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../utils/AuthProvider'; // Adjust path if necessary

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return null; // Show a loading indicator or nothing while checking
  }

  if (!userToken) {
    return <Redirect href="/(auth)/welcome" />; // Redirect to login if not logged in
  }

  return <>{children}</>; // Allow access to the protected route
}