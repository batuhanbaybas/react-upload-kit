import type { UploadFile } from '../core/types';
import { useFilePreview } from '../hooks/use-file-preview';

export interface FileListItemContext<TResponse = unknown> {
  file: UploadFile<TResponse>;
  preview: string | null;
  isPreviewLoading: boolean;
  remove: () => void;
  retry: () => void;
  cancel: () => void;
}

export interface FileListProps<TResponse = unknown> {
  files: UploadFile<TResponse>[];
  children: (context: FileListItemContext<TResponse>) => React.ReactNode;
  onRemove?: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
  onCancel?: (fileId: string) => void;
  previewEnabled?: boolean;
  previewMaxWidth?: number;
  previewMaxHeight?: number;
}

export function FileList<TResponse = unknown>({
  files,
  children,
  onRemove,
  onRetry,
  onCancel,
  previewEnabled = true,
  previewMaxWidth,
  previewMaxHeight,
}: FileListProps<TResponse>) {
  return (
    <>
      {files.map((file) => (
        <FileListItem
          key={file.id}
          file={file}
          onRemove={onRemove}
          onRetry={onRetry}
          onCancel={onCancel}
          previewEnabled={previewEnabled}
          previewMaxWidth={previewMaxWidth}
          previewMaxHeight={previewMaxHeight}
        >
          {children}
        </FileListItem>
      ))}
    </>
  );
}

interface FileListItemProps<TResponse = unknown> {
  file: UploadFile<TResponse>;
  children: (context: FileListItemContext<TResponse>) => React.ReactNode;
  onRemove?: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
  onCancel?: (fileId: string) => void;
  previewEnabled: boolean;
  previewMaxWidth?: number;
  previewMaxHeight?: number;
}

function FileListItem<TResponse = unknown>({
  file,
  children,
  onRemove,
  onRetry,
  onCancel,
  previewEnabled,
  previewMaxWidth,
  previewMaxHeight,
}: FileListItemProps<TResponse>) {
  const isImage = file.file.type.startsWith('image/');
  const { previewUrl, isLoading: isPreviewLoading } = useFilePreview(
    file.file,
    {
      enabled: previewEnabled && isImage,
      maxWidth: previewMaxWidth,
      maxHeight: previewMaxHeight,
    },
  );

  return (
    <>
      {children({
        file,
        preview: previewUrl,
        isPreviewLoading,
        remove: () => onRemove?.(file.id),
        retry: () => onRetry?.(file.id),
        cancel: () => onCancel?.(file.id),
      })}
    </>
  );
}
