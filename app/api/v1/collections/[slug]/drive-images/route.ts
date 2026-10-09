import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { fetchDriveFolderImages, getDriveImageUrl } from '@/utils/google-drive';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // Fetch collection to get drive_link
    const { data: collection, error } = await supabase
      .from('collections')
      .select('drive_link')
      .eq('slug', slug)
      .single();

    if (error || !collection) {
      Logger.error('Collection not found:', error);
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (!collection.drive_link) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Fetch images from Google Drive
    const driveImages = await fetchDriveFolderImages(collection.drive_link);

    // Return both optimized thumbnail for grid and full quality for viewer
    const images = driveImages.map((img) => ({
      id: img.id,
      name: img.name,
      thumbnailUrl: `${getDriveImageUrl(img.id)}=s1600`,
      fullQualityUrl: `${getDriveImageUrl(img.id)}=d`,
    }));

    const response = NextResponse.json({ data: images }, { status: 200 });
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=86400'
    );
    return response;
  } catch (error) {
    Logger.error('Error fetching Google Drive images:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
