import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Input, Icon } from '@rneui/themed';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../utils/AuthProvider'; 

const API_URL = 'http://10.0.2.2:3000/api/login'; 

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const isValidEmail = (value: any) => /\S+@\S+\.\S+/.test(value);
  const isValidPhone = (value: any) => /^\+?[1-9]\d{7,14}$/.test(value);

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.appName}>BGear</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue to your account</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email or Phone</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="user"
                  type="font-awesome"
                  size={18}
                  color="#757575"
                  containerStyle={styles.inputIcon}
                />
                <Input
                  containerStyle={styles.input}
                  inputContainerStyle={{ borderBottomWidth: 0 }}
                  inputStyle={styles.inputText}
                  onChangeText={setIdentifier}
                  value={identifier}
                  placeholder="email@example.com or +628123456789"
                  autoCapitalize="none"
                  keyboardType="default"
                  placeholderTextColor="#9E9E9E"
                  label=""
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="lock"
                  type="font-awesome"
                  size={18}
                  color="#757575"
                  containerStyle={styles.inputIcon}
                />
                <Input
                  containerStyle={styles.input}
                  inputContainerStyle={{ borderBottomWidth: 0 }}
                  inputStyle={styles.inputText}
                  onChangeText={setPassword}
                  value={password}
                  placeholder="Enter your password"
                  autoCapitalize="none"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9E9E9E"
                  label=""
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
                      <Icon
                        type="font-awesome"
                        name={showPassword ? 'eye' : 'eye-slash'}
                        size={18}
                        color="#757575"
                      />
                    </TouchableOpacity>
                  }
                />
              </View>
            </View>

            <TouchableOpacity style={styles.forgotPasswordLink}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialsContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Icon
                  name="google"
                  type="font-awesome"
                  size={18}
                  color="#DB4437"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Icon
                  name="facebook"
                  type="font-awesome"
                  size={18}
                  color="#4267B2"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Icon
                  name="apple"
                  type="font-awesome"
                  size={18}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Link href="/(auth)/register" style={styles.link}>
                Sign Up
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 32,
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00897B',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    marginVertical: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
    marginLeft: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    paddingLeft: 8,
    height: 56,
  },
  inputText: {
    fontSize: 16,
    color: '#212121',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#00897B',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#00897B',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#757575',
    fontSize: 14,
  },
  socialsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  footerContainer: {
    marginTop: 'auto',
    marginBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#757575',
  },
  link: {
    color: '#00897B',
    fontWeight: 'bold',
  },
});