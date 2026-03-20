import { useCallback, useRef, useState } from 'react';
import type { DropzoneOptions, DropzoneState } from '../core/types';
import { isFileAccepted, acceptPatternsToInputAccept } from '../core/mime';
import { validateFiles } from '../core/validator';

export function useDropzone(options: DropzoneOptions): DropzoneState {
  const {
    onDrop,
    onDropRejected,
    accept,
    multiple = true,
    disabled = false,
    noClick = false,
    noDrag = false,
    maxFiles,
    maxFileSize,
    minFileSize,
    validator,
  } = options;

  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragAccept, setIsDragAccept] = useState(false);
  const [isDragReject, setIsDragReject] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  const processFiles = useCallback(
    (rawFiles: File[]) => {
      if (disabled) return;

      const { accepted, rejected } = validateFiles(rawFiles, {
        accept,
        maxFileSize,
        minFileSize,
        maxFiles,
        validator,
      });

      if (accepted.length > 0) {
        onDrop(accepted);
      }

      if (rejected.length > 0) {
        onDropRejected?.(rejected);
      }
    },
    [disabled, accept, maxFileSize, minFileSize, maxFiles, validator, onDrop, onDropRejected],
  );

  const checkDragTypes = useCallback(
    (event: React.DragEvent) => {
      if (!accept || accept.length === 0) {
        setIsDragAccept(true);
        setIsDragReject(false);
        return;
      }

      const items = Array.from(event.dataTransfer.items);
      const hasAccepted = items.some((item) =>
        isFileAccepted({ name: '', type: item.type }, accept),
      );
      const hasRejected = items.some(
        (item) => !isFileAccepted({ name: '', type: item.type }, accept),
      );

      setIsDragAccept(hasAccepted);
      setIsDragReject(hasRejected && !hasAccepted);
    },
    [accept],
  );

  const onDragEnter = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled || noDrag) return;

      dragCounter.current++;
      if (dragCounter.current === 1) {
        setIsDragActive(true);
        checkDragTypes(event);
      }
    },
    [disabled, noDrag, checkDragTypes],
  );

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled || noDrag) return;
      event.dataTransfer.dropEffect = 'copy';
    },
    [disabled, noDrag],
  );

  const onDragLeave = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled || noDrag) return;

      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragActive(false);
        setIsDragAccept(false);
        setIsDragReject(false);
      }
    },
    [disabled, noDrag],
  );

  const onDropHandler = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled || noDrag) return;

      dragCounter.current = 0;
      setIsDragActive(false);
      setIsDragAccept(false);
      setIsDragReject(false);

      const droppedFiles = Array.from(event.dataTransfer.files);
      processFiles(droppedFiles);
    },
    [disabled, noDrag, processFiles],
  );

  const onClick = useCallback(() => {
    if (disabled || noClick) return;
    inputRef.current?.click();
  }, [disabled, noClick]);

  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files
        ? Array.from(event.target.files)
        : [];
      processFiles(selectedFiles);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [processFiles],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled || noClick) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled, noClick],
  );

  const open = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const getRootProps = useCallback(
    (props?: Record<string, unknown>) => ({
      ...props,
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop: onDropHandler,
      onClick,
      onKeyDown,
      role: 'presentation' as const,
      tabIndex: disabled ? -1 : 0,
    }),
    [onDragEnter, onDragOver, onDragLeave, onDropHandler, onClick, onKeyDown, disabled],
  );

  const getInputProps = useCallback(
    (props?: Record<string, unknown>) => ({
      ...props,
      type: 'file' as const,
      accept: acceptPatternsToInputAccept(accept),
      multiple,
      onChange: onInputChange,
      style: { display: 'none' } as const,
      tabIndex: -1,
      ref: (el: HTMLInputElement | null) => {
        inputRef.current = el;
      },
    }),
    [accept, multiple, onInputChange],
  );

  return {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    open,
  };
}
