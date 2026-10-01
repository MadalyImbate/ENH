import React from 'react';
import { useColorScheme } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { RechargeScreen } from '../screens/RechargeScreen';
import { MyMetersScreen } from '../screens/MyMetersScreen';
import { SupportScreen } from '../screens/SupportScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { AppLanguage, MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type MainTabsProps = {
  initialTab?: keyof MainTabParamList;
  language: AppLanguage;
  onSignOut: () => void;
};

const iconMap: Record<keyof MainTabParamList, string> = {
  Inicio: 'home-variant-outline',
  Recargas: 'flash-outline',
  MyMeters: 'gauge',
  Suporte: 'face-agent',
  Perfil: 'account-outline',
};

const labels = {
  pt: {
    Inicio: 'Início',
    Recargas: 'Recargas',
    MyMeters: 'Contadores',
    Suporte: 'Suporte',
    Perfil: 'Perfil',
  },
  en: {
    Inicio: 'Home',
    Recargas: 'Top Up',
    MyMeters: 'Meters',
    Suporte: 'Support',
    Perfil: 'Profile',
  },
};

const tabTheme = {
  light: {
    bg: '#ffffff',
    border: '#e0eae2',
    active: '#1e7e34',
    inactive: '#8fa096',
  },
  dark: {
    bg: '#12160f',
    border: '#2b352e',
    active: '#9fdcb0',
    inactive: '#7d8f83',
  },
};

export function MainTabs({ language, initialTab = 'Recargas', onSignOut }: MainTabsProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const t = isDark ? tabTheme.dark : tabTheme.light;
  const tabHeight = 58 + insets.bottom;

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: tabHeight,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: t.bg,
          borderTopWidth: 1,
          borderTopColor: t.border,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        },
        tabBarActiveTintColor: t.active,
        tabBarInactiveTintColor: t.inactive,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Manrope_700Bold',
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={iconMap[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" options={{ title: labels[language].Inicio }}>
        {() => <HomeScreen language={language} />}
      </Tab.Screen>

      <Tab.Screen name="Recargas" options={{ title: labels[language].Recargas }}>
        {({ route }) => <RechargeScreen language={language} prefillMeterNumber={route.params?.meterNumber} />}
      </Tab.Screen>

      <Tab.Screen name="MyMeters" options={{ title: labels[language].MyMeters }}>
        {() => <MyMetersScreen language={language} />}
      </Tab.Screen>

      <Tab.Screen name="Suporte" options={{ title: labels[language].Suporte }}>
        {() => <SupportScreen language={language} />}
      </Tab.Screen>

      <Tab.Screen name="Perfil" options={{ title: labels[language].Perfil }}>
        {() => <ProfileScreen language={language} onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
