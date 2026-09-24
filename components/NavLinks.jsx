'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** The category row: the link for the page you are on is underlined. */
export function NavLinks({ links }) {
  const pathname = usePathname() ?? '';
  return (
    <>
      {links.map(({ href, label }) => {
        const current = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={current ? 'page' : undefined}>{label}</Link>;
      })}
    </>
  );
}
