import { Button, Form, type FormItemProps, copyToClipboard } from '@lobehub/ui';
import { App, Switch } from 'antd';
import isEqual from 'fast-deep-equal';
import { CopyIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { FORM_STYLE } from '@renderer/const/layoutTokens';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors, topicSelectors } from '@renderer/store/chat/selectors';
import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';

import React from 'react';
import { useStyles } from '../style';
import Preview from './Preview';
import { generateMarkdown } from './template';
import { FieldType } from './type';

const DEFAULT_FIELD_VALUE: FieldType = {
  includeTool: true,
  includeUser: true,
  withRole: true,
  withSystemRole: false,
};

const ShareText = memo(() => {
  const [fieldValue, setFieldValue] = useState(DEFAULT_FIELD_VALUE);
  const { t } = useTranslation(['chat', 'common']);
  const { styles } = useStyles();
  const { message } = App.useApp();
  const settings: FormItemProps[] = [
    {
      children: <Switch />,
      label: t('withSystemRole'),
      layout: 'horizontal',
      minWidth: undefined,
      name: 'withSystemRole',
      valuePropName: 'checked',
    },
    {
      children: <Switch />,
      label: t('withRole'),
      layout: 'horizontal',
      minWidth: undefined,
      name: 'withRole',
      valuePropName: 'checked',
    },
    {
      children: <Switch />,
      label: t('includeUser'),
      layout: 'horizontal',
      minWidth: undefined,
      name: 'includeUser',
      valuePropName: 'checked',
    },
    {
      children: <Switch />,
      label: t('includeTool'),
      layout: 'horizontal',
      minWidth: undefined,
      name: 'includeTool',
      valuePropName: 'checked',
    },
  ];

  // 从 SessionStore 读取当前会话的 systemRole
  const systemRole = useSessionStore(sessionSelectors.currentSessionSystemRole);
  const messages = useChatStore(chatSelectors.activeBaseChats, isEqual);
  const topic = useChatStore(topicSelectors.currentActiveTopic, isEqual);

  const title = topic?.title || '默认标题';
  const content = generateMarkdown({
    ...fieldValue,
    messages,
    systemRole,
    title,
  }).replaceAll('\n\n\n', '\n');

  const isMobile = false;

  const button = (
    <>
      <Button
        block
        icon={CopyIcon}
        onClick={async () => {
          await copyToClipboard(content);
          message.success(t('copySuccess', { defaultValue: 'Copy Success', ns: 'common' }));
        }}
        size={isMobile ? undefined : 'large'}
        type={'primary'}
      >
        {t('copy')}
      </Button>
    </>
  );

  return (
    <>
      <Flexbox className={styles.body} gap={16} horizontal={!isMobile}>
        <Preview content={content} />
        <Flexbox className={styles.sidebar} gap={12}>
          <Form
            initialValues={DEFAULT_FIELD_VALUE}
            items={settings}
            itemsType={'flat'}
            onValuesChange={(_, v) => setFieldValue(v)}
            {...FORM_STYLE}
          />
          {!isMobile && button}
        </Flexbox>
      </Flexbox>
      {isMobile && (
        <Flexbox className={styles.footer} gap={8} horizontal>
          {button}
        </Flexbox>
      )}
    </>
  );
});

export default ShareText;