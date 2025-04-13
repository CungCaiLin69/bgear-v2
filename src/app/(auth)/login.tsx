import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button, Input, Icon } from '@rneui/themed';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../utils/AuthProvider'; // Adjust path if necessary

const API_URL = 'http://10.0.2.2:3000/api/login'; // For Android emulator
// OR
// const API_URL = 'http://192.168.1.5:8081/api/login'; // For physical device

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth(); // Use your AuthProvider's login function

  // Helper to validate email format
  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  async function signInWithEmailHandler() {
    // Validate input fields
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please fill in both email and password.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      // Send login request to the backend
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // Handle backend errors
      if (!response.ok) {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
        return;
      }

      // Save the JWT token and user data, then redirect to the homepage
      await login(data.token, {
        name: data.user.name,
        email: data.user.email,
        has_shop: data.user.has_shop,
        is_repairman: data.user.is_repairman,
      }); 
      router.replace('/(home)/home');
    } catch (error) {
      console.error('Error during login:', error);
      Alert.alert('Login Error', 'Network error, please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to BGear</Text>

      <View style={[styles.verticallySpaced, styles.mt10]}>
        <Input
          label="Email"
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt10]}>
        <Input
          label="Password"
          onChangeText={setPassword}
          value={password}
          placeholder="Password"
          autoCapitalize="none"
          secureTextEntry={!showPassword}
          rightIcon={
            <Icon
              type="font-awesome"
              name={showPassword ? 'eye' : 'eye-slash'}
              onPress={() => setShowPassword((prev) => !prev)}
            />
          }
        />
      </View>

      <TouchableOpacity
        style={[styles.loginBtn, styles.mt30]}
        onPress={signInWithEmailHandler}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.regisTxt}>Login</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Don't have an account yet?{' '}
        <Link href="/(auth)/register" style={styles.link}>
          Register
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loginBtn: {
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: '#00897B',
    borderColor: '#00897B',
  },
  regisTxt: { color: 'white', fontSize: 16, fontWeight: '600' },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  verticallySpaced: { paddingVertical: 4, alignSelf: 'stretch' },
  mt10: { marginTop: 10 },
  mt30: { marginTop: 30 },
  footerText: { textAlign: 'center', marginTop: 20 },
  link: { color: '#1E90FF', fontWeight: 'bold' },
});