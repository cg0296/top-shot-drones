/**
 * Cloudflare Stream thumbnail URLs default to t=0, which is almost always a
 * black frame. Add ?time=5s unless the URL already carries a time param.
 */
export function cfThumbnail(url: string | null | undefined, time = '5s'): string | null {
  if (!url) return null;
  if (url.includes('time=')) return url;
  return `${url}?time=${time}`;
}
