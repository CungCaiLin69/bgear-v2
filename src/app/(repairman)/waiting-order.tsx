import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../utils/AuthProvider';
import { useSocket } from '../../utils/SocketProvider';

export default function WaitingScreen() {
  const { userToken } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId ? parseInt(params.orderId as string) : 0;
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(3); // Estimated wait in minutes
  const [tips, setTips] = useState([
    "Repairmen in your area are being notified about your request",
    "Prepare any relevant information about the issue",
    "Make sure the repair area is accessible",
    "Have your payment method ready"
  ]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    const totalEstimatedSeconds = estimatedWait * 60;
    return Math.min((elapsedTime / totalEstimatedSeconds) * 100, 100);
  };

  useEffect(() => {
    // Timer for elapsed time
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      
      // Rotate tips every 8 seconds
      if (elapsedTime % 8 === 0 && elapsedTime > 0) {
        setCurrentTipIndex(prev => (prev + 1) % tips.length);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [elapsedTime, tips.length]);

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

    // Listen for estimated wait time updates
    socket.on('waitTimeUpdate', (data) => {
      if (data.orderId === orderId && data.estimatedMinutes) {
        setEstimatedWait(data.estimatedMinutes);
      }
    });

    return () => {
      socket.off('orderAccepted');
      socket.off('orderRejected');
      socket.off('waitTimeUpdate');
    };
  }, [socket, orderId, router]);

  const cancelOrder = async () => {
    if (!userToken || !orderId) {
      Alert.alert('Error', 'User not authenticated or invalid order.');
      return;
    }

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this repair request?',
      [
        {
          text: 'No, Keep Waiting',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
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
              router.replace('/order-repairman');

            } catch (error) {
              console.error('Cancel order error:', error);
              Alert.alert('Error', 'Something went wrong while cancelling the order.');
            }
          }
        }
      ]
    );
  };

  const contactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Do you want to contact customer support?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call Support',
          onPress: () => console.log('Call support')
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finding Your Repairman</Text>
        <Text style={styles.orderIdText}>Order #{orderId}</Text>
      </View>
      
      {/* Progress Indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.progressOuterCircle}>
          <View style={styles.progressInnerCircle}>
            <ActivityIndicator size="large" color="#00897B" />
            <Text style={styles.timeElapsed}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Estimated Wait Time</Text>
          <Text style={styles.statusValue}>{estimatedWait} min</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${getProgressPercentage()}%` }]} />
          </View>
        </View>
      </View>

      {/* Status Information */}
      <View style={styles.infoContainer}>
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Text style={styles.iconText}>⏱️</Text>
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Order Status</Text>
            <Text style={styles.infoValue}>Searching for repairmen...</Text>
          </View>
        </View>
        
        <View style={styles.tipCard}>
          <Text style={styles.iconText}>💡</Text>
          <Text style={styles.tipText}>{tips[currentTipIndex]}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.cancelButton]} 
          onPress={cancelOrder}
        >
          <Text style={styles.buttonIconText}>✕</Text>
          <Text style={styles.actionButtonText}>Cancel Request</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.supportButton]} 
          onPress={contactSupport}
        >
          <Text style={styles.buttonIconText}>📞</Text>
          <Text style={styles.actionButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FA',
    padding: 20,
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  orderIdText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  progressOuterCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressInnerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timeElapsed: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusContainer: {
    width: '100%',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00897B',
    marginBottom: 10,
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00897B',
  },
  infoContainer: {
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  buttonIconText: {
    fontSize: 18,
    color: '#FFF',
    marginRight: 8,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tipCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tipIcon: {
    marginRight: 12,
    fontSize: 22,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 0.48,
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  supportButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
  }
});