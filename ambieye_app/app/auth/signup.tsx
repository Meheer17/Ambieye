import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TextInput, 
  TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function SignUpScreen() {
  const { signup, userType, isLoading, error, clearError } = useAuth();
  const [fullName, setFullName] = useState('Meheer');
  const [username, setUsername] = useState('mahi');
  const [email, setEmail] = useState('meherr17.j@gmail.com');
  const [password, setPassword] = useState('pass123');
  const [confirmPassword, setConfirmPassword] = useState('pass123');
  const [validationError, setValidationError] = useState('');
  
  // Show API error as alert
  useEffect(() => {
    if (error) {
      Alert.alert('Signup Failed', error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error]);
  
  const handleSignUp = async () => {
    // Validation
    if (!fullName || !username || !email || !password || !confirmPassword) {
      setValidationError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }
    
    setValidationError('');
    
    // Attempt signup
    const success = await signup({
      fullName,
      username,
      email,
      password
    });
    
    if (success) {
      // Navigate to appropriate screen based on user type
      if (userType === 'doctor') {
        router.replace('/(doctor)/');
      } else {
        router.replace('/(patient)/');
      }
    }
  };
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />
        
        <Text style={styles.title}>
          Create {userType === 'doctor' ? 'Doctor' : 'Patient'} Account
        </Text>
        
        {validationError ? <Text style={styles.error}>{validationError}</Text> : null}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#aaa"
            value={fullName}
            onChangeText={setFullName}
            editable={!isLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!isLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#aaa"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleSignUp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0145',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    color: 'white',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#5f2446',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#3a1529',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 30,
  },
  footerText: {
    color: 'white',
  },
  link: {
    color: '#5f2446',
    fontWeight: 'bold',
  },
});