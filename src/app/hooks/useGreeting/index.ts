import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { parseGreetingTime } from './greetingTime';

export const useGreeting = () => {
  const { t } = useTranslation('common');
  const [greeting, setGreeting] = useState<'morning' | 'noon' | 'afternoon' | 'night'>();

  useEffect(() => {
    // 初始化问候语，只在组件挂载时执行一次
    const timer = setTimeout(() => {
      setGreeting(parseGreetingTime());
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  return greeting && t(`greeting.${greeting}`);
};
