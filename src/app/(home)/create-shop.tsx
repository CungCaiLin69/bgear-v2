import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { Input, Button } from '@rneui/themed';
import { useAuth } from '../../utils/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import MultiSelect from 'react-native-multiple-select';
import AddressAutocomplete from '@/src/components/AddressAutocomplete';

const SERVICE_OPTIONS = [
  { id: 'car', name: 'Car Repair' },
  { id: 'bike', name: 'Bicycle Repair' },
  { id: 'motorcycle', name: 'Motorcycle Repair' },
  { id: 'gundam', name: 'Gundam Repair' },
];

const CreateShopScreen = () => {
  const navigation = useNavigation();
  const { user, createShop } = useAuth();

  // State for shop details
  const [shopName, setShopName] = useState('');
  const [shopLocation, setShopLocation] = useState('');
  const [locationData, setLocationData] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photos, setPhotos] = useState<string[]>([]); // Store image URIs
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectedServicesChange = (selectedItems: string[]) => {
    setSelectedServices(selectedItems);
  };

  // Handle image selection
  const handleSelectImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true, // Allow multiple image selection
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newImages = result.assets.map((asset) => asset.uri); // Extract URIs of selected images
      if (photos.length + newImages.length > 10) {
        Alert.alert('Limit Exceeded', 'You can only select up to 10 images.');
        return;
      }
      setPhotos((prevPhotos) => [...prevPhotos, ...newImages]); // Add new images to the list
    }
  };

  // Remove an image from the list
  const handleRemoveImage = (index: number) => {
    setPhotos((prevPhotos) => prevPhotos.filter((_, i) => i !== index));
  };

  const handleLocationSelect = (item: any) => {
    setShopLocation(item.description);
    setLocationData({
      address: item.description,
      latitude: item.lat,
      longitude: item.lon
    });
  };

  // Toggle service selection
  const toggleService = (service: any) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(item => item !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Handle shop creation
  const handleCreateShop = async () => {
    if (!shopName || !shopLocation || selectedServices.length === 0) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);

    try {
      await createShop({
        shopName,
        shopLocation,
        shopServices: selectedServices,
        phoneNumber,
        photos,
      });

      Alert.alert('Success', 'Shop created successfully!');
      // router.replace('/(seller)/manage-shop'); // Redirect to the shop management page
      navigation.goBack();
    } catch (error) {
      console.error('Error creating shop:', error);
      Alert.alert('Error', 'Failed to create shop. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <FlatList
          data={[]} 
          keyExtractor={() => "dummy"}
          renderItem={null}
          ListHeaderComponent={() => (
            <View style={[styles.container, { flex: 1 }]}>
              <Text style={styles.title}>Shop Dashboard</Text>
    
              <Text style={styles.label}>Shop Name</Text>
              <TextInput
                style={styles.shopBox}
                value={shopName}
                onChangeText={setShopName}
                placeholder="Enter your shop name"
              />
    
              <Text style={styles.label}>Shop Location</Text>
              <AddressAutocomplete
                value={shopLocation}
                onSelect={(label, coords) => {
                  setShopLocation(label);
                  setLocationData({
                    address: label,
                    latitude: parseFloat(coords.lat),
                    longitude: parseFloat(coords.lon)
                  });
                }}
                apiKey="pk.95ff82ac779b33e03418197e365fd8b6"
              />
    
              <Text style={styles.label}>Shop Services</Text>
              <MultiSelect
                items={SERVICE_OPTIONS}
                uniqueKey="id"
                onSelectedItemsChange={handleSelectedServicesChange}
                selectedItems={selectedServices}
                selectText="Select Services"
                searchInputPlaceholderText="Search Services..."
                tagRemoveIconColor="#CCC"
                tagBorderColor="#CCC"
                tagTextColor="#333"
                selectedItemTextColor="#333"
                selectedItemIconColor="#333"
                itemTextColor="#000"
                displayKey="name"
                searchInputStyle={{ color: '#333' }}
                submitButtonColor="#00897B"
                submitButtonText="Done"
                styleMainWrapper={styles.multiSelect}
              />
    
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.shopBox}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your shop phone number"
                keyboardType="phone-pad"
              />
    
              {/* Image Upload Section */}
              <View style={styles.imageUploadContainer}>
                <Text style={styles.label}>Upload Photos (Max 10)</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={handleSelectImages}>
                  <Text style={styles.uploadButtonText}>Select Images</Text>
                </TouchableOpacity>
              </View>
    
              {/* Display photos grid */}
              <View style={styles.photosGrid}>
                {photos.map((photoUri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: photoUri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Text style={styles.removeImageButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
    
              {/* Push buttons to bottom */}
              <View style={{ marginTop: 'auto' }}>
                <Button
                  title={isLoading ? 'Opening...' : 'Open Shop'}
                  onPress={handleCreateShop}
                  disabled={isLoading}
                  buttonStyle={styles.button}
                />
    
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.submitButton}>
                  <Text style={styles.submitButtonText}>{'Cancel'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
    );  
  }

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 30
  },
  button: {
    backgroundColor: '#00897B',
    borderRadius: 10,
    paddingVertical: 15,
  },
  submitButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageUploadContainer: {
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    margin: 5,
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  multiSelect: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2,
    padding: 8,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginVertical: 10,
  },
  shopBox: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFF",
    borderRadius: 20,
    height: 50,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00897B',
    marginBottom: 5,
    textTransform: 'uppercase',
    marginTop: 20
  },
});

export default CreateShopScreen;