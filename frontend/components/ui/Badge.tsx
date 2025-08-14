'use client';
import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  size?: 'sm' | 'default' | 'lg';
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <div
        className={clsx(
          'inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            // Variants
            'border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300': variant === 'default',
            'border-transparent bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100': variant === 'secondary',
            'border-transparent bg-error-500 text-white': variant === 'destructive',
            'text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700': variant === 'outline',
            'border-transparent bg-success-500 text-white': variant === 'success',
            'border-transparent bg-warning-500 text-white': variant === 'warning',
            
            // Sizes
            'px-2 py-0.5 text-xs': size === 'sm',
            'px-2.5 py-0.5 text-xs': size === 'default',
            'px-3 py-1 text-sm': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };