import { StateScreen } from '@/components/StateScreen.jsx';

export const metadata = { title: 'StoreKit', robots: { index: false, follow: false } };

export default function Page() {
  return <main className="sk-plain"><StateScreen kind="store-not-found" /></main>;
}
