import { describe, it, expect } from 'vitest';
import { createUploadFile, fileReducer } from '../file-manager';
import { createMockFile } from '../../test/helpers';
import type { UploadFile } from '../types';

describe('createUploadFile', () => {
  it('creates an upload file with correct defaults', () => {
    const raw = createMockFile('photo.png');
    const uploadFile = createUploadFile(raw);

    expect(uploadFile.file).toBe(raw);
    expect(uploadFile.status).toBe('pending');
    expect(uploadFile.progress).toBe(0);
    expect(uploadFile.error).toBeNull();
    expect(uploadFile.response).toBeNull();
    expect(uploadFile.retryCount).toBe(0);
    expect(uploadFile.id).toBeDefined();
    expect(typeof uploadFile.id).toBe('string');
  });

  it('generates unique ids for different files', () => {
    const a = createUploadFile(createMockFile('a.png'));
    const b = createUploadFile(createMockFile('b.png'));
    expect(a.id).not.toBe(b.id);
  });
});

describe('fileReducer', () => {
  function makeFile(overrides: Partial<UploadFile> = {}): UploadFile {
    return {
      id: 'test-1',
      file: createMockFile(),
      status: 'pending',
      progress: 0,
      error: null,
      response: null,
      retryCount: 0,
      ...overrides,
    };
  }

  it('ADD_FILES appends files to state', () => {
    const initial: UploadFile[] = [makeFile({ id: 'existing' })];
    const newFile = makeFile({ id: 'new-1' });
    const result = fileReducer(initial, {
      type: 'ADD_FILES',
      payload: [newFile],
    });

    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('new-1');
  });

  it('REMOVE_FILE removes file by id', () => {
    const state = [makeFile({ id: 'a' }), makeFile({ id: 'b' })];
    const result = fileReducer(state, {
      type: 'REMOVE_FILE',
      payload: { id: 'a' },
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('REMOVE_FILE with non-existent id returns same-length array', () => {
    const state = [makeFile({ id: 'a' })];
    const result = fileReducer(state, {
      type: 'REMOVE_FILE',
      payload: { id: 'nonexistent' },
    });

    expect(result).toHaveLength(1);
  });

  it('UPDATE_STATUS changes status of target file', () => {
    const state = [makeFile({ id: 'a' })];
    const result = fileReducer(state, {
      type: 'UPDATE_STATUS',
      payload: { id: 'a', status: 'uploading' },
    });

    expect(result[0].status).toBe('uploading');
  });

  it('UPDATE_PROGRESS sets progress of target file', () => {
    const state = [makeFile({ id: 'a' })];
    const result = fileReducer(state, {
      type: 'UPDATE_PROGRESS',
      payload: { id: 'a', progress: 50 },
    });

    expect(result[0].progress).toBe(50);
  });

  it('SET_RESPONSE marks file as success with 100% progress', () => {
    const state = [makeFile({ id: 'a', status: 'uploading', progress: 50 })];
    const result = fileReducer(state, {
      type: 'SET_RESPONSE',
      payload: { id: 'a', response: { url: '/uploaded.png' } },
    });

    expect(result[0].status).toBe('success');
    expect(result[0].progress).toBe(100);
    expect(result[0].response).toEqual({ url: '/uploaded.png' });
    expect(result[0].error).toBeNull();
  });

  it('SET_ERROR marks file with error status', () => {
    const state = [makeFile({ id: 'a', status: 'uploading' })];
    const error = new Error('Network error');
    const result = fileReducer(state, {
      type: 'SET_ERROR',
      payload: { id: 'a', error },
    });

    expect(result[0].status).toBe('error');
    expect(result[0].error).toBe(error);
  });

  it('INCREMENT_RETRY increments retry count', () => {
    const state = [makeFile({ id: 'a', retryCount: 1 })];
    const result = fileReducer(state, {
      type: 'INCREMENT_RETRY',
      payload: { id: 'a' },
    });

    expect(result[0].retryCount).toBe(2);
  });

  it('CLEAR_COMPLETED removes only success files', () => {
    const state = [
      makeFile({ id: 'a', status: 'success' }),
      makeFile({ id: 'b', status: 'error' }),
      makeFile({ id: 'c', status: 'pending' }),
    ];
    const result = fileReducer(state, { type: 'CLEAR_COMPLETED' });

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.id)).toEqual(['b', 'c']);
  });

  it('CLEAR_ALL empties the state', () => {
    const state = [makeFile({ id: 'a' }), makeFile({ id: 'b' })];
    const result = fileReducer(state, { type: 'CLEAR_ALL' });

    expect(result).toHaveLength(0);
  });

  it('does not mutate files other than the target', () => {
    const other = makeFile({ id: 'other' });
    const state = [makeFile({ id: 'target' }), other];
    const result = fileReducer(state, {
      type: 'UPDATE_STATUS',
      payload: { id: 'target', status: 'uploading' },
    });

    expect(result[1]).toEqual(other);
  });
});
