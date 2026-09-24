import { TrackForm } from '@/components/TrackForm.jsx';
import { noindex } from '@/lib/seo.js';

export const metadata = noindex('Track your order');

export default function TrackPage() {
  return <TrackForm />;
}
