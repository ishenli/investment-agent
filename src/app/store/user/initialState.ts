import { CommonState, initialCommonState } from './slices/common/initialState';
import { UserPreferenceState, initialPreferenceState } from './slices/preference/initialState';

export type UserState = UserPreferenceState & CommonState;

export const initialState: UserState = {
  ...initialPreferenceState,
  ...initialCommonState,
};
