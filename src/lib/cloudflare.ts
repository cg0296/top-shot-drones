/**
 * Push updated metadata back to a Cloudflare Stream video.
 * Called whenever a video's org/game assignment changes in the DB so future
 * syncs don't overwrite the corrected values.
 */
export async function updateCloudflareMetadata(
  cloudflareVideoId: string,
  meta: Record<string, string>,
): Promise<boolean> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
    return false;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareVideoId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meta }),
      },
    );

    const data = await res.json();
    if (!data.success) {
      console.error('Cloudflare metadata update failed:', data);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to update Cloudflare metadata:', err);
    return false;
  }
}

export async function getSignedPlaybackToken(
  cloudflareVideoId: string
): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareVideoId}/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success && data.result?.token) {
      return data.result.token;
    }

    console.error('Cloudflare token API returned failure:', data);
    return null;
  } catch (error) {
    console.error('Failed to get signed playback token:', error);
    return null;
  }
}
