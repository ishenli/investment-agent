import { DEFAULT_LANGUAGE } from '@/app/const/languages';
import { TopicDisplayMode, UserPreference } from '@typings/user';

export const DEFAULT_PREFERENCE: UserPreference = {
  autoSave: true,
  enableNotifications: true,
  guide: {
    moveSettingsToAvatar: true,
    topic: true,
  },
  language: DEFAULT_LANGUAGE,
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
