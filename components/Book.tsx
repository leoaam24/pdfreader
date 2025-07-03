import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Page } from './Page';
import { BookmarkIcon, ZoomInIcon, ZoomOutIcon, ArrowLeftIcon, ArrowRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from './icons';
import type { Bookmark } from '../types';

interface BookProps {
    pdfDoc: PDFDocumentProxy;
    currentPage: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    onGoToPage: (page: number) => void;
    bookmarks: Bookmark[];
    addBookmark: (page: number, name: string) => void;
    removeBookmark: (page: number) => void;
}

export const Book: React.FC<BookProps> = ({ pdfDoc, currentPage, setCurrentPage, onGoToPage, bookmarks, addBookmark, removeBookmark }) => {
    const [isTurning, setIsTurning] = useState(false);
    const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
    const [containerWidth, setContainerWidth] = useState(1000);
    const [zoom, setZoom] = useState(1);
    const [pageAspectRatio, setPageAspectRatio] = useState(1.414);
    const [jumpToPageInput, setJumpToPageInput] = useState('');
    
    const containerRef = useRef<HTMLDivElement>(null);
    const leftPageRef = useRef<HTMLDivElement>(null);
    const rightPageRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (pdfDoc) {
            pdfDoc.getPage(1).then(page => {
                if (page) {
                    const viewport = page.getViewport({ scale: 1.0 });
                    setPageAspectRatio(viewport.height / viewport.width);
                }
            });
        }
    }, [pdfDoc]);

    useEffect(() => {
        const updateSize = () => {
            const viewportHeight = window.innerHeight * 0.95; 
            const viewportWidth = window.innerWidth * 0.95;
            const bookAspectRatio = 2 / pageAspectRatio; 
            
            let newWidth = viewportHeight * bookAspectRatio;
            if (newWidth > viewportWidth) {
                newWidth = viewportWidth;
            }
            setContainerWidth(newWidth);
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [pageAspectRatio]);

    const page_width = containerWidth / 2;
    const page_height = page_width * pageAspectRatio;

    useEffect(() => {
        setZoom(1);
        if (leftPageRef.current) leftPageRef.current.scrollTop = 0;
        if (rightPageRef.current) rightPageRef.current.scrollTop = 0;
    }, [currentPage]);

    const turnPage = (dir: 'next' | 'prev') => {
        if (isTurning) return;
        const canTurnNext = currentPage + 1 < pdfDoc.numPages;
        const canTurnPrev = currentPage > 1;

        if (dir === 'next' && !canTurnNext) return;
        if (dir === 'prev' && !canTurnPrev) return;

        setIsTurning(true);
        setDirection(dir);
    };

    const onTransitionEnd = () => {
        if (direction === 'next') {
            setCurrentPage(p => p + 2);
        } else if (direction === 'prev') {
            setCurrentPage(p => Math.max(p - 2, 1));
        }
        setIsTurning(false);
        setDirection(null);
    };
    
    const handleBookmarkClick = useCallback((pageNum: number) => {
        if (pageNum <= 0 || pageNum > pdfDoc.numPages) return;
        const isBookmarked = bookmarks.some(b => b.page === pageNum);

        if (isBookmarked) {
            removeBookmark(pageNum);
        } else {
            const name = prompt(`Enter a name for the bookmark on page ${pageNum}:`, `Page ${pageNum}`);
            if (name) {
                addBookmark(pageNum, name);
            }
        }
    }, [pdfDoc, bookmarks, addBookmark, removeBookmark]);

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));

    const handleJumpToPage = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(jumpToPageInput, 10);
        if (!isNaN(pageNum)) {
            onGoToPage(pageNum);
            setJumpToPageInput('');
        }
    };

    const renderPageTurner = () => {
        if (!isTurning || !direction) return null;

        const frontPageNum = direction === 'next' ? currentPage + 1 : currentPage - 2;
        const backPageNum = direction === 'next' ? currentPage + 2 : currentPage - 1;

        const flipperStyle: React.CSSProperties = {
            width: `${page_width}px`,
            height: `${page_height}px`,
            left: direction === 'next' ? '50%' : '0%',
            transform: direction === 'next' ? 'rotateY(0deg)' : 'rotateY(-180deg)',
        };
        
        const flipperClasses = `absolute top-0 z-20 transform-style-preserve-3d transition-transform duration-1000 ease-in-out ${direction === 'next' ? 'origin-left' : 'origin-right'} ${
            isTurning && direction === 'next' ? '[transform:rotateY(-180deg)]' : ''
        } ${
            isTurning && direction === 'prev' ? '[transform:rotateY(0deg)]' : ''
        }`;

        return (
            <div className={flipperClasses} style={flipperStyle} onTransitionEnd={onTransitionEnd}>
                <div className="absolute w-full h-full backface-hidden overflow-hidden">
                    <Page pdfDoc={pdfDoc} pageNum={direction === 'next' ? frontPageNum : backPageNum} width={page_width * zoom} />
                </div>
                <div className="absolute w-full h-full backface-hidden [transform:rotateY(180deg)] overflow-hidden">
                    <Page pdfDoc={pdfDoc} pageNum={direction === 'next' ? backPageNum : frontPageNum} width={page_width * zoom} />
                </div>
            </div>
        );
    };
    
    const leftPageNum = isTurning && direction === 'prev' ? currentPage - 2 : currentPage;
    const rightPageNum = isTurning && direction === 'next' ? currentPage + 2 : currentPage + 1;

    const renderBookmarkIcon = (pageNum: number, side: 'left' | 'right') => {
        if (pageNum <= 0 || pageNum > pdfDoc.numPages) return null;
        const isBookmarked = bookmarks.some(b => b.page === pageNum);
        const positionClass = side === 'left' ? 'left-4' : 'right-4';

        return (
            <button 
                onClick={() => handleBookmarkClick(pageNum)} 
                className={`absolute top-0 ${positionClass} z-30 w-8 h-12 transition-all duration-300 drop-shadow-md hover:scale-110`}
                title={isBookmarked ? `Remove bookmark from page ${pageNum}` : `Bookmark page ${pageNum}`}
            >
                <BookmarkIcon className={`w-full h-full ${isBookmarked ? 'text-rose-500 fill-rose-500/30' : 'text-stone-400 fill-stone-400/20 hover:text-rose-400'}`} />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-2 md:p-4 bg-transparent" role="main">
            {/* Main content area */}
            <div className="relative flex-grow flex items-center justify-center w-full">
                {/* Left Buttons (Desktop) */}
                <div className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-[60] flex-col items-center gap-4">
                    <button onClick={() => onGoToPage(1)} disabled={currentPage <= 1 || isTurning} className="p-2 bg-stone-900/50 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="First Page" aria-label="First Page">
                        <ChevronDoubleLeftIcon className="w-6 h-6" />
                    </button>
                    <button onClick={() => turnPage('prev')} disabled={currentPage <= 1 || isTurning} className="p-3 bg-stone-900/50 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Previous Page" aria-label="Previous Page">
                        <ArrowLeftIcon className="w-8 h-8" />
                    </button>
                </div>

                <div ref={containerRef} className="relative bg-stone-800 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] p-2 md:p-4 shadow-2xl rounded-lg" style={{ width: `${containerWidth + 16}px`, height: `${page_height + 16}px` }}>
                    <div className="relative w-full h-full perspective-2000">
                        <div className="relative w-full h-full flex" style={{ height: `${page_height}px`, width: `${containerWidth}px` }}>
                            {/* Left Page */}
                            <div ref={leftPageRef} className="w-1/2 h-full relative overflow-auto" style={{ boxShadow: 'inset -5px 0 15px -5px rgba(0,0,0,0.4)'}}>
                                <Page pdfDoc={pdfDoc} pageNum={leftPageNum} width={page_width * zoom} />
                                {renderBookmarkIcon(leftPageNum, 'left')}
                                {currentPage > 1 && (
                                    <button onClick={() => turnPage('prev')} aria-label="Previous Page" className="absolute top-0 left-0 w-1/5 h-full z-20 group cursor-pointer bg-transparent border-none p-0">
                                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-l-md" />
                                    </button>
                                )}
                            </div>

                            {/* Right Page */}
                            <div ref={rightPageRef} className="w-1/2 h-full relative overflow-auto" style={{ boxShadow: 'inset 5px 0 15px -5px rgba(0,0,0,0.4)' }}>
                                <Page pdfDoc={pdfDoc} pageNum={rightPageNum} width={page_width * zoom} />
                                {renderBookmarkIcon(rightPageNum, 'right')}
                                 {rightPageNum < pdfDoc.numPages && (
                                    <button onClick={() => turnPage('next')} aria-label="Next Page" className="absolute top-0 right-0 w-1/5 h-full z-20 group cursor-pointer bg-transparent border-none p-0">
                                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-r-md" />
                                    </button>
                                 )}
                            </div>
                            
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-full bg-gradient-to-r from-transparent via-black/30 to-transparent pointer-events-none z-10" />
                            {renderPageTurner()}
                        </div>
                    </div>
                </div>
                
                {/* Right Buttons (Desktop) */}
                <div className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-[60] flex-col items-center gap-4">
                    <button onClick={() => onGoToPage(pdfDoc.numPages)} disabled={currentPage + 1 >= pdfDoc.numPages || isTurning} className="p-2 bg-stone-900/50 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Last Page" aria-label="Last Page">
                        <ChevronDoubleRightIcon className="w-6 h-6" />
                    </button>
                    <button onClick={() => turnPage('next')} disabled={currentPage + 1 >= pdfDoc.numPages || isTurning} className="p-3 bg-stone-900/50 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Next Page" aria-label="Next Page">
                        <ArrowRightIcon className="w-8 h-8" />
                    </button>
                </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="w-full max-w-4xl mt-2 p-1 bg-stone-900/60 backdrop-blur-sm rounded-lg flex items-center justify-center flex-wrap gap-x-2 sm:gap-x-4 gap-y-2">
                {/* Mobile Nav */}
                <div className="md:hidden flex items-center gap-1 text-stone-300">
                    <button onClick={() => onGoToPage(1)} disabled={currentPage <= 1 || isTurning} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30" title="First Page"><ChevronDoubleLeftIcon className="w-5 h-5" /></button>
                    <button onClick={() => turnPage('prev')} disabled={currentPage <= 1 || isTurning} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30" title="Previous Page"><ArrowLeftIcon className="w-5 h-5" /></button>
                </div>

                <span className="text-stone-300 text-sm font-semibold p-2 px-3 order-first md:order-none">
                    {`Page ${currentPage}${currentPage + 1 <= pdfDoc.numPages ? ' - ' + (currentPage+1) : ''} of ${pdfDoc.numPages}`}
                </span>

                <div className="md:hidden flex items-center gap-1 text-stone-300">
                     <button onClick={() => turnPage('next')} disabled={currentPage + 1 >= pdfDoc.numPages || isTurning} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30" title="Next Page"><ArrowRightIcon className="w-5 h-5" /></button>
                    <button onClick={() => onGoToPage(pdfDoc.numPages)} disabled={currentPage + 1 >= pdfDoc.numPages || isTurning} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30" title="Last Page"><ChevronDoubleRightIcon className="w-5 h-5" /></button>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                        <button onClick={handleZoomOut} className="p-1 text-stone-300 hover:text-white rounded-md disabled:text-stone-500" title="Zoom Out" disabled={zoom <= 0.5}><ZoomOutIcon className="w-5 h-5"/></button>
                        <span className="text-stone-300 text-sm font-semibold w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} className="p-1 text-stone-300 hover:text-white rounded-md disabled:text-stone-500" title="Zoom In" disabled={zoom >= 3}><ZoomInIcon className="w-5 h-5"/></button>
                    </div>
                    <form onSubmit={handleJumpToPage} className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                        <label htmlFor="page-jump-input" className="sr-only">Jump to page</label>
                        <input
                            id="page-jump-input"
                            type="number"
                            value={jumpToPageInput}
                            onChange={(e) => setJumpToPageInput(e.target.value)}
                            min="1"
                            max={pdfDoc.numPages}
                            className="w-20 bg-stone-700/50 text-white text-center rounded-md p-1 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                            placeholder="Go to..."
                        />
                        <button type="submit" className="p-1 text-stone-300 hover:text-white rounded-md" aria-label="Jump to specified page">
                            <ArrowRightIcon className="w-5 h-5"/>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};