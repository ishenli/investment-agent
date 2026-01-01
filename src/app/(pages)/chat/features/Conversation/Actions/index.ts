import { MessageRoleType } from '@typings/message';

import { RenderAction } from '../types';
import { AssistantActionsBar } from './Assistant';
import { DefaultActionsBar } from './Fallback';
import { UserActionsBar } from './User';
import { ToolActionsBar } from './Tool';

export const renderActions: Record<MessageRoleType, RenderAction> = {
  assistant: AssistantActionsBar,
  system: DefaultActionsBar,
  tool: ToolActionsBar,
  user: UserActionsBar,
};
