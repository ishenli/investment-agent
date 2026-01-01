'use client';

import { memo } from 'react';
import Toast from './Toast';

const ZenModeToast = memo(() => {
  const inZenMode = false;

  return inZenMode && <Toast />;
});

export default ZenModeToast;
