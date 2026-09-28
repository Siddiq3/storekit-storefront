// Small inline icons: no icon font, no extra request, and they inherit the text colour.
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const MenuIcon = () => <svg {...base}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const SearchIcon = () => <svg {...base} width="16" height="16"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>;
export const BagIcon = () => <svg {...base}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>;
export const PinIcon = () => <svg {...base} width="14" height="14"><path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.800 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
export const CashIcon = () => <svg {...base} width="26" height="26"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>;
export const TruckIcon = () => <svg {...base} width="26" height="26"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>;
export const ShieldIcon = () => <svg {...base} width="26" height="26"><path d="M12 3 5 6v5c0 4.500 3 8 7 10 4-2 7-5.500 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
export const ArrowIcon = () => <svg {...base} width="14" height="14"><path d="m9 6 6 6-6 6" /></svg>;
export const PhoneIcon = () => <svg {...base} width="16" height="16"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>;
export const ChatIcon = () => <svg {...base} width="16" height="16"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12Z" /></svg>;
export const MailIcon = () => <svg {...base} width="16" height="16"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
/** For a product with no photo yet: a quiet picture outline instead of an empty box. */
export const NoPhotoIcon = () => <svg {...base} width="36" height="36" strokeWidth="1.3"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-9 9" /></svg>;
