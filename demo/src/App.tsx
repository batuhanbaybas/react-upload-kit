import { useMemo } from 'react';
import {
  useUploader,
  useDropzone,
  useFilePreview,
  type UploadFile,
} from 'react-upload-kit';
import { createMockAdapter, type MockUploadResponse } from './mock-adapter';

const ACCEPT = ['image/*', '.pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 8;

export function App() {
  // The adapter is stable across renders so the upload queue keeps working
  // on the same function instance.
  const adapter = useMemo(() => createMockAdapter({ failureRate: 0.3 }), []);

  const uploader = useUploader<MockUploadResponse>({
    adapter,
    accept: ACCEPT,
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    autoUpload: true,
    concurrency: 2,
    maxRetries: 1,
  });

  const dropzone = useDropzone({
    onDrop: uploader.addFiles,
    accept: ACCEPT,
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE,
  });

  const dropzoneClass = [
    'dropzone',
    dropzone.isDragActive && 'dropzone--active',
    dropzone.isDragReject && 'dropzone--reject',
  ]
    .filter(Boolean)
    .join(' ');

  const hasFiles = uploader.files.length > 0;

  return (
    <div className="page">
      <header className="header">
        <h1>react-upload-kit</h1>
        <p className="subtitle">
          Headless, adapter-based file upload toolkit for React. This demo uses a
          simulated backend that fakes progress and occasionally fails so you can
          try cancel &amp; retry.
        </p>
      </header>

      <main className="card">
        <div {...(dropzone.getRootProps() as React.HTMLAttributes<HTMLDivElement>)} className={dropzoneClass}>
          <input {...(dropzone.getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)} />
          <div className="dropzone__icon" aria-hidden>
            {dropzone.isDragReject ? '✕' : '↑'}
          </div>
          <p className="dropzone__title">
            {dropzone.isDragReject
              ? 'These files are not allowed'
              : dropzone.isDragActive
                ? 'Drop the files here'
                : 'Drag & drop files, or click to browse'}
          </p>
          <p className="dropzone__hint">
            Images or PDF · up to {formatBytes(MAX_FILE_SIZE)} · max {MAX_FILES} files
          </p>
        </div>

        {hasFiles && (
          <div className="toolbar">
            <div className="toolbar__progress">
              <span>Total progress</span>
              <progress value={uploader.totalProgress} max={100} />
              <strong>{uploader.totalProgress}%</strong>
            </div>
            <div className="toolbar__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={uploader.retryAll}
              >
                Retry all
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={uploader.clearCompleted}
              >
                Clear completed
              </button>
              <button
                type="button"
                className="btn btn--danger-ghost"
                onClick={uploader.clearAll}
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {uploader.rejections.length > 0 && (
          <ul className="rejections">
            {uploader.rejections.map((rejection, index) => (
              <li key={`${rejection.file.name}-${index}`} className="rejections__item">
                <strong>{rejection.file.name}</strong>
                {' — '}
                {rejection.errors.map((e) => e.message).join(', ')}
              </li>
            ))}
          </ul>
        )}

        <ul className="file-list">
          {uploader.files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              onRemove={() => uploader.removeFile(file.id)}
              onRetry={() => uploader.retryFile(file.id)}
              onCancel={() => uploader.cancelFile(file.id)}
            />
          ))}
        </ul>

        {!hasFiles && (
          <p className="empty">No files yet. Add some above to see the queue in action.</p>
        )}
      </main>

      <footer className="footer">
        <a href="https://github.com/batuhanbaybas/react-upload-kit" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <span>·</span>
        <a href="https://www.npmjs.com/package/react-upload-kit" target="_blank" rel="noreferrer">
          npm
        </a>
      </footer>
    </div>
  );
}

interface FileRowProps {
  file: UploadFile<MockUploadResponse>;
  onRemove: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

function FileRow({ file, onRemove, onRetry, onCancel }: FileRowProps) {
  const isImage = file.file.type.startsWith('image/');
  const { previewUrl } = useFilePreview(file.file, {
    enabled: isImage,
    maxWidth: 96,
    maxHeight: 96,
  });

  return (
    <li className="file">
      <div className="file__thumb" data-status={file.status}>
        {previewUrl ? (
          <img src={previewUrl} alt={file.file.name} />
        ) : (
          <span className="file__ext">{fileExtension(file.file.name)}</span>
        )}
      </div>

      <div className="file__body">
        <div className="file__top">
          <span className="file__name" title={file.file.name}>
            {file.file.name}
          </span>
          <StatusBadge status={file.status} />
        </div>

        <div className="file__meta">
          <span>{formatBytes(file.file.size)}</span>
          {file.retryCount > 0 && <span>· retried {file.retryCount}×</span>}
          {file.status === 'success' && file.response && (
            <a href={file.response.url} target="_blank" rel="noreferrer">
              view
            </a>
          )}
        </div>

        <div className="file__bar" data-status={file.status}>
          <div className="file__bar-fill" style={{ width: `${file.progress}%` }} />
        </div>

        {file.status === 'error' && file.error && (
          <p className="file__error">{file.error.message}</p>
        )}
      </div>

      <div className="file__actions">
        {file.status === 'uploading' && (
          <button type="button" className="btn btn--sm" onClick={onCancel}>
            Cancel
          </button>
        )}
        {(file.status === 'error' || file.status === 'cancelled') && (
          <button type="button" className="btn btn--sm" onClick={onRetry}>
            Retry
          </button>
        )}
        <button
          type="button"
          className="btn btn--sm btn--icon"
          onClick={onRemove}
          aria-label="Remove file"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: UploadFile['status'] }) {
  const label: Record<UploadFile['status'], string> = {
    pending: 'Pending',
    uploading: 'Uploading',
    success: 'Done',
    error: 'Failed',
    cancelled: 'Cancelled',
  };
  return <span className={`badge badge--${status}`}>{label[status]}</span>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? 'FILE' : name.slice(dot + 1).toUpperCase().slice(0, 4);
}
