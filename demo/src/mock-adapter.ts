import type { UploadAdapter } from 'react-upload-kit';

export interface MockUploadResponse {
  url: string;
  uploadedAt: string;
}

export interface MockAdapterOptions {
  /** Approximate total upload time in ms (scaled slightly by file size). */
  baseDurationMs?: number;
  /** Probability [0..1] that an upload fails, to showcase retry. */
  failureRate?: number;
}

/**
 * A fake upload adapter for the demo. There is no real backend here: it
 * simulates a chunked upload by emitting progress on an interval, honours the
 * AbortSignal for cancellation, and occasionally rejects so the retry flow is
 * demonstrable. Swap this for a real XHR/fetch/S3 adapter in production.
 */
export function createMockAdapter(
  options: MockAdapterOptions = {},
): UploadAdapter<MockUploadResponse> {
  const { baseDurationMs = 3000, failureRate = 0.25 } = options;

  return (file, { onProgress, signal }) =>
    new Promise<MockUploadResponse>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Upload aborted', 'AbortError'));
        return;
      }

      // Larger files take a little longer, capped so the demo stays snappy.
      const sizeFactor = Math.min(file.size / (2 * 1024 * 1024), 2);
      const duration = baseDurationMs * (0.75 + sizeFactor);
      const tickMs = 120;
      const steps = Math.max(1, Math.round(duration / tickMs));

      let currentStep = 0;

      const cleanup = () => {
        clearInterval(timer);
        signal.removeEventListener('abort', onAbort);
      };

      const onAbort = () => {
        cleanup();
        reject(new DOMException('Upload aborted', 'AbortError'));
      };

      signal.addEventListener('abort', onAbort);

      const timer = setInterval(() => {
        currentStep += 1;
        const percent = Math.min(100, Math.round((currentStep / steps) * 100));
        onProgress(percent);

        if (currentStep >= steps) {
          cleanup();

          if (Math.random() < failureRate) {
            reject(new Error('Simulated network error. Try again.'));
            return;
          }

          resolve({
            url: `https://cdn.example.com/${encodeURIComponent(file.name)}`,
            uploadedAt: new Date().toISOString(),
          });
        }
      }, tickMs);
    });
}
