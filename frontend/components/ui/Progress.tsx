'use client';
import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    variant = 'default', 
    size = 'default', 
    showLabel = false,
    ...props 
  }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    return (
      <div className="w-full space-y-2">
        {showLabel && (
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{value.toLocaleString()} / {max.toLocaleString()}</span>
            <span>{percentage.toFixed(0)}%</span>
          </div>
        )}
        <div
          className={clsx(
            'w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden',
            {
              'h-2': size === 'sm',
              'h-3': size === 'default',
              'h-4': size === 'lg',
            },
            className
          )}
          ref={ref}
          {...props}
        >
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-300 ease-out',
              {
                'bg-gradient-to-r from-brand-500 to-purple-500': variant === 'default',
                'bg-emerald-500': variant === 'success',
                'bg-amber-500': variant === 'warning',
                'bg-red-500': variant === 'danger',
              }
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };