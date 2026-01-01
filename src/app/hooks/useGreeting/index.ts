import { useEffect, useState } from 'react';

import { parseGreetingTime } from './greetingTime';

const greetingMap = {
  afternoon: '下午好',
  morning: '早上好',
  night: '晚上好',
  noon: '中午好',
};

export const useGreeting = () => {
  const [greeting, setGreeting] = useState<'morning' | 'noon' | 'afternoon' | 'night'>();

  useEffect(() => {
    setGreeting(parseGreetingTime());
  }, []);

  return greeting && greetingMap[greeting];
};
