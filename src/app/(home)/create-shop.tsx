import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { Input, Button } from '@rneui/themed';
import { useAuth } from '../../utils/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const CreateShopScreen = () => {
  const navigation = useNavigation();
  const { user, createShop } = useAuth();

  // State for shop details
  const [shopName, setShopName] = useState('');
  const [shopLocation, setShopLocation] = useState('');
  const [shopServices, setShopServices] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photos, setPhotos] = useState<string[]>([]); // Store image URIs
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle shop creation
  const handleCreateShop = async () => {
    if (!shopName || !shopLocation || shopServices.length === 0) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);

    try {
      await createShop({
        shopName,
        shopLocation,
        shopServices,
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Open a Shop</Text>

      <Input
        label="Shop Name"
        value={shopName}
        onChangeText={setShopName}
        placeholder="Enter your shop name"
      />

      <Input
        label="Shop Location"
        value={shopLocation}
        onChangeText={setShopLocation}
        placeholder="Enter your shop location"
      />

      <Input
        label="Services (comma-separated)"
        value={shopServices.join(', ')}
        onChangeText={(text) => setShopServices(text.split(',').map((s) => s.trim()))}
        placeholder="e.g., Gundam Repair, Bike Repair"
      />

      <Input
        label="Phone Number"
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

        {/* Display Selected Images */}
        <FlatList
          data={photos}
          keyExtractor={(item, index) => index.toString()}
          numColumns={3} // Display images in a grid
          renderItem={({ item, index }) => (
            <View style={styles.imageContainer}>
              <Image source={{ uri: item }} style={styles.selectedImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => handleRemoveImage(index)}
              >
                <Text style={styles.removeImageButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      <Button
        title={isLoading ? 'Creating Shop...' : 'Create Shop'}
        onPress={handleCreateShop}
        disabled={isLoading}
        buttonStyle={styles.button}
      />

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.submitButton}>
        <Text style={styles.submitButtonText}>{'Cancel'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

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
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageUploadContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
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
});

export default CreateShopScreen;