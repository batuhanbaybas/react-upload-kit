import { describe, it, expect } from 'vitest';
import { isFileAccepted, acceptPatternsToInputAccept } from '../mime';

describe('isFileAccepted', () => {
  it('accepts any file when accept is undefined', () => {
    const file = { name: 'anything.xyz', type: 'application/octet-stream' };
    expect(isFileAccepted(file, undefined)).toBe(true);
  });

  it('accepts any file when accept is an empty array', () => {
    const file = { name: 'anything.xyz', type: 'application/octet-stream' };
    expect(isFileAccepted(file, [])).toBe(true);
  });

  it('matches exact MIME type', () => {
    const file = { name: 'photo.png', type: 'image/png' };
    expect(isFileAccepted(file, ['image/png'])).toBe(true);
  });

  it('rejects non-matching exact MIME type', () => {
    const file = { name: 'photo.png', type: 'image/png' };
    expect(isFileAccepted(file, ['image/jpeg'])).toBe(false);
  });

  it('matches wildcard MIME type', () => {
    const file = { name: 'photo.jpg', type: 'image/jpeg' };
    expect(isFileAccepted(file, ['image/*'])).toBe(true);
  });

  it('rejects file with non-matching wildcard group', () => {
    const file = { name: 'doc.pdf', type: 'application/pdf' };
    expect(isFileAccepted(file, ['image/*'])).toBe(false);
  });

  it('matches file extension', () => {
    const file = { name: 'document.pdf', type: 'application/pdf' };
    expect(isFileAccepted(file, ['.pdf'])).toBe(true);
  });

  it('rejects non-matching file extension', () => {
    const file = { name: 'document.pdf', type: 'application/pdf' };
    expect(isFileAccepted(file, ['.doc'])).toBe(false);
  });

  it('handles case-insensitive MIME matching', () => {
    const file = { name: 'photo.png', type: 'Image/PNG' };
    expect(isFileAccepted(file, ['image/png'])).toBe(true);
  });

  it('handles case-insensitive extension matching', () => {
    const file = { name: 'PHOTO.PNG', type: 'image/png' };
    expect(isFileAccepted(file, ['.png'])).toBe(true);
  });

  it('matches when at least one pattern matches', () => {
    const file = { name: 'doc.pdf', type: 'application/pdf' };
    expect(isFileAccepted(file, ['image/*', '.pdf'])).toBe(true);
  });

  it('rejects file with empty type and non-extension patterns', () => {
    const file = { name: 'unknown', type: '' };
    expect(isFileAccepted(file, ['image/png'])).toBe(false);
  });

  it('trims whitespace in patterns', () => {
    const file = { name: 'photo.png', type: 'image/png' };
    expect(isFileAccepted(file, [' image/png '])).toBe(true);
  });
});

describe('acceptPatternsToInputAccept', () => {
  it('returns undefined for undefined input', () => {
    expect(acceptPatternsToInputAccept(undefined)).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(acceptPatternsToInputAccept([])).toBeUndefined();
  });

  it('joins patterns with commas', () => {
    expect(acceptPatternsToInputAccept(['image/*', '.pdf'])).toBe(
      'image/*,.pdf',
    );
  });

  it('handles single pattern', () => {
    expect(acceptPatternsToInputAccept(['image/png'])).toBe('image/png');
  });
});
