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
