import { UserStore } from './store';

export { preferenceSelectors } from './slices/preference/selectors';

export function userAvatar(s: UserStore): string {
  return s.avatar || '';
}
