import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Dropzone } from '../dropzone';
import type { DropzoneState } from '../../core/types';

describe('Dropzone', () => {
  it('renders children with dropzone state via render prop', () => {
    const renderFn = vi.fn((state: DropzoneState) => (
      <div data-testid="zone" {...state.getRootProps()}>
        <input data-testid="input" {...(state.getInputProps() as any)} />
        <span>{state.isDragActive ? 'active' : 'idle'}</span>
      </div>
    ));

    render(
      <Dropzone onDrop={vi.fn()}>{renderFn}</Dropzone>,
    );

    expect(renderFn).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('zone')).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('passes accept option through to the hook', () => {
    render(
      <Dropzone onDrop={vi.fn()} accept={['image/*']}>
        {(state) => {
          const inputProps = state.getInputProps() as any;
          return <input data-testid="input" {...inputProps} />;
        }}
      </Dropzone>,
    );

    expect(screen.getByTestId('input')).toHaveAttribute('accept', 'image/*');
  });

  it('passes multiple option through to the hook', () => {
    render(
      <Dropzone onDrop={vi.fn()} multiple={false}>
        {(state) => {
          const inputProps = state.getInputProps() as any;
          return <input data-testid="input" {...inputProps} />;
        }}
      </Dropzone>,
    );

    expect(screen.getByTestId('input')).not.toHaveAttribute('multiple');
  });

  it('provides open function in state', () => {
    let openFn: (() => void) | undefined;

    render(
      <Dropzone onDrop={vi.fn()}>
        {(state) => {
          openFn = state.open;
          return <div>zone</div>;
        }}
      </Dropzone>,
    );

    expect(typeof openFn).toBe('function');
  });

  it('provides isDragAccept and isDragReject in state', () => {
    let capturedState: DropzoneState | undefined;

    render(
      <Dropzone onDrop={vi.fn()}>
        {(state) => {
          capturedState = state;
          return <div>zone</div>;
        }}
      </Dropzone>,
    );

    expect(capturedState!.isDragAccept).toBe(false);
    expect(capturedState!.isDragReject).toBe(false);
  });
});
