import React, { useRef } from 'react';
import type { Bookmark } from '../types';
import type { ViewMode } from '../App';
import { BookmarkIcon, TrashIcon, CloseIcon, DownloadIcon, FileImportIcon } from './icons';

interface BookmarkManagerProps {
    isOpen: boolean;
    onClose: () => void;
    bookmarks: Bookmark[];
    onGoToPage: (page: number) => void;
    onRemoveBookmark: (page: number) => void;
    onUploadBookmarks: (bookmarks: Bookmark[]) => void;
    fileName: string;
    viewMode: ViewMode;
}

export const BookmarkManager: React.FC<BookmarkManagerProps> = ({
    isOpen,
    onClose,
    bookmarks,
    onGoToPage,
    onRemoveBookmark,
    onUploadBookmarks,
    fileName,
    viewMode,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleGoTo = (page: number) => {
        onGoToPage(page);
        if (viewMode === 'scroll') {
            const pageElement = document.getElementById(`page-container-${page}`);
            if (pageElement) {
                pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        onClose();
    };
    
    const handleDownload = () => {
        const fileContent = JSON.stringify(bookmarks, null, 2);
        const blob = new Blob([fileContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName.replace('.pdf', '')}_bookmarks.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const newBookmarks = JSON.parse(content);

                if (Array.isArray(newBookmarks) && newBookmarks.every(b => 'page' in b && 'name' in b && typeof b.page === 'number' && typeof b.name === 'string')) {
                    onUploadBookmarks(newBookmarks);
                    alert(`${newBookmarks.length} bookmarks loaded successfully!`);
                    onClose();
                } else {
                    throw new Error("Invalid bookmark file format.");
                }
            } catch (error) {
                console.error("Failed to load bookmarks:", error);
                alert("Failed to load bookmarks. Please ensure it's a valid JSON file with the correct format.");
            }
        };
        reader.readAsText(file);

        if(event.target) {
            event.target.value = '';
        }
    };


    return (
        <div 
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bookmark-manager-title"
        >
            <div 
                className="relative w-full max-w-md bg-stone-100 rounded-lg shadow-2xl p-6 flex flex-col h-auto max-h-[80vh] border-2 border-stone-300"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div className="flex-shrink-0 flex items-center justify-between mb-4">
                    <h2 id="bookmark-manager-title" className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                        <BookmarkIcon className="w-7 h-7" />
                        Bookmarks
                    </h2>
                     <button onClick={onClose} className="p-1 text-stone-500 hover:text-stone-800 rounded-full hover:bg-stone-200" aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 -mr-4 mb-4">
                    {bookmarks.length === 0 ? (
                        <p className="text-sm text-stone-500 text-center py-10">No bookmarks yet. Click the ribbon on a page to add one!</p>
                    ) : (
                        <ul className="space-y-2">
                            {bookmarks.map((bookmark) => (
                                <li key={bookmark.page} className="group flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm hover:bg-white hover:shadow-md transition-all">
                                    <button onClick={() => handleGoTo(bookmark.page)} className="text-left flex-grow">
                                        <span className="font-semibold text-stone-800">{bookmark.name}</span>
                                        <span className="block text-xs text-stone-600">Page {bookmark.page}</span>
                                    </button>
                                    <button onClick={() => onRemoveBookmark(bookmark.page)} className="ml-2 p-1.5 text-stone-400 hover:text-red-600 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all" aria-label={`Remove bookmark for page ${bookmark.page}`}>
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                <div className="flex-shrink-0 mt-auto border-t pt-4 flex flex-col sm:flex-row gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json,application/json"
                        className="hidden"
                    />
                    <button
                        onClick={handleUploadClick}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-600 text-white font-bold rounded-lg hover:bg-stone-700 transition-all duration-300 transform hover:scale-105"
                        title="Load bookmarks from a .json file"
                    >
                        <FileImportIcon className="w-5 h-5" />
                        Upload Bookmarks
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={bookmarks.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-all duration-300 transform hover:scale-105 disabled:bg-rose-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        title={bookmarks.length > 0 ? "Save bookmarks to a .json file" : "Add bookmarks to enable download"}
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download Bookmarks
                    </button>
                </div>
            </div>
        </div>
    );
};