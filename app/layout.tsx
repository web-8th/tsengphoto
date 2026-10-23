import { Navbar } from '@/components/Navbar';
import { QueryProvider } from '@/components/query-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { ImageOptimizationProvider } from '@/contexts/ImageOptimizationContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LoadingProvider } from '@/hooks/use-loading';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, Merriweather } from 'next/font/google';

import { Footer } from '@/components/Footer';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { cn } from '@/lib/utils';
import './globals.css';

const fontSans = Merriweather({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Event Photography in Vancouver and Kelowna | Tseng Photography',
  description:
    'Professional event photography services in Vancouver and Kelowna. Capturing your special moments with creativity and precision. Book now for unforgettable memories.',
  metadataBase: new URL('https://tsengphoto.vercel.app'),
  openGraph: {
    title: 'Event Photography in Vancouver and Kelowna | Tseng Photography',
    description:
      'Professional event photography services in Vancouver and Kelowna. Capturing your special moments with creativity and precision.',
    url: 'https://tsengphoto.vercel.app',
    siteName: 'Tseng Photography',
    images: [
      {
        url: '/landing/carousel/carousel_1.webp',
        width: 1200,
        height: 630,
        alt: 'Tseng Photography - Professional Event Photography',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Event Photography in Vancouver and Kelowna | Tseng Photography',
    description:
      'Professional event photography services in Vancouver and Kelowna. Capturing your special moments with creativity and precision.',
    images: ['/landing/carousel/carousel_1.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className={cn(fontSans.variable, fontMono.variable)}>
      <body className='antialiased'>
        <ImageOptimizationProvider>
          <AuthProvider>
            <ThemeProvider attribute='class' defaultTheme='light' enableSystem>
              <QueryProvider>
                <LoadingProvider>
                  <ToastProvider>
                    <TooltipProvider>
                      <Navbar />
                      <main>{children}</main>
                      <Footer />
                    </TooltipProvider>
                    <Toaster />
                    <Analytics />
                    <SpeedInsights />
                  </ToastProvider>
                </LoadingProvider>
              </QueryProvider>
            </ThemeProvider>
          </AuthProvider>
        </ImageOptimizationProvider>
      </body>
    </html>
  );
}
