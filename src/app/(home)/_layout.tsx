// app/(home)/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../../utils/AuthProvider';

export default function HomeLayout() {
  const { userToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If no token, go back to starting screen
    if (!userToken) {
      router.replace('/');
    }
  }, [userToken]);

  return (
    <AuthProvider>
        <Stack>
        <Stack.Screen
            name="home"
            options={{ headerShown: false }}
        />
        {/* If you add more screens for logged-in users, define them here */}
        </Stack>
    </AuthProvider>
  );
}
