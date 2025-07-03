import React, { useState, useRef, useEffect } from 'react';
import { HamburgerIcon, CloseIcon, BookOpenIcon, UploadIcon } from './icons';

interface HamburgerMenuProps {
  onShowBookmarks: () => void;
  onLoadNewPdf: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ onShowBookmarks, onLoadNewPdf }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => {
        setIsOpen(prev => !prev);
    };

    // Close menu if clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <>
            <button
                onClick={toggleMenu}
                className="fixed top-4 right-4 z-[80] p-2 bg-stone-800/80 text-white rounded-full shadow-lg hover:bg-stone-900 transition-all backdrop-blur-sm"
                aria-label="Open menu"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {isOpen ? <CloseIcon className="w-6 h-6" /> : <HamburgerIcon className="w-6 h-6" />}
            </button>

            {isOpen && (
                 <div className="fixed inset-0 bg-black/50 z-[70] transition-opacity" onClick={() => setIsOpen(false)} />
            )}

            <div
                ref={menuRef}
                className={`fixed top-0 right-0 h-full w-64 bg-stone-100 shadow-2xl z-[80] transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="menu-button"
            >
                <div className="p-4 flex flex-col gap-4 mt-16">
                    <button
                        onClick={() => { onShowBookmarks(); setIsOpen(false); }}
                        className="flex items-center gap-3 w-full text-left p-3 rounded-lg text-stone-700 hover:bg-stone-200 hover:text-stone-900 transition-colors"
                        role="menuitem"
                    >
                        <BookOpenIcon className="w-6 h-6" />
                        <span className="font-semibold">View Bookmarks</span>
                    </button>
                    <button
                        onClick={() => { onLoadNewPdf(); setIsOpen(false); }}
                        className="flex items-center gap-3 w-full text-left p-3 rounded-lg text-stone-700 hover:bg-stone-200 hover:text-stone-900 transition-colors"
                        role="menuitem"
                    >
                        <UploadIcon className="w-6 h-6" />
                        <span className="font-semibold">Load New PDF</span>
                    </button>
                </div>
            </div>
        </>
    );
};
