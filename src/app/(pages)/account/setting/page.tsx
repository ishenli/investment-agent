import { AccountSettings } from './account-settings';

export default function AccountPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <AccountSettings />
    </div>
  );
}
