import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilePreview } from '../use-file-preview';
import { createMockFile, setupObjectURLMock } from '../../test/helpers';

describe('useFilePreview', () => {
  let mockUrls: ReturnType<typeof setupObjectURLMock>;

  beforeEach(() => {
    mockUrls = setupObjectURLMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when file is null', () => {
    const { result } = renderHook(() => useFilePreview(null));

    expect(result.current.previewUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null when file is undefined', () => {
    const { result } = renderHook(() => useFilePreview(undefined));

    expect(result.current.previewUrl).toBeNull();
  });

  it('returns null when enabled is false', () => {
    const file = createMockFile('photo.png');
    const { result } = renderHook(() =>
      useFilePreview(file, { enabled: false }),
    );

    expect(result.current.previewUrl).toBeNull();
    expect(mockUrls.createObjectURL).not.toHaveBeenCalled();
  });

  it('creates object URL for a file without resize', () => {
    const file = createMockFile('photo.png');
    const { result } = renderHook(() => useFilePreview(file));

    expect(mockUrls.createObjectURL).toHaveBeenCalledWith(file);
    expect(result.current.previewUrl).toMatch(/^blob:mock-/);
  });

  it('revokes URL on unmount', () => {
    const file = createMockFile('photo.png');
    const { result, unmount } = renderHook(() => useFilePreview(file));

    const url = result.current.previewUrl;
    expect(url).toBeTruthy();

    unmount();

    expect(mockUrls.revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it('revokes old URL and creates new one when file changes', () => {
    const file1 = createMockFile('a.png');
    const file2 = createMockFile('b.png');

    const { result, rerender } = renderHook(
      ({ file }) => useFilePreview(file),
      { initialProps: { file: file1 as File | null } },
    );

    const firstUrl = result.current.previewUrl;
    expect(firstUrl).toBeTruthy();

    rerender({ file: file2 });

    expect(mockUrls.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    expect(result.current.previewUrl).not.toBe(firstUrl);
  });

  it('revokes URL when file changes to null', () => {
    const file = createMockFile('photo.png');
    const { result, rerender } = renderHook(
      ({ file }) => useFilePreview(file),
      { initialProps: { file: file as File | null } },
    );

    const url = result.current.previewUrl;
    expect(url).toBeTruthy();

    rerender({ file: null });

    expect(result.current.previewUrl).toBeNull();
  });
});
