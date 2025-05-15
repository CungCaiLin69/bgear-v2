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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "@/src/utils/AuthProvider";
import { router, useLocalSearchParams } from "expo-router";
import CustomDateTimePicker from "@/src/components/DateTimePicker";
import DropDownPicker from "react-native-dropdown-picker";
import { Ionicons } from "@expo/vector-icons";

// Define dropdown item type
type DropdownItem = {
  label: string;
  value: string;
};

// Vehicle data - these would come from your API in a real scenario
const SUPPORTED_CAR_BRANDS = ["Toyota", "Honda", "Ford", "BMW", "Mercedes", "Tesla", "Nissan"];
const SUPPORTED_MOTORCYCLE_BRANDS = ["Honda", "Yamaha", "Kawasaki", "Ducati", "Harley-Davidson"];

export type Shop = {
  id: number;
  ownerId: string;
  name: string;
  location: string;
  services: string[];
  photos: string[];
  phoneNumber?: string;
};

export default function BookPageScreen() {
  const { userToken } = useAuth();
  const { socket, isConnected, reconnect } = useSocket();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { shopId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<any>(null);
  const [issue, setIssue] = useState("");

  // DateTime state
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Connection state
  const [networkAvailable, setNetworkAvailable] = useState<boolean>(true);
  const [connectionChecking, setConnectionChecking] = useState<boolean>(false);

  // Vehicle dropdown states
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [vehicleItems, setVehicleItems] = useState<DropdownItem[]>([
    { label: "Car", value: "car" },
    { label: "Motorcycle", value: "motorcycle" },
  ]);

  // Brand dropdown states
  const [brandOpen, setBrandOpen] = useState(false);
  const [vehicleBrand, setVehicleBrand] = useState<string | null>(null);
  const [brandItems, setBrandItems] = useState<DropdownItem[]>([]);

  // Model dropdown states
  const [modelOpen, setModelOpen] = useState(false);
  const [vehicleModel, setVehicleModel] = useState<string | null>(null);
  const [modelItems, setModelItems] = useState<DropdownItem[]>([]);

  // Year dropdown states
  const [yearOpen, setYearOpen] = useState(false);
  const [vehicleYear, setVehicleYear] = useState<string | null>(null);
  const [yearItems, setYearItems] = useState<DropdownItem[]>(
    Array.from({ length: 30 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      return { label: year.toString(), value: year.toString() };
    })
  );

  // Mileage state
  const [vehicleMileage, setVehicleMileage] = useState("");

  // Control dropdown closing order
  useEffect(() => {
    if (vehicleOpen) {
      setBrandOpen(false);
      setModelOpen(false);
      setYearOpen(false);
    }
  }, [vehicleOpen]);

  useEffect(() => {
    if (brandOpen) {
      setVehicleOpen(false);
      setModelOpen(false);
      setYearOpen(false);
    }
  }, [brandOpen]);

  useEffect(() => {
    if (modelOpen) {
      setVehicleOpen(false);
      setBrandOpen(false);
      setYearOpen(false);
    }
  }, [modelOpen]);

  useEffect(() => {
    if (yearOpen) {
      setVehicleOpen(false);
      setBrandOpen(false);
      setModelOpen(false);
    }
  }, [yearOpen]);

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
    checkNetworkConnection();
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

  const fetchVehicleModels = async (brand: string | null, type: string | null) => {
    // This would be an API call in a real app
    // For now, we'll simulate with dummy data
    setModelItems([]);
    setVehicleModel(null);
    
    setTimeout(() => {
      if (type === 'car') {
        if (brand === 'Toyota') {
          setModelItems([
            { label: 'Camry', value: 'Camry' },
            { label: 'Corolla', value: 'Corolla' },
            { label: 'RAV4', value: 'RAV4' },
          ]);
        } else if (brand === 'Honda') {
          setModelItems([
            { label: 'Civic', value: 'Civic' },
            { label: 'Accord', value: 'Accord' },
            { label: 'CR-V', value: 'CR-V' },
          ]);
        } else {
          setModelItems([
            { label: 'Model 1', value: 'Model 1' },
            { label: 'Model 2', value: 'Model 2' },
            { label: 'Model 3', value: 'Model 3' },
          ]);
        }
      } else {
        if (brand === 'Honda') {
          setModelItems([
            { label: 'CBR', value: 'CBR' },
            { label: 'Rebel', value: 'Rebel' },
            { label: 'Gold Wing', value: 'Gold Wing' },
          ]);
        } else if (brand === 'Yamaha') {
          setModelItems([
            { label: 'R1', value: 'R1' },
            { label: 'MT-07', value: 'MT-07' },
            { label: 'YZF', value: 'YZF' },
          ]);
        } else {
          setModelItems([
            { label: 'Model A', value: 'Model A' },
            { label: 'Model B', value: 'Model B' },
            { label: 'Model C', value: 'Model C' },
          ]);
        }
      }
    }, 300);
  };

  const handleBooking = async () => {
    // Validate form
    if (!vehicleType || !vehicleBrand || !vehicleModel || !vehicleYear || !vehicleMileage || !issue) {
      Alert.alert(
        "Incomplete Information",
        "Please fill in all vehicle details and describe your issue.",
        [{ text: "OK" }]
      );
      return;
    }

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
      vehicle: {
        type: vehicleType,
        brand: vehicleBrand,
        model: vehicleModel,
        year: vehicleYear,
        mileage: parseInt(vehicleMileage),
      }
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

      Alert.alert(
        "Booking Successful!",
        `Your appointment has been scheduled for ${selectedDate.toLocaleString()}`,
        [
          { 
            text: "OK", 
            onPress: () => router.push({
              pathname: "/(home)/home",
            }) 
          }
        ]
      );
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00897B" />
            <Text style={styles.loadingText}>Loading shop details...</Text>
          </View>
        ) : shop ? (
          <>
            {/* Shop Header */}
            <View style={styles.shopHeader}>
              {shop.photos && shop.photos.length > 0 ? (
                <Image
                  source={{ uri: shop.photos[0] }}
                  style={styles.shopImage}
                  defaultSource={require('@/assets/images/mechanic-potrait.jpg')}
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="car" size={40} color="#00897B" />
                </View>
              )}
              <Text style={styles.title}>{shop.name}</Text>
              <Text style={styles.location}>
                <Ionicons name="location-outline" size={16} color="#757575" />
                {" "}{shop.location}
              </Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="calendar-outline" size={20} color="#00897B" /> 
                {" "}Schedule Appointment
              </Text>

              {/* Vehicle Selection Section */}
              <View style={styles.section}>
                <Text style={styles.sectionSubtitle}>Vehicle Information</Text>
                
                {/* Vehicle Type */}
                <View style={[styles.formGroup, { zIndex: 4000 }]}>
                  <Text style={styles.label}>Vehicle Type</Text>
                  <DropDownPicker
                    open={vehicleOpen}
                    value={vehicleType}
                    items={vehicleItems}
                    setOpen={setVehicleOpen}
                    setValue={setVehicleType}
                    setItems={setVehicleItems}
                    placeholder="Select Vehicle Type"
                    searchable={false} 
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    placeholderStyle={styles.dropdownPlaceholder}
                    listMode="MODAL"
                    modalProps={{
                      animationType: "slide"
                    }}
                    modalTitle="Select Vehicle Type"
                  />
                </View>

                {vehicleType ? (
                  <>
                    {/* BRAND */}
                    <View style={[styles.formGroup, { zIndex: 3000 }]}>
                      <Text style={styles.label}>Vehicle Brand</Text>
                      <DropDownPicker
                        open={brandOpen}
                        setOpen={setBrandOpen}
                        value={vehicleBrand}
                        setValue={(callback) => {
                          const value = callback(vehicleBrand);
                          setVehicleBrand(value);
                          fetchVehicleModels(value, vehicleType);
                        }}
                        items={
                          (vehicleType === 'car' ? SUPPORTED_CAR_BRANDS : SUPPORTED_MOTORCYCLE_BRANDS)
                            .map(b => ({ label: b, value: b }))
                        }
                        setItems={setBrandItems}
                        multiple={false}
                        placeholder="Select a brand"
                        style={styles.dropdown}
                        listMode="MODAL"
                        modalProps={{
                          animationType: "slide"
                        }}
                        modalTitle="Select Vehicle Brand"
                      />
                    </View>

                    {/* MODEL */}
                    <View style={[styles.formGroup, { zIndex: 2000 }]}>
                      <Text style={styles.label}>Vehicle Model</Text>
                      <DropDownPicker
                        open={modelOpen}
                        setOpen={setModelOpen}
                        value={vehicleModel}
                        setValue={setVehicleModel}
                        items={modelItems}
                        setItems={setModelItems}
                        multiple={false}
                        placeholder="Select a model"
                        style={styles.dropdown}
                        disabled={!vehicleBrand}
                        disabledStyle={styles.disabledDropdown}
                        listMode="MODAL"
                        modalProps={{
                          animationType: "slide"
                        }}
                        modalTitle="Select Vehicle Model"
                      />
                    </View>

                    {/* YEAR */}
                    <View style={[styles.formGroup, { zIndex: 1000 }]}>
                      <Text style={styles.label}>Year</Text>
                      <DropDownPicker
                        open={yearOpen}
                        setOpen={setYearOpen}
                        value={vehicleYear}
                        setValue={setVehicleYear}
                        items={yearItems}
                        setItems={setYearItems}
                        multiple={false}
                        placeholder="Select a year"
                        style={styles.dropdown}
                        disabled={!vehicleModel}
                        disabledStyle={styles.disabledDropdown}
                        listMode="MODAL"
                        modalProps={{
                          animationType: "slide"
                        }}
                        modalTitle="Select Vehicle Year"
                      />
                    </View>

                    {/* MILEAGE */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Mileage (km)</Text>
                      <View style={styles.inputWithIcon}>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. 50000"
                          value={vehicleMileage}
                          onChangeText={setVehicleMileage}
                          keyboardType="numeric"
                        />
                        <Ionicons name="speedometer-outline" size={20} color="#757575" style={styles.inputIcon} />
                      </View>
                    </View>
                  </>
                ) : null}
              </View>

              {/* Issue Description */}
              <View style={styles.section}>
                <Text style={styles.sectionSubtitle}>Service Details</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Issue Description</Text>
                  <View style={styles.textAreaContainer}>
                    <TextInput
                      style={styles.textArea}
                      value={issue}
                      onChangeText={setIssue}
                      placeholder="Describe the issue with your vehicle"
                      multiline={true}
                      numberOfLines={4}
                    />
                  </View>
                </View>
              </View>

              {/* Date & Time Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionSubtitle}>Appointment Time</Text>
                <CustomDateTimePicker
                  mode="datetime"
                  onDateChange={handleDateChange}
                />
              </View>

              {/* Booking Button */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  onPress={handleBooking} 
                  style={[
                    styles.submitButton,
                    (!networkAvailable || connectionChecking || isSubmitting) && styles.submitButtonDisabled
                  ]}
                  disabled={isSubmitting || !networkAvailable || connectionChecking}
                >
                  {isSubmitting || connectionChecking ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {isSubmitting ? "Processing..." : "Connecting..."}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Ionicons name={!networkAvailable ? "alert-circle" : "calendar-outline"} size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {!networkAvailable ? "No Connection" : "Book Appointment"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
            <Text style={styles.errorText}>Shop information not available</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={getShop}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Bottom padding for scroll */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    color: "#757575",
  },
  shopHeader: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  shopImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212121",
    textAlign: "center",
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
  },
  formContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#424242",
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#00897B",
    marginBottom: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    minHeight: 50,
    backgroundColor: "#fff",
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  dropdownPlaceholder: {
    color: "#9e9e9e",
  },
  disabledDropdown: {
    opacity: 0.5,
    backgroundColor: "#f5f5f5",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFF",
    height: 50,
    paddingHorizontal: 16,
    color: "#212121",
    flex: 1,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    right: 16,
  },
  textAreaContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  textArea: {
    fontSize: 16,
    padding: 12,
    textAlignVertical: "top",
    minHeight: 100,
    color: "#212121",
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  submitButton: {
    borderRadius: 8,
    backgroundColor: "#00897B",  
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: "#B0BEC5",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  networkStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    backgroundColor: "#ffebee",
    borderRadius: 4,
    marginTop: 8,
  },
  networkStatusText: {
    color: "#f44336",
    marginLeft: 4,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 300,
  },
  errorText: {
    fontSize: 16,
    color: "#757575",
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#00897B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});