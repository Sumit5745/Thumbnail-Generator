'use client';

import { Loader } from './loader';

interface LoadingOverlayProps {
    message?: string;
    show?: boolean;
}

export function LoadingOverlay({ message = "Loading...", show = true }: LoadingOverlayProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-slate-800/90 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md mx-4 text-center">
                <div className="mb-6">
                    <Loader variant="gradient" size="xl" className="mx-auto mb-4" />
                    <div className="flex justify-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{message}</h3>
                <p className="text-slate-400 text-sm">Please wait while we prepare everything...</p>
            </div>
        </div>
    );
}
