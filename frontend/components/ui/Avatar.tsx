'use client';
import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg' | 'xl';
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'default', ...props }, ref) => {
    return (
      <div
        className={clsx(
          'relative flex shrink-0 overflow-hidden rounded-full border border-white/20 dark:border-white/10',
          {
            'w-8 h-8': size === 'sm',
            'w-10 h-10': size === 'default',
            'w-12 h-12': size === 'lg',
            'w-16 h-16': size === 'xl',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Avatar.displayName = 'Avatar';

interface AvatarImageProps extends HTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, ...props }, ref) => {
    return (
      <img
        className={clsx('aspect-square h-full w-full object-cover', className)}
        src={src}
        alt={alt}
        ref={ref}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

interface AvatarFallbackProps extends HTMLAttributes<HTMLDivElement> {
  delayMs?: number;
}

const AvatarFallback = forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, delayMs, ...props }, ref) => {
    return (
      <div
        className={clsx(
          'flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-white font-medium',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };