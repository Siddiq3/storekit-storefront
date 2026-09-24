import './globals.css';
import { Inter, Poppins, DM_Sans } from 'next/font/google';

// Only the font the store chose is ever downloaded: the browser fetches a font file when it is used.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap', preload: false });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap', preload: false });

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
