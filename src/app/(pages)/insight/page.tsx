'use client';

import { useTranslation } from 'react-i18next';
import { InsightHistory } from './modules/InsightHistory';
import { useAccountGuard } from '@renderer/hooks/useAccountGuard';

export default function InsightPage() {
  useAccountGuard();
  const { t } = useTranslation('insight');

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-lg font-semibold">{t('title')}</h1>
      <InsightHistory />
    </div>
  );
}
