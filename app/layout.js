import './globals.css';
import { Inter, Poppins, DM_Sans, Urbanist } from 'next/font/google';

// Only the font the store chose is ever downloaded: the browser fetches a font file when it is used.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap', preload: false });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap', preload: false });
// Headlines only (the hero and section titles), in every theme: the store's font stays the body font.
const display = Urbanist({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-display', display: 'swap' });

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${dmSans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
