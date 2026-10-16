import type { Collection } from '@/lib/types';
import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';

// Social previews link straight to the cover image, so crawlers never hit a Vercel function
const FALLBACK_OG_IMAGE = '/landing/carousel/carousel_1.webp';

interface CollectionLayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Fetch collection from database
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from('collections').select('*').eq('slug', slug);

  // Only filter by is_published for non-authenticated users
  if (!user) {
    query = query.eq('is_published', true);
  }

  const { data: collection } = await query.single<Collection>();

  if (!collection) {
    return {
      title: 'Collection Not Found | Tseng Photography',
      description: 'The requested collection could not be found.',
    };
  }

  const title = `${collection.title} ${collection.collection_group_name ? `from ${collection.collection_group_name}` : ''} | Tseng Photography`;
  const description =
    collection.description ||
    `View ${collection.title} collection ${collection.collection_group_name ? `from ${collection.collection_group_name} ` : ''}by Tseng Photography.`;
  const url = `https://tsengphoto.vercel.app/collections/${slug}`;

  const ogImage = {
    url: collection.cover_image_url || FALLBACK_OG_IMAGE,
    alt: collection.title,
  };

  return {
    metadataBase: new URL('https://tsengphoto.vercel.app'),
    title,
    description,
    keywords: [
      collection.title,
      collection.type,
      collection.collection_group_name ?? '',
      'photography collection',
      'event photography',
      'Vancouver photographer',
      'Kelowna photographer',
      'professional photography',
      'photo gallery',
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
      canonical: `/collections/${slug}`,
    },
  };
}

export default async function CollectionLayout({ children }: CollectionLayoutProps) {
  return <>{children}</>;
}
