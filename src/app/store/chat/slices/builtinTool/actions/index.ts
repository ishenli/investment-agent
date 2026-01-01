import { StateCreator } from 'zustand/vanilla';

import { ChatStore } from '@renderer/store/chat/store';

import { ChatDallEAction, dalleSlice } from './dalle';
import { LocalFileAction, localFileSlice } from './localFile';

export interface ChatBuiltinToolAction extends ChatDallEAction, LocalFileAction {}

export const chatToolSlice: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  ChatBuiltinToolAction
> = (...params) => ({
  ...dalleSlice(...params),
  ...localFileSlice(...params),
});
