import { useTheme } from 'antd-style';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import React from 'react';

const ShortcutHint = memo(() => {
  const { t } = useTranslation('chat');
  const theme = useTheme();

  return (
    <Flexbox
      align={'center'}
      gap={4}
      horizontal
      style={{
        color: theme.colorTextDescription,
        fontSize: 12,
        marginRight: 12,
      }}
    >
      <span>{t('input.send')}</span>
      <span>/</span>
      <span>{t('input.warp')}</span>
    </Flexbox>
  );
});

export default ShortcutHint;
