import { useState, useEffect } from 'react';

export type Orientation = 'landscape' | 'portrait';

export const useOrientation = (): Orientation => {
    const [orientation, setOrientation] = useState<Orientation>(
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    );

    useEffect(() => {
        const handleResize = () => {
            setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return orientation;
};
