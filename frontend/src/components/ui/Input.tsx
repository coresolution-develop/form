import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const describedById = error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-800">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedById}
          className={cn(
            'h-10 rounded-lg border px-3 text-sm text-gray-900 placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            error ? 'border-red-400' : 'border-gray-300',
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-help`} className="text-xs text-gray-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
