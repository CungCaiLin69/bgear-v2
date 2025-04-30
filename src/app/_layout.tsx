// app/_layout.tsx
import React from 'react';
import { Slot } from 'expo-router';
import { AuthProvider } from '../utils/AuthProvider';
import { SocketProvider } from '../utils/SocketProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Slot />
      </SocketProvider>
    </AuthProvider>
  );
}
