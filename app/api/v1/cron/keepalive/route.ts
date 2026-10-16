import { Logger } from '@/lib/logger';
import { createPublicClient } from '@/utils/supabase/public';
import { NextRequest, NextResponse } from 'next/server';

// Never cache: the point is to reach the database every run
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/cron/keepalive
 * Called daily by Vercel Cron (see vercel.json). Supabase pauses free-tier projects
 * after ~7 days without database activity, and CDN caching means quiet weeks may
 * never reach the database, so this runs one cheap query.
 */
export async function GET(request: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createPublicClient();
  const { error } = await supabase.from('collections').select('id').limit(1);

  if (error) {
    Logger.error('Supabase keepalive failed:', error);
    return NextResponse.json({ error: 'Keepalive query failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
