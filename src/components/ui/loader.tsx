'use client';

import { cn } from '@/lib/utils';

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'spinner' | 'dots' | 'pulse' | 'wave' | 'gradient';
    className?: string;
}

export function Loader({ size = 'md', variant = 'spinner', className }: LoaderProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12'
    };

    const renderLoader = () => {
        switch (variant) {
            case 'spinner':
                return (
                    <div className={cn(
                        'animate-spin rounded-full border-2 border-transparent',
                        'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500',
                        'bg-clip-border',
                        sizeClasses[size],
                        className
                    )}>
                        <div className="w-full h-full rounded-full bg-slate-900" />
                    </div>
                );

            case 'dots':
                return (
                    <div className={cn('flex space-x-1', className)}>
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={cn(
                                    'bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse',
                                    size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-4 h-4'
                                )}
                                style={{
                                    animationDelay: `${i * 0.2}s`,
                                    animationDuration: '1.4s'
                                }}
                            />
                        ))}
                    </div>
                );

            case 'pulse':
                return (
                    <div className={cn(
                        'bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse',
                        sizeClasses[size],
                        className
                    )} />
                );

            case 'wave':
                return (
                    <div className={cn('flex space-x-1', className)}>
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={cn(
                                    'bg-gradient-to-r from-blue-500 to-purple-500 rounded-full',
                                    size === 'sm' ? 'w-1 h-3' : size === 'md' ? 'w-1.5 h-4' : size === 'lg' ? 'w-2 h-6' : 'w-3 h-8'
                                )}
                                style={{
                                    animation: 'wave 1.2s ease-in-out infinite',
                                    animationDelay: `${i * 0.1}s`
                                }}
                            />
                        ))}
                    </div>
                );

            case 'gradient':
                return (
                    <div className={cn('relative', sizeClasses[size], className)}>
                        <div className={cn(
                            'absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500',
                            'animate-spin'
                        )} />
                        <div className={cn(
                            'absolute inset-1 rounded-full bg-slate-900',
                            'flex items-center justify-center'
                        )}>
                            <div className={cn(
                                'w-1/2 h-1/2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500',
                                'animate-pulse'
                            )} />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return renderLoader();
}

// Custom wave animation
const waveKeyframes = `
@keyframes wave {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}
`;

// Add the keyframes to the document if not already present
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = waveKeyframes;
    if (!document.head.querySelector('style[data-wave-keyframes]')) {
        style.setAttribute('data-wave-keyframes', 'true');
        document.head.appendChild(style);
    }
}
