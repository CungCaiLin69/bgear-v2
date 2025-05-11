import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../utils/AuthProvider'; 
import { useSocket } from '../../utils/SocketProvider';
import AddressAutocomplete from '@/src/components/AddressAutocomplete';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import NetInfo from '@react-native-community/netinfo';

type LocationType = {
  latitude: number;
  longitude: number;
};

const AVAILABLE_SERVICES = [
  { id: 'change_tires', name: 'Change Tires', price: 150000 },
  { id: 'replace_oil', name: 'Oil Change', price: 100000 },
  { id: 'battery_replacement', name: 'Battery Replacement', price: 200000 },
  { id: 'brake_service', name: 'Brake Service', price: 175000 },
  { id: 'engine_repair', name: 'Engine Repair', price: 300000 },
  { id: 'tune_up', name: 'Tune-Up', price: 120000 },
  { id: 'diagnostics', name: 'Diagnostics', price: 90000 },
  { id: 'chain_repair', name: 'Chain Repair', price: 110000 },
  { id: 'flat_tire', name: 'Flat Tire', price: 80000 },
  { id: 'parts_replacement', name: 'Parts Replacement', price: 220000 },
  { id: 'other', name: 'Other (Describe your problem)', price: 0 }
];

export default function OrderRepairmanScreen() {
  const { socket, isConnected, reconnect } = useSocket();
  const { user, userToken } = useAuth();

  // Form state
  const [address, setAddress] = useState('');
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [complaint, setComplaint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMileage, setVehicleMileage] = useState('');

  // New problem selection state
  const [problemOpen, setProblemOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [customProblem, setCustomProblem] = useState('');
  const [problemItems, setProblemItems] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const [brandItems, setBrandItems] = useState<{ label: string; value: string }[]>([]);
  const [modelItems, setModelItems] = useState<{ label: string; value: string }[]>([]);
  const [yearItems, setYearItems] = useState<{ label: string; value: string }[]>([]);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  
  // Connection state
  const [networkAvailable, setNetworkAvailable] = useState<boolean>(true);
  const [connectionChecking, setConnectionChecking] = useState<boolean>(false);
  
  // Location state
  const [location, setLocation] = useState<LocationType | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [locationData, setLocationData] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  // Vehicle types
  const [vehicleItems] = useState([
    { label: 'Car', value: 'car' },
    { label: 'Motorcycle', value: 'motorcycle' },
    { label: 'Bike', value: 'bike' },
  ]);

  const SUPPORTED_CAR_BRANDS = ['Toyota', 'Honda', 'Mazda', 'BMW', 'Nissan', 'Mitsubishi', 'Mercedes-Benz'];
  const SUPPORTED_MOTORCYCLE_BRANDS = ['Yamaha', 'Suzuki', 'Kawasaki', 'Harley-Davidson'];

  // Check network connection
  const checkNetworkConnection = useCallback(async () => {
    setConnectionChecking(true);
    try {
      const netInfo = await NetInfo.fetch();
      setNetworkAvailable(!!netInfo.isConnected);
      
      if (netInfo.isConnected && !isConnected) {
        console.log('Network available but socket disconnected, triggering reconnection');
        reconnect();
      }
    } catch (error) {
      console.error('Error checking network:', error);
      setNetworkAvailable(false);
    } finally {
      setConnectionChecking(false);
    }
  }, [isConnected, reconnect]);

  // Monitor connection status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkAvailable(!!state.isConnected);
    });
    
    // Initial check
    checkNetworkConnection();
    
    return () => unsubscribe();
  }, [checkNetworkConnection]);

  // Initialize location
  const initializeLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        Alert.alert(
          "Permission Denied",
          "Location permission is required to use this feature.",
          [{ text: "OK" }]
        );
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      // Initial reverse geocoding
      try {
        const geocoded = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        
        if (geocoded[0]) {
          const addressComponents = geocoded[0];
          const formattedAddress = `${addressComponents.street || ''} ${addressComponents.name || ''}, ${addressComponents.city || ''}, ${addressComponents.region || ''}`;
          
          setLocationData({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            address: formattedAddress.trim(),
          });
          
          setAddress(formattedAddress.trim());
        }
      } catch (error) {
        console.error('Error during reverse geocoding:', error);
      }
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        "Location Error",
        "Unable to access your location. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    const formattedItems = AVAILABLE_SERVICES.map(service => ({
      label: `${service.name} (Rp ${service.price.toLocaleString()})`,
      value: service.id,
      price: service.price
    }));
    setProblemItems(formattedItems);
  }, []);

  useEffect(() => {
    initializeLocation();
  }, [initializeLocation]);

  const useMyLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        Alert.alert(
          "Permission Denied",
          "Location permission is required to use this feature.",
          [{ text: "OK" }]
        );
        setLocationLoading(false);
        return;
      }
  
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      const { latitude, longitude } = location.coords;
  
      const geocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
  
      let formattedAddress = 'Unknown Location';
      if (geocoded[0]) {
        const addressComponents = geocoded[0];
        formattedAddress = `${addressComponents.street || ''} ${addressComponents.name || ''}, ${addressComponents.city || ''}, ${addressComponents.region || ''}, ${addressComponents.country || ''}`;
      }
  
      setLocationData({
        latitude,
        longitude,
        address: formattedAddress.trim(),
      });
      
      setAddress(formattedAddress.trim());
      console.log('Current Location Set:', formattedAddress);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        "Location Error",
        "Failed to get your location. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLocationLoading(false);
    }
  };  

  const fetchVehicleModels = async (brand: string, type: any) => {
  const apiKey = 'ail9yVqrAHSTnxj6ttYJyA==eoJprJj1HYemS56f';
  const endpoint =
    type === 'car'
      ? `https://api.api-ninjas.com/v1/car?make=${brand}`
      : `https://api.api-ninjas.com/v1/motorcycles?make=${brand}`;

  try {
    const res = await fetch(endpoint, {
      headers: { 'X-Api-Key': apiKey },
    });
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.warn('Unexpected API format:', data);
      setModelItems([]);
      setYearItems([]);
      return;
    }

    const models = Array.from(new Set(data.map((item: any) => item.model)));
    const years = Array.from(new Set(data.map((item: any) => Number(item.year)))).sort((a, b) => b - a);

    setModelItems(models.map(m => ({ label: m, value: m })));
    setYearItems(years.map(y => ({ label: `${y}`, value: `${y}` })));
  } catch (err) {
    console.error('Failed to fetch vehicle data:', err);
    setModelItems([]);
    setYearItems([]);
  }
};

useEffect(() => {
  const selected = problemItems.find(item => item.value === selectedProblem);
  if (selected) {
    setEstimatedPrice(selected.price || 0);
    const label = selected.label?.split(' (')[0]; 
    setComplaint(selected.value === 'other' ? '' : label);
  }
}, [selectedProblem, problemItems]);

  const validateForm = () => {
    const errors = [];
    
    if (!locationData || !locationData.address) {
      errors.push("Location is required");
    }
    
    if (!vehicleType) {
      errors.push("Vehicle type is required");
    }
    
    if (!selectedProblem) {
      errors.push("Please select a problem or 'Other'");
    }
    
    if (selectedProblem === 'other' && (!customProblem || customProblem.trim().length < 3)) {
      errors.push("Please provide a valid problem description");
    }
    
    return errors;
  };

  const handleOrder = async () => {
    const validationErrors = validateForm();
    
    if (validationErrors.length > 0) {
      Alert.alert(
        "Invalid Form",
        validationErrors.join("\n"),
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
            onPress: checkNetworkConnection 
          },
          { text: "Cancel" }
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
                onPress: handleOrder 
              },
              { text: "Cancel" }
            ]
          );
          return;
        } else {
          // If reconnected successfully, continue with order
          processOrder();
        }
      }, 2000);
    } else {
      // If already connected, proceed with order
      processOrder();
    }
  };

  const processOrder = async () => {
    setIsSubmitting(true);

    // Determine the final complaint text
    const finalComplaint = selectedProblem === 'other' ? customProblem : complaint;
    
    // Find selected service to get the price info
    const selectedService = problemItems.find(item => item.value === selectedProblem);
    const estimatedPrice = selectedService?.price;
    
    const payload = {
      address: locationData!.address,  
      vehicleType: vehicleType!,
      complaint: finalComplaint,
      locationLat: locationData!.latitude,
      locationLng: locationData!.longitude,
      vehicleBrand: vehicleBrand || undefined,
      vehicleModel: vehicleModel || undefined, 
      vehicleYear: vehicleYear || undefined,
      vehicleMileage: vehicleMileage || undefined,
      serviceId: selectedProblem !== 'other' ? selectedProblem : undefined,
      estimatedPrice: estimatedPrice
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
      
      const response = await fetch('http://10.0.2.2:3000/order/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error('Order creation failed:', data.error);
        Alert.alert(
          "Order Creation Failed",
          data.error || 'Failed to create order. Please try again.',
          [{ text: "OK" }]
        );
        setIsSubmitting(false);
        return;
      }
  
      console.log('Order created successfully:', data.order);
  
      // Emit the order to server
      if (socket && isConnected) {
        socket.emit('newOrder', data.order);
      } else {
        console.warn('Socket not connected, order created but not emitted via socket');
      }
  
      router.push({
        pathname: '/waiting-order', 
        params: { orderId: data.order.id }
      });
  
    } catch (error: any) {
      console.error('Order creation error:', error);
      
      // Different error message based on error type
      if (error.name === 'AbortError') {
        Alert.alert(
          "Connection Timeout",
          "The request took too long to complete. Please check your connection and try again.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Error",
          "Something went wrong while creating the order. Please try again.",
          [{ text: "OK" }]
        );
      }
      
      setIsSubmitting(false);
    }
  };

  // Render connection status indicator
  const ConnectionStatus = () => {
    if (!networkAvailable) {
      return (
        <View style={styles.connectionStatusBar}>
          <Icon name="wifi-off" size={16} color="#fff" />
          <Text style={styles.connectionStatusText}>No Internet Connection</Text>
          <TouchableOpacity onPress={checkNetworkConnection}>
            <Icon name="refresh" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    } else if (!isConnected && !connectionChecking) {
      return (
        <View style={styles.connectionStatusBar}>
          <Icon name="warning" size={16} color="#fff" />
          <Text style={styles.connectionStatusText}>Service Disconnected</Text>
          <TouchableOpacity onPress={reconnect}>
            <Icon name="refresh" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  // Render loading state
  if (locationLoading && !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00897B" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  // Render permission denied state
  if (locationPermissionDenied) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="warning-outline" size={80} color="#FF9800" />
        <Text style={styles.permissionText}>
          Location permission is required to use this feature.
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={() => initializeLocation()}
        >
          <Text style={styles.permissionButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <ConnectionStatus />
        
        {location && (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            region={{
              latitude: locationData ? locationData.latitude : location.latitude,
              longitude: locationData ? locationData.longitude : location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {(locationData || location) && (
              <Marker 
                coordinate={{
                  latitude: locationData ? locationData.latitude : location.latitude,
                  longitude: locationData ? locationData.longitude : location.longitude,
                }}
                title="Selected Location"
              />
            )}
          </MapView>
        )}

        <TouchableOpacity
          onPress={() => router.replace('/(home)/home')}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <KeyboardAwareScrollView 
          style={styles.bottomSheet}
          contentContainerStyle={styles.bottomSheetContent}
          enableOnAndroid={true}
        >
          <Text style={styles.formTitle}>Request Repair Service</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Location</Text>
            <AddressAutocomplete
              placeholder="Enter Address"
              value={address}
              onSelect={(label, coords) => {
                setAddress(label); 
                setLocationData({
                  address: label,
                  latitude: parseFloat(coords.lat),
                  longitude: parseFloat(coords.lon),
                });
              }}
              apiKey="pk.95ff82ac779b33e03418197e365fd8b6"
              
            />
          </View>

          <TouchableOpacity
            onPress={useMyLocation}
            style={styles.locationButton}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="locate" size={16} color="#fff" />
                <Text style={styles.locationButtonText}>Use My Current Location</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.formGroup, { zIndex: 1000 }]}>
            <Text style={styles.label}>Vehicle Type</Text>
            <DropDownPicker
              open={vehicleOpen}
              value={vehicleType}
              items={vehicleItems}
              setOpen={setVehicleOpen}
              setValue={setVehicleType}
              setItems={() => {}}
              placeholder="Select Vehicle Type"
              searchable={false} 
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              listMode='MODAL'
            />
          </View>

          {vehicleType ? (
            <>
              {/* BRAND */}
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
                listMode='MODAL'
              />

              {/* MODEL */}
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
                listMode='MODAL'
              />

              {/* YEAR */}
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
                listMode='MODAL'
              />

              {/* MILEAGE */}
              <Text style={styles.label}>Mileage (in km)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 50000"
                value={vehicleMileage}
                onChangeText={setVehicleMileage}
                keyboardType="numeric"
              />
            </>
          ) : null}

          {/* Problem Selection Dropdown */}
          {vehicleType && (
            <View style={[styles.formGroup, { zIndex: 900 }]}>
              <Text style={styles.label}>What's the problem?</Text>
              {servicesLoading ? (
                <View style={styles.loadingServices}>
                  <ActivityIndicator size="small" color="#00897B" />
                  <Text>Loading services...</Text>
                </View>
              ) : (
                <DropDownPicker
                  open={problemOpen}
                  value={selectedProblem}
                  items={problemItems}
                  setOpen={setProblemOpen}
                  setValue={setSelectedProblem}
                  setItems={setProblemItems}
                  placeholder="Select Service Needed"
                  searchable={false}
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  placeholderStyle={styles.dropdownPlaceholder}
                  listMode='MODAL'
                />
              )}
            </View>
          )}

          {selectedProblem && selectedProblem !== 'other' && estimatedPrice !== null && (
            <Text style={{ marginTop: 8, fontWeight: '600', color: '#333' }}>
              Estimated Price: Rp {estimatedPrice.toLocaleString()}
            </Text>
          )}

          {/* Custom problem description for "Other" option */}
          {selectedProblem === 'other' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Describe Your Problem</Text>
              <TextInput
                placeholder="Detail the issue with your vehicle"
                value={customProblem}
                onChangeText={setCustomProblem}
                style={styles.textArea}
                multiline={true}
                numberOfLines={4}
              />
            </View>
          )}

          <TouchableOpacity 
            onPress={handleOrder} 
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
                {!networkAvailable ? "No Connection" : "Order Repairman"}
              </Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  permissionButton: {
    backgroundColor: '#00897B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectionStatusBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: '#e53935',
    padding: 8,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  backButton: {
    position: 'absolute',
    top: 50, 
    left: 20,
    zIndex: 10,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxHeight: '60%', // Adjust based on your needs
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  bottomSheetContent: {
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#00897B',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  dropdown: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    paddingVertical: 12,
  },
  dropdownContainer: {
    borderColor: '#ddd',
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    height: 100,
    textAlignVertical: 'top',
  },
  locationButton: {
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  locationButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
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
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingServices: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    gap: 8,
  },
});