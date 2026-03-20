import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUploader } from '../use-uploader';
import type { UploaderOptions } from '../../core/types';
import { createMockFile, createMockAdapter } from '../../test/helpers';

function renderUploader(overrides: Partial<UploaderOptions> = {}) {
  const defaultAdapter = createMockAdapter();
  return renderHook(() =>
    useUploader({
      adapter: defaultAdapter,
      ...overrides,
    }),
  );
}

describe('useUploader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty files and rejections', () => {
    const { result } = renderUploader();
    expect(result.current.files).toHaveLength(0);
    expect(result.current.rejections).toHaveLength(0);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.totalProgress).toBe(0);
  });

  it('addFiles adds files to the list', () => {
    const { result } = renderUploader();
    const file = createMockFile('photo.png');

    act(() => {
      result.current.addFiles([file]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].file).toBe(file);
    expect(result.current.files[0].status).toBe('pending');
  });

  it('addFiles validates against accept patterns', () => {
    const { result } = renderUploader({ accept: ['image/*'] });
    const pdf = createMockFile('doc.pdf', 1024, 'application/pdf');

    act(() => {
      result.current.addFiles([pdf]);
    });

    expect(result.current.files).toHaveLength(0);
    expect(result.current.rejections).toHaveLength(1);
  });

  it('addFiles validates against maxFileSize', () => {
    const { result } = renderUploader({ maxFileSize: 500 });
    const big = createMockFile('big.png', 1024);

    act(() => {
      result.current.addFiles([big]);
    });

    expect(result.current.files).toHaveLength(0);
    expect(result.current.rejections[0].errors[0].code).toBe('file-too-large');
  });

  it('addFiles enforces maxFiles', () => {
    const { result } = renderUploader({ maxFiles: 1 });

    act(() => {
      result.current.addFiles([createMockFile('a.png'), createMockFile('b.png')]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.rejections).toHaveLength(1);
  });

  it('triggers onFileAdded callback', () => {
    const onFileAdded = vi.fn();
    const { result } = renderUploader({ onFileAdded });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    expect(onFileAdded).toHaveBeenCalledTimes(1);
    expect(onFileAdded).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  it('autoUpload starts upload immediately', async () => {
    const adapter = createMockAdapter({ delay: 0 });
    const { result } = renderUploader({ adapter, autoUpload: true });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.files[0].status).toBe('success');
  });

  it('upload() enqueues pending files', async () => {
    const adapter = createMockAdapter({ delay: 0 });
    const { result } = renderUploader({ adapter });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    expect(result.current.files[0].status).toBe('pending');

    act(() => {
      result.current.upload();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.files[0].status).toBe('success');
  });

  it('removeFile removes from list and triggers callback', () => {
    const onFileRemoved = vi.fn();
    const { result } = renderUploader({ onFileRemoved });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    const fileId = result.current.files[0].id;

    act(() => {
      result.current.removeFile(fileId);
    });

    expect(result.current.files).toHaveLength(0);
    expect(onFileRemoved).toHaveBeenCalledTimes(1);
  });

  it('cancelFile sets status to cancelled', async () => {
    const adapter = createMockAdapter({ delay: 5000 });
    const { result } = renderUploader({ adapter, autoUpload: true });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    const fileId = result.current.files[0].id;

    act(() => {
      result.current.cancelFile(fileId);
    });

    expect(result.current.files[0].status).toBe('cancelled');
  });

  it('cancelAll cancels all uploading files', async () => {
    const adapter = createMockAdapter({ delay: 5000 });
    const { result } = renderUploader({ adapter, autoUpload: true });

    act(() => {
      result.current.addFiles([createMockFile('a.png'), createMockFile('b.png')]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    act(() => {
      result.current.cancelAll();
    });

    expect(result.current.files.every((f) => f.status === 'cancelled')).toBe(true);
  });

  it('clearCompleted removes only successful files', async () => {
    const adapter = createMockAdapter({ delay: 0 });
    const { result } = renderUploader({ adapter });

    act(() => {
      result.current.addFiles([createMockFile('a.png'), createMockFile('b.png')]);
    });

    act(() => {
      result.current.upload();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    const allSuccess = result.current.files.every((f) => f.status === 'success');
    expect(allSuccess).toBe(true);

    act(() => {
      result.current.clearCompleted();
    });

    expect(result.current.files).toHaveLength(0);
  });

  it('clearAll removes all files', () => {
    const { result } = renderUploader();

    act(() => {
      result.current.addFiles([createMockFile('a.png'), createMockFile('b.png')]);
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.files).toHaveLength(0);
  });

  it('totalProgress computes average across files', async () => {
    const adapter = createMockAdapter({ delay: 0 });
    const { result } = renderUploader({ adapter });

    act(() => {
      result.current.addFiles([createMockFile('a.png'), createMockFile('b.png')]);
    });

    expect(result.current.totalProgress).toBe(0);

    act(() => {
      result.current.upload();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.totalProgress).toBe(100);
  });

  it('triggers onUploadSuccess callback', async () => {
    const onUploadSuccess = vi.fn();
    const adapter = createMockAdapter({
      response: { url: '/file.png' },
      delay: 0,
    });
    const { result } = renderUploader({
      adapter,
      autoUpload: true,
      onUploadSuccess,
    });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(onUploadSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ file: expect.any(File) }),
      { url: '/file.png' },
    );
  });

  it('triggers onUploadError callback on failure', async () => {
    const onUploadError = vi.fn();
    const adapter = createMockAdapter({ shouldFail: true, delay: 0 });
    const { result } = renderUploader({
      adapter,
      autoUpload: true,
      onUploadError,
    });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(onUploadError).toHaveBeenCalled();
    expect(result.current.files[0].status).toBe('error');
  });

  it('triggers onAllComplete when all uploads finish', async () => {
    const onAllComplete = vi.fn();
    const adapter = createMockAdapter({ delay: 0 });
    const { result } = renderUploader({
      adapter,
      autoUpload: true,
      onAllComplete,
    });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(onAllComplete).toHaveBeenCalled();
  });

  it('retryFile re-enqueues an errored file', async () => {
    let callCount = 0;
    const adapter = vi.fn(async () => {
      callCount++;
      if (callCount === 1) throw new Error('fail');
      return { url: '/ok.png' };
    });
    const { result } = renderUploader({ adapter, autoUpload: true });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.files[0].status).toBe('error');

    const fileId = result.current.files[0].id;
    act(() => {
      result.current.retryFile(fileId);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.files[0].status).toBe('success');
  });

  it('retryAll re-enqueues all error/cancelled files', async () => {
    const adapter = createMockAdapter({ shouldFail: true, delay: 0 });
    const { result } = renderUploader({ adapter, autoUpload: true });

    act(() => {
      result.current.addFiles([createMockFile('a.png'), createMockFile('b.png')]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.files.every((f) => f.status === 'error')).toBe(true);

    const successAdapter = createMockAdapter({ delay: 0 });
    const { result: result2 } = renderHook(() =>
      useUploader({ adapter: successAdapter }),
    );

    act(() => {
      result.current.retryAll();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
  });

  it('isUploading is true when any file is uploading', async () => {
    const adapter = createMockAdapter({ delay: 5000 });
    const { result } = renderUploader({ adapter, autoUpload: true });

    act(() => {
      result.current.addFiles([createMockFile()]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(result.current.isUploading).toBe(true);
  });
});
