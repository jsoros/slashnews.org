import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from '../security';

describe('sanitizeUrl', () => {
  it('allows valid http/https URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('allows relative URLs', () => {
    expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    expect(sanitizeUrl('path/to/page')).toBe('path/to/page');
    expect(sanitizeUrl('?query=string')).toBe('?query=string');
  });

  it('blocks standard malicious protocols', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('vbscript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('about:blank');
  });

  it('blocks malicious protocols with mixed case', () => {
    expect(sanitizeUrl('JavaScript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('VbScRiPt:alert(1)')).toBe('about:blank');
  });

  it('blocks malicious protocols with leading whitespace', () => {
    expect(sanitizeUrl(' javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('\tjavascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('\njavascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('\rjavascript:alert(1)')).toBe('about:blank');
  });

  it('blocks malicious protocols with control characters (bypass test)', () => {
    expect(sanitizeUrl('\x01javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('\x1Ajavascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('\x00javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('j\navascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('j\tavascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('j\ravascript:alert(1)')).toBe('about:blank');
  });

  it('handles undefined or empty URLs', () => {
    expect(sanitizeUrl(undefined)).toBeUndefined();
    expect(sanitizeUrl('')).toBe('');
  });
});
