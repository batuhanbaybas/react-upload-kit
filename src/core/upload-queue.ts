import type { UploadAdapter } from './types';

export interface QueueItem<TResponse = unknown> {
  id: string;
  file: File;
  adapter: UploadAdapter<TResponse>;
  abortController: AbortController;
  onProgress: (id: string, percent: number) => void;
  onSuccess: (id: string, response: TResponse) => void;
  onError: (id: string, error: Error) => void;
  onStart: (id: string) => void;
  retryCount: number;
  maxRetries: number;
  retryDelay: number;
}

export interface UploadQueueOptions {
  concurrency: number;
}

/**
 * Framework-agnostic upload queue with concurrency control.
 *
 * Items enter the queue and are processed up to `concurrency` at a time.
 * Failed items can be re-queued with retry logic handled externally
 * (the hook layer decides when/whether to retry).
 */
export class UploadQueue<TResponse = unknown> {
  private queue: QueueItem<TResponse>[] = [];
  private active = new Map<string, QueueItem<TResponse>>();
  private concurrency: number;
  private onDrain?: () => void;

  constructor(options: UploadQueueOptions) {
    this.concurrency = options.concurrency;
  }

  setOnDrain(cb: () => void) {
    this.onDrain = cb;
  }

  enqueue(item: QueueItem<TResponse>) {
    this.queue.push(item);
    this.flush();
  }

  cancel(id: string) {
    this.queue = this.queue.filter((item) => item.id !== id);

    const activeItem = this.active.get(id);
    if (activeItem) {
      activeItem.abortController.abort();
      this.active.delete(id);
      this.flush();
    }
  }

  cancelAll() {
    this.queue = [];
    for (const [id, item] of this.active) {
      item.abortController.abort();
      this.active.delete(id);
    }
  }

  get size(): number {
    return this.queue.length + this.active.size;
  }

  get isProcessing(): boolean {
    return this.active.size > 0 || this.queue.length > 0;
  }

  private flush() {
    while (this.active.size < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.process(item);
    }
  }

  private async process(item: QueueItem<TResponse>) {
    this.active.set(item.id, item);
    item.onStart(item.id);

    let retried = false;

    try {
      const response = await item.adapter(item.file, {
        onProgress: (percent) => item.onProgress(item.id, percent),
        signal: item.abortController.signal,
      });

      if (!item.abortController.signal.aborted) {
        item.onSuccess(item.id, response);
      }
    } catch (err) {
      if (item.abortController.signal.aborted) return;

      const error =
        err instanceof Error ? err : new Error(String(err));

      if (item.retryCount < item.maxRetries) {
        retried = true;
        this.active.delete(item.id);
        await this.scheduleRetry(item);
        return;
      }

      item.onError(item.id, error);
    } finally {
      if (!retried) {
        this.active.delete(item.id);
        this.flush();

        if (!this.isProcessing) {
          this.onDrain?.();
        }
      }
    }
  }

  private scheduleRetry(item: QueueItem<TResponse>): Promise<void> {
    const delay = item.retryDelay * Math.pow(2, item.retryCount);

    return new Promise((resolve) => {
      setTimeout(() => {
        const retried: QueueItem<TResponse> = {
          ...item,
          retryCount: item.retryCount + 1,
          abortController: new AbortController(),
        };
        this.enqueue(retried);
        resolve();
      }, delay);
    });
  }
}
