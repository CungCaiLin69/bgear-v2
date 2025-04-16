import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';

export default function OTPVerificationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { userId, phoneNumber } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      
      // Verify the OTP
      const res = await fetch('http://10.0.2.2:3000/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp }), 
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }
      
      Alert.alert('Success', 'Your phone number has been verified!');
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-center items-center bg-white px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text className="text-2xl font-bold text-gray-800 mb-2">Enter OTP</Text>
      <Text className="text-gray-500 text-sm mb-6">
        We've sent a 6-digit code to {phoneNumber}
      </Text>
      <TextInput
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-lg tracking-widest mb-6"
        keyboardType="numeric"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        placeholder="●●●●●●"
        placeholderTextColor="#ccc"
      />
      <TouchableOpacity
        className={`w-full bg-blue-600 py-3 rounded-xl ${
          loading ? 'opacity-50' : ''
        }`}
        disabled={loading}
        onPress={handleVerifyOTP}
      >
        <Text className="text-white text-center text-lg font-semibold">
          {loading ? 'Verifying...' : 'Verify'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4">
        <Text className="text-blue-600 font-semibold">Back</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}