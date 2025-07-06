import React, { useEffect, useState, useRef } from 'react';
import { 
  ImageBackground, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ActivityIndicator, 
  Animated, 
  Dimensions,
  StatusBar,
  Platform 
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const image = { uri: 'https://t3.ftcdn.net/jpg/02/55/92/20/360_F_255922049_AFP2zmwkx1OS8HH46Wu5IJerTaqgV5mV.jpg' };

const WelcomeScreen = () => {
  const router = useRouter();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonSlideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Check if user is already logged in
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          // If token exists, user is logged in -> go directly to Home
          router.replace('/(home)/home');
          return;
        }

        // 2. If no token, check if it's the first time launching the app
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        if (!hasLaunched) {
          // First launch
          await AsyncStorage.setItem('hasLaunched', 'true');
          setIsFirstLaunch(true);
        } else {
          // Not the first launch -> skip Welcome, go to Login
          setIsFirstLaunch(false);
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Error checking first launch or token:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Trigger animations when component mounts
  useEffect(() => {
    if (!loading && isFirstLaunch) {
      // Stagger animations for smooth entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Delayed button animation
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(buttonFadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(buttonSlideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, 400);
    }
  }, [loading, isFirstLaunch]);

  // Show a loader while we're checking
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#00897B" />
          <Text style={styles.loadingText}>Memuat...</Text>
        </View>
      </View>
    );
  }

  // If we already redirected, or if not first launch, we can return null
  if (isFirstLaunch === false) {
    return null;
  }

  // If it's truly the first launch (and user not logged in), show the welcome screen
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <ImageBackground source={image} resizeMode="cover" style={styles.image}>
          {/* Gradient overlay for better text readability */}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          />
          
          {/* Content container */}
          <View style={styles.contentContainer}>
            {/* Header section with logo/branding */}
            <Animated.View 
              style={[
                styles.headerSection,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                  ]
                }
              ]}
            >
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>BGear</Text>
              </View>
            </Animated.View>

            {/* Text section */}
            <Animated.View 
              style={[
                styles.textSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={styles.headerText}>Selamat Datang</Text>
              <Text style={styles.subHeaderText}>di BGear</Text>
              <Text style={styles.descriptionText}>
                Aplikasi yang bikin kamu dan kendaraanmu hidup lebih nyaman dan terhubung dengan mudah
              </Text>
            </Animated.View>

            {/* Button section */}
            <Animated.View 
              style={[
                styles.buttonSection,
                {
                  opacity: buttonFadeAnim,
                  transform: [{ translateY: buttonSlideAnim }]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00897B', '#26A69A']}
                  style={styles.gradientButton}
                >
                  <Text style={styles.loginButtonText}>Masuk</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.registerButton}
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.8}
              >
                <Text style={styles.registerButtonText}>Belum punya akun? Daftar</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Decorative elements */}
          <Animated.View 
            style={[
              styles.decorativeCircle1,
              { opacity: fadeAnim }
            ]}
          />
          <Animated.View 
            style={[
              styles.decorativeCircle2,
              { opacity: fadeAnim }
            ]}
          />
        </ImageBackground>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#000',
  },
  image: { 
    flex: 1, 
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 50,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  textSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  headerText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
    letterSpacing: 1,
  },
  subHeaderText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  descriptionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
    maxWidth: width * 0.85,
  },
  buttonSection: {
    gap: 15,
  },
  loginButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#00897B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  registerButton: {
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  // Decorative elements
  decorativeCircle1: {
    position: 'absolute',
    top: 100,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 137, 123, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 137, 123, 0.2)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: 200,
    left: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});