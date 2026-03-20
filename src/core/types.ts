// ---------------------------------------------------------------------------
// Upload Adapter
// ---------------------------------------------------------------------------

export type UploadAdapter<TResponse = unknown> = (
  file: File,
  context: UploadAdapterContext,
) => Promise<TResponse>;

export interface UploadAdapterContext {
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}

// ---------------------------------------------------------------------------
// File Status & State
// ---------------------------------------------------------------------------

export type UploadFileStatus =
  | 'pending'
  | 'uploading'
  | 'success'
  | 'error'
  | 'cancelled';

export interface UploadFile<TResponse = unknown> {
  id: string;
  file: File;
  status: UploadFileStatus;
  progress: number;
  error: Error | null;
  response: TResponse | null;
  retryCount: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type AcceptPattern = string;

export interface FileRejection {
  file: File;
  errors: FileError[];
}

export interface FileError {
  code: FileErrorCode;
  message: string;
}

export type FileErrorCode =
  | 'file-too-large'
  | 'file-too-small'
  | 'too-many-files'
  | 'file-invalid-type'
  | 'validation-error';

export type FileValidator = (file: File) => FileError | FileError[] | null;

// ---------------------------------------------------------------------------
// Uploader Configuration
// ---------------------------------------------------------------------------

export interface UploaderOptions<TResponse = unknown> {
  adapter: UploadAdapter<TResponse>;
  accept?: AcceptPattern[];
  maxFileSize?: number;
  minFileSize?: number;
  maxFiles?: number;
  autoUpload?: boolean;
  concurrency?: number;
  maxRetries?: number;
  retryDelay?: number;
  validator?: FileValidator;
  onFileAdded?: (file: UploadFile<TResponse>) => void;
  onFileRemoved?: (file: UploadFile<TResponse>) => void;
  onUploadStart?: (file: UploadFile<TResponse>) => void;
  onUploadProgress?: (file: UploadFile<TResponse>, percent: number) => void;
  onUploadSuccess?: (file: UploadFile<TResponse>, response: TResponse) => void;
  onUploadError?: (file: UploadFile<TResponse>, error: Error) => void;
  onAllComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Uploader Return Type
// ---------------------------------------------------------------------------

export interface UploaderInstance<TResponse = unknown> {
  files: UploadFile<TResponse>[];
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  upload: () => void;
  retryFile: (fileId: string) => void;
  retryAll: () => void;
  cancelFile: (fileId: string) => void;
  cancelAll: () => void;
  clearCompleted: () => void;
  clearAll: () => void;
  isUploading: boolean;
  totalProgress: number;
  rejections: FileRejection[];
}

// ---------------------------------------------------------------------------
// Dropzone
// ---------------------------------------------------------------------------

export interface DropzoneOptions {
  onDrop: (acceptedFiles: File[]) => void;
  onDropRejected?: (rejections: FileRejection[]) => void;
  accept?: AcceptPattern[];
  multiple?: boolean;
  disabled?: boolean;
  noClick?: boolean;
  noDrag?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  minFileSize?: number;
  validator?: FileValidator;
}

export interface DropzoneState {
  getRootProps: (props?: Record<string, unknown>) => Record<string, unknown>;
  getInputProps: (props?: Record<string, unknown>) => Record<string, unknown>;
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
  open: () => void;
}

// ---------------------------------------------------------------------------
// Paste
// ---------------------------------------------------------------------------

export interface PasteOptions {
  onPaste: (files: File[]) => void;
  accept?: AcceptPattern[];
  enabled?: boolean;
  targetRef?: React.RefObject<Element | null>;
}

// ---------------------------------------------------------------------------
// File Preview
// ---------------------------------------------------------------------------

export interface FilePreviewOptions {
  maxWidth?: number;
  maxHeight?: number;
  enabled?: boolean;
}

export interface FilePreviewState {
  previewUrl: string | null;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// FileManager Reducer
// ---------------------------------------------------------------------------

export type FileAction<TResponse = unknown> =
  | { type: 'ADD_FILES'; payload: UploadFile<TResponse>[] }
  | { type: 'REMOVE_FILE'; payload: { id: string } }
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: UploadFileStatus } }
  | { type: 'UPDATE_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'SET_RESPONSE'; payload: { id: string; response: TResponse } }
  | { type: 'SET_ERROR'; payload: { id: string; error: Error } }
  | { type: 'INCREMENT_RETRY'; payload: { id: string } }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'CLEAR_ALL' };
