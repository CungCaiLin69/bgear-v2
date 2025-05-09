import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useSocket } from '../../utils/SocketProvider';
import { useAuth } from '../../utils/AuthProvider';
import Icon from 'react-native-vector-icons/Ionicons';
import { router, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

type PendingOrder = {
  orderId: number;
  address: string;
  vehicleType: string;
  complaint: string;
  locationLat: number;
  locationLng: number;
  timeout: number; 
};

export default function RepairmanDashboardScreen() {
  const router = useRouter();
  const { userToken } = useAuth();
  const { socket, isConnected } = useSocket();

  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [acceptingOrderId, setAcceptingOrderId] = useState<number | null>(null);
  const [ongoingOrders, setOngoingOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!socket) {
      console.log("No socket available");
      return;
    }
    
    socket.emit('joinRepairmanChannel');

    // Listen to new incoming orders
    socket.on('newOrderRequest', (newOrderPayload) => {
      const orders = Array.isArray(newOrderPayload) ? newOrderPayload : [newOrderPayload];
      const enriched = orders.map(order => ({
        ...order,
        timeout: 180
      }));
      setPendingOrders(prev => [...prev, ...enriched]);
    });

    // Listen for rejected orders
    socket.on('orderRejected', ({ orderId }) => {
      setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
    });

    // Listen for accepted orders
    socket.on('orderAccepted', ({ orderId, repairmanId }) => {
      setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
      fetchOrders();
    });

    return () => {
      socket.off('newOrderRequest');
      socket.off('orderRejected');
      socket.off('orderAccepted');
    };
  }, [socket, isConnected]);

  // Countdown timers for each pending order
  useEffect(() => {
    if (pendingOrders.length === 0) return;
    
    const interval = setInterval(() => {
      setPendingOrders(prevOrders => {
        const updated = prevOrders
          .map(order => ({ ...order, timeout: order.timeout - 1 }))
          .filter(order => order.timeout > 0); 
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingOrders.length]);

  const acceptOrder = async (orderId: number) => {
    if (acceptingOrderId !== null) {
      return;
    }
  
    setAcceptingOrderId(orderId);
    
    try {
      const response = await fetch(`http://10.0.2.2:3000/order/accept/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept order');
      }
      
      // Emit acceptance via socket for faster updates
      socket?.emit('acceptOrder', { orderId });
      
      // Remove from pending orders
      setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
      
      // Refresh orders to update lists
      await fetchOrders();
      
      // Navigate to tracking screen
      router.push({
        pathname: '/(repairman)/order-tracking',
        params: { orderId }
      });
    } catch (error) {
      console.error('Failed to accept order:', error);
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    } finally {
      setAcceptingOrderId(null);
    }
  };

  useEffect(() => {
    fetchOrders();
    const refreshInterval = setInterval(fetchOrders, 30000);
    return () => clearInterval(refreshInterval);
  }, []);
  
  const fetchOrders = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('http://10.0.2.2:3000/api/repairman/orders', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      
      const data = await res.json();
      
      const ongoing = data.orders.filter((order: any) =>
        order.status === 'accepted' || order.status === 'on_the_way'
      );
      
      const completed = data.orders.filter((order: any) =>
        ['completed', 'finished', 'rejected', 'canceled'].includes(order.status)
      );
  
      setOngoingOrders(ongoing);
      setCompletedOrders(completed);
    } catch (error) {
      console.error('Failed to fetch repairman orders:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const rejectOrder = async (orderId: number) => {
    try {
      const response = await fetch(`http://10.0.2.2:3000/order/reject/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject order');
      }
      
      // Also emit rejection via socket for faster updates
      socket?.emit('rejectOrder', { orderId });
      
      // Remove from pending orders
      setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
    } catch (error) {
      console.error('Failed to reject order:', error);
      Alert.alert('Error', 'Failed to reject order. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'accepted': return '#3498db';
      case 'on_the_way': return '#f39c12';
      case 'completed':
      case 'finished': return '#2ecc71';
      case 'rejected':
      case 'canceled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    const type = vehicleType.toLowerCase();
    if (type.includes('car')) return 'car-sport';
    if (type.includes('truck')) return 'truck';
    if (type.includes('motor') || type.includes('cycle')) return 'bicycle';
    return 'car';
  };

  const formatSecondsRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const renderPendingItem = ({ item }: { item: PendingOrder }) => {
    const timeoutPercentage = (item.timeout / 180) * 100;
    const isUrgent = item.timeout <= 30;
    
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.vehicleIconContainer}>
            <Icon name={getVehicleIcon(item.vehicleType)} size={24} color="#fff" />
          </View>
          <View style={styles.orderHeaderText}>
            <Text style={styles.orderTitle}>New Request</Text>
            <Text style={styles.vehicleType}>{item.vehicleType}</Text>
          </View>
        </View>
        
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Icon name="location" size={16} color="#555" />
            <Text style={styles.detailText}>{item.address}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="alert-circle" size={16} color="#555" />
            <Text style={styles.detailText}>{item.complaint}</Text>
          </View>
        </View>
        
        <View style={styles.timerContainer}>
          <View style={styles.timerBarBackground}>
            <View 
              style={[
                styles.timerBarFill, 
                { 
                  width: `${timeoutPercentage}%`,
                  backgroundColor: isUrgent ? '#e74c3c' : '#3498db'
                }
              ]} 
            />
          </View>
          <Text style={[styles.timeoutText, isUrgent && styles.urgentText]}>
            {formatSecondsRemaining(item.timeout)} remaining
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]} 
            onPress={() => rejectOrder(item.orderId)}
          >
            <Icon name="close" size={20} color="#fff" />
            <Text style={styles.buttonText}>Decline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.acceptButton,
              acceptingOrderId !== null && styles.disabledButton
            ]} 
            onPress={() => acceptOrder(item.orderId)}
            disabled={acceptingOrderId !== null}
          >
            <Icon name="checkmark" size={20} color="#fff" />
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOngoingHistoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.historyCard}
      onPress={() => {
        if (activeTab === 'ongoing') {
          router.push({
            pathname: '/(repairman)/order-tracking',
            params: { orderId: item.id }
          });
        }
      }}
    >
      <View style={styles.historyHeader}>
        <View style={styles.vehicleIconSmall}>
          <Icon name={getVehicleIcon(item.vehicleType)} size={16} color="#fff" />
        </View>
        <Text style={styles.historyVehicle}>{item.vehicleType}</Text>
        <View 
          style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(item.status) }
          ]}
        >
          <Text style={styles.statusText}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      
      <View style={styles.historyDetails}>
        <View style={styles.detailRow}>
          <Icon name="location-outline" size={14} color="#777" />
          <Text style={styles.historyDetailText} numberOfLines={1}>
            {item.address || 'Unknown address'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="alert-circle-outline" size={14} color="#777" />
          <Text style={styles.historyDetailText} numberOfLines={1}>
            {item.complaint}
          </Text>
        </View>
      </View>
      
      {activeTab === 'ongoing' && (
        <View style={styles.trackButtonContainer}>
          <Icon name="navigate" size={16} color="#3498db" />
          <Text style={styles.trackButtonText}>Track Order</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
            <LinearGradient
        colors={['#f8f9fa', '#ffffff']}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          onPress={() => router.replace('/(home)/home')}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>

        <Text style={styles.header}>Dashboard</Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push({ pathname: '/edit-repairman' })} 
          >
            <Icon name="settings-outline" size={22} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchOrders}
          >
            <Icon name={isRefreshing ? 'sync-circle' : 'refresh'} size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      {!isConnected && (
        <View style={styles.connectionWarning}>
          <Icon name="warning-outline" size={16} color="#FFA000" />
          <Text style={styles.connectionWarningText}>
            Not connected to service. Orders may not appear.
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {pendingOrders.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Incoming Orders</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingOrders.length}</Text>
              </View>
            </View>
            
            <FlatList
              data={pendingOrders}
              keyExtractor={(item) => `pending-order-${item.orderId}-${Date.now()}`}
              renderItem={renderPendingItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pendingOrdersContainer}
            />
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Orders</Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ongoing' && styles.activeTab]}
            onPress={() => setActiveTab('ongoing')}
          >
            <Text style={[styles.tabText, activeTab === 'ongoing' && styles.activeTabText]}>
              Ongoing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={activeTab === 'ongoing' ? ongoingOrders : completedOrders}
          keyExtractor={(item) => `${activeTab}-order-${item.id}-${Date.now()}`}
          renderItem={renderOngoingHistoryItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon 
                name={activeTab === 'ongoing' ? 'car-outline' : 'time-outline'} 
                size={48} 
                color="#ccc" 
              />
              <Text style={styles.emptyText}>
                {activeTab === 'ongoing' ? 'No ongoing orders' : 'No order history'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eaecef',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: { 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000'
  },
  connectionWarningText: {
    color: '#E65100',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  pendingBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingOrdersContainer: {
    paddingBottom: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderHeaderText: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  vehicleType: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  timerContainer: {
    marginBottom: 16,
  },
  timerBarBackground: {
    height: 4,
    backgroundColor: '#ecf0f1',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  timerBarFill: {
    height: '100%',
  },
  timeoutText: {
    fontSize: 12,
    color: '#7f8c8d',
    alignSelf: 'flex-end',
  },
  urgentText: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#2ecc71',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#eaecef',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 24,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7f8c8d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  historyVehicle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  historyDetails: {
    marginBottom: 6,
  },
  historyDetailText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#777',
    flex: 1,
  },
  trackButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 6,
  },
  trackButtonText: {
    marginLeft: 4,
    color: '#3498db',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#95a5a6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  noOrdersContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noOrdersText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#7f8c8d',
    marginTop: 12,
  },
  noOrdersSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginRight: 10, // Add margin to separate from refresh button
  },
});