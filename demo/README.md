# react-upload-kit · demo

A small Vite + React + TypeScript app showcasing `react-upload-kit` with a
simulated backend (fake progress, occasional failures) so you can try
drag & drop, validation, concurrency, cancel, retry, and image previews.

## Run

From the repository root:

```bash
npm run demo
```

This builds the library, installs the demo's dependencies, and starts the Vite
dev server.

Alternatively, run it directly (requires the library to be built first via
`npm run build` in the root):

```bash
cd demo
npm install
npm run dev
```

The demo consumes the library as a linked dependency (`"react-upload-kit": "file:.."`),
so a production build must exist in the root `dist/` folder.

## What it demonstrates

- `useUploader` — queue, validation, `autoUpload`, concurrency, retry
- `useDropzone` — drag & drop with live accept/reject feedback
- `useFilePreview` — object-URL image thumbnails with auto cleanup
- A custom `UploadAdapter` (`src/mock-adapter.ts`) you can swap for XHR/fetch/S3
