import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { useAuth } from '../../utils/AuthProvider';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import MultiSelect from 'react-native-multiple-select';

const AVAILABLE_SKILLS = [
  { id: 'car', name: 'Car Repair' },
  { id: 'bike', name: 'Bicycle Repair' },
  { id: 'motorcycle', name: 'Motorcycle Repair' },
];

const AVAILABLE_SERVICES = [
  { id: 'change_tires', name: 'Change Tires' },
  { id: 'replace_oil', name: 'Oil Change' },
  { id: 'battery_replacement', name: 'Battery Replacement' },
  { id: 'brake_service', name: 'Brake Service' },
  { id: 'engine_repair', name: 'Engine Repair' },
  { id: 'tune_up', name: 'Tune-Up' },
  { id: 'diagnostics', name: 'Diagnostics' },
  { id: 'chain_repair', name: 'Chain Repair' },
  { id: 'flat_tire', name: 'Flat Tire' },
  { id: 'parts_replacement', name: 'Parts Replacement' }
];

const BecomeRepairmanForm = () => {
  const navigation = useNavigation();
  const { becomeRepairman } = useAuth();
  const { profilePicture } = useLocalSearchParams();

  const profilePictureUrl = Array.isArray(profilePicture) ? profilePicture[0] : profilePicture;

  const [name, setName] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [servicePrices, setServicePrices] = useState<Record<string, string>>({});

  const handleSelectedSkillsChange = (selectedItems: string[]) => {
    setSelectedSkills(selectedItems);
  };

  const handleSelectedServicesChange = (selectedItems: string[]) => {
    setSelectedServices(selectedItems);
  };

  const validateInputs = () => {
    if (selectedSkills.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one skill.');
      return false;
    }
    if (selectedServices.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one service.');
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
      // Map selected IDs to actual skill/service names for better readability in the database
      const skillNames = selectedSkills.map(id => 
        AVAILABLE_SKILLS.find(skill => skill.id === id)?.name || id
      );
      
      const serviceNames = selectedServices.map(id => 
        AVAILABLE_SERVICES.find(service => service.id === id)?.name || id
      );

      const servicesWithPrices = Object.fromEntries(
        selectedServices.map(id => [
          AVAILABLE_SERVICES.find(s => s.id === id)?.name || id,
          Number(servicePrices[id] || 0)
        ])
      );

      const repairmanData = {
        name,
        skills: skillNames,
        servicesProvided: serviceNames,
        servicesWithPrices,
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
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.container, { flex: 1 }]}>
        <Text style={styles.title}>Become a Repairman</Text>
  
        {profilePictureUrl && (
          <Image source={{ uri: profilePictureUrl }} style={styles.profilePicture} />
        )}
  
        <View style={styles.dropdownContainer}>
          <Text style={styles.label}>Select Your Skills</Text>
          <MultiSelect
            items={AVAILABLE_SKILLS}
            uniqueKey="id"
            onSelectedItemsChange={handleSelectedSkillsChange}
            selectedItems={selectedSkills}
            selectText="Select Skills"
            searchInputPlaceholderText="Search Skills..."
            tagRemoveIconColor="#CCC"
            tagBorderColor="#CCC"
            tagTextColor="#333"
            selectedItemTextColor="#333"
            selectedItemIconColor="#333"
            itemTextColor="#000"
            displayKey="name"
            searchInputStyle={{ color: '#333' }}
            submitButtonColor="#48d22b"
            submitButtonText="Done"
            styleMainWrapper={styles.multiSelect}
          />
        </View>
  
        <View style={styles.dropdownContainer}>
          <Text style={styles.label}>Select Services You Provide</Text>
          <MultiSelect
            items={AVAILABLE_SERVICES}
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
            submitButtonColor="#48d22b"
            submitButtonText="Done"
            styleMainWrapper={styles.multiSelect}
          />
        </View>

        {selectedServices.map(serviceId => {
          const service = AVAILABLE_SERVICES.find(s => s.id === serviceId);
          return (
            <View key={serviceId}>
              <Text style={{ marginBottom: 4 }}>
                {service?.name || serviceId} Price (IDR)
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={servicePrices[serviceId] || ''}
                onChangeText={(value) =>
                  setServicePrices(prev => ({ ...prev, [serviceId]: value }))
                }
                placeholder="e.g. 50000"
              />
            </View>
          );
        })}

        <TextInput 
          style={styles.input}
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
  
        {/* Sticky bottom buttons */}
        <View style={{ marginTop: 'auto' }}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
  
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );  
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 50
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00897B',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 12,
    marginBottom: 50,
    fontSize: 16,
    backgroundColor: "#FFF",
    borderRadius: 20,
    height: 50,
    paddingHorizontal: 20,
  },
  dropdownContainer: {
    marginBottom: 15,
  },
  multiSelect: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2,
    padding: 8,
  },
  submitButton: {
    borderRadius: 20,
    backgroundColor: '#00897B',  
    alignItems: 'center',
    padding: 15,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 10,
    borderColor: '#00897B',
    borderWidth: 1,
    marginTop: 10
  },
  cancelButtonText: {
    color: '#00897B',
    fontSize: 16,
  },
  resignButton: {
    backgroundColor: '#ff3b30',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  resignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BecomeRepairmanForm;