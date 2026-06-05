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
          <label htmlFor={taId} className="text-sm font-medium text-gray-800">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={taId}
          aria-invalid={!!error}
          aria-describedby={describedById}
          className={cn(
            'min-h-[96px] rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            error ? 'border-red-400' : 'border-gray-300',
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${taId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${taId}-help`} className="text-xs text-gray-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
