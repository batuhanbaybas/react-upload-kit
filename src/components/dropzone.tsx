import type { DropzoneOptions, DropzoneState } from '../core/types';
import { useDropzone } from '../hooks/use-dropzone';

export interface DropzoneProps extends DropzoneOptions {
  children: (state: DropzoneState) => React.ReactNode;
}

export function Dropzone({ children, ...options }: DropzoneProps) {
  const state = useDropzone(options);
  return <>{children(state)}</>;
}
