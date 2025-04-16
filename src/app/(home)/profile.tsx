import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../utils/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const ProfilePage = () => {
  const { user, updateUser, changePassword } = useAuth();
  const navigation = useNavigation();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);

  // Handle profile picture upload
  const handleProfilePictureUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleSaveChanges = async () => {
    try {
      const updatedUser = { 
        ...user, 
        name,    
        email,   
        profilePicture, 
        has_shop: user?.has_shop || false,
        is_repairman: user?.is_repairman || false,
        phoneNumber: phoneNumber || ''
      };
      await updateUser(updatedUser);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error instanceof Error) {
        Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleChangePassword = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      await changePassword(password, confirmPassword);
      Alert.alert('Success', 'Password changed successfully.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error instanceof Error) {
        Alert.alert('Error', error.message || 'Failed to change password. Please try again.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'Back'}</Text>
        </TouchableOpacity>

        {/* User Photo */}
        <View style={styles.photoContainer}>
          <TouchableOpacity onPress={handleProfilePictureUpload}>
            <Image
              source={{ uri: profilePicture || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541' }}
              style={styles.photo}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>

        {/* Change Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Change Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter new password"
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        {/* Repairman Button */}
        {user?.is_repairman ? (
          // If the user is already a repairman, show "Edit Repairman Profile" button
          <TouchableOpacity
            style={styles.becomeRepairmanButton}
            onPress={() => router.push('/(home)/edit-repairman')}
          >
            <Text style={styles.becomeRepairmanButtonText}>Edit Repairman Profile</Text>
          </TouchableOpacity>
        ) : (
          // If the user is not a repairman, show "Become a Repairman" button
          <TouchableOpacity
            style={styles.becomeRepairmanButton}
            onPress={() => router.push('/(home)/create-repairman')}
          >
            <Text style={styles.becomeRepairmanButtonText}>Become a Repairman</Text>
          </TouchableOpacity>
        )}

        {/* Shop Button */}
        {user?.has_shop ? (
          // If the user has a shop, show "Edit Shop" button
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/(home)/edit-shop')}
          >
            <Text style={styles.shopButtonText}>Edit Shop</Text>
          </TouchableOpacity>
        ) : (
          // If the user doesn't have a shop, show "Open a Shop" button
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/(home)/create-shop')}
          >
            <Text style={styles.shopButtonText}>Open a Shop</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.changePasswordButton} onPress={handleChangePassword}>
          <Text style={styles.changePasswordButtonText}>Change Password</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 60,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  saveButton: {
    backgroundColor: '#00897B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  changePasswordButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  becomeRepairmanButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  becomeRepairmanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shopButton: {
    backgroundColor: '#FFA500',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfilePage;