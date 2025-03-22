import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useAuth } from '../../utils/AuthProvider';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';

const BecomeRepairmanForm = () => {
  const navigation = useNavigation();
  const { becomeRepairman } = useAuth();
  const { profilePicture } = useLocalSearchParams();

  const profilePictureUrl = Array.isArray(profilePicture) ? profilePicture[0] : profilePicture;

  const [name, setName] = useState('');
  const [skills, setSkills] = useState('');
  const [servicesProvided, setServicesProvided] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateInputs = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return false;
    }
    if (!skills.trim()) {
      Alert.alert('Validation Error', 'Please enter at least one skill.');
      return false;
    }
    if (!servicesProvided.trim()) {
      Alert.alert('Validation Error', 'Please enter at least one service.');
      return false;
    }
    if(!phoneNumber.trim()){
      Alert.alert('Validation Error', 'Phone number is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;
    setIsLoading(true);

    try {
      const repairmanData = {
        name,
        skills: skills.split(',').map(s => s.trim()),
        servicesProvided: servicesProvided.split(',').map(s => s.trim()),
        profilePicture: profilePictureUrl || null,
        phoneNumber,
      };

      await becomeRepairman(repairmanData);
      Alert.alert('Success', 'You are now a repairman!');
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to submit the form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Become a Repairman</Text>

      {profilePictureUrl && (
        <Image source={{ uri: profilePictureUrl }} style={styles.profilePicture} />
      )}

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Skills (e.g. car, bike)"
        value={skills}
        onChangeText={setSkills}
      />
      <TextInput
        style={styles.input}
        placeholder="Services Provided (e.g. change tires, replace oil)"
        value={servicesProvided}
        onChangeText={setServicesProvided}
      />
      <TextInput 
        style={styles.input}
        placeholder="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? 'Submitting...' : 'Submit'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.submitButton}>
        <Text style={styles.submitButtonText}>{'Cancel'}</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#00897B',
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
});

export default BecomeRepairmanForm;