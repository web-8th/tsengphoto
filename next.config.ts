import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Vercel Hobby allows 5k transformations/month, and every (src, width, quality,
    // format) combo counts as one, so keep the width/quality/format lists short.
    // Drive images skip this entirely (see driveImageLoader).
    deviceSizes: [640, 1080, 1920, 2560],
    imageSizes: [256],
    qualities: [75],
    formats: ['image/webp'],
    // Allow local images with any pathname (including query strings)
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: `${process.env.UPLOADTHING_APP_ID}.ufs.sh`,
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // allow squarespace images for contact page
      {
        protocol: 'https',
        hostname: 'images.squarespace-cdn.com',
        pathname: '/**',
      },
      // allow Google Drive images
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      // allow YouTube thumbnail images
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
    ],
    // 31 days: fewer cache misses = fewer re-transformations
    minimumCacheTTL: 2678400,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
