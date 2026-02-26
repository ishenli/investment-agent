import type { PartialDeep } from 'type-fest';

import { MessageModel } from '@renderer/database/models/message';
import { SessionModel } from '@renderer/database/models/session';
import { UserModel } from '@renderer/database/models/user';
import { UserGuide, UserInitializationState, UserPreference } from '@typings/user';
import { UserSettings } from '@typings/user/settings';
import { AsyncLocalStorage } from '@renderer/lib/utils/localStorage';
import { IUserService } from './type';

export class UserService implements IUserService {
  private preferenceStorage: AsyncLocalStorage<UserPreference>;

  constructor() {
    this.preferenceStorage = new AsyncLocalStorage('LOBE_PREFERENCE');
  }

  getUserRegistrationDuration = async () => {
    throw new Error('Method not implemented.');
  };

  async getUserState(): Promise<UserInitializationState> {
    const user = await UserModel.getUser();
    const messageCount = await MessageModel.count();
    const sessionCount = await SessionModel.count();

    // 从 settings API 获取头像
    const avatar = await this.getAvatar();

    return {
      avatar,
      canEnablePWAGuide: messageCount >= 4,
      canEnableTrace: messageCount >= 4,
      hasConversation: messageCount > 0 || sessionCount > 0,
      isOnboard: true,
      preference: await this.preferenceStorage.getFromLocalStorage(),
      settings: user.settings as UserSettings,
      userId: user.uuid,
    };
  }

  getUserSSOProviders = async () => {
    // Account not exist on next-auth in client mode, no need to implement this method
    return [];
  };

  unlinkSSOProvider = async () => {
    // Account not exist on next-auth in client mode, no need to implement this method
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateUserSettings = async (patch: PartialDeep<UserSettings>, _?: any) => {
    return UserModel.updateSettings(patch);
  };

  resetUserSettings = async () => {
    return UserModel.resetSettings();
  };

  /**
   * 获取用户头像
   * 从 SQLite settings 表中获取
   */
  async getAvatar(): Promise<string> {
    try {
      const response = await fetch('/api/setting');
      const result = await response.json();
      if (result.success && result.data?.AVATAR) {
        return result.data.AVATAR;
      }
      return '';
    } catch {
      return '';
    }
  }

  /**
   * 更新用户头像
   * 存储到 SQLite settings 表中
   */
  async updateAvatar(avatar: string) {
    const response = await fetch('/api/setting', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: 'AVATAR', value: avatar }),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to update avatar');
    }
  }

  async updatePreference(preference: Partial<UserPreference>) {
    await this.preferenceStorage.saveToLocalStorage(preference);
  }

  async getUserPreference(): Promise<UserPreference> {
    return this.preferenceStorage.getFromLocalStorage();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars,unused-imports/no-unused-vars
  async updateGuide(guide: Partial<UserGuide>) {
    throw new Error('Method not implemented.');
  }
}

const userService = new UserService();

export default userService;
