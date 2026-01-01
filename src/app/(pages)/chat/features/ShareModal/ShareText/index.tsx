import { Button, Form, type FormItemProps, copyToClipboard } from '@lobehub/ui';
import { App, Switch } from 'antd';
import isEqual from 'fast-deep-equal';
import { CopyIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { FORM_STYLE } from '@renderer/const/layoutTokens';
import { useAgentStore } from '@renderer/store/agent';
import { agentSelectors } from '@renderer/store/agent/selectors';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors, topicSelectors } from '@renderer/store/chat/selectors';

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
      label: '包含助手角色设定',
      layout: 'horizontal',
      minWidth: undefined,
      name: 'withSystemRole',
      valuePropName: 'checked',
    },
    {
      children: <Switch />,
      label: '包含消息角色',
      layout: 'horizontal',
      minWidth: undefined,
      name: 'withRole',
      valuePropName: 'checked',
    },
    {
      children: <Switch />,
      label: '包含用户消息',
      layout: 'horizontal',
      minWidth: undefined,
      name: 'includeUser',
      valuePropName: 'checked',
    },
    {
      children: <Switch />,
      label: '包含插件消息',
      layout: 'horizontal',
      minWidth: undefined,
      name: 'includeTool',
      valuePropName: 'checked',
    },
  ];

  const [systemRole] = useAgentStore((s) => [agentSelectors.currentAgentSystemRole(s)]);
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
        复制
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
