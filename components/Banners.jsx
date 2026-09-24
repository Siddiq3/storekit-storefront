import Link from 'next/link';
import { safeHttpsUrl } from '@/lib/urls.js';

export function Banners({ banners }) {
  const usable = banners.filter((b) => b.imageUrl);
  if (usable.length === 0) return null;
  return (
    <div className="sk-banners" role="region" aria-label="Featured">
      {usable.map((banner, index) => {
        const image = <img src={banner.imageUrl} alt={banner.alt ?? ''} width="1200" height="525" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : undefined} />;
        const link = banner.link ? safeHttpsUrl(banner.link) : null;
        return (
          <div className="sk-banner" key={banner.imageUrl}>
            {link ? <Link href={link} target="_blank" rel="noopener noreferrer">{image}</Link> : image}
          </div>
        );
      })}
    </div>
  );
}
