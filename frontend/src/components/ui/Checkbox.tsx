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
      <label htmlFor={cbId} className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
        <input
          ref={ref}
          id={cbId}
          type="checkbox"
          className={cn(
            'h-4 w-4 rounded border-[#cfd4da] accent-brand',
            'focus:outline-none focus-visible:shadow-focus',
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
