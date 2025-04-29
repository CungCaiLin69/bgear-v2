import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../utils/AuthProvider';
import { useSocket } from '../../utils/SocketProvider';

export default function WaitingScreen() {
  const { userToken } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId ? parseInt(params.orderId as string) : 0;
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    if (!socket || !orderId) return;

    console.log('Listening for order events for order:', orderId);
    
    // Join the specific order room
    socket.emit('joinOrderRoom', { orderId });

    // Listen for order acceptance
    socket.on('orderAccepted', (data) => {
      console.log('Order accepted event received:', data);
      if (data.orderId === orderId) {
        router.replace(`/order-tracking?orderId=${orderId}`);
      }
    });

    // Listen for order rejection
    socket.on('orderRejected', (data) => {
      console.log('Order rejected event received:', data);
      if (data.orderId === orderId) {
        Alert.alert('Order Rejected', 'No repairman accepted your order.', [
          {
            text: 'OK',
            onPress: () => router.replace('/order-repairman'),
          },
        ]);
      }
    });

    return () => {
      socket.off('orderAccepted');
      socket.off('orderRejected');
    };
  }, [socket, orderId, router]);

  const cancelOrder = async () => {
    if (!userToken || !orderId) {
      Alert.alert('Error', 'User not authenticated or invalid order.');
      return;
    }

    try {
      const response = await fetch(`http://10.0.2.2:3000/order/cancel/${orderId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Cancel failed:', data.error);
        Alert.alert('Error', data.error || 'Failed to cancel order.');
        return;
      }

      console.log('Order cancelled successfully:', data);
      setIsCancelled(true);
      router.replace('/order-repairman');

    } catch (error) {
      console.error('Cancel order error:', error);
      Alert.alert('Error', 'Something went wrong while cancelling the order.');
    }
  };

  if (isCancelled) {
    return <Text>Returning to order screen...</Text>;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00897B" />
      <Text style={styles.text}>Waiting for a repairman to accept your order...</Text>
      <Text style={styles.orderIdText}>Order ID: {orderId}</Text>
      <Button title="Cancel Order" onPress={cancelOrder} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  text: {
    marginVertical: 20,
    fontSize: 18,
    textAlign: 'center',
  },
  orderIdText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  }
});