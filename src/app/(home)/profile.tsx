import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '../../utils/AuthProvider'; // Adjust path if necessary
import { useRouter } from 'expo-router';

export default function ProfilePage() {
  const { userToken } = useAuth();
  const router = useRouter();

  if (!userToken) {
    router.replace('/(auth)/welcome'); // Redirect to login if not logged in
    return null;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Profile Page</Text>
    </View>
  );
}