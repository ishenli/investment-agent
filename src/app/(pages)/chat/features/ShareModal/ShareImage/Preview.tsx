import { ModelTag } from '@lobehub/icons';
import { Avatar, Markdown } from '@lobehub/ui';
import { ChatHeaderTitle } from '@lobehub/ui/chat';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useAgentStore } from '@renderer/store/agent';
import { agentSelectors } from '@renderer/store/agent/selectors';
import { useSessionStore } from '@renderer/store/session';
import { sessionMetaSelectors, sessionSelectors } from '@renderer/store/session/selectors';

import { SESSION_CONFIG_TITLE } from '@renderer/const/text/sessionConfig';
import React from 'react';
import { useContainerStyles } from '../style';
import ChatList from './ChatList';
import { useStyles } from './style';
import { FieldType } from './type';

const Preview = memo<FieldType & { title?: string }>(
  ({ title, withSystemRole, withBackground, withFooter }) => {
    const [model, plugins, systemRole] = useAgentStore((s) => [
      agentSelectors.currentAgentModel(s),
      agentSelectors.currentAgentPlugins(s),
      agentSelectors.currentAgentSystemRole(s),
    ]);
    const [isInbox, description, avatar, backgroundColor] = useSessionStore((s) => [
      sessionSelectors.isInboxSession(s),
      sessionMetaSelectors.currentAgentDescription(s),
      sessionMetaSelectors.currentAgentAvatar(s),
      sessionMetaSelectors.currentAgentBackgroundColor(s),
    ]);

    const { styles } = useStyles(withBackground);
    const { styles: containerStyles } = useContainerStyles();

    const displayTitle = isInbox ? SESSION_CONFIG_TITLE.INBOX : title;
    const displayDesc = isInbox
      ? '开启大脑集群，激发思维火花。你的智能助理，在这里与你交流一切'
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
                <div className={styles.mainTitle}>
                  你的投资 AI 助手
                </div>
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
