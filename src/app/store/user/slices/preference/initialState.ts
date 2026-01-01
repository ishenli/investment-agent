import { TopicDisplayMode, UserPreference } from '@typings/user';

export const DEFAULT_PREFERENCE: UserPreference = {
  guide: {
    moveSettingsToAvatar: true,
    topic: true,
  },
  telemetry: null,
  topicDisplayMode: TopicDisplayMode.ByTime,
  useCmdEnterToSend: false,
};

export interface UserPreferenceState {
  /**
   * the user preference, which only store in local storage
   */
  preference: UserPreference;
}

export const initialPreferenceState: UserPreferenceState = {
  preference: DEFAULT_PREFERENCE,
};
