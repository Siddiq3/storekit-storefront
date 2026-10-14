'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { safeBannerLink } from '@/lib/urls.js';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.jsx';

/** Native swipe/scroll works before hydration; controls never auto-advance a shopper's reading. */
export function Banners({ banners = [] }) {
  const usable = banners.filter((b) => b.imageUrl);
  const track = useRef(null);
  const id = useId();
  const [active, setActive] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  if (usable.length === 0) return null;
  const go = (index) => {
    const slide = track.current?.children[index];
    if (!slide) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.current.scrollTo({ left: slide.offsetLeft - track.current.offsetLeft, behavior: reduced ? 'instant' : 'smooth' });
  };
  return (
    <div className="sk-carousel" role="region" aria-roledescription="carousel" aria-label="Featured banners">
      <div className="sk-banners" id={id} ref={track} tabIndex={usable.length > 1 ? 0 : undefined} aria-label="Swipe to browse banners" onScroll={() => {
        const el = track.current;
        if (!el) return;
        // Two banners share the row on a wide screen, so a step is one slide's width plus the gap, not the track's.
        const step = (el.children[0]?.getBoundingClientRect().width ?? el.clientWidth) + 12;
        setActive(Math.min(usable.length - 1, Math.round(el.scrollLeft / step)));
        setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
      }}>
        {usable.map((banner, index) => {
          const image = <img src={banner.imageUrl} alt={banner.alt ?? ''} width="1200" height="675" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : undefined} />;
          const link = safeBannerLink(banner.link);
          const external = link?.startsWith('https:');
          return (
            <div className="sk-banner" key={`${banner.imageUrl}-${index}`} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${usable.length}`}>
              {link ? <Link href={link} aria-label={banner.alt || `Shop banner ${index + 1}`} prefetch={false} tabIndex={index === active ? undefined : -1} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{image}</Link> : image}
            </div>
          );
        })}
      </div>
      {usable.length > 1 ? <div className="sk-carousel-controls">
        <button type="button" aria-label="Previous banner" aria-controls={id} disabled={active === 0} className="sk-carousel-arrow" data-dir="prev" onClick={() => go(active - 1)}><ChevronLeftIcon /></button>
        <div className="sk-carousel-dots">{usable.map((_, index) => <button type="button" key={index} aria-label={`Show banner ${index + 1}`} aria-controls={id} aria-current={index === active ? 'true' : undefined} onClick={() => go(index)}><span /></button>)}</div>
        <button type="button" aria-label="Next banner" aria-controls={id} disabled={atEnd || active === usable.length - 1} className="sk-carousel-arrow" data-dir="next" onClick={() => go(active + 1)}><ChevronRightIcon /></button>
      </div> : null}
    </div>
  );
}
