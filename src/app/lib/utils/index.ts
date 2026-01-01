import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US',
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * 使用 Intl 格式化百分比（自动 ×100）
 * @example formatPercentage(0.1234) => "12.34%"
 */
export const formatPercentage = (ratio: number, locale: string = navigator.language): string => {
  if (typeof ratio !== 'number' || !isFinite(ratio)) {
    return '0.00%';
  }
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ratio);
};
