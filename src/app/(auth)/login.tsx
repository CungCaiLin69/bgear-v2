import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Input, Icon } from '@rneui/themed';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../utils/AuthProvider'; // Adjust path if necessary

const API_URL = 'http://10.0.2.2:3000/api/login'; 

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
  const isValidPhone = (value: string) => /^\+?[1-9]\d{7,14}$/.test(value);

  async function handleLogin() {
    if (!identifier || !password) {
      Alert.alert('Validation Error', 'Please fill in all fields.');
      return;
    }
  
    if (!isValidEmail(identifier) && !isValidPhone(identifier)) {
      Alert.alert('Validation Error', 'Enter a valid email or phone number.');
      return;
    }
  
    setLoading(true);
  
    try {
      console.log('Login with:', { emailOrPhone: identifier, password });
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: identifier,
          password,
        }),
      });
  
      const data = await response.json();
      console.log('Login response:', data);
  
      if (!response.ok) {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }
  
      await login(data.token, {
        name: data.user.name,
        email: data.user.email,
        phoneNumber: data.user.phoneNumber,
        has_shop: data.user.has_shop,
        is_repairman: data.user.is_repairman,
      });
  
      router.replace('/(home)/home');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to BGear</Text>

      <View style={[styles.verticallySpaced, styles.mt10]}>
        <Input
          label="Email or Phone"
          onChangeText={setIdentifier}
          value={identifier}
          placeholder="email@example.com or +628123456789"
          autoCapitalize="none"
          keyboardType="default"
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
              onPress={() => setShowPassword(prev => !prev)}
            />
          }
        />
      </View>

      <TouchableOpacity
        style={[styles.loginBtn, styles.mt30]}
        onPress={handleLogin}
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
