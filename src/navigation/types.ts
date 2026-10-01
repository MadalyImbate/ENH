export type AppLanguage = 'pt' | 'en';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  GuestRechargeStack: undefined;
};

export type MainTabParamList = {
  Inicio: undefined;
  Recargas: { meterNumber?: string } | undefined;
  MyMeters: undefined;
  Suporte: undefined;
  Perfil: undefined;
};

export type GuestRechargeStackParamList = {
  GuestRechargeHome: undefined;
};
