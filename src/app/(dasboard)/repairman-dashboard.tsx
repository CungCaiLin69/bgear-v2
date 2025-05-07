import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useSocket } from '../../utils/SocketProvider';
import { useAuth } from '../../utils/AuthProvider';
import Icon from 'react-native-vector-icons/Ionicons';
import { router, useRouter } from 'expo-router';

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

  console.log("Socket connected:", isConnected);

  useEffect(() => {
    if (!socket) {
      console.log("No socket available");
      return;
    }
    
    console.log("Setting up socket listeners");
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

    // Listen for rejected orders (to remove from the list if rejected by someone else)
    socket.on('orderRejected', ({ orderId }) => {
      console.log(`Order ${orderId} was rejected`);
      setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
    });

    // Listen for accepted orders (to remove from the list if accepted by someone else)
    socket.on('orderAccepted', ({ orderId, repairmanId }) => {
      console.log(`Order ${orderId} was accepted by repairman ${repairmanId}`);
      setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
      
      // Refresh order lists in case this repairman accepted it
      fetchOrders();
    });

    return () => {
      console.log("Cleaning up socket listeners");
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
          
        if (updated.length !== prevOrders.length) {
          console.log("Some orders timed out");
        }
        
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingOrders.length]);

  const acceptOrder = async (orderId: number) => {
    if (acceptingOrderId !== null) {
      console.log('Already accepting another order, blocked.');
      return;
    }
  
    setAcceptingOrderId(orderId);
    
    try {
      // Make API call to accept order
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
      
      console.log('Order accepted successfully:', data);
      
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
    
    // Set up a regular refresh interval
    const refreshInterval = setInterval(fetchOrders, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  const fetchOrders = async () => {
    try {
      const res = await fetch('http://10.0.2.2:3000/api/repairman/orders', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      
      const data = await res.json();
      
      const ongoing = data.orders.filter((order: any) =>
        order.status === 'accepted' || order.status === 'on_the_way'
      );
      
      // Include rejected and canceled orders in history
      const completed = data.orders.filter((order: any) =>
        ['completed', 'finished', 'rejected', 'canceled'].includes(order.status)
      );
  
      setOngoingOrders(ongoing);
      setCompletedOrders(completed);
    } catch (error) {
      console.error('Failed to fetch repairman orders:', error);
    }
  };

  const rejectOrder = async (orderId: number) => {
    try {
      // Make API call to reject order
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
      
      console.log('Order rejected successfully');
      
      // Also emit rejection via socket for faster updates
      socket?.emit('rejectOrder', { orderId });
      
      // Remove from pending orders
      setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
    } catch (error) {
      console.error('Failed to reject order:', error);
      Alert.alert('Error', 'Failed to reject order. Please try again.');
    }
  };

  const renderItem = ({ item }: { item: PendingOrder }) => (
    <View style={styles.orderCard}>
      <Text style={styles.orderTitle}>New Order</Text>
      <Text>Address: {item.address}</Text>
      <Text>Vehicle: {item.vehicleType}</Text>
      <Text>Complaint: {item.complaint}</Text>
      <Text style={styles.timeoutText}>⏳ {item.timeout} seconds left</Text>

      <View style={styles.buttonRow}>
        <View style={styles.buttonWrapper}>
        <Button
            title="Accept"
            onPress={() => acceptOrder(item.orderId)}
            color="green"
            disabled={acceptingOrderId !== null}
        />
        </View>
        <View style={styles.buttonWrapper}>
          <Button title="Reject" onPress={() => rejectOrder(item.orderId)} color="red" />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.replace('/(home)/home')}
        style={{
          position: 'absolute',
          top: 50, 
          left: 20,
          zIndex: 10,
          backgroundColor: '#EEE' ,
          padding: 8,
          borderRadius: 20,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 5,
        }}
      >
        <Icon name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <Text style={styles.header}>Repairman Dashboard</Text>
      
      {!isConnected && (
        <View style={styles.connectionWarning}>
          <Icon name="warning-outline" size={20} color="#FFA000" />
          <Text style={styles.connectionWarningText}>
            Not connected to service. Orders may not appear.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Incoming Orders</Text>
      
      {pendingOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No incoming orders</Text>
        </View>
      ) : (
        <FlatList
          data={pendingOrders}
          keyExtractor={(item) => `pending-order-${item.orderId}-${Date.now()}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ongoing' && styles.activeTab]}
          onPress={() => setActiveTab('ongoing')}
        >
          <Text style={[styles.tabText, activeTab === 'ongoing' && styles.activeTabText]}>Ongoing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'ongoing' ? ongoingOrders : completedOrders}
        keyExtractor={(item) => `${activeTab}-order-${item.id}-${Date.now()}`}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <Text style={styles.orderTitle}>{item.vehicleType.toUpperCase()}</Text>
            <Text>Address: {item.address || 'Unknown address'}</Text>
            <Text>Complaint: {item.complaint}</Text>
            <Text>Status: {item.status}</Text>

            {activeTab === 'ongoing' && (
              <Button
                title="Go to Tracking"
                onPress={() => router.push({
                  pathname: '/(repairman)/order-tracking',
                  params: { orderId: item.id }
                })}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'ongoing' ? 'No ongoing orders' : 'No order history'}
            </Text>
          </View>
        }
      />
      
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={fetchOrders}
      >
        <Icon name="refresh" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#fff',
    paddingTop: 80 // Add space for the back button
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15
  },
  connectionWarningText: {
    color: '#E65100',
    marginLeft: 8,
    fontSize: 14
  },
  timeoutText: { 
    marginTop: 10, 
    color: 'red', 
    fontWeight: 'bold' 
  },
  buttonRow: { 
    flexDirection: 'row', 
    marginTop: 15 
  },
  buttonWrapper: { 
    flex: 1, 
    marginHorizontal: 5 
  },
  emptyContainer: { 
    paddingVertical: 30, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  emptyText: { 
    fontSize: 16, 
    color: 'gray' 
  },
  tabRow: { 
    flexDirection: 'row', 
    marginVertical: 15 
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#4287f5',
  },
  tabText: {
    color: '#555',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#fff',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  orderTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4287f5',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  }
});