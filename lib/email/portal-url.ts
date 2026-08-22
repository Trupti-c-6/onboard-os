export function getPortalUrl(accessToken: string): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return `${url.origin}/portal/${accessToken}`;
  } catch {
    return null;
  }
}
