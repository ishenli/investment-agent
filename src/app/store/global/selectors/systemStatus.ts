import { GlobalState, INITIAL_STATUS } from '../initialState';

const sessionGroupKeys = (s: GlobalState): string[] =>
  s.status.expandSessionGroupKeys || INITIAL_STATUS.expandSessionGroupKeys;

export const systemStatus = (s: GlobalState) => s.status;

const showSessionPanel = (s: GlobalState) => !s.status.zenMode && s.status.showSessionPanel;
const sessionWidth = (s: GlobalState) => s.status.sessionsWidth;
const showChatSideBar = (s: GlobalState) => s.status.showChatSideBar;
const showSystemRole = (s: GlobalState) => s.status.showSystemRole;

const inputHeight = (s: GlobalState) => s.status.inputHeight;

const isDBInited = (s: GlobalState): boolean => true;
const getAgentSystemRoleExpanded =
  (agentId: string) =>
    (s: GlobalState): boolean => {
      const map = s.status.systemRoleExpandedMap || {};
      return map[agentId] !== false; // 角色设定默认为展开状态
    };

const portalWidth = (s: GlobalState) => s.status.portalWidth || 400;

export const systemStatusSelectors = {
  inputHeight,
  isDBInited,
  sessionGroupKeys,
  sessionWidth,
  showChatSideBar,
  showSessionPanel,
  showSystemRole,
  getAgentSystemRoleExpanded,
  portalWidth,
};
