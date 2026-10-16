import type { Metadata } from 'next';
import { createPublicClient } from '@/utils/supabase/public';

// Cache rendered page for a day, matching /collections/[slug]
export const revalidate = 86400;

// Social previews link straight to the cover image, so crawlers never hit a Vercel function
const FALLBACK_OG_IMAGE = '/landing/carousel/carousel_1.webp';

// Prebuild nothing; each slug is rendered on first visit, then cached (ISR)
export function generateStaticParams() {
  return [];
}

interface VideoCollectionLayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Published-only, cookie-less query so this page can be cached (ISR) instead of
  // rendering per request. Unpublished collections (admin preview) get generic metadata.
  const supabase = createPublicClient();
  const { data: videoCollection } = await supabase
    .from('video_collections')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!videoCollection) {
    return {
      title: 'Tseng Photography',
    };
  }

  const title = `${videoCollection.title} | Tseng Photography`;
  const description =
    videoCollection.description || `View ${videoCollection.title} video collection`;
  const url = `https://tsengphoto.vercel.app/video-collections/${slug}`;

  const ogImage = {
    url: videoCollection.cover_image_url || FALLBACK_OG_IMAGE,
    alt: videoCollection.title,
  };

  return {
    metadataBase: new URL('https://tsengphoto.vercel.app'),
    title,
    description,
    keywords: [
      videoCollection.title,
      'video collection',
      'videography',
      'video production',
      'video editing',
      'Vancouver videographer',
      'Kelowna videographer',
      'professional videography',
      'video portfolio',
    ],
    openGraph: {
      title,
      description,
      url,
      siteName: 'Tseng Photography',
      type: 'website',
      locale: 'en_CA',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `/video-collections/${slug}`,
    },
  };
}

export default async function VideoCollectionLayout({
  children,
}: VideoCollectionLayoutProps) {
  return <>{children}</>;
}
