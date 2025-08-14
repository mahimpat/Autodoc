'use client';
import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

interface StatsProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  description?: string;
}

const Stats = forwardRef<HTMLDivElement, StatsProps>(
  ({ className, title, value, change, icon, description, ...props }, ref) => {
    return (
      <div
        className={clsx(
          'relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/65 dark:bg-white/5 backdrop-blur-xl p-6',
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {description}
              </p>
            )}
            {change && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={clsx(
                    'inline-flex items-center text-sm font-medium',
                    {
                      'text-emerald-600 dark:text-emerald-400': change.trend === 'up',
                      'text-red-600 dark:text-red-400': change.trend === 'down',
                      'text-gray-600 dark:text-gray-400': change.trend === 'neutral',
                    }
                  )}
                >
                  {change.trend === 'up' && '↗'}
                  {change.trend === 'down' && '↘'}
                  {change.trend === 'neutral' && '→'}
                  {change.value}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 ml-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                {icon}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

Stats.displayName = 'Stats';

export { Stats };