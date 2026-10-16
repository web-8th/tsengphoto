import type { Collection } from '@/lib/types';
import { createPublicClient } from '@/utils/supabase/public';
import type { Metadata } from 'next';

// Social previews link straight to the cover image, so crawlers never hit a Vercel function
const FALLBACK_OG_IMAGE = '/landing/carousel/carousel_1.webp';

// Prebuild nothing; each slug is rendered on first visit, then cached (ISR)
export function generateStaticParams() {
  return [];
}

interface CollectionLayoutProps {
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
  const { data: collection } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single<Collection>();

  if (!collection) {
    return {
      title: 'Tseng Photography',
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
