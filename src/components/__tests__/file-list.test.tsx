import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FileList } from '../file-list';
import type { UploadFile } from '../../core/types';
import { createMockFile, setupObjectURLMock } from '../../test/helpers';

function makeUploadFile(
  overrides: Partial<UploadFile> = {},
): UploadFile {
  return {
    id: `file-${Math.random().toString(36).slice(2, 8)}`,
    file: createMockFile('photo.png'),
    status: 'pending',
    progress: 0,
    error: null,
    response: null,
    retryCount: 0,
    ...overrides,
  };
}

describe('FileList', () => {
  beforeEach(() => {
    setupObjectURLMock();
  });

  it('renders one item per file', () => {
    const files = [makeUploadFile({ id: 'a' }), makeUploadFile({ id: 'b' })];

    render(
      <FileList files={files}>
        {(ctx) => <div data-testid={`item-${ctx.file.id}`}>{ctx.file.file.name}</div>}
      </FileList>,
    );

    expect(screen.getByTestId('item-a')).toBeInTheDocument();
    expect(screen.getByTestId('item-b')).toBeInTheDocument();
  });

  it('provides remove callback in context', () => {
    const onRemove = vi.fn();
    const files = [makeUploadFile({ id: 'x' })];

    render(
      <FileList files={files} onRemove={onRemove}>
        {(ctx) => (
          <button data-testid="remove" onClick={ctx.remove}>
            Remove
          </button>
        )}
      </FileList>,
    );

    screen.getByTestId('remove').click();
    expect(onRemove).toHaveBeenCalledWith('x');
  });

  it('provides retry callback in context', () => {
    const onRetry = vi.fn();
    const files = [makeUploadFile({ id: 'y', status: 'error' })];

    render(
      <FileList files={files} onRetry={onRetry}>
        {(ctx) => (
          <button data-testid="retry" onClick={ctx.retry}>
            Retry
          </button>
        )}
      </FileList>,
    );

    screen.getByTestId('retry').click();
    expect(onRetry).toHaveBeenCalledWith('y');
  });

  it('provides cancel callback in context', () => {
    const onCancel = vi.fn();
    const files = [makeUploadFile({ id: 'z', status: 'uploading' })];

    render(
      <FileList files={files} onCancel={onCancel}>
        {(ctx) => (
          <button data-testid="cancel" onClick={ctx.cancel}>
            Cancel
          </button>
        )}
      </FileList>,
    );

    screen.getByTestId('cancel').click();
    expect(onCancel).toHaveBeenCalledWith('z');
  });

  it('renders empty when files array is empty', () => {
    const { container } = render(
      <FileList files={[]}>
        {(ctx) => <div data-testid="item">{ctx.file.file.name}</div>}
      </FileList>,
    );

    expect(screen.queryByTestId('item')).not.toBeInTheDocument();
  });

  it('provides preview url for image files', () => {
    const file = makeUploadFile({
      id: 'img',
      file: createMockFile('photo.png', 100, 'image/png'),
    });

    let capturedPreview: string | null = null;

    render(
      <FileList files={[file]}>
        {(ctx) => {
          capturedPreview = ctx.preview;
          return <div>{ctx.file.file.name}</div>;
        }}
      </FileList>,
    );

    expect(capturedPreview).toMatch(/^blob:mock-/);
  });

  it('provides null preview when previewEnabled is false', () => {
    const file = makeUploadFile({
      id: 'img',
      file: createMockFile('photo.png', 100, 'image/png'),
    });

    let capturedPreview: string | null = 'should-be-null';

    render(
      <FileList files={[file]} previewEnabled={false}>
        {(ctx) => {
          capturedPreview = ctx.preview;
          return <div>{ctx.file.file.name}</div>;
        }}
      </FileList>,
    );

    expect(capturedPreview).toBeNull();
  });
});
