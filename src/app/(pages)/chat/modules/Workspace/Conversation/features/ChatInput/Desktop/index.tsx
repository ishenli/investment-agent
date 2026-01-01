'use client';

import { memo } from 'react';

import { ActionKeys } from '@renderer/(pages)/chat/features/ChatInput/ActionBar/config';
import DesktopChatInput, { FooterRender } from '@renderer/(pages)/chat/features/ChatInput/Desktop';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import Footer from './Footer';
import TextArea from './TextArea';

const leftActions = [
  'model',
  // 'search',
  // 'params',
  // 'history',
  'tools',
  // 'mainToken',
] as ActionKeys[];

const rightActions = ['clear'] as ActionKeys[];

const renderTextArea = (onSend: () => void) => <TextArea onSend={onSend} />;
const renderFooter: FooterRender = ({ expand, onExpandChange }) => (
  <Footer expand={expand} onExpandChange={onExpandChange} />
);

const Desktop = memo(() => {
  const [inputHeight, updatePreference] = useGlobalStore((s) => [
    systemStatusSelectors.inputHeight(s),
    s.updateSystemStatus,
  ]);

  const leftActionFinal = leftActions;

  return (
    <DesktopChatInput
      inputHeight={inputHeight}
      leftActions={leftActionFinal}
      onInputHeightChange={(height) => {
        updatePreference({ inputHeight: height });
      }}
      renderFooter={renderFooter}
      renderTextArea={renderTextArea}
      rightActions={rightActions}
    />
  );
});

export default Desktop;
