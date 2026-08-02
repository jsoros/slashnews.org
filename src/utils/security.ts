/**
 * Sanitizes a URL to ensure it uses a safe protocol (http or https).
 * Returns an empty string or '#' if the URL is unsafe (e.g., javascript:).
 */
export const sanitizeUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;

  // Remove all whitespace and control characters before checking
  // eslint-disable-next-line no-control-regex
  const normalizedUrl = url.replace(/[\s\x00-\x1F\x7F-\x9F]/g, '');
  const lowerNormalizedUrl = normalizedUrl.toLowerCase();

  try {
    const parsedUrl = new URL(normalizedUrl, 'http://dummy.com');
    // If it's a relative URL, parsedUrl.protocol will be 'http:' because of the dummy base.
    // We want to block 'javascript:', 'vbscript:', 'data:' (except maybe safe ones, but let's be strict).
    if (parsedUrl.protocol === 'javascript:' || parsedUrl.protocol === 'vbscript:' || parsedUrl.protocol === 'data:') {
      return 'about:blank';
    }
  } catch {
    // Fall back to startsWith check below
  }

  if (lowerNormalizedUrl.startsWith('javascript:') || lowerNormalizedUrl.startsWith('vbscript:') || lowerNormalizedUrl.startsWith('data:')) {
    return 'about:blank';
  }

  return url;
};
