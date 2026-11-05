import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GarmentSheet } from '../components/GarmentSheet';
import { UIProvider } from '../components/SheetContext';
import { Button, StateMessage, Wordmark } from '../components/ui';
import { StoreProvider, useStore } from '../storage/store';
import { color } from '../theme/tokens';

function Gate() {
  const { status, retryLoad, logout } = useStore();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: color.black, alignItems: 'center', justifyContent: 'center' }}>
        <Wordmark tone="light" />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: color.black, justifyContent: 'center' }}>
        <StateMessage
          tone="onBlack"
          title="couldn’t open your closet."
          body="the saved data on this device couldn’t be read."
          action={
            <View style={{ gap: 8 }}>
              <Button tone="onBlack" label="try again" onPress={retryLoad} />
              <Button tone="onBlack" variant="outline" label="start fresh" onPress={() => logout().then(retryLoad)} />
            </View>
          }
        />
      </View>
    );
  }
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.black }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <GarmentSheet />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: color.black }}>
      <StoreProvider>
        <UIProvider>
          <StatusBar style="light" />
          <Gate />
        </UIProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
