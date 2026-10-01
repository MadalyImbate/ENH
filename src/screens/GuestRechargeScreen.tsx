import React from 'react';
import type { AppLanguage } from '../navigation/types';
import { RechargeScreen } from './RechargeScreen';

type GuestRechargeScreenProps = {
  language: AppLanguage;
  onBackToLogin: () => void;
};

const copy = {
  pt: { back: 'Voltar ao login' },
  en: { back: 'Back to login' },
};

export function GuestRechargeScreen({ language, onBackToLogin }: GuestRechargeScreenProps) {
  const t = copy[language];
  return <RechargeScreen language={language} onBack={onBackToLogin} backLabel={t.back} />;
}
