import { Stack } from 'expo-router';
import ProtectedRoute from '../../components/ProtectedRoute'; // Adjust path if necessary

export default function HomeLayout() {
  return (
    <ProtectedRoute>
      <Stack>
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="create-shop" options={{ headerShown: false }} />
        <Stack.Screen name="edit-shop" options={{ headerShown: false }} />
      </Stack>
    </ProtectedRoute>
  );
}