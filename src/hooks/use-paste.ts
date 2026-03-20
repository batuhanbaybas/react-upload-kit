import { useEffect, useRef } from 'react';
import type { PasteOptions } from '../core/types';
import { isFileAccepted } from '../core/mime';

export function usePaste(options: PasteOptions): void {
  const { onPaste, accept, enabled = true, targetRef } = options;

  const onPasteRef = useRef(onPaste);
  onPasteRef.current = onPaste;

  const acceptRef = useRef(accept);
  acceptRef.current = accept;

  useEffect(() => {
    if (!enabled) return;

    const target = targetRef?.current ?? document;

    const handler = (event: Event) => {
      const clipboardEvent = event as ClipboardEvent;
      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== 'file') continue;

        const file = item.getAsFile();
        if (!file) continue;

        if (isFileAccepted(file, acceptRef.current)) {
          files.push(file);
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        onPasteRef.current(files);
      }
    };

    target.addEventListener('paste', handler);
    return () => target.removeEventListener('paste', handler);
  }, [enabled, targetRef]);
}
