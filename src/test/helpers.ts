import type { UploadAdapter, UploadAdapterContext } from '../core/types';

export function createMockFile(
  name = 'test.png',
  size = 1024,
  type = 'image/png',
): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

export function createMockAdapter<T = { url: string }>(
  options: {
    response?: T;
    delay?: number;
    shouldFail?: boolean;
    failMessage?: string;
    onCall?: (file: File, ctx: UploadAdapterContext) => void;
  } = {},
): UploadAdapter<T> {
  const {
    response = { url: 'https://example.com/uploaded.png' } as T,
    delay = 0,
    shouldFail = false,
    failMessage = 'Upload failed',
    onCall,
  } = options;

  return async (file: File, ctx: UploadAdapterContext) => {
    onCall?.(file, ctx);

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (shouldFail) {
      throw new Error(failMessage);
    }

    ctx.onProgress(100);
    return response;
  };
}

let urlCounter = 0;

export function setupObjectURLMock() {
  const urls = new Map<string, boolean>();

  const createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:mock-${++urlCounter}`;
    urls.set(url, true);
    return url;
  });

  const revokeObjectURL = vi.fn((url: string) => {
    urls.delete(url);
  });

  globalThis.URL.createObjectURL = createObjectURL;
  globalThis.URL.revokeObjectURL = revokeObjectURL;

  return { createObjectURL, revokeObjectURL, urls };
}

export function createDragEvent(
  type: string,
  files: File[] = [],
): React.DragEvent {
  const dataTransfer = {
    files,
    items: files.map((f) => ({
      kind: 'file' as const,
      type: f.type,
      getAsFile: () => f,
    })),
    types: ['Files'],
    dropEffect: 'none' as DataTransfer['dropEffect'],
    effectAllowed: 'all' as DataTransfer['effectAllowed'],
    clearData: vi.fn(),
    getData: vi.fn(),
    setData: vi.fn(),
    setDragImage: vi.fn(),
  };

  return {
    dataTransfer,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.DragEvent;
}

export function createPasteEvent(files: File[]): ClipboardEvent {
  const items = files.map((f) => ({
    kind: 'file' as const,
    type: f.type,
    getAsFile: () => f,
    getAsString: vi.fn(),
    webkitGetAsEntry: vi.fn(),
  }));

  return {
    clipboardData: {
      items,
      files,
      types: ['Files'],
      getData: vi.fn(),
      setData: vi.fn(),
      clearData: vi.fn(),
    },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as ClipboardEvent;
}

export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
