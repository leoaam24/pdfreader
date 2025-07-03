import React, { useState, useEffect } from 'react';
import { DeviceRotateIcon } from './icons';

export const OrientationLock: React.FC = () => {
    // Check initial orientation, but default to false on SSR or non-browser envs
    const [isPortrait, setIsPortrait] = useState(() =>
        typeof window !== 'undefined'
            ? window.matchMedia("(orientation: portrait)").matches
            : false
    );

    useEffect(() => {
        // Ensure this effect runs only in the browser
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia("(orientation: portrait)");

        const handleChange = (event: MediaQueryListEvent) => {
            setIsPortrait(event.matches);
        };

        // Use the newer addEventListener method
        mediaQuery.addEventListener('change', handleChange);

        // Cleanup function to remove the listener
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    // If the orientation is not portrait, render nothing.
    if (!isPortrait) {
        return null;
    }

    // If in portrait mode, render the overlay.
    return (
        <div className="fixed inset-0 bg-stone-900 text-white z-[100] flex flex-col items-center justify-center text-center p-8" aria-modal="true" role="dialog">
            <DeviceRotateIcon className="w-24 h-24 mb-6 text-stone-400 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2 text-stone-100">Please Rotate Your Device</h2>
            <p className="text-stone-300">This reading experience is designed for landscape mode.</p>
        </div>
    );
};