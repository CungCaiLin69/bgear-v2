import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../utils/AuthProvider'; 
import { useRouter } from 'expo-router';

export default function HomePage() {
  const { userToken, user } = useAuth(); 
  const router = useRouter();

  // Redirect to login if not logged in
  if (!userToken) {
    router.replace('/(auth)/login');
    return null;
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Button */}
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => router.push({ pathname: '/(home)/profile' })} 
      >
        <Text style={styles.profileButtonText}>Profile</Text>
      </TouchableOpacity>

      {/* Greeting Card */}
      <View style={styles.greetingCard}>
        <Text style={styles.greetingText}>Welcome, {user?.name}!</Text>

        <View style={styles.cardButtons}>
          {/* Repairman Button */}
                  {user?.is_repairman ? (
                    // If the user is already a repairman, show "Edit Repairman Profile" button
                    <TouchableOpacity
                      style={styles.becomeRepairmanButton}
                      onPress={() => router.push('/(home)/edit-repairman')}
                    >
                      <Text style={styles.becomeRepairmanButtonText}>Repairman Dashboard</Text>
                    </TouchableOpacity>
                  ) : (
                    // If the user is not a repairman, show "Become a Repairman" button
                    <TouchableOpacity
                      style={styles.becomeRepairmanButton}
                      onPress={() => router.push('/(home)/create-repairman')}
                    >
                      <Text style={styles.becomeRepairmanButtonText}>Become Repairman</Text>
                    </TouchableOpacity>
                  )}
          
                  {/* Shop Button */}
                  {user?.has_shop ? (
                    // If the user has a shop, show "Edit Shop" button
                    <TouchableOpacity
                      style={styles.shopButton}
                      onPress={() => router.push('/(home)/edit-shop')}
                    >
                      <Text style={styles.shopButtonText}>Shop Dashboard</Text>
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
        </View>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push('/')} 
        >
          <Text style={styles.optionButtonText}>Order a Repairman</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push('/')} 
        >
          <Text style={styles.optionButtonText}>Book a Shop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  profileButtonText: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: 'bold',
  },
  greetingCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 12, 
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  optionsContainer: {
    marginTop: 40,
  },
  optionButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  optionButtonText: {
    color: '#fff',
    fontSize: 18,
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