'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { safeBannerLink } from '@/lib/urls.js';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.jsx';

/** Auto-advance between banners while keeping native swipe and manual controls. */
export function Banners({ banners = [] }) {
  const usable = banners.filter((b) => b.imageUrl);
  const track = useRef(null);
  const id = useId();
  const [active, setActive] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const go = useCallback((index) => {
    const slide = track.current?.children[index];
    if (!slide) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.current.scrollTo({ left: slide.offsetLeft - track.current.offsetLeft, behavior: reduced ? 'instant' : 'smooth' });
  }, []);

  useEffect(() => {
    if (usable.length < 2 || paused || hovered || focused || dragging) return;
    const timer = window.setInterval(() => {
      const el = track.current;
      if (!el || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // Desktop shows two slides at once, so wrap when the scroll track reaches its end.
      if (el.scrollWidth <= el.clientWidth + 2) return;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      go(end ? 0 : Math.min(active + 1, usable.length - 1));
    }, 4000);
    return () => window.clearInterval(timer);
  }, [active, usable.length, paused, hovered, focused, dragging, go]);

  if (usable.length === 0) return null;
  return (
    <div className="sk-carousel" role="region" aria-roledescription="carousel" aria-label="Featured banners"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => { setHovered(false); setDragging(false); }}
      onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onPointerDown={() => setDragging(true)} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)} onLostPointerCapture={() => setDragging(false)}
    >
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
        <button type="button" className="sk-carousel-playback" aria-label={paused ? 'Play banner slideshow' : 'Pause banner slideshow'} aria-controls={id} onClick={() => setPaused((value) => !value)}>{paused ? 'Play' : 'Pause'}</button>
        <button type="button" aria-label="Previous banner" aria-controls={id} disabled={active === 0} className="sk-carousel-arrow" data-dir="prev" onClick={() => go(active - 1)}><ChevronLeftIcon /></button>
        <div className="sk-carousel-dots">{usable.map((_, index) => <button type="button" key={index} aria-label={`Show banner ${index + 1}`} aria-controls={id} aria-current={index === active ? 'true' : undefined} onClick={() => go(index)}><span /></button>)}</div>
        <button type="button" aria-label="Next banner" aria-controls={id} disabled={atEnd || active === usable.length - 1} className="sk-carousel-arrow" data-dir="next" onClick={() => go(active + 1)}><ChevronRightIcon /></button>
      </div> : null}
    </div>
  );
}
