'use client';

import { useEffect, useState } from 'react';
import { useAccountStore } from '@renderer/store/account/store';
import { TradingAccountType } from '@typings/account';
import { useTranslation } from 'react-i18next';

export default function AccountList() {
  const [items, setItems] = useState<TradingAccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('account');

  const setAccount = useAccountStore((s) => s.setAccount);

  useEffect(() => {
    let mounted = true;

    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/account');
        if (!res.ok) throw new Error('Failed to fetch accounts');
        const payload = await res.json();
        // payload is expected to be { items: TradingAccountType[], totalCount }
        if (mounted) setItems(payload.items || []);
      } catch (err) {
        if (mounted) setError((err as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAccounts();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="p-4">{t('loading')}</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">{t('list.title')}</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t('list.title')}</h2>
      {items.length === 0 ? (
        <p>{t('list.noData')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((account) => (
            <div key={account.id} className="border p-3 rounded flex justify-between items-center">
              <div>
                <p>
                  <strong>{t('list.accountName')}:</strong> {account.accountName}
                </p>
                <p>
                  <strong>{t('list.balance')}:</strong> {account.balance?.toFixed(2)} {account.currency}
                </p>
                <p>
                  <strong>{t('dashboard.market')}:</strong> {account.market}
                </p>
              </div>
              <div>
                <button className="btn btn-primary" onClick={() => setAccount(account)}>
                  {t('list.select')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
