'use client';

import { useEffect, useState } from 'react';
import { useAccountStore } from '@renderer/store/account/store';
import { TradingAccountType } from '@typings/account';

export default function AccountList() {
  const [items, setItems] = useState<TradingAccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return <div className="p-4">加载中...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">账户列表</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">账户列表</h2>
      {items.length === 0 ? (
        <p>暂无账户数据</p>
      ) : (
        <div className="space-y-2">
          {items.map((account) => (
            <div key={account.id} className="border p-3 rounded flex justify-between items-center">
              <div>
                <p>
                  <strong>账户名:</strong> {account.accountName}
                </p>
                <p>
                  <strong>余额:</strong> {account.balance?.toFixed(2)} {account.currency}
                </p>
                <p>
                  <strong>市场:</strong> {account.market}
                </p>
              </div>
              <div>
                <button className="btn btn-primary" onClick={() => setAccount(account)}>
                  选择
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
