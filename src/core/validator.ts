import type {
  AcceptPattern,
  FileError,
  FileRejection,
  FileValidator,
} from './types';
import { isFileAccepted } from './mime';

export interface ValidationConfig {
  accept?: AcceptPattern[];
  maxFileSize?: number;
  minFileSize?: number;
  maxFiles?: number;
  validator?: FileValidator;
}

/**
 * Validates a batch of files against the provided configuration.
 * Returns accepted files and rejections separately.
 *
 * `existingFileCount` is the number of files already tracked by the uploader,
 * used to enforce `maxFiles` across additions.
 */
export function validateFiles(
  files: File[],
  config: ValidationConfig,
  existingFileCount = 0,
): { accepted: File[]; rejected: FileRejection[] } {
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];

  for (const file of files) {
    const errors = validateSingleFile(file, config);

    if (
      config.maxFiles !== undefined &&
      accepted.length + existingFileCount >= config.maxFiles
    ) {
      errors.push({
        code: 'too-many-files',
        message: `Maximum ${config.maxFiles} files allowed`,
      });
    }

    if (errors.length > 0) {
      rejected.push({ file, errors });
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}

function validateSingleFile(file: File, config: ValidationConfig): FileError[] {
  const errors: FileError[] = [];

  if (!isFileAccepted(file, config.accept)) {
    errors.push({
      code: 'file-invalid-type',
      message: `File type "${file.type || 'unknown'}" is not accepted`,
    });
  }

  if (config.maxFileSize !== undefined && file.size > config.maxFileSize) {
    errors.push({
      code: 'file-too-large',
      message: `File size ${file.size} exceeds maximum ${config.maxFileSize}`,
    });
  }

  if (config.minFileSize !== undefined && file.size < config.minFileSize) {
    errors.push({
      code: 'file-too-small',
      message: `File size ${file.size} is below minimum ${config.minFileSize}`,
    });
  }

  if (config.validator) {
    const custom = config.validator(file);
    if (custom) {
      const customErrors = Array.isArray(custom) ? custom : [custom];
      errors.push(...customErrors);
    }
  }

  return errors;
}
