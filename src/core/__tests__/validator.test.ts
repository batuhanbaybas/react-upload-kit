import { describe, it, expect } from 'vitest';
import { validateFiles } from '../validator';
import { createMockFile } from '../../test/helpers';

describe('validateFiles', () => {
  it('accepts all files when no constraints are set', () => {
    const files = [createMockFile('a.png'), createMockFile('b.jpg')];
    const result = validateFiles(files, {});

    expect(result.accepted).toHaveLength(2);
    expect(result.rejected).toHaveLength(0);
  });

  it('rejects files exceeding maxFileSize', () => {
    const files = [createMockFile('big.png', 5000)];
    const result = validateFiles(files, { maxFileSize: 2000 });

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].errors[0].code).toBe('file-too-large');
  });

  it('rejects files below minFileSize', () => {
    const files = [createMockFile('tiny.png', 10)];
    const result = validateFiles(files, { minFileSize: 100 });

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].errors[0].code).toBe('file-too-small');
  });

  it('rejects files with invalid type based on accept patterns', () => {
    const files = [createMockFile('doc.pdf', 1024, 'application/pdf')];
    const result = validateFiles(files, { accept: ['image/*'] });

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].errors[0].code).toBe('file-invalid-type');
  });

  it('accepts files matching accept patterns', () => {
    const files = [createMockFile('photo.png', 1024, 'image/png')];
    const result = validateFiles(files, { accept: ['image/*'] });

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it('enforces maxFiles with existing file count', () => {
    const files = [
      createMockFile('a.png'),
      createMockFile('b.png'),
      createMockFile('c.png'),
    ];
    const result = validateFiles(files, { maxFiles: 3 }, 2);

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0].errors[0].code).toBe('too-many-files');
  });

  it('enforces maxFiles from zero existing files', () => {
    const files = [createMockFile('a.png'), createMockFile('b.png')];
    const result = validateFiles(files, { maxFiles: 1 });

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
  });

  it('uses custom validator', () => {
    const files = [createMockFile('bad-name.png')];
    const result = validateFiles(files, {
      validator: (file) => {
        if (file.name.startsWith('bad')) {
          return { code: 'validation-error', message: 'Bad name' };
        }
        return null;
      },
    });

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].errors[0].code).toBe('validation-error');
  });

  it('custom validator can return array of errors', () => {
    const files = [createMockFile('test.png')];
    const result = validateFiles(files, {
      validator: () => [
        { code: 'validation-error', message: 'Error 1' },
        { code: 'validation-error', message: 'Error 2' },
      ],
    });

    expect(result.rejected[0].errors).toHaveLength(2);
  });

  it('custom validator returning null accepts file', () => {
    const files = [createMockFile('good.png')];
    const result = validateFiles(files, {
      validator: () => null,
    });

    expect(result.accepted).toHaveLength(1);
  });

  it('combines multiple validation errors on single file', () => {
    const files = [createMockFile('big.txt', 5000, 'text/plain')];
    const result = validateFiles(files, {
      accept: ['image/*'],
      maxFileSize: 2000,
    });

    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].errors.length).toBeGreaterThanOrEqual(2);

    const codes = result.rejected[0].errors.map((e) => e.code);
    expect(codes).toContain('file-invalid-type');
    expect(codes).toContain('file-too-large');
  });

  it('handles empty file array', () => {
    const result = validateFiles([], { maxFileSize: 1000 });
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
  });
});
