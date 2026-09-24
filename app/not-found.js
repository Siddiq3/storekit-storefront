import { StateScreen } from '@/components/StateScreen.jsx';

export const metadata = { title: 'Page not found', robots: { index: false, follow: false } };

export default function NotFound() {
  return <main className="sk-plain"><StateScreen kind="page-not-found" /></main>;
}
