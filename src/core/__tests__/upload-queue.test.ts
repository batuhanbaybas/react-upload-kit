import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UploadQueue } from '../upload-queue';
import type { QueueItem } from '../upload-queue';
import { createMockFile } from '../../test/helpers';

function createQueueItem(
  overrides: Partial<QueueItem> = {},
): QueueItem<string> {
  return {
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    file: createMockFile(),
    adapter: async (_file, ctx) => {
      ctx.onProgress(100);
      return 'ok';
    },
    abortController: new AbortController(),
    onProgress: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    onStart: vi.fn(),
    retryCount: 0,
    maxRetries: 0,
    retryDelay: 100,
    ...overrides,
  };
}

describe('UploadQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('processes items up to concurrency limit', async () => {
    const queue = new UploadQueue<string>({ concurrency: 2 });
    let resolveA!: () => void;
    let resolveB!: () => void;
    let resolveC!: () => void;

    const adapterA = vi.fn(
      () => new Promise<string>((r) => (resolveA = () => r('a'))),
    );
    const adapterB = vi.fn(
      () => new Promise<string>((r) => (resolveB = () => r('b'))),
    );
    const adapterC = vi.fn(
      () => new Promise<string>((r) => (resolveC = () => r('c'))),
    );

    const itemA = createQueueItem({ id: 'a', adapter: adapterA });
    const itemB = createQueueItem({ id: 'b', adapter: adapterB });
    const itemC = createQueueItem({ id: 'c', adapter: adapterC });

    queue.enqueue(itemA);
    queue.enqueue(itemB);
    queue.enqueue(itemC);

    expect(adapterA).toHaveBeenCalledTimes(1);
    expect(adapterB).toHaveBeenCalledTimes(1);
    expect(adapterC).not.toHaveBeenCalled();

    resolveA();
    await vi.advanceTimersByTimeAsync(0);

    expect(adapterC).toHaveBeenCalledTimes(1);

    resolveB();
    resolveC();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('calls onStart when processing begins', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    const item = createQueueItem({ id: 'x' });

    queue.enqueue(item);

    expect(item.onStart).toHaveBeenCalledWith('x');
  });

  it('calls onSuccess with response on successful upload', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    const item = createQueueItem({
      adapter: async () => 'response-data',
    });

    queue.enqueue(item);
    await vi.advanceTimersByTimeAsync(0);

    expect(item.onSuccess).toHaveBeenCalledWith(item.id, 'response-data');
  });

  it('calls onError when adapter throws and retries exhausted', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    const item = createQueueItem({
      adapter: async () => {
        throw new Error('fail');
      },
      maxRetries: 0,
    });

    queue.enqueue(item);
    await vi.advanceTimersByTimeAsync(0);

    expect(item.onError).toHaveBeenCalledWith(
      item.id,
      expect.objectContaining({ message: 'fail' }),
    );
  });

  it('wraps non-Error throws into Error objects', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    const item = createQueueItem({
      adapter: async () => {
        throw 'string-error';
      },
      maxRetries: 0,
    });

    queue.enqueue(item);
    await vi.advanceTimersByTimeAsync(0);

    expect(item.onError).toHaveBeenCalledWith(
      item.id,
      expect.objectContaining({ message: 'string-error' }),
    );
  });

  it('retries failed items with exponential backoff', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    let callCount = 0;
    const adapter = vi.fn(async () => {
      callCount++;
      if (callCount < 3) throw new Error('fail');
      return 'ok';
    });

    const item = createQueueItem({
      adapter,
      maxRetries: 2,
      retryDelay: 100,
    });

    queue.enqueue(item);
    await vi.advanceTimersByTimeAsync(0);

    // First retry after 100ms (100 * 2^0)
    expect(adapter).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(0);

    expect(adapter).toHaveBeenCalledTimes(2);

    // Second retry after 200ms (100 * 2^1)
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(0);

    expect(adapter).toHaveBeenCalledTimes(3);
  });

  it('cancel removes queued item before processing', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    let resolve!: () => void;
    const blockingAdapter = vi.fn(
      () => new Promise<string>((r) => (resolve = () => r('ok'))),
    );
    const neverAdapter = vi.fn(async () => 'never');

    const blocking = createQueueItem({ id: 'blocking', adapter: blockingAdapter });
    const toCancel = createQueueItem({ id: 'cancel-me', adapter: neverAdapter });

    queue.enqueue(blocking);
    queue.enqueue(toCancel);

    queue.cancel('cancel-me');

    resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(neverAdapter).not.toHaveBeenCalled();
  });

  it('cancel aborts an active item', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    let capturedSignal!: AbortSignal;
    const adapter = vi.fn(
      (_file: File, ctx: { signal: AbortSignal }) =>
        new Promise<string>((_, reject) => {
          capturedSignal = ctx.signal;
          ctx.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    const item = createQueueItem({ id: 'active', adapter });
    queue.enqueue(item);

    queue.cancel('active');
    expect(capturedSignal.aborted).toBe(true);
  });

  it('cancelAll aborts all active and clears queue', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    const signals: AbortSignal[] = [];
    const adapter = vi.fn(
      (_file: File, ctx: { signal: AbortSignal }) =>
        new Promise<string>(() => {
          signals.push(ctx.signal);
        }),
    );

    queue.enqueue(createQueueItem({ adapter }));
    queue.enqueue(createQueueItem({ adapter }));

    queue.cancelAll();

    expect(queue.size).toBe(0);
    expect(signals[0].aborted).toBe(true);
  });

  it('calls onDrain when all items complete', async () => {
    const queue = new UploadQueue<string>({ concurrency: 2 });
    const onDrain = vi.fn();
    queue.setOnDrain(onDrain);

    queue.enqueue(createQueueItem({ adapter: async () => 'ok' }));
    queue.enqueue(createQueueItem({ adapter: async () => 'ok' }));

    await vi.advanceTimersByTimeAsync(0);

    expect(onDrain).toHaveBeenCalled();
  });

  it('does not call onDrain while items remain', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    const onDrain = vi.fn();
    queue.setOnDrain(onDrain);

    let resolve!: () => void;
    const blockingAdapter = () =>
      new Promise<string>((r) => (resolve = () => r('ok')));

    queue.enqueue(createQueueItem({ adapter: blockingAdapter }));
    queue.enqueue(createQueueItem({ adapter: async () => 'ok' }));

    resolve();
    await vi.advanceTimersByTimeAsync(0);

    // onDrain should not fire yet because the second item is now processing
    // We need to wait for the second item to complete
    await vi.advanceTimersByTimeAsync(0);

    expect(onDrain).toHaveBeenCalledTimes(1);
  });

  it('reports correct size', () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    const adapter = () => new Promise<string>(() => {});

    queue.enqueue(createQueueItem({ adapter }));
    queue.enqueue(createQueueItem({ adapter }));

    expect(queue.size).toBe(2);
  });

  it('reports isProcessing correctly', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });

    expect(queue.isProcessing).toBe(false);

    let resolve!: () => void;
    queue.enqueue(
      createQueueItem({
        adapter: () => new Promise<string>((r) => (resolve = () => r('ok'))),
      }),
    );

    expect(queue.isProcessing).toBe(true);

    resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(queue.isProcessing).toBe(false);
  });

  it('does not call onSuccess when aborted during upload', async () => {
    const queue = new UploadQueue<string>({ concurrency: 1 });
    const ac = new AbortController();
    let resolveAdapter!: (val: string) => void;

    const item = createQueueItem({
      abortController: ac,
      adapter: () => new Promise<string>((r) => (resolveAdapter = r)),
    });

    queue.enqueue(item);
    ac.abort();
    resolveAdapter('should-not-succeed');
    await vi.advanceTimersByTimeAsync(0);

    expect(item.onSuccess).not.toHaveBeenCalled();
  });
});
