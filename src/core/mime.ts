import type { AcceptPattern } from './types';

/**
 * Tests whether a file matches a set of accept patterns.
 *
 * Supported pattern formats:
 * - MIME type:       "image/png"
 * - MIME wildcard:   "image/*"
 * - Extension:       ".pdf", ".jpg"
 */
export function isFileAccepted(
  file: Pick<File, 'name' | 'type'>,
  accept: AcceptPattern[] | undefined,
): boolean {
  if (!accept || accept.length === 0) return true;
  return accept.some((pattern) => matchPattern(file, pattern));
}

function matchPattern(
  file: Pick<File, 'name' | 'type'>,
  pattern: string,
): boolean {
  const trimmed = pattern.trim().toLowerCase();

  if (trimmed.startsWith('.')) {
    return file.name.toLowerCase().endsWith(trimmed);
  }

  if (trimmed.endsWith('/*')) {
    const group = trimmed.slice(0, -2);
    return file.type.toLowerCase().startsWith(group + '/');
  }

  return file.type.toLowerCase() === trimmed;
}

/**
 * Converts accept patterns to a comma-separated string suitable for
 * the HTML `<input accept="...">` attribute.
 */
export function acceptPatternsToInputAccept(
  accept: AcceptPattern[] | undefined,
): string | undefined {
  if (!accept || accept.length === 0) return undefined;
  return accept.join(',');
}
