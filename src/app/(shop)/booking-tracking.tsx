import { useAuth } from "@/src/utils/AuthProvider";
import { useSocket } from "@/src/utils/SocketProvider";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  SafeAreaView, 
  TouchableOpacity,
  Alert,
  ScrollView
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

interface Booking {
  id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'canceled';
  datetime: string;
  issue: string;
  user?: {
    id: string;
    name: string;
    phoneNumber?: string;
    profilePicture?: string;
  };
  shop?: {
    id: number;
    name: string;
    location: string;
    phoneNumber?: string;
  };
}

export default function BookingTrackingScreen() {
  const { user, userToken } = useAuth();
  const { socket } = useSocket();
  const params = useLocalSearchParams();
  const bookingId = Number(params.bookingId);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingInfo, setBookingInfo] = useState<Booking | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      Alert.alert("Error", "Booking ID is missing");
      router.back();
      return;
    }
    
    fetchBookingInfo();
    
    if (socket) {
      // Listen for booking status updates
      socket.on("bookingAccepted", (data) => {
        if (data.bookingId === bookingId) {
          fetchBookingInfo(); // Refresh data when booking is accepted
        }
      });
      
      socket.on("bookingRejected", (data) => {
        if (data.bookingId === bookingId) {
          fetchBookingInfo(); // Refresh data when booking is rejected
        }
      });
      
      socket.on("bookingCompleted", (data) => {
        if (data.bookingId === bookingId) {
          fetchBookingInfo(); // Refresh data when booking is completed
        }
      });
    }
    
    return () => {
      if (socket) {
        socket.off("bookingAccepted");
        socket.off("bookingRejected");
        socket.off("bookingCompleted");
      }
    };
  }, [bookingId, socket]);

  const fetchBookingInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://10.0.2.2:3000/api/booking/${bookingId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Booking info:", data);
      
      setBookingInfo(data.booking);
    } catch (error) {
      console.error("Fetch booking info error", error);
      Alert.alert("Error", "Failed to load booking information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: cancelBooking }
      ]
    );
  };

  const cancelBooking = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`http://10.0.2.2:3000/booking/cancel/${bookingId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel booking");
      }

      // Notify through socket
      if (socket) {
        socket.emit("bookingCanceled", { bookingId });
      }

      Alert.alert("Success", "Booking has been cancelled");
      router.replace("/(home)/home");
    } catch (error: any) {
      console.error("Cancel booking error:", error);
      Alert.alert("Error", error.message || "Failed to cancel booking");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteBooking = () => {
    // This would only be available to shop owners
    if (user?.has_shop) {
      Alert.alert(
        "Complete Booking",
        "Mark this booking as completed?",
        [
          { text: "No", style: "cancel" },
          { text: "Yes", onPress: completeBooking }
        ]
      );
    }
  };

  const completeBooking = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`http://10.0.2.2:3000/booking/complete/${bookingId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete booking");
      }

      // Notify through socket
      if (socket) {
        socket.emit("bookingCompleted", { bookingId });
      }

      Alert.alert("Success", "Booking has been marked as completed");
      router.replace("../(dashboard)/shop-dashboard");
    } catch (error: any) {
      console.error("Complete booking error:", error);
      Alert.alert("Error", error.message || "Failed to complete booking");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#FFA000';
      case 'accepted': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'rejected': 
      case 'canceled': return '#F44336';
      default: return '#757575';
    }
  };

  const formatDate = (dateString: string | number | Date) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f8f9fa', '#ffffff']}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>

        <Text style={styles.header}>Booking Details</Text>
        
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {bookingInfo && (
          <View style={styles.bookingCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.shopName}>{bookingInfo.shop?.name || 'Shop'}</Text>
              
              <View style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(bookingInfo.status) }
              ]}>
                <Text style={styles.statusText}>
                  {bookingInfo.status || 'Unknown'}
                </Text>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Icon name="calendar" size={18} color="#666" />
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailText}>{formatDate(bookingInfo.datetime)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Icon name="location" size={18} color="#666" />
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailText}>{bookingInfo.shop?.location || 'Not specified'}</Text>
              </View>
              
              <View style={styles.issueContainer}>
                <View style={styles.detailRow}>
                  <Icon name="alert-circle" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Issue:</Text>
                </View>
                <Text style={styles.issueText}>{bookingInfo.issue || 'No issue described'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.customerSection}>
              <Text style={styles.sectionTitle}>Customer</Text>
              <View style={styles.detailRow}>
                <Icon name="person" size={18} color="#666" />
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailText}>{bookingInfo.user?.name || 'Not available'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Icon name="call" size={18} color="#666" />
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailText}>{bookingInfo.user?.phoneNumber || 'Not provided'}</Text>
              </View>
            </View>

            {/* Action buttons based on current status and user role */}
            <View style={styles.actionsContainer}>
              {bookingInfo.status === 'pending' && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancelBooking}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="close-circle" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Cancel Booking</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {bookingInfo.status === 'accepted' && user?.has_shop && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={handleCompleteBooking}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Mark as Complete</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {bookingInfo.status === 'accepted' && !user?.has_shop && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancelBooking}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="close-circle" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Cancel Booking</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {(bookingInfo.status === 'completed' || 
                bookingInfo.status === 'rejected' || 
                bookingInfo.status === 'canceled') && (
                <View style={styles.statusMessageContainer}>
                  <Text style={styles.statusMessage}>
                    This booking is {bookingInfo.status.toLowerCase()}.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
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
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailsSection: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#eaecef',
    marginVertical: 16,
  },
  customerSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#7f8c8d',
    width: 80,
  },
  detailText: {
    flex: 1,
    color: '#2c3e50',
  },
  issueContainer: {
    marginTop: 4,
  },
  issueText: {
    color: '#2c3e50',
    marginLeft: 26,
    marginTop: 2,
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  completeButton: {
    backgroundColor: '#2ecc71',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  statusMessageContainer: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  statusMessage: {
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
});