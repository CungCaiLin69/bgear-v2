import React from 'react';
import { View, Text, Button } from 'react-native';
import { useAuth } from '../../utils/AuthProvider'; // Adjust path if necessary
import { useRouter } from 'expo-router';

export default function HomePage() {
  const { userToken, logout } = useAuth();
  const router = useRouter();

  if (!userToken) {
    router.replace('/(auth)/welcome'); // Redirect to login if not logged in
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome'); // Redirect to login after logout
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome to the Homepage!</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}