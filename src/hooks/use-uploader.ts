import { useCallback, useMemo, useReducer, useRef } from 'react';
import type {
  FileRejection,
  UploaderInstance,
  UploaderOptions,
  UploadFile,
} from '../core/types';
import { createUploadFile, fileReducer } from '../core/file-manager';
import { UploadQueue } from '../core/upload-queue';
import { validateFiles } from '../core/validator';

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_RETRIES = 0;
const DEFAULT_RETRY_DELAY = 1000;

export function useUploader<TResponse = unknown>(
  options: UploaderOptions<TResponse>,
): UploaderInstance<TResponse> {
  const {
    adapter,
    accept,
    maxFileSize,
    minFileSize,
    maxFiles,
    autoUpload = false,
    concurrency = DEFAULT_CONCURRENCY,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    validator,
    onFileAdded,
    onFileRemoved,
    onUploadStart,
    onUploadProgress,
    onUploadSuccess,
    onUploadError,
    onAllComplete,
  } = options;

  const [files, dispatch] = useReducer(fileReducer<TResponse>, []);
  const [rejections, setRejections] = useReducer(
    (_: FileRejection[], next: FileRejection[]) => next,
    [],
  );

  const callbacksRef = useRef({
    onFileAdded,
    onFileRemoved,
    onUploadStart,
    onUploadProgress,
    onUploadSuccess,
    onUploadError,
    onAllComplete,
  });
  callbacksRef.current = {
    onFileAdded,
    onFileRemoved,
    onUploadStart,
    onUploadProgress,
    onUploadSuccess,
    onUploadError,
    onAllComplete,
  };

  const filesRef = useRef(files);
  filesRef.current = files;

  const abortControllers = useRef(new Map<string, AbortController>());

  const queue = useRef<UploadQueue<TResponse>>(
    new UploadQueue<TResponse>({ concurrency }),
  );

  const findFile = useCallback(
    (id: string) => filesRef.current.find((f) => f.id === id) ?? null,
    [],
  );

  const enqueueFile = useCallback(
    (uploadFile: UploadFile<TResponse>) => {
      const ac = new AbortController();
      abortControllers.current.set(uploadFile.id, ac);

      queue.current.enqueue({
        id: uploadFile.id,
        file: uploadFile.file,
        adapter,
        abortController: ac,
        retryCount: 0,
        maxRetries,
        retryDelay,
        onStart: (id) => {
          dispatch({ type: 'UPDATE_STATUS', payload: { id, status: 'uploading' } });
          const f = findFile(id);
          if (f) callbacksRef.current.onUploadStart?.(f);
        },
        onProgress: (id, percent) => {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { id, progress: percent } });
          const f = findFile(id);
          if (f) callbacksRef.current.onUploadProgress?.(f, percent);
        },
        onSuccess: (id, response) => {
          dispatch({ type: 'SET_RESPONSE', payload: { id, response } });
          abortControllers.current.delete(id);
          const f = findFile(id);
          if (f) callbacksRef.current.onUploadSuccess?.(f, response);
        },
        onError: (id, error) => {
          dispatch({ type: 'SET_ERROR', payload: { id, error } });
          abortControllers.current.delete(id);
          const f = findFile(id);
          if (f) callbacksRef.current.onUploadError?.(f, error);
        },
      });
    },
    [adapter, maxRetries, retryDelay, findFile],
  );

  queue.current.setOnDrain(() => {
    callbacksRef.current.onAllComplete?.();
  });

  const addFiles = useCallback(
    (rawFiles: File[]) => {
      const { accepted, rejected } = validateFiles(
        rawFiles,
        { accept, maxFileSize, minFileSize, maxFiles, validator },
        filesRef.current.length,
      );

      setRejections(rejected);

      if (accepted.length === 0) return;

      const uploadFiles = accepted.map((f) => createUploadFile<TResponse>(f));
      dispatch({ type: 'ADD_FILES', payload: uploadFiles });

      for (const uf of uploadFiles) {
        callbacksRef.current.onFileAdded?.(uf);
      }

      if (autoUpload) {
        for (const uf of uploadFiles) {
          enqueueFile(uf);
        }
      }
    },
    [accept, maxFileSize, minFileSize, maxFiles, validator, autoUpload, enqueueFile],
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const ac = abortControllers.current.get(fileId);
      if (ac) {
        ac.abort();
        abortControllers.current.delete(fileId);
      }
      queue.current.cancel(fileId);

      const f = findFile(fileId);
      dispatch({ type: 'REMOVE_FILE', payload: { id: fileId } });
      if (f) callbacksRef.current.onFileRemoved?.(f);
    },
    [findFile],
  );

  const upload = useCallback(() => {
    const pending = filesRef.current.filter((f) => f.status === 'pending');
    for (const uf of pending) {
      enqueueFile(uf);
    }
  }, [enqueueFile]);

  const retryFile = useCallback(
    (fileId: string) => {
      const f = findFile(fileId);
      if (!f || (f.status !== 'error' && f.status !== 'cancelled')) return;

      dispatch({ type: 'UPDATE_STATUS', payload: { id: fileId, status: 'pending' } });
      dispatch({ type: 'INCREMENT_RETRY', payload: { id: fileId } });
      enqueueFile(f);
    },
    [findFile, enqueueFile],
  );

  const retryAll = useCallback(() => {
    const retryable = filesRef.current.filter(
      (f) => f.status === 'error' || f.status === 'cancelled',
    );
    for (const f of retryable) {
      retryFile(f.id);
    }
  }, [retryFile]);

  const cancelFile = useCallback(
    (fileId: string) => {
      const ac = abortControllers.current.get(fileId);
      if (ac) {
        ac.abort();
        abortControllers.current.delete(fileId);
      }
      queue.current.cancel(fileId);
      dispatch({ type: 'UPDATE_STATUS', payload: { id: fileId, status: 'cancelled' } });
    },
    [],
  );

  const cancelAll = useCallback(() => {
    queue.current.cancelAll();
    for (const [id] of abortControllers.current) {
      dispatch({ type: 'UPDATE_STATUS', payload: { id, status: 'cancelled' } });
    }
    abortControllers.current.clear();
  }, []);

  const clearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' });
  }, []);

  const clearAll = useCallback(() => {
    cancelAll();
    dispatch({ type: 'CLEAR_ALL' });
  }, [cancelAll]);

  const isUploading = useMemo(
    () => files.some((f) => f.status === 'uploading'),
    [files],
  );

  const totalProgress = useMemo(() => {
    if (files.length === 0) return 0;
    const sum = files.reduce((acc, f) => acc + f.progress, 0);
    return Math.round(sum / files.length);
  }, [files]);

  return {
    files,
    addFiles,
    removeFile,
    upload,
    retryFile,
    retryAll,
    cancelFile,
    cancelAll,
    clearCompleted,
    clearAll,
    isUploading,
    totalProgress,
    rejections,
  };
}
