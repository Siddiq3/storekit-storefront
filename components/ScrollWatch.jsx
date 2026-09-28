'use client';

import { useEffect } from 'react';

/** Marks the page as scrolled, so the sticky header can separate itself from the content with a soft shadow. */
export function ScrollWatch() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (window.scrollY > 8) root.dataset.scrolled = ''; else delete root.dataset.scrolled;
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  return null;
}
