'use client';
import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'ghost';
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', variant = 'default', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={clsx(
            'flex h-10 w-full rounded-xl px-3 py-2 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            {
              // Variants
              'border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 hover:border-neutral-300 dark:hover:border-neutral-600': variant === 'default',
              'border-transparent bg-transparent focus:ring-2 focus:ring-primary-500/20': variant === 'ghost',
              
              // Error state
              'border-error-500 focus:ring-error-500/30 focus:border-error-500': error,
            },
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-error-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };