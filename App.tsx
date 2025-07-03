import React, { useState, useEffect, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Book } from './components/Book';
import { FileUpload } from './components/FileUpload';
import { BookmarkManager } from './components/BookmarkManager';
import { useBookmarks } from './hooks/useBookmarks';
import { BookOpenIcon, UploadIcon } from './components/icons';
import { OrientationLock } from './components/OrientationLock';

// pdfjs-dist is loaded from a CDN, so we declare it here to satisfy TypeScript
declare const pdfjsLib: any;

const App: React.FC = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [fileName, setFileName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBookmarkManagerOpen, setBookmarkManagerOpen] = useState(false);

    const { bookmarks, addBookmark, removeBookmark, setAllBookmarks } = useBookmarks(fileName);

    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://mozilla.github.io/pdf.js/build/pdf.worker.mjs`;
        }
    }, []);

    const handleFileChange = useCallback(async (file: File) => {
        if (!file) return;

        setIsLoading(true);
        setPdfFile(file);
        setFileName(file.name);
        setCurrentPage(1);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (e.target?.result) {
                const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
                try {
                    const doc = await pdfjsLib.getDocument({ data: typedArray }).promise;
                    setPdfDoc(doc);
                } catch (error) {
                    console.error("Error loading PDF:", error);
                    alert("Failed to load PDF file. It might be corrupted or in an unsupported format.");
                    setPdfFile(null);
                    setFileName('');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const handleGoToPage = (pageNumber: number) => {
        if (pdfDoc) {
            const newPage = Math.max(1, Math.min(pageNumber, pdfDoc.numPages));
            // Ensure the target page is always on the left for consistency
            const targetPage = newPage % 2 === 0 ? newPage - 1 : newPage;
            if (targetPage > 0) {
                 setCurrentPage(targetPage);
            } else {
                 setCurrentPage(1);
            }
        }
    };

    const handleReset = () => {
        setPdfFile(null);
        setPdfDoc(null);
        setCurrentPage(1);
        setFileName('');
        setBookmarkManagerOpen(false);
    };

    return (
        <div className="min-h-screen bg-stone-800 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] text-stone-900 font-sans flex flex-col items-center justify-center p-4 overflow-hidden">
            <OrientationLock />
            {!pdfDoc ? (
                <FileUpload onFileSelect={handleFileChange} isLoading={isLoading} />
            ) : (
                <>
                    <Book
                        pdfDoc={pdfDoc}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        onGoToPage={handleGoToPage}
                        bookmarks={bookmarks}
                        addBookmark={addBookmark}
                        removeBookmark={removeBookmark}
                    />
                    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3">
                         <button 
                            onClick={() => setBookmarkManagerOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-800/80 text-white font-semibold rounded-lg shadow-lg hover:bg-stone-900 transition-all transform hover:scale-105 backdrop-blur-sm"
                            title="View Bookmarks"
                            aria-label="View Bookmarks"
                        >
                            <BookOpenIcon className="w-5 h-5"/>
                            <span>View Bookmarks</span>
                        </button>
                        <button 
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600/90 text-white font-semibold rounded-lg shadow-lg hover:bg-rose-700 transition-all transform hover:scale-105 backdrop-blur-sm"
                            title="Load Another PDF"
                            aria-label="Load Another PDF"
                        >
                            <UploadIcon className="w-5 h-5"/>
                            <span>Load New PDF</span>
                        </button>
                    </div>

                    <BookmarkManager
                        isOpen={isBookmarkManagerOpen}
                        onClose={() => setBookmarkManagerOpen(false)}
                        bookmarks={bookmarks}
                        onGoToPage={handleGoToPage}
                        onRemoveBookmark={removeBookmark}
                        onUploadBookmarks={setAllBookmarks}
                        fileName={fileName || 'bookmarks'}
                    />
                </>
            )}
            <footer className="fixed bottom-2 left-4 text-stone-400 text-xs z-0">
                <p>PDF Book Reader</p>
            </footer>
        </div>
    );
};

export default App;