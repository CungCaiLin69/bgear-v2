import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useAuth } from '../../utils/AuthProvider';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';

const EditRepairmanForm = () => {
  const navigation = useNavigation();
  const { user, repairman, editRepairman, resignAsRepairman } = useAuth();
  const { profilePicture } = useLocalSearchParams();

  const profilePictureUrl = Array.isArray(profilePicture) ? profilePicture[0] : profilePicture;

  const [name, setName] = useState(user?.name || '');
  const [skills, setSkills] = useState(repairman?.skills.join(', ') || '');
  const [servicesProvided, setServicesProvided] = useState(repairman?.servicesProvided.join(', ') || '');
  const [phoneNumber, setPhoneNumber] = useState(repairman?.phoneNumber || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (repairman) {
      setName(user?.name || '');
      setSkills(repairman?.skills.join(', ') || '');
      setServicesProvided(repairman?.servicesProvided.join(', ') || '');
      setPhoneNumber(repairman?.phoneNumber || '');
    }
  }, [repairman]);

  const validateInputs = () => {
    // if (!name.trim()) {
    //   Alert.alert('Validation Error', 'Please enter your name.');
    //   return false;
    // }
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
    if (!skills.trim() || !servicesProvided.trim() || !phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
  
    setIsLoading(true);
  
    try {
      await editRepairman({
        name,
        skills: skills.split(',').map(skill => skill.trim()), // Convert to array
        servicesProvided: servicesProvided.split(',').map(service => service.trim()), // Convert to array
        phoneNumber,
      });
  
      Alert.alert('Success', 'Repairman updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating repairman:', error);
      Alert.alert('Error', 'Failed to update repairman. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleResign = async () => {
    try {
      await resignAsRepairman();
      Alert.alert('Success', 'You have resigned as a repairman.');
      navigation.goBack()
    } catch (error) {
      console.error('Error resigning as repairman:', error);
      Alert.alert('Error', 'Failed to resign as a repairman. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Repairman Profile</Text>

      {profilePictureUrl && (
        <Image source={{ uri: profilePictureUrl }} style={styles.profilePicture} />
      )}

      {/* <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      /> */}
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
          {isLoading ? 'Updating...' : 'Update Profile'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resignButton} onPress={handleResign}>
          <Text style={styles.resignButtonText}>Resign as Repairman</Text>
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
  resignButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  resignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditRepairmanForm;