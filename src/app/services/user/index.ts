
import { UserGuide, UserPreference } from '@typings/user';
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

  async updateGuide(_guide: Partial<UserGuide>) {
    throw new Error('Method not implemented.');
  }
}

const userService = new UserService();

export default userService;
