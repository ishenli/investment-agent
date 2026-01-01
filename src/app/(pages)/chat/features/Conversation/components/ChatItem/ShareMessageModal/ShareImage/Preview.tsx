import { ModelTag } from '@lobehub/icons';
import { Avatar } from '@lobehub/ui';
import { ChatHeaderTitle } from '@lobehub/ui/chat';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
// import { ProductLogo } from '@renderer/components/Branding';
import { ChatItem } from '@renderer/(pages)/chat/features/Conversation';
import { useAgentStore } from '@renderer/store/agent';
import { agentSelectors } from '@renderer/store/agent/selectors';
import { useSessionStore } from '@renderer/store/session';
import { sessionMetaSelectors, sessionSelectors } from '@renderer/store/session/selectors';
import { ChatMessage } from '@typings/message';

import { SESSION_CONFIG_DESCRIPTION, SESSION_CONFIG_TITLE } from '@renderer/const/text/sessionConfig';
import React from 'react';
import { useContainerStyles } from '../style';
import { useStyles } from './style';
import { FieldType } from './type';

interface PreviewProps extends FieldType {
  message: ChatMessage;
  previewId?: string;
  title?: string;
}

const Preview = memo<PreviewProps>(
  ({ title, withBackground, withFooter, message, previewId = 'preview' }) => {
    const [model, plugins] = useAgentStore((s) => [
      agentSelectors.currentAgentModel(s),
      agentSelectors.currentAgentPlugins(s),
    ]);

    const [isInbox, description, avatar, backgroundColor] = useSessionStore((s) => [
      sessionSelectors.isInboxSession(s),
      sessionMetaSelectors.currentAgentDescription(s),
      sessionMetaSelectors.currentAgentAvatar(s),
      sessionMetaSelectors.currentAgentBackgroundColor(s),
    ]);

    const { t } = useTranslation('chat');
    const { styles } = useStyles(withBackground);
    const { styles: containerStyles } = useContainerStyles();

    const displayTitle = isInbox ? SESSION_CONFIG_TITLE.INBOX : title;
    const displayDesc = isInbox ? SESSION_CONFIG_DESCRIPTION.INBOX : description;

    return (
      <div className={containerStyles.preview}>
        <div className={withBackground ? styles.background : undefined} id={previewId}>
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
            </div>
            <Flexbox
              height={'100%'}
              style={{ paddingTop: 24, position: 'relative' }}
              width={'100%'}
            >
              <ChatItem id={message.id} index={0} />
            </Flexbox>
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
