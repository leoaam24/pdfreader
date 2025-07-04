import React, { useState, useEffect, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Book } from './components/Book';
import { FileUpload } from './components/FileUpload';
import { BookmarkManager } from './components/BookmarkManager';
import { ChapterPanel } from './components/ChapterPanel';
import { useBookmarks } from './hooks/useBookmarks';
import { BookOpenIcon, UploadIcon } from './components/icons';
import { useOrientation, type Orientation } from './hooks/useOrientation';
import { HamburgerMenu } from './components/HamburgerMenu';
import type { OutlineItem } from './types';

// pdfjs-dist is loaded from a CDN, so we declare it here to satisfy TypeScript
declare const pdfjsLib: any;

export type ViewMode = 'book' | 'scroll';

const App: React.FC = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [fileName, setFileName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBookmarkManagerOpen, setBookmarkManagerOpen] = useState(false);
    const [isChaptersPanelOpen, setChaptersPanelOpen] = useState(false);
    const [outline, setOutline] = useState<OutlineItem[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('book');
    const orientation = useOrientation();
    const isPortrait = orientation === 'portrait';

    const { bookmarks, addBookmark, removeBookmark, setAllBookmarks } = useBookmarks(fileName);

    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://mozilla.github.io/pdf.js/build/pdf.worker.mjs`;
        }
    }, []);
    
    // Force scroll view in portrait mode for better UX
    useEffect(() => {
        if (isPortrait && viewMode === 'book') {
            setViewMode('scroll');
        }
    }, [isPortrait, viewMode]);

    const handleFileChange = useCallback(async (file: File) => {
        if (!file) return;

        setIsLoading(true);
        setPdfFile(file);
        setFileName(file.name);
        setCurrentPage(1);
        setOutline([]);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (e.target?.result) {
                const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
                try {
                    const doc = await pdfjsLib.getDocument({ data: typedArray }).promise;
                    setPdfDoc(doc);
                    const outlineData = await doc.getOutline();
                    setOutline(outlineData || []);
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
            if (viewMode === 'book' && !isPortrait) {
                 // In book mode, ensure the target page is on the left for consistency in landscape
                const isLandscape = window.innerWidth > window.innerHeight;
                const targetPage = isLandscape && newPage % 2 === 0 ? newPage - 1 : newPage;
                setCurrentPage(targetPage > 0 ? targetPage : 1);
            } else {
                // In scroll mode, just set the page
                setCurrentPage(newPage);
            }
        }
    };

    const handleReset = () => {
        setPdfFile(null);
        setPdfDoc(null);
        setCurrentPage(1);
        setFileName('');
        setBookmarkManagerOpen(false);
        setChaptersPanelOpen(false);
        setOutline([]);
    };

    return (
        <div className="min-h-screen bg-stone-800 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] text-stone-900 font-sans flex flex-col items-center justify-center p-0 overflow-hidden">
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
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        orientation={orientation}
                        outline={outline}
                        onShowChapters={() => setChaptersPanelOpen(true)}
                    />

                    {isPortrait ? (
                        <HamburgerMenu 
                            onShowBookmarks={() => setBookmarkManagerOpen(true)}
                            onLoadNewPdf={handleReset}
                            onShowChapters={() => setChaptersPanelOpen(true)}
                            hasChapters={outline.length > 0}
                        />
                    ) : (
                        <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3">
                             <button 
                                onClick={() => setBookmarkManagerOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-stone-800/80 text-white font-semibold rounded-lg shadow-lg hover:bg-stone-900 transition-all transform hover:scale-105 backdrop-blur-sm"
                                title="View Bookmarks"
                                aria-label="View Bookmarks"
                            >
                                <BookOpenIcon className="w-5 h-5"/>
                                <span className="hidden sm:inline">View Bookmarks</span>
                            </button>
                            <button 
                                onClick={handleReset}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-600/90 text-white font-semibold rounded-lg shadow-lg hover:bg-rose-700 transition-all transform hover:scale-105 backdrop-blur-sm"
                                title="Load Another PDF"
                                aria-label="Load Another PDF"
                            >
                                <UploadIcon className="w-5 h-5"/>
                                <span className="hidden sm:inline">Load New PDF</span>
                            </button>
                        </div>
                    )}


                    <BookmarkManager
                        isOpen={isBookmarkManagerOpen}
                        onClose={() => setBookmarkManagerOpen(false)}
                        bookmarks={bookmarks}
                        onGoToPage={handleGoToPage}
                        onRemoveBookmark={removeBookmark}
                        onUploadBookmarks={setAllBookmarks}
                        fileName={fileName || 'bookmarks'}
                        viewMode={viewMode}
                    />

                    <ChapterPanel
                        isOpen={isChaptersPanelOpen}
                        onClose={() => setChaptersPanelOpen(false)}
                        outline={outline}
                        pdfDoc={pdfDoc}
                        onGoToPage={handleGoToPage}
                        viewMode={viewMode}
                    />
                </>
            )}
            <footer className="fixed bottom-2 left-4 text-stone-400 text-xs z-0 hidden sm:block">
                <p>PDF Book Reader</p>
            </footer>
        </div>
    );
};

export default App;