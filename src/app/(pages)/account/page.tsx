import { AccountDashboard } from './components/account-dashboard';
import AccountList from './components/account-list';

export default function AccountPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="grid gap-6">
        <AccountDashboard />
      </div>
      <AccountList />
    </div>
  );
}
