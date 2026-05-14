'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import { Button } from '@renderer/components/ui/button';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HideAmountContextValue {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
}

const HideAmountContext = createContext<HideAmountContextValue | null>(null);

export function useHideAmount() {
  const ctx = useContext(HideAmountContext);
  if (!ctx) {
    throw new Error('useHideAmount must be used within HideAmountProvider');
  }
  return ctx;
}

export function HideAmountProvider({ children }: { children: ReactNode }) {
  const [hideAmounts, setHideAmounts] = useState(false);
  
  const toggleHideAmounts = () => setHideAmounts(prev => !prev);
  
  return (
    <HideAmountContext.Provider value={{ hideAmounts, toggleHideAmounts }}>
      {children}
    </HideAmountContext.Provider>
  );
}

interface HideAmountToggleProps {
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
}

export function HideAmountToggle({ size = 'default', showText = false }: HideAmountToggleProps) {
  const { hideAmounts, toggleHideAmounts } = useHideAmount();
  const { t } = useTranslation('asset');
  
  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggleHideAmounts}
      className="gap-2"
    >
      {hideAmounts ? (
        <EyeOffIcon className="h-4 w-4" />
      ) : (
        <EyeIcon className="h-4 w-4" />
      )}
      {showText && (
        <span className="text-xs">
          {hideAmounts ? t('common.showAmount', '显示金额') : t('common.hideAmount', '隐藏金额')}
        </span>
      )}
    </Button>
  );
}

/** 隐藏金额的文本组件 */
export function AmountText({ 
  value, 
  className = '',
  maskedChar = '****',
}: { 
  value: string | number;
  className?: string;
  maskedChar?: string;
}) {
  const { hideAmounts } = useHideAmount();
  
  if (hideAmounts) {
    return <span className={className}>{maskedChar}</span>;
  }
  
  return <span className={className}>{value}</span>;
}
