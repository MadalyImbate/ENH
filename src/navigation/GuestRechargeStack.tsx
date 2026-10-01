import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GuestRechargeScreen } from '../screens/GuestRechargeScreen';
import type { AppLanguage, GuestRechargeStackParamList } from './types';

const Stack = createNativeStackNavigator<GuestRechargeStackParamList>();

type GuestRechargeStackProps = {
  language: AppLanguage;
  onBackToLogin: () => void;
};

export function GuestRechargeStack({ language, onBackToLogin }: GuestRechargeStackProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GuestRechargeHome">
        {() => <GuestRechargeScreen language={language} onBackToLogin={onBackToLogin} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
