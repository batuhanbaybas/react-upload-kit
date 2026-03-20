import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UploadTrigger } from '../upload-trigger';

describe('UploadTrigger', () => {
  it('renders children with open and inputProps context', () => {
    let capturedOpen: (() => void) | undefined;

    render(
      <UploadTrigger onSelect={vi.fn()}>
        {(ctx) => {
          capturedOpen = ctx.open;
          return (
            <div>
              <input data-testid="file-input" {...(ctx.inputProps as any)} />
              <button data-testid="trigger" onClick={ctx.open}>
                Select files
              </button>
            </div>
          );
        }}
      </UploadTrigger>,
    );

    expect(typeof capturedOpen).toBe('function');
    expect(screen.getByTestId('trigger')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  it('input has correct type and style', () => {
    render(
      <UploadTrigger onSelect={vi.fn()}>
        {(ctx) => <input data-testid="input" {...(ctx.inputProps as any)} />}
      </UploadTrigger>,
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveStyle({ display: 'none' });
  });

  it('passes accept prop to input', () => {
    render(
      <UploadTrigger onSelect={vi.fn()} accept={['.pdf', 'image/*']}>
        {(ctx) => <input data-testid="input" {...(ctx.inputProps as any)} />}
      </UploadTrigger>,
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('accept', '.pdf,image/*');
  });

  it('sets multiple attribute when multiple is true', () => {
    render(
      <UploadTrigger onSelect={vi.fn()} multiple={true}>
        {(ctx) => <input data-testid="input" {...(ctx.inputProps as any)} />}
      </UploadTrigger>,
    );

    expect(screen.getByTestId('input')).toHaveAttribute('multiple');
  });

  it('does not set multiple when false', () => {
    render(
      <UploadTrigger onSelect={vi.fn()} multiple={false}>
        {(ctx) => <input data-testid="input" {...(ctx.inputProps as any)} />}
      </UploadTrigger>,
    );

    expect(screen.getByTestId('input')).not.toHaveAttribute('multiple');
  });

  it('sets disabled attribute when disabled', () => {
    render(
      <UploadTrigger onSelect={vi.fn()} disabled={true}>
        {(ctx) => <input data-testid="input" {...(ctx.inputProps as any)} />}
      </UploadTrigger>,
    );

    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('open does not throw when disabled', () => {
    let capturedOpen: (() => void) | undefined;

    render(
      <UploadTrigger onSelect={vi.fn()} disabled={true}>
        {(ctx) => {
          capturedOpen = ctx.open;
          return <div>trigger</div>;
        }}
      </UploadTrigger>,
    );

    expect(() => capturedOpen!()).not.toThrow();
  });
});
