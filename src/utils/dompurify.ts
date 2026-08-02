import DOMPurify, { type Config } from 'dompurify';

// Create a dedicated instance of DOMPurify for external link sanitization.
// We pass window if available to allow it to initialize properly in browser environments.
const createPurifier = () => {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return DOMPurify(window as any);
  }
  return DOMPurify;
};

const purifyInstance = createPurifier();

// Register the hook once globally on this specific instance.
purifyInstance.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName && node.nodeName.toLowerCase() === 'a') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Sanitizes HTML using a dedicated DOMPurify instance with pre-configured
 * hooks (e.g., adding target="_blank" to links) to optimize performance.
 */
export const sanitizeHtml = (html: string, config: Config): string => {
  return purifyInstance.sanitize(html, config) as unknown as string;
};
