import { useEffect } from 'react';
import { router } from 'expo-router';

export default function OtpScreen() {
  useEffect(() => {
    router.replace('/(auth)/phone');
  }, []);

  return null;
}
