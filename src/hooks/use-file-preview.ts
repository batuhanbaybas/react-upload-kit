import { useEffect, useState } from 'react';
import type { FilePreviewOptions, FilePreviewState } from '../core/types';

/**
 * Generates an Object URL preview for a file (typically an image).
 * Automatically revokes the URL on unmount or when the file changes,
 * preventing memory leaks.
 */
export function useFilePreview(
  file: File | null | undefined,
  options: FilePreviewOptions = {},
): FilePreviewState {
  const { maxWidth, maxHeight, enabled = true } = options;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!file || !enabled) {
      setPreviewUrl(null);
      return;
    }

    const needsResize = maxWidth !== undefined || maxHeight !== undefined;

    if (!needsResize) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    setIsLoading(true);
    let revoked = false;

    const img = new Image();
    const originalUrl = URL.createObjectURL(file);

    img.onload = () => {
      if (revoked) {
        URL.revokeObjectURL(originalUrl);
        return;
      }

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (maxWidth && width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (maxHeight && height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(originalUrl);
        if (revoked || !blob) return;

        const resizedUrl = URL.createObjectURL(blob);
        setPreviewUrl(resizedUrl);
        setIsLoading(false);
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(originalUrl);
      setPreviewUrl(null);
      setIsLoading(false);
    };

    img.src = originalUrl;

    return () => {
      revoked = true;
      URL.revokeObjectURL(originalUrl);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [file, maxWidth, maxHeight, enabled]);

  return { previewUrl, isLoading };
}
