# react-upload-kit

[![npm version](https://img.shields.io/npm/v/react-upload-kit.svg)](https://www.npmjs.com/package/react-upload-kit)
[![npm downloads](https://img.shields.io/npm/dm/react-upload-kit.svg)](https://www.npmjs.com/package/react-upload-kit)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/react-upload-kit)](https://bundlephobia.com/package/react-upload-kit)
[![license](https://img.shields.io/npm/l/react-upload-kit.svg)](https://github.com/batuhanbaybas/react-upload-kit/blob/master/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

Headless, adapter-based file upload toolkit for React. Zero dependencies. Full TypeScript support.

Most upload libraries either ship opinionated UI that fights your design system, or leave you wiring up low-level browser APIs by hand. **react-upload-kit** gives you composable hooks and renderless components that handle the hard parts -- drag & drop, validation, concurrency, retry, cancellation, previews -- while you own 100% of the UI.


## Features

| | |
|---|---|
| **Headless** | Hooks-first API, zero styling opinions. You build the UI. |
| **Adapter pattern** | Bring your own upload function -- XHR, fetch, S3 presigned, tus.io, anything that returns a Promise. |
| **Drag & drop** | Native HTML5 DnD with real-time accept/reject feedback during drag. |
| **Clipboard paste** | Paste images directly from clipboard into any target element. |
| **Validation** | File size, MIME type, count limits, and custom validator functions. |
| **Concurrency** | Configurable parallel upload queue. |
| **Retry** | Automatic retry with exponential backoff. |
| **Cancel** | Abort in-flight uploads via AbortController. |
| **Preview** | Object URL image previews with optional resize and auto memory cleanup. |
| **Components** | Optional renderless components via `react-upload-kit/components`. |
| **Tree-shakeable** | Dual CJS/ESM, `sideEffects: false`. Import only what you use. |
| **Typed** | Generic `TResponse` flows end-to-end from adapter to file state. |
| **Zero deps** | Only `react` as a peer dependency. |
| **Tested** | 127 tests across core, hooks, and components. |

## Installation

```bash
npm install react-upload-kit
```

> **Peer dependency:** React 18 or later.

## Quick Start

```tsx
import { useUploader, useDropzone } from 'react-upload-kit';

const uploadAdapter = async (file, { onProgress, signal }) => {
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => xhr.abort());

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
};

function FileUploader() {
  const uploader = useUploader({
    adapter: uploadAdapter,
    accept: ['image/*', '.pdf'],
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 5,
    autoUpload: true,
    concurrency: 3,
    maxRetries: 2,
  });

  const dropzone = useDropzone({
    onDrop: uploader.addFiles,
    accept: ['image/*', '.pdf'],
  });

  return (
    <div>
      <div {...dropzone.getRootProps()}>
        <input {...dropzone.getInputProps()} />
        {dropzone.isDragActive
          ? 'Drop files here...'
          : 'Drag & drop files, or click to select'}
      </div>

      {uploader.files.map((file) => (
        <div key={file.id}>
          <span>{file.file.name}</span>
          <span>{file.progress}%</span>
          <span>{file.status}</span>
          {file.status === 'uploading' && (
            <button onClick={() => uploader.cancelFile(file.id)}>Cancel</button>
          )}
          {file.status === 'error' && (
            <button onClick={() => uploader.retryFile(file.id)}>Retry</button>
          )}
          <button onClick={() => uploader.removeFile(file.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

## Exports

The package has two entrypoints:

```tsx
// Hooks, core utilities, and types
import { useUploader, useDropzone, usePaste, useFilePreview } from 'react-upload-kit';

// Optional renderless components
import { Dropzone, FileList, UploadTrigger } from 'react-upload-kit/components';
```

## API Reference

### `useUploader<TResponse>(options)`

The main orchestrator hook. Manages file state, validation, upload queue, and lifecycle callbacks.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `adapter` | `UploadAdapter<TResponse>` | *required* | Upload function |
| `accept` | `string[]` | -- | Accepted MIME types or extensions (`'image/*'`, `'.pdf'`) |
| `maxFileSize` | `number` | -- | Max file size in bytes |
| `minFileSize` | `number` | -- | Min file size in bytes |
| `maxFiles` | `number` | -- | Max number of files |
| `autoUpload` | `boolean` | `false` | Start upload immediately when files are added |
| `concurrency` | `number` | `3` | Max parallel uploads |
| `maxRetries` | `number` | `0` | Max retry attempts per file |
| `retryDelay` | `number` | `1000` | Base retry delay in ms (exponential backoff) |
| `validator` | `FileValidator` | -- | Custom validation function |
| `onFileAdded` | `(file) => void` | -- | Called when a file is added |
| `onFileRemoved` | `(file) => void` | -- | Called when a file is removed |
| `onUploadStart` | `(file) => void` | -- | Called when upload begins |
| `onUploadProgress` | `(file, percent) => void` | -- | Called on progress update |
| `onUploadSuccess` | `(file, response) => void` | -- | Called on successful upload |
| `onUploadError` | `(file, error) => void` | -- | Called on upload failure |
| `onAllComplete` | `() => void` | -- | Called when all uploads finish |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `files` | `UploadFile<TResponse>[]` | Current file list with state |
| `addFiles` | `(files: File[]) => void` | Add files (triggers validation) |
| `removeFile` | `(id: string) => void` | Remove a file |
| `upload` | `() => void` | Start uploading all pending files |
| `retryFile` | `(id: string) => void` | Retry a failed/cancelled file |
| `retryAll` | `() => void` | Retry all failed/cancelled files |
| `cancelFile` | `(id: string) => void` | Cancel an in-flight upload |
| `cancelAll` | `() => void` | Cancel all in-flight uploads |
| `clearCompleted` | `() => void` | Remove successfully uploaded files |
| `clearAll` | `() => void` | Cancel everything and clear |
| `isUploading` | `boolean` | Whether any file is currently uploading |
| `totalProgress` | `number` | Average progress across all files (0-100) |
| `rejections` | `FileRejection[]` | Most recent batch of rejected files |

---

### `useDropzone(options)`

Drag & drop zone hook with prop-getter pattern.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onDrop` | `(files: File[]) => void` | *required* | Called with accepted files |
| `onDropRejected` | `(rejections) => void` | -- | Called with rejected files |
| `accept` | `string[]` | -- | Accepted file types |
| `multiple` | `boolean` | `true` | Allow multiple files |
| `disabled` | `boolean` | `false` | Disable the dropzone |
| `noClick` | `boolean` | `false` | Disable click-to-select |
| `noDrag` | `boolean` | `false` | Disable drag & drop |
| `maxFiles` | `number` | -- | Max file count |
| `maxFileSize` | `number` | -- | Max file size |
| `minFileSize` | `number` | -- | Min file size |
| `validator` | `FileValidator` | -- | Custom validator |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `getRootProps` | `(props?) => props` | Spread on the container element |
| `getInputProps` | `(props?) => props` | Spread on a hidden `<input>` |
| `isDragActive` | `boolean` | Files are being dragged over |
| `isDragAccept` | `boolean` | Dragged files match accept criteria |
| `isDragReject` | `boolean` | Dragged files don't match |
| `open` | `() => void` | Programmatically open file dialog |

---

### `usePaste(options)`

Clipboard paste support.

```tsx
usePaste({
  onPaste: uploader.addFiles,
  accept: ['image/*'],
  enabled: true,
  targetRef: containerRef, // optional, defaults to document
});
```

---

### `useFilePreview(file, options?)`

Object URL preview generation with automatic cleanup.

```tsx
const { previewUrl, isLoading } = useFilePreview(uploadFile.file, {
  maxWidth: 200,
  maxHeight: 200,
  enabled: true,
});
```

Returns `{ previewUrl: string | null, isLoading: boolean }`. The URL is revoked automatically on unmount or when the file changes.

---

### Components

Optional renderless components for a declarative API. Import from `react-upload-kit/components`:

#### `<Dropzone>`

```tsx
<Dropzone onDrop={uploader.addFiles} accept={['image/*']}>
  {({ getRootProps, getInputProps, isDragActive }) => (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive ? 'Drop here!' : 'Drag & drop or click'}
    </div>
  )}
</Dropzone>
```

#### `<FileList>`

```tsx
<FileList
  files={uploader.files}
  onRemove={uploader.removeFile}
  onRetry={uploader.retryFile}
  onCancel={uploader.cancelFile}
>
  {({ file, preview, remove, retry, cancel }) => (
    <div key={file.id}>
      {preview && <img src={preview} alt={file.file.name} />}
      <span>{file.file.name}</span>
      <progress value={file.progress} max={100} />
      <button onClick={remove}>Remove</button>
      {file.status === 'error' && <button onClick={retry}>Retry</button>}
      {file.status === 'uploading' && <button onClick={cancel}>Cancel</button>}
    </div>
  )}
</FileList>
```

#### `<UploadTrigger>`

```tsx
<UploadTrigger onSelect={uploader.addFiles} accept={['image/*']}>
  {({ open, inputProps }) => (
    <>
      <button onClick={open}>Select Files</button>
      <input {...inputProps} />
    </>
  )}
</UploadTrigger>
```

---

### Upload Adapter

The adapter is a function you provide. It receives a `File` and a context object:

```typescript
type UploadAdapter<TResponse> = (
  file: File,
  context: {
    onProgress: (percent: number) => void;
    signal: AbortSignal;
  },
) => Promise<TResponse>;
```

Call `onProgress` with a 0-100 value to report progress. Respect `signal` for cancellation support.

**Minimal fetch adapter:**

```typescript
const fetchAdapter = async (file, { signal }) => {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body, signal });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
};
```

> `fetch()` does not support upload progress. Use `XMLHttpRequest` if you need it. See the [XHR adapter example](#quick-start) above.

---

## File States

```
pending -> uploading -> success
                     -> error     -> (retry) -> uploading
                     -> cancelled -> (retry) -> uploading
```

Each `UploadFile` object contains:

```typescript
interface UploadFile<TResponse> {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';
  progress: number;       // 0-100
  error: Error | null;
  response: TResponse | null;
  retryCount: number;
}
```

## Custom Validation

Return a `FileError` (or array) to reject, or `null` to accept:

```typescript
const noSpaces = (file) => {
  if (file.name.includes(' ')) {
    return { code: 'validation-error', message: 'Filename must not contain spaces' };
  }
  return null;
};

const uploader = useUploader({
  adapter: myAdapter,
  validator: noSpaces,
});
```

## Development

```bash
git clone https://github.com/batuhan/react-upload-kit.git
cd react-upload-kit
npm install
npm test
```

| Script | Description |
|--------|-------------|
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type check |
| `npm run build` | Production build (CJS + ESM + .d.ts) |
| `npm run dev` | Watch mode build |

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/my-feature`)
3. Make sure tests pass (`npm test`) and add tests for new functionality
4. Commit your changes (`git commit -m 'feat: add my feature'`)
5. Push to the branch (`git push origin feat/my-feature`)
6. Open a Pull Request

### Guidelines

- All new features and bug fixes must include tests.
- Follow the existing code style (TypeScript strict mode, no `any`).
- Keep the library headless -- no UI opinions, no CSS.
- Maintain backward compatibility unless there's a major version bump.

## License

[MIT](https://github.com/batuhanbaybas/react-upload-kit/blob/main/LICENSE)
