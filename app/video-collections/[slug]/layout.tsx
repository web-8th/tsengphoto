import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';

// Social previews link straight to the cover image, so crawlers never hit a Vercel function
const FALLBACK_OG_IMAGE = '/landing/carousel/carousel_1.webp';

interface VideoCollectionLayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Fetch video collection from database
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from('video_collections').select('*').eq('slug', slug);

  // Only filter by is_published for non-authenticated users
  if (!user) {
    query = query.eq('is_published', true);
  }

  const { data: videoCollection } = await query.single();

  if (!videoCollection) {
    return {
      title: 'Video Collection Not Found | Tseng Photography',
      description: 'The requested video collection could not be found.',
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
