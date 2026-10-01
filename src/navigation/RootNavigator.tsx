import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { GuestRechargeStack } from './GuestRechargeStack';
import { MainTabs } from './MainTabs';
import type { MainTabParamList, RootStackParamList } from './types';
import { clearMobileSession, restoreMobileSession } from '../services/authSession';
import { setSessionExpiredHandler } from '../services/api';
import { startTicketNotifications, stopTicketNotifications } from '../services/ticketNotifications';
import { getDeviceLanguage } from '../utils/locale';

const Stack = createNativeStackNavigator<RootStackParamList>();

type SessionMode = 'logged_out' | 'auth' | 'guest';

export function RootNavigator() {
  // Idioma segue o dispositivo — sem seletor manual no login.
  const [language] = useState(getDeviceLanguage());
  const [sessionMode, setSessionMode] = useState<SessionMode>('logged_out');
  const [initialTab, setInitialTab] = useState<keyof MainTabParamList>('Inicio');
  const [hydrating, setHydrating] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    restoreMobileSession()
      .then(session => {
        if (session?.token) {
          setInitialTab('Inicio');
          setSessionMode('auth');
        }
      })
      .finally(() => setHydrating(false));
  }, []);

  // Com sessão iniciada, vigia os tickets e notifica quando um é resolvido —
  // é o convite ao cliente para confirmar, que desbloqueia o fecho no IRS.
  useEffect(() => {
    if (sessionMode !== 'auth') {
      stopTicketNotifications();
      return undefined;
    }
    return startTicketNotifications();
  }, [sessionMode]);

  // Sessão rejeitada pelo servidor: limpa e volta ao login.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearMobileSession().catch(() => undefined);
      setInitialTab('Inicio');
      setSessionMode('logged_out');
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
      {sessionMode === 'logged_out' && (
        <Stack.Screen name="Login">
          {() => (
            <LoginScreen
              language={language}
              onLogin={() => {
                setInitialTab('Inicio');
                setSessionMode('auth');
              }}
              onGuest={() => setSessionMode('guest')}
            />
          )}
        </Stack.Screen>
      )}

      {sessionMode === 'auth' && (
        <Stack.Screen name="MainTabs">
          {() => (
            <MainTabs
              key={`tabs-${initialTab}-${language}`}
              language={language}
              initialTab={initialTab}
              onSignOut={async () => {
                await clearMobileSession();
                setInitialTab('Inicio');
                setSessionMode('logged_out');
              }}
            />
          )}
        </Stack.Screen>
      )}

      {sessionMode === 'guest' && (
        <Stack.Screen name="GuestRechargeStack">
          {() => <GuestRechargeStack language={language} onBackToLogin={() => setSessionMode('logged_out')} />}
        </Stack.Screen>
      )}
      </Stack.Navigator>

      {showSplash ? (
        <SplashScreen language={language} ready={!hydrating} onFinish={() => setShowSplash(false)} />
      ) : null}
    </>
  );
}
