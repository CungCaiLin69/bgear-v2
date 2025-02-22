import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../utils/AuthProvider';

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    // userToken is now null, so (home)/_layout.tsx will redirect to (auth)/starting
    router.replace('/');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to BGear Home!</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20 },
});
