import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function NotFoundScreen() {
  return (
    <View>
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">This screen doesn&apos;t exist.</ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">Go to home screen!</ThemedText>
        </Link>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop:0,
    marginTop: 150,
    height: '100%',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    width: '100%',
    textAlign: 'center',
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
