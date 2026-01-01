import { UserPreference } from '@typings/user';

export interface IUserService {
  updatePreference: (preference: Partial<UserPreference>) => Promise<any>;
}
