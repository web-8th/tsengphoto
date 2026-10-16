/**
 * Google Drive API utilities for fetching images from public folders
 */

export interface GoogleDriveImage {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink: string;
  webContentLink: string;
  webViewLink: string;
}

/**
 * Extract folder ID from Google Drive URL
 * Supports formats:
 * - https://drive.google.com/drive/folders/FOLDER_ID
 * - https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
 */
export function extractFolderId(driveLink: string): string | null {
  try {
    const url = new URL(driveLink);
    const pathParts = url.pathname.split('/');
    const foldersIndex = pathParts.indexOf('folders');

    if (foldersIndex !== -1 && pathParts[foldersIndex + 1]) {
      return pathParts[foldersIndex + 1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch images from a Google Drive folder using the Drive API v3
 * Requires DRIVE_KEY environment variable
 */
export async function fetchDriveFolderImages(
  driveLink: string
): Promise<GoogleDriveImage[]> {
  const folderId = extractFolderId(driveLink);

  if (!folderId) {
    throw new Error('Invalid Google Drive folder link');
  }

  const apiKey = process.env.DRIVE_KEY;

  if (!apiKey) {
    throw new Error('DRIVE_KEY environment variable is not set');
  }

  // Google Drive API v3 endpoint to list files in a folder
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.append('q', `'${folderId}' in parents and trashed=false`);
  url.searchParams.append('key', apiKey);
  url.searchParams.append(
    'fields',
    'files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink)'
  );
  url.searchParams.append('pageSize', '1000'); // Max 1000 files

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch Google Drive folder');
  }

  const data = await response.json();
  const files: GoogleDriveImage[] = data.files || [];

  // Filter for image files only
  const imageFiles = files.filter((file) => file.mimeType.startsWith('image/'));

  return imageFiles;
}

/**
 * Get direct download/view URL for a Google Drive file
 * Uses Google's content delivery for better performance and CORS support
 */
export function getDriveImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Get full quality (uncompressed) image URL from Google Drive
 * Uses the =d parameter to get original quality without resizing
 */
export function getDriveFullQualityUrl(thumbnailLink: string): string {
  // Google Drive thumbnailLink format: https://lh3.googleusercontent.com/...=s220
  // Replace size parameter with =d for original quality download
  return thumbnailLink.replace(/=s\d+$/, '=d');
}

const PROXY_IMAGE_PREFIX = '/api/v1/proxy-image?url=';

/**
 * Get the direct lh3 URL for a Drive image, unwrapping it from our proxy if needed.
 * Returns null when the src is not a Drive image.
 */
export function getDirectDriveUrl(src: string): string | null {
  const url = src.startsWith(PROXY_IMAGE_PREFIX)
    ? decodeURIComponent(src.slice(PROXY_IMAGE_PREFIX.length))
    : src;
  return url.startsWith('https://lh3.googleusercontent.com/') ? url : null;
}

/**
 * Route a Drive image through our proxy (fallback when Google rejects a direct request)
 */
export function getDriveProxyUrl(driveUrl: string): string {
  return `${PROXY_IMAGE_PREFIX}${encodeURIComponent(driveUrl)}`;
}

/**
 * Fetch an image's bytes. Drive images come straight from Google (it sends CORS headers),
 * so they cost no Vercel bandwidth; our proxy is only used if the direct request fails.
 */
export async function fetchImage(url: string): Promise<Response> {
  const driveUrl = getDirectDriveUrl(url);
  if (!driveUrl) return fetch(url);

  try {
    const response = await fetch(driveUrl);
    if (response.ok) return response;
  } catch {
    // Network/CORS failure: fall through to the proxy
  }
  return fetch(getDriveProxyUrl(driveUrl));
}

/**
 * next/image loader that has Google resize Drive images (=w<width>, -rw = WebP),
 * so they never count against Vercel's image transformation quota
 */
export function driveImageLoader({ src, width }: { src: string; width: number }): string {
  return `${src.replace(/=[^/]*$/, '')}=w${width}-rw`;
}

/**
 * Get high-quality thumbnail URL from Google Drive
 * Size param can be adjusted (e.g., s1600 for 1600px max dimension, s2048 for 2048px)
 * Use this for grid/thumbnail display - much faster than full quality
 */
export function getDriveThumbnailUrl(thumbnailLink: string, size = 's1600'): string {
  // Google Drive thumbnailLink format: https://lh3.googleusercontent.com/...=s220
  // We replace the size parameter to get higher quality
  return thumbnailLink.replace(/=s\d+$/, `=${size}`);
}
