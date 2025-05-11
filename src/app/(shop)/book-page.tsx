import { useSocket } from "@/src/utils/SocketProvider";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Text,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "@/src/utils/AuthProvider";
import { router, useLocalSearchParams } from "expo-router";
import CustomDateTimePicker from "@/src/components/DateTimePicker";

export type Shop = {
  id: number;
  ownerId: string;
  name: string;
  location: string;
  services: string[];
  photos: string[];
  phoneNumber?: string;
};

export default function BookPageScreen({}) {
  const { userToken } = useAuth();
  const { socket, isConnected, reconnect } = useSocket();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { shopId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<any>(null);
  const [issue, setIssue] = useState('');

  // DateTime state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Connection state
  const [networkAvailable, setNetworkAvailable] = useState<boolean>(true);
  const [connectionChecking, setConnectionChecking] = useState<boolean>(false);

  const handleDateChange = (date: any) => {
    setSelectedDate(date);
    console.log("Selected date:", date);
  };

  // Check network connection
  const checkNetworkConnection = useCallback(async () => {
    setConnectionChecking(true);
    try {
      const netInfo = await NetInfo.fetch();
      setNetworkAvailable(!!netInfo.isConnected);

      if (netInfo.isConnected && !isConnected) {
        console.log(
          "Network available but socket disconnected, triggering reconnection"
        );
        reconnect();
      }
    } catch (error) {
      console.error("Error checking network:", error);
      setNetworkAvailable(false);
    } finally {
      setConnectionChecking(false);
    }
  }, [isConnected, reconnect]);

  useEffect(() => {
    getShop();
    console.log("this is shop id:", shopId);
  }, [shopId, userToken]);

  const getShop = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://10.0.2.2:3000/api/get-shop-by-id/${shopId}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      setShop(data);
    } catch (error) {
      console.error("Error fetching shop", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    // Check network connection first
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert(
        "No Network Connection",
        "Please check your internet connection and try again.",
        [
          {
            text: "Try Again",
            onPress: checkNetworkConnection,
          },
          { text: "Cancel" },
        ]
      );
      return;
    }

    // If socket is not connected, try to reconnect
    if (!isConnected) {
      setConnectionChecking(true);

      // Try to reconnect socket
      reconnect();

      // Wait briefly to see if reconnection works
      setTimeout(async () => {
        setConnectionChecking(false);

        // If still not connected, show error
        if (!isConnected) {
          Alert.alert(
            "Connection Error",
            "Unable to connect to the service. Would you like to try again?",
            [
              {
                text: "Try Again",
                onPress: handleBooking,
              },
              { text: "Cancel" },
            ]
          );
          return;
        } else {
          // If reconnected successfully, continue with order
          processBooking();
        }
      }, 2000);
    } else {
      // If already connected, proceed with order
      processBooking();
    }
  };

  const processBooking = async () => {
    setIsSubmitting(true);

    const payload = {
      shopId: shopId,
      datetime: selectedDate,
      issue: issue,
    };

    if (!userToken) {
      Alert.alert("Error", "User not authenticated.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("http://10.0.2.2:3000/book/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        // Use the controller's signal instead of AbortSignal.timeout
        signal: controller.signal,
      });

      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        console.error("Booking creation failed:", data.error);
        Alert.alert(
          "Booking Creation Failed",
          data.error || "Failed to create Booking. Please try again.",
          [{ text: "OK" }]
        );
        setIsSubmitting(false);
        return;
      }

      console.log("Booking created successfully:", data.booking);

      // Emit the order to server
      if (socket && isConnected) {
        socket.emit("newOrder", data.booking);
      } else {
        console.warn(
          "Socket not connected, order created but not emitted via socket"
        );
      }

      router.push({
        pathname: "/(home)/home",
      });
    } catch (error: any) {
      console.error("Booking creation error:", error);

      // Different error message based on error type
      if (error.name === "AbortError") {
        Alert.alert(
          "Connection Timeout",
          "The request took too long to complete. Please check your connection and try again.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Error",
          "Something went wrong while creating the booking. Please try again.",
          [{ text: "OK" }]
        );
      }

      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <Text>Loading...</Text>
      ) : shop ? (
        <>
          <Text style={styles.title}>Book {shop.name}</Text>

          <View style={styles.container}>
            <Text style={styles.label}>Vehicle Issue</Text>
            <TextInput
              style={styles.inputBox}
              value={issue}
              onChangeText={setIssue}
              placeholder="Enter your issue with your vehicle"
            />
          </View>

          <View style={styles.container}>
            <Text style={styles.sectionTitle}>Date & Time:</Text>
            <CustomDateTimePicker
              mode="datetime"
              onDateChange={handleDateChange}
            />
          </View>

          <View style={styles.container}>
            <TouchableOpacity 
              onPress={handleBooking} 
              style={[
                styles.submitButton,
                (!networkAvailable || connectionChecking) && styles.submitButtonDisabled
              ]}
              disabled={isSubmitting || !networkAvailable || connectionChecking}
            >
              {isSubmitting || connectionChecking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {!networkAvailable ? "No Connection" : "Book Shop"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text>No shop data available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 30,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: "gray",
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFF",
    borderRadius: 20,
    height: 50,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00897B",
    marginBottom: 5,
    textTransform: "uppercase",
    marginTop: 20,
  },
  container: {
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    borderRadius: 25,
    backgroundColor: '#00897B',  
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
});
