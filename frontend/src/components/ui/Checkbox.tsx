import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className, ...props }, ref) => {
    const autoId = useId();
    const cbId = id ?? autoId;
    return (
      <label htmlFor={cbId} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
        <input
          ref={ref}
          id={cbId}
          type="checkbox"
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-blue-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            className,
          )}
          {...props}
        />
        {label && <span>{label}</span>}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
