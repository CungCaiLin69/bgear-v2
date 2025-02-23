import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useAuth } from '../../utils/AuthProvider'; // Adjust path if necessary
import { useNavigation } from '@react-navigation/native';

const ProfilePage = () => {
  const { user, updateUser, changePassword } = useAuth();
  const navigation = useNavigation();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveChanges = async () => {
    try {
      const updatedUser = { name, email }; // Use 'name' instead of 'username'
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
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>{'Back'}</Text>
      </TouchableOpacity>

      {/* User Photo */}
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: 'https://via.placeholder.com/150' }} // Placeholder image
          style={styles.photo}
        />
      </View>

      {/* Name Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
        />
      </View>

      {/* Email Input */}
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

      {/* Save Changes Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      {/* Change Password Button */}
      <TouchableOpacity style={styles.changePasswordButton} onPress={handleChangePassword}>
        <Text style={styles.changePasswordButtonText}>Change Password</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
    marginTop: 60, // Add margin to avoid overlap with the back button
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
});

export default ProfilePage;