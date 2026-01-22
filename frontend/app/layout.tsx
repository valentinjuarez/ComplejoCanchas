// app/layout.tsx
import './globals.css';
import { Inter, Poppins } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${poppins.variable}`}>
    <body>{children}</body>
    </html>
  );
}
