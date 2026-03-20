import { useCallback, useRef } from 'react';
import type { AcceptPattern } from '../core/types';
import { acceptPatternsToInputAccept } from '../core/mime';

export interface UploadTriggerContext {
  open: () => void;
  inputProps: Record<string, unknown>;
}

export interface UploadTriggerProps {
  onSelect: (files: File[]) => void;
  accept?: AcceptPattern[];
  multiple?: boolean;
  disabled?: boolean;
  children: (context: UploadTriggerContext) => React.ReactNode;
}

export function UploadTrigger({
  onSelect,
  accept,
  multiple = true,
  disabled = false,
  children,
}: UploadTriggerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const open = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      if (files.length > 0) {
        onSelect(files);
      }
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onSelect],
  );

  const inputProps = {
    type: 'file' as const,
    accept: acceptPatternsToInputAccept(accept),
    multiple,
    disabled,
    onChange,
    style: { display: 'none' } as const,
    tabIndex: -1,
    ref: (el: HTMLInputElement | null) => {
      inputRef.current = el;
    },
  };

  return <>{children({ open, inputProps })}</>;
}
