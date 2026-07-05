/**
 * Sanitizes a URL to ensure it uses a safe protocol (http or https).
 * Returns an empty string or '#' if the URL is unsafe (e.g., javascript:).
 */
export const sanitizeUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;

  try {
    const parsedUrl = new URL(url, 'http://dummy.com');
    // If it's a relative URL, parsedUrl.protocol will be 'http:' because of the dummy base.
    // We want to block 'javascript:', 'vbscript:', 'data:' (except maybe safe ones, but let's be strict).
    if (parsedUrl.protocol === 'javascript:' || parsedUrl.protocol === 'vbscript:' || parsedUrl.protocol === 'data:') {
      return 'about:blank';
    }
    return url;
  } catch {
    // If parsing fails, fall back to safe check
    // Remove all whitespace and control characters before checking
    // eslint-disable-next-line no-control-regex
    const normalizedUrl = url.replace(/[\s\x00-\x1F\x7F-\x9F]/g, '').toLowerCase();
    if (normalizedUrl.startsWith('javascript:') || normalizedUrl.startsWith('vbscript:') || normalizedUrl.startsWith('data:')) {
      return 'about:blank';
    }
    return url;
  }
};
