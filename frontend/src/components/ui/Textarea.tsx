import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, id, className, ...props }, ref) => {
    const autoId = useId();
    const taId = id ?? autoId;
    const describedById = error ? `${taId}-error` : helperText ? `${taId}-help` : undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={taId} className="text-[12.5px] font-medium text-ink-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={taId}
          aria-invalid={!!error}
          aria-describedby={describedById}
          className={cn(
            'min-h-[96px] rounded-lg border px-3 py-2 text-sm text-ink-900 placeholder:text-ink-200',
            'focus:outline-none focus:border-brand focus:shadow-focus',
            error ? 'border-danger-accent' : 'border-line-input',
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${taId}-error`} className="text-xs text-danger-accent">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${taId}-help`} className="text-xs text-ink-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
