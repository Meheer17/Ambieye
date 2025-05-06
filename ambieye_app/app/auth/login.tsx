import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TextInput, 
  TouchableOpacity, Image, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { Link, router, Stack, useNavigation } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login, userType, isLoading, error, clearError } = useAuth();
  const [username, setUsername] = useState('mahi');
  const [password, setPassword] = useState('pass123');
  const [validationError, setValidationError] = useState('');

  // Show API error as alert
  useEffect(() => {
    if (error) {
      Alert.alert('Login Failed', error, [
        { text: 'OK', onPress: clearError }
      ]); 
    }
  }, [error]);

  const handleLogin = async () => {
    // Validation
    // 
    if (!username || !password) {
      setValidationError('Please fill in all fields');
      return;
    }

    setValidationError('');

    // Attempt login
    const success = await login(username, password);
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
    <>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

        <Text style={styles.title}>
          Login as {userType === 'doctor' ? 'Doctor' : 'Patient'}
        </Text>

        {validationError ? <Text style={styles.error}>{validationError}</Text> : null}

        <View style={styles.inputContainer}>
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
            placeholder="Password"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/auth/signup" asChild>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.link}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0145',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
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
    marginTop: 30,
  },
  footerText: {
    color: 'white',
  },
  link: {
    color: '#5f2446',
    fontWeight: 'bold',
  },
});