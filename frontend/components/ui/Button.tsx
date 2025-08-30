'use client';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none group relative overflow-hidden',
          {
            // Variants - Premium Modern Design
            'bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 hover:shadow-lg hover:shadow-black/5 hover:border-border/60 hover:-translate-y-0.5': variant === 'default',
            'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 active:translate-y-0 hover:scale-[1.02] active:scale-[0.98] border-0': variant === 'primary',
            'bg-violet-500 text-white hover:bg-violet-600 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-1 active:translate-y-0 font-semibold border-0': variant === 'secondary',
            'hover:bg-muted/50 text-muted-foreground hover:text-foreground hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5': variant === 'ghost',
            'border border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 backdrop-blur-sm': variant === 'outline',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/40 hover:-translate-y-1 active:translate-y-0 border-0': variant === 'destructive',
            
            // Sizes
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-5 py-2.5': size === 'default',
            'px-8 py-4 text-lg font-semibold': size === 'lg',
            'w-11 h-11': size === 'icon',
          },
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };