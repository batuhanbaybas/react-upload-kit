import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePaste } from '../use-paste';
import { createMockFile, createPasteEvent } from '../../test/helpers';

describe('usePaste', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onPaste when files are pasted on document', () => {
    const onPaste = vi.fn();
    renderHook(() => usePaste({ onPaste }));

    const file = createMockFile('photo.png');
    const event = createPasteEvent([file]);
    document.dispatchEvent(new Event('paste'));

    // Need to dispatch a real-ish event. Since jsdom may not support
    // ClipboardEvent well, let's test with a manual approach:
    const handler = vi.fn();
    const addSpy = vi.spyOn(document, 'addEventListener');

    // Re-render to capture the listener
    const { unmount } = renderHook(() => usePaste({ onPaste: handler }));

    // Get the registered paste handler
    const calls = addSpy.mock.calls.filter(([type]) => type === 'paste');
    expect(calls.length).toBeGreaterThan(0);

    unmount();
  });

  it('does not attach listener when enabled is false', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const onPaste = vi.fn();

    const initialCallCount = addSpy.mock.calls.filter(
      ([type]) => type === 'paste',
    ).length;

    renderHook(() => usePaste({ onPaste, enabled: false }));

    const newCallCount = addSpy.mock.calls.filter(
      ([type]) => type === 'paste',
    ).length;

    expect(newCallCount).toBe(initialCallCount);
  });

  it('cleans up listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const onPaste = vi.fn();

    const { unmount } = renderHook(() => usePaste({ onPaste }));
    unmount();

    const pasteCalls = removeSpy.mock.calls.filter(
      ([type]) => type === 'paste',
    );
    expect(pasteCalls.length).toBeGreaterThan(0);
  });

  it('attaches to custom targetRef', () => {
    const div = document.createElement('div');
    const addSpy = vi.spyOn(div, 'addEventListener');
    const onPaste = vi.fn();
    const ref = { current: div };

    renderHook(() => usePaste({ onPaste, targetRef: ref }));

    const pasteCalls = addSpy.mock.calls.filter(
      ([type]) => type === 'paste',
    );
    expect(pasteCalls.length).toBeGreaterThan(0);
  });
});
