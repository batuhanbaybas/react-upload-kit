import type { FileAction, UploadFile } from './types';

export function createUploadFile<TResponse = unknown>(
  file: File,
): UploadFile<TResponse> {
  return {
    id: crypto.randomUUID(),
    file,
    status: 'pending',
    progress: 0,
    error: null,
    response: null,
    retryCount: 0,
  };
}

export function fileReducer<TResponse = unknown>(
  state: UploadFile<TResponse>[],
  action: FileAction<TResponse>,
): UploadFile<TResponse>[] {
  switch (action.type) {
    case 'ADD_FILES':
      return [...state, ...action.payload];

    case 'REMOVE_FILE':
      return state.filter((f) => f.id !== action.payload.id);

    case 'UPDATE_STATUS':
      return state.map((f) =>
        f.id === action.payload.id
          ? { ...f, status: action.payload.status }
          : f,
      );

    case 'UPDATE_PROGRESS':
      return state.map((f) =>
        f.id === action.payload.id
          ? { ...f, progress: action.payload.progress }
          : f,
      );

    case 'SET_RESPONSE':
      return state.map((f) =>
        f.id === action.payload.id
          ? {
              ...f,
              status: 'success' as const,
              progress: 100,
              response: action.payload.response,
              error: null,
            }
          : f,
      );

    case 'SET_ERROR':
      return state.map((f) =>
        f.id === action.payload.id
          ? {
              ...f,
              status: 'error' as const,
              error: action.payload.error,
            }
          : f,
      );

    case 'INCREMENT_RETRY':
      return state.map((f) =>
        f.id === action.payload.id
          ? { ...f, retryCount: f.retryCount + 1 }
          : f,
      );

    case 'CLEAR_COMPLETED':
      return state.filter((f) => f.status !== 'success');

    case 'CLEAR_ALL':
      return [];
  }
}
