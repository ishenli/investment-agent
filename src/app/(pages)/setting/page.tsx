import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // Redirect to the default provider settings page
  redirect('/setting/general');
}