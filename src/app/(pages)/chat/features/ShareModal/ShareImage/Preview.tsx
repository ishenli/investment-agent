import { ModelTag } from '@lobehub/icons';
import { Avatar, Markdown } from '@lobehub/ui';
import { ChatHeaderTitle } from '@lobehub/ui/chat';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@renderer/store/session';
import { sessionMetaSelectors, sessionSelectors } from '@renderer/store/session/selectors';


import { useTranslation } from 'react-i18next';
import React from 'react';
import { useContainerStyles } from '../style';
import ChatList from './ChatList';
import { useStyles } from './style';
import { FieldType } from './type';

const Preview = memo<FieldType & { title?: string }>(
  ({ title, withSystemRole, withBackground, withFooter }) => {
    const { t } = useTranslation(['common', 'chat']);
    // 从 SessionStore 读取当前会话的 model, plugins, systemRole
    const [model, plugins, systemRole] = useSessionStore((s) => [
      sessionSelectors.currentSessionModel(s),
      sessionSelectors.currentSessionPlugins(s),
      sessionSelectors.currentSessionSystemRole(s),
    ]);
    const [isInbox, description, avatar, backgroundColor] = useSessionStore((s) => [
      sessionSelectors.isInboxSession(s),
      sessionMetaSelectors.currentAgentDescription(s),
      sessionMetaSelectors.currentAgentAvatar(s),
      sessionMetaSelectors.currentAgentBackgroundColor(s),
    ]);

    const { styles } = useStyles(withBackground);
    const { styles: containerStyles } = useContainerStyles();

    const displayTitle = isInbox ? t('chat:sessionConfig.inboxTitle') : title;
    const displayDesc = isInbox
      ? t('chat:sessionConfig.inboxDescription')
      : description;

    return (
      <div className={containerStyles.preview}>
        <div className={withBackground ? styles.background : undefined} id={'preview'}>
          <Flexbox className={styles.container} gap={16}>
            <div className={styles.header}>
              <Flexbox align={'flex-start'} gap={12} horizontal>
                <Avatar avatar={avatar} background={backgroundColor} size={40} title={title} />
                <ChatHeaderTitle
                  desc={displayDesc}
                  tag={
                    <Flexbox gap={4} horizontal>
                      <ModelTag model={model} />
                    </Flexbox>
                  }
                  title={displayTitle}
                />
              </Flexbox>
              {withSystemRole && systemRole && (
                <div className={styles.role}>
                  <Markdown variant={'chat'}>{systemRole}</Markdown>
                </div>
              )}
            </div>
            <ChatList />
            {withFooter ? (
              <Flexbox align={'center'} className={styles.footer} gap={4}>
                <div className={styles.mainTitle}>{t('mainTitle')}</div>
              </Flexbox>
            ) : (
              <div />
            )}
          </Flexbox>
        </div>
      </div>
    );
  },
);

export default Preview;