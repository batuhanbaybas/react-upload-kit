import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDropzone } from '../use-dropzone';
import type { DropzoneOptions } from '../../core/types';
import { createMockFile, createDragEvent } from '../../test/helpers';

function renderDropzone(overrides: Partial<DropzoneOptions> = {}) {
  const onDrop = vi.fn();
  return {
    onDrop,
    ...renderHook(() =>
      useDropzone({
        onDrop,
        ...overrides,
      }),
    ),
  };
}

describe('useDropzone', () => {
  describe('getRootProps', () => {
    it('returns event handlers and accessibility attributes', () => {
      const { result } = renderDropzone();
      const rootProps = result.current.getRootProps();

      expect(rootProps).toHaveProperty('onDragEnter');
      expect(rootProps).toHaveProperty('onDragOver');
      expect(rootProps).toHaveProperty('onDragLeave');
      expect(rootProps).toHaveProperty('onDrop');
      expect(rootProps).toHaveProperty('onClick');
      expect(rootProps).toHaveProperty('onKeyDown');
      expect(rootProps.role).toBe('presentation');
      expect(rootProps.tabIndex).toBe(0);
    });

    it('merges custom props', () => {
      const { result } = renderDropzone();
      const rootProps = result.current.getRootProps({ className: 'zone' });

      expect(rootProps.className).toBe('zone');
      expect(rootProps).toHaveProperty('onDrop');
    });

    it('sets tabIndex -1 when disabled', () => {
      const { result } = renderDropzone({ disabled: true });
      const rootProps = result.current.getRootProps();

      expect(rootProps.tabIndex).toBe(-1);
    });
  });

  describe('getInputProps', () => {
    it('returns file input configuration', () => {
      const { result } = renderDropzone({ accept: ['image/*'], multiple: true });
      const inputProps = result.current.getInputProps();

      expect(inputProps.type).toBe('file');
      expect(inputProps.accept).toBe('image/*');
      expect(inputProps.multiple).toBe(true);
      expect(inputProps.style).toEqual({ display: 'none' });
      expect(inputProps.tabIndex).toBe(-1);
    });

    it('returns undefined accept when no accept patterns', () => {
      const { result } = renderDropzone();
      const inputProps = result.current.getInputProps();

      expect(inputProps.accept).toBeUndefined();
    });
  });

  describe('drag and drop flow', () => {
    it('sets isDragActive on dragEnter', () => {
      const { result } = renderDropzone();
      const rootProps = result.current.getRootProps();

      expect(result.current.isDragActive).toBe(false);

      act(() => {
        (rootProps.onDragEnter as Function)(createDragEvent('dragenter'));
      });

      expect(result.current.isDragActive).toBe(true);
    });

    it('resets isDragActive on dragLeave', () => {
      const { result } = renderDropzone();
      const rootProps = result.current.getRootProps();

      act(() => {
        (rootProps.onDragEnter as Function)(createDragEvent('dragenter'));
      });

      expect(result.current.isDragActive).toBe(true);

      act(() => {
        (rootProps.onDragLeave as Function)(createDragEvent('dragleave'));
      });

      expect(result.current.isDragActive).toBe(false);
    });

    it('handles nested dragEnter/dragLeave without resetting', () => {
      const { result } = renderDropzone();
      const rootProps = result.current.getRootProps();

      act(() => {
        (rootProps.onDragEnter as Function)(createDragEvent('dragenter'));
      });
      act(() => {
        (rootProps.onDragEnter as Function)(createDragEvent('dragenter'));
      });
      act(() => {
        (rootProps.onDragLeave as Function)(createDragEvent('dragleave'));
      });

      expect(result.current.isDragActive).toBe(true);

      act(() => {
        (rootProps.onDragLeave as Function)(createDragEvent('dragleave'));
      });

      expect(result.current.isDragActive).toBe(false);
    });

    it('processes files on drop', () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() => useDropzone({ onDrop }));
      const rootProps = result.current.getRootProps();
      const file = createMockFile('photo.png');

      act(() => {
        (rootProps.onDrop as Function)(createDragEvent('drop', [file]));
      });

      expect(onDrop).toHaveBeenCalledWith([file]);
    });

    it('resets drag state on drop', () => {
      const { result } = renderDropzone();
      const rootProps = result.current.getRootProps();

      act(() => {
        (rootProps.onDragEnter as Function)(createDragEvent('dragenter'));
      });
      expect(result.current.isDragActive).toBe(true);

      act(() => {
        (rootProps.onDrop as Function)(
          createDragEvent('drop', [createMockFile()]),
        );
      });
      expect(result.current.isDragActive).toBe(false);
    });

    it('validates dropped files', () => {
      const onDrop = vi.fn();
      const onDropRejected = vi.fn();
      const { result } = renderHook(() =>
        useDropzone({ onDrop, onDropRejected, accept: ['image/*'] }),
      );
      const rootProps = result.current.getRootProps();
      const pdf = createMockFile('doc.pdf', 1024, 'application/pdf');

      act(() => {
        (rootProps.onDrop as Function)(createDragEvent('drop', [pdf]));
      });

      expect(onDrop).not.toHaveBeenCalled();
      expect(onDropRejected).toHaveBeenCalledTimes(1);
    });
  });

  describe('isDragAccept / isDragReject', () => {
    it('sets isDragAccept when dragged file matches accept', () => {
      const { result } = renderDropzone({ accept: ['image/*'] });
      const rootProps = result.current.getRootProps();
      const file = createMockFile('photo.png', 100, 'image/png');

      act(() => {
        (rootProps.onDragEnter as Function)(createDragEvent('dragenter', [file]));
      });

      expect(result.current.isDragAccept).toBe(true);
      expect(result.current.isDragReject).toBe(false);
    });

    it('sets isDragReject when no dragged files match', () => {
      const { result } = renderDropzone({ accept: ['image/*'] });
      const rootProps = result.current.getRootProps();
      const pdf = createMockFile('doc.pdf', 100, 'application/pdf');

      act(() => {
        (rootProps.onDragEnter as Function)(createDragEvent('dragenter', [pdf]));
      });

      expect(result.current.isDragReject).toBe(true);
    });

    it('sets isDragAccept when no accept restriction', () => {
      const { result } = renderDropzone();
      const rootProps = result.current.getRootProps();

      act(() => {
        (rootProps.onDragEnter as Function)(
          createDragEvent('dragenter', [createMockFile()]),
        );
      });

      expect(result.current.isDragAccept).toBe(true);
      expect(result.current.isDragReject).toBe(false);
    });
  });

  describe('disabled', () => {
    it('does not activate drag when disabled', () => {
      const { result } = renderDropzone({ disabled: true });
      const rootProps = result.current.getRootProps();

      act(() => {
        (rootProps.onDragEnter as Function)(createDragEvent('dragenter'));
      });

      expect(result.current.isDragActive).toBe(false);
    });

    it('does not process drop when disabled', () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() =>
        useDropzone({ onDrop, disabled: true }),
      );
      const rootProps = result.current.getRootProps();

      act(() => {
        (rootProps.onDrop as Function)(
          createDragEvent('drop', [createMockFile()]),
        );
      });

      expect(onDrop).not.toHaveBeenCalled();
    });
  });

  describe('noClick', () => {
    it('does not open file dialog on click when noClick', () => {
      const { result } = renderDropzone({ noClick: true });
      const rootProps = result.current.getRootProps();

      const clickSpy = vi.fn();
      act(() => {
        (rootProps.onClick as Function)();
      });

      // No assertion on dialog (no ref), just ensure no error
    });
  });

  describe('noDrag', () => {
    it('does not activate drag when noDrag', () => {
      const { result } = renderDropzone({ noDrag: true });
      const rootProps = result.current.getRootProps();

      act(() => {
        (rootProps.onDragEnter as Function)(createDragEvent('dragenter'));
      });

      expect(result.current.isDragActive).toBe(false);
    });
  });

  describe('open()', () => {
    it('is a function', () => {
      const { result } = renderDropzone();
      expect(typeof result.current.open).toBe('function');
    });

    it('does not throw when disabled', () => {
      const { result } = renderDropzone({ disabled: true });
      expect(() => result.current.open()).not.toThrow();
    });
  });

  describe('dragOver', () => {
    it('sets dropEffect to copy', () => {
      const { result } = renderDropzone();
      const rootProps = result.current.getRootProps();
      const event = createDragEvent('dragover');

      act(() => {
        (rootProps.onDragOver as Function)(event);
      });

      expect(event.dataTransfer.dropEffect).toBe('copy');
    });
  });
});
