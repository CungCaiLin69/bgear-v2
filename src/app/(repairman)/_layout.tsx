import { Stack } from 'expo-router';
import ProtectedRoute from '../../components/ProtectedRoute'; // Adjust path if necessary

export default function OrderRepairmanLayout() {
  return (
    <ProtectedRoute>
      <Stack>
        <Stack.Screen name="order-repairman" options={{ headerShown: false }} />
        <Stack.Screen name="waiting-order" options={{ headerShown: false }} />
        <Stack.Screen name="order-tracking" options={{ headerShown: false }} />
        <Stack.Screen name="chat-repairman" options={{ headerShown: false }} />
      </Stack>
    </ProtectedRoute>
  )
}