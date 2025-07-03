import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Page } from './Page';
import { BookmarkIcon, ZoomInIcon, ZoomOutIcon, ArrowLeftIcon, ArrowRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, BookLayoutIcon, ScrollLayoutIcon } from './icons';
import type { Bookmark } from '../types';
import type { ViewMode } from '../App';
import type { Orientation } from '../hooks/useOrientation';

interface BookProps {
    pdfDoc: PDFDocumentProxy;
    currentPage: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    onGoToPage: (page: number) => void;
    bookmarks: Bookmark[];
    addBookmark: (page: number, name: string) => void;
    removeBookmark: (page: number) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    orientation: Orientation;
}

const renderBookmarkIconFn = (
    pageNum: number,
    bookmarks: Bookmark[],
    handleBookmarkClick: (pageNum: number) => void,
    side: 'left' | 'right',
    numPages: number
) => {
    if (pageNum <= 0 || pageNum > numPages) return null;
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
};

export const Book: React.FC<BookProps> = (props) => {
    const { pdfDoc, currentPage, setCurrentPage, viewMode, orientation, bookmarks, addBookmark, removeBookmark } = props;
    const isLandscape = orientation === 'landscape';
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (viewMode === 'scroll') {
            const pageElement = document.getElementById(`page-container-${currentPage}`);
            if (pageElement) {
                pageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            }
        }
    }, [viewMode, currentPage]);
    
    // Intersection observer for scroll mode
    useEffect(() => {
        if (viewMode === 'scroll') {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const pageNum = parseInt(entry.target.getAttribute('data-page-num') || '0', 10);
                        if (pageNum) {
                            setCurrentPage(pageNum);
                        }
                    }
                });
            }, { root: null, rootMargin: '0px', threshold: 0.4 });

            const currentRefs = pageRefs.current;
            currentRefs.forEach(ref => {
                if (ref) observer.observe(ref);
            });

            return () => {
                currentRefs.forEach(ref => {
                    if (ref) observer.unobserve(ref);
                });
            };
        }
    }, [viewMode, pdfDoc.numPages, setCurrentPage]);

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

    // In portrait, App.tsx forces viewMode to 'scroll'.
    // This logic respects that and provides a fallback.
    if (viewMode === 'scroll') {
        return <ScrollView {...props} pageRefs={pageRefs} handleBookmarkClick={handleBookmarkClick} />;
    }
    
    // Book mode is only possible in landscape.
    if (isLandscape) {
       return <BookView {...props} isLandscape={isLandscape} handleBookmarkClick={handleBookmarkClick} />;
    }

    // Fallback for portrait + book mode state, which shouldn't happen.
    return <ScrollView {...props} pageRefs={pageRefs} handleBookmarkClick={handleBookmarkClick} />;
};


// --- Scroll View Component ---
const ScrollView: React.FC<BookProps & { pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>; handleBookmarkClick: (pageNum: number) => void; }> = (props) => {
    const { pdfDoc, setViewMode, viewMode, onGoToPage, currentPage, pageRefs, orientation, bookmarks, handleBookmarkClick } = props;
    const [pageWidth, setPageWidth] = useState(window.innerWidth * 0.9);

    useEffect(() => {
        const handleResize = () => setPageWidth(window.innerWidth * 0.9);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        pageRefs.current = pageRefs.current.slice(0, pdfDoc.numPages);
     }, [pdfDoc.numPages, pageRefs]);

    const handleJumpToPage = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const input = form.elements.namedItem('page-jump-input') as HTMLInputElement;
        const pageNum = parseInt(input.value, 10);
        if (!isNaN(pageNum)) {
            onGoToPage(pageNum);
            const pageElement = document.getElementById(`page-container-${pageNum}`);
            pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            input.value = '';
            input.blur();
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-transparent" role="main">
            <div className="w-full h-full overflow-y-auto pt-20 pb-24">
                <div className="flex flex-col items-center gap-4">
                    {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map(pageNum => (
                        <div 
                            key={pageNum} 
                            id={`page-container-${pageNum}`} 
                            ref={el => { if(el) pageRefs.current[pageNum - 1] = el; }}
                            data-page-num={pageNum}
                            className="shadow-lg relative"
                            style={{ width: `${pageWidth}px` }}
                        >
                            <Page pdfDoc={pdfDoc} pageNum={pageNum} width={pageWidth} />
                            {renderBookmarkIconFn(pageNum, bookmarks, handleBookmarkClick, 'right', pdfDoc.numPages)}
                        </div>
                    ))}
                </div>
            </div>
             {/* Bottom Control Bar */}
             <div className="fixed bottom-0 left-0 right-0 w-full p-2 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center flex-wrap gap-x-2 sm:gap-x-4 gap-y-2 z-10">
                <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} orientation={orientation} />

                <span className="text-stone-300 text-sm font-semibold p-2 px-3 order-first md:order-none">
                    {`Page ${currentPage} of ${pdfDoc.numPages}`}
                </span>

                <form onSubmit={handleJumpToPage} className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                    <label htmlFor="page-jump-input-scroll" className="sr-only">Jump to page</label>
                    <input
                        id="page-jump-input-scroll"
                        name="page-jump-input"
                        type="number"
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
    );
};

// --- Book View Component ---
const BookView: React.FC<BookProps & { isLandscape: boolean; handleBookmarkClick: (pageNum: number) => void; }> = (props) => {
    const { pdfDoc, currentPage, setCurrentPage, onGoToPage, bookmarks, viewMode, setViewMode, isLandscape, orientation, handleBookmarkClick } = props;
    const [isTurning, setIsTurning] = useState(false);
    const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
    const [containerWidth, setContainerWidth] = useState(1000);
    const [zoom, setZoom] = useState(1);
    const [pageAspectRatio, setPageAspectRatio] = useState(1.414);
    const [jumpToPageInput, setJumpToPageInput] = useState('');
    
    const pageIncrement = isLandscape ? 2 : 1;

    const containerRef = useRef<HTMLDivElement>(null);
    const leftPageRef = useRef<HTMLDivElement>(null);
    const rightPageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        pdfDoc.getPage(1).then(page => {
            setPageAspectRatio(page.getViewport({ scale: 1 }).height / page.getViewport({ scale: 1 }).width);
        });
    }, [pdfDoc]);

    useEffect(() => {
        const updateSize = () => {
            const viewportHeight = window.innerHeight * 0.95; 
            const viewportWidth = window.innerWidth * 0.95;
            const bookAspectRatio = (isLandscape ? 2 : 1) / pageAspectRatio; 
            
            let newWidth = Math.min(viewportWidth, viewportHeight * bookAspectRatio);
            setContainerWidth(newWidth);
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [pageAspectRatio, isLandscape]);
    
    const page_width = isLandscape ? containerWidth / 2 : containerWidth;
    const page_height = page_width * pageAspectRatio;

    useEffect(() => {
        setZoom(1);
        if (leftPageRef.current) leftPageRef.current.scrollTop = 0;
        if (rightPageRef.current) rightPageRef.current.scrollTop = 0;
    }, [currentPage]);

    const turnPage = (dir: 'next' | 'prev') => {
        if (isTurning) return;
        const canTurnNext = (currentPage + pageIncrement -1) < pdfDoc.numPages;
        const canTurnPrev = currentPage > 1;

        if ((dir === 'next' && !canTurnNext) || (dir === 'prev' && !canTurnPrev)) return;

        setIsTurning(true);
        setDirection(dir);
    };

    const onTransitionEnd = () => {
        if (direction === 'next') {
            setCurrentPage(p => p + pageIncrement);
        } else if (direction === 'prev') {
            setCurrentPage(p => Math.max(p - pageIncrement, 1));
        }
        setIsTurning(false);
        setDirection(null);
    };
    
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

        let frontPageNum, backPageNum;
        if (direction === 'next') {
            frontPageNum = isLandscape ? currentPage + 1 : currentPage;
            backPageNum = isLandscape ? currentPage + 2 : currentPage + 1;
        } else { // prev
            frontPageNum = isLandscape ? currentPage - 2 : currentPage - 1;
            backPageNum = isLandscape ? currentPage - 1 : currentPage;
        }
        
        const flipperStyle: React.CSSProperties = {
            width: `${page_width}px`,
            height: `${page_height}px`,
            left: (direction === 'next' && isLandscape) ? '50%' : '0%',
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
    
    const leftPageNum = isTurning && direction === 'prev' ? currentPage - pageIncrement : currentPage;
    const rightPageNum = isTurning && direction === 'next' ? currentPage + pageIncrement : currentPage + 1;

    const renderBookmarkIcon = (pageNum: number, side: 'left' | 'right') => {
        return renderBookmarkIconFn(pageNum, bookmarks, handleBookmarkClick, side, pdfDoc.numPages);
    }
    
    const finalContainerWidth = isLandscape ? containerWidth + 32 : containerWidth + 16;
    const finalContainerHeight = page_height + (isLandscape ? 32 : 16);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-2 sm:p-4 bg-transparent" role="main">
            <div className="relative flex-grow flex items-center justify-center w-full">
                {isLandscape && (
                  <div className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-[60] flex-col items-center gap-4">
                      <button onClick={() => onGoToPage(1)} disabled={currentPage <= 1 || isTurning} className="p-2 bg-stone-900/50 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="First Page"><ChevronDoubleLeftIcon className="w-6 h-6" /></button>
                      <button onClick={() => turnPage('prev')} disabled={currentPage <= 1 || isTurning} className="p-3 bg-stone-900/50 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Previous Page"><ArrowLeftIcon className="w-8 h-8" /></button>
                  </div>
                )}

                <div ref={containerRef} className="relative bg-stone-800 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] p-2 md:p-4 shadow-2xl rounded-lg" style={{ width: `${finalContainerWidth}px`, height: `${finalContainerHeight}px` }}>
                    <div className="relative w-full h-full perspective-2000">
                        <div className="relative w-full h-full flex" style={{ height: `${page_height}px`, width: `${containerWidth}px` }}>
                            {/* Left/Single Page */}
                            <div ref={leftPageRef} className="h-full relative overflow-auto" style={{ width: `${page_width}px`, boxShadow: isLandscape ? 'inset -5px 0 15px -5px rgba(0,0,0,0.4)' : 'none'}}>
                                <Page pdfDoc={pdfDoc} pageNum={leftPageNum} width={page_width * zoom} />
                                {renderBookmarkIcon(leftPageNum, 'left')}
                                {currentPage > 1 && (
                                    <button onClick={() => turnPage('prev')} aria-label="Previous Page" className="absolute top-0 left-0 w-1/5 h-full z-20 group cursor-pointer bg-transparent border-none p-0">
                                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-l-md" />
                                    </button>
                                )}
                            </div>

                            {/* Right Page (Landscape only) */}
                            {isLandscape && (
                                <div ref={rightPageRef} className="w-1/2 h-full relative overflow-auto" style={{ boxShadow: 'inset 5px 0 15px -5px rgba(0,0,0,0.4)' }}>
                                    <Page pdfDoc={pdfDoc} pageNum={rightPageNum} width={page_width * zoom} />
                                    {renderBookmarkIcon(rightPageNum, 'right')}
                                    {rightPageNum < pdfDoc.numPages && (
                                        <button onClick={() => turnPage('next')} aria-label="Next Page" className="absolute top-0 right-0 w-1/5 h-full z-20 group cursor-pointer bg-transparent border-none p-0">
                                            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-r-md" />
                                        </button>
                                    )}
                                </div>
                            )}
                            
                            {isLandscape && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-full bg-gradient-to-r from-transparent via-black/30 to-transparent pointer-events-none z-10" />}
                            {renderPageTurner()}
                        </div>
                    </div>
                </div>
                
                {isLandscape && (
                  <div className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-[60] flex-col items-center gap-4">
                     <button onClick={() => turnPage('next')} disabled={currentPage + pageIncrement - 1 >= pdfDoc.numPages || isTurning} className="p-3 bg-stone-900/50 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Next Page"><ArrowRightIcon className="w-8 h-8" /></button>
                     <button onClick={() => onGoToPage(pdfDoc.numPages)} disabled={currentPage + pageIncrement -1 >= pdfDoc.numPages || isTurning} className="p-2 bg-stone-900/50 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Last Page"><ChevronDoubleRightIcon className="w-6 h-6" /></button>
                  </div>
                )}
            </div>

            {/* Bottom Control Bar */}
            <div className="w-full max-w-4xl mt-2 p-1 bg-stone-900/60 backdrop-blur-sm rounded-lg flex items-center justify-center flex-wrap gap-x-2 sm:gap-x-4 gap-y-2">
                <div className="flex items-center gap-1 text-stone-300">
                    <button onClick={() => onGoToPage(1)} disabled={currentPage <= 1 || isTurning} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30" title="First Page"><ChevronDoubleLeftIcon className="w-5 h-5" /></button>
                    <button onClick={() => turnPage('prev')} disabled={currentPage <= 1 || isTurning} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30" title="Previous Page"><ArrowLeftIcon className="w-5 h-5" /></button>
                </div>

                <span className="text-stone-300 text-sm font-semibold p-2 px-3 order-first sm:order-none">
                    {`Page ${currentPage}${isLandscape && currentPage + 1 <= pdfDoc.numPages ? ' - ' + (currentPage+1) : ''} of ${pdfDoc.numPages}`}
                </span>

                <div className="flex items-center gap-1 text-stone-300">
                     <button onClick={() => turnPage('next')} disabled={currentPage + pageIncrement -1 >= pdfDoc.numPages || isTurning} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30" title="Next Page"><ArrowRightIcon className="w-5 h-5" /></button>
                    <button onClick={() => onGoToPage(pdfDoc.numPages)} disabled={currentPage + pageIncrement - 1 >= pdfDoc.numPages || isTurning} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30" title="Last Page"><ChevronDoubleRightIcon className="w-5 h-5" /></button>
                </div>
                
                <div className="flex items-center gap-2">
                    <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} orientation={orientation} />
                    <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                        <button onClick={handleZoomOut} className="p-1 text-stone-300 hover:text-white rounded-md disabled:text-stone-500" title="Zoom Out" disabled={zoom <= 0.5}><ZoomOutIcon className="w-5 h-5"/></button>
                        <span className="text-stone-300 text-sm font-semibold w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} className="p-1 text-stone-300 hover:text-white rounded-md disabled:text-stone-500" title="Zoom In" disabled={zoom >= 3}><ZoomInIcon className="w-5 h-5"/></button>
                    </div>
                    <form onSubmit={handleJumpToPage} className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                        <label htmlFor="page-jump-input-book" className="sr-only">Jump to page</label>
                        <input
                            id="page-jump-input-book"
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

// --- View Mode Switcher Component ---
const ViewModeSwitcher: React.FC<{viewMode: ViewMode, setViewMode: (mode: ViewMode) => void, orientation: Orientation}> = ({ viewMode, setViewMode, orientation }) => {
    const isPortrait = orientation === 'portrait';
    return (
        <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
            <button
                onClick={() => setViewMode('book')}
                title={isPortrait ? "Book mode is only available in landscape" : "Book Mode"}
                className={`p-1 rounded-md ${viewMode === 'book' ? 'bg-rose-600 text-white' : 'text-stone-300 hover:bg-white/10'} ${isPortrait ? 'cursor-not-allowed opacity-50' : ''}`}
                aria-pressed={viewMode === 'book'}
                disabled={isPortrait}
            >
                <BookLayoutIcon className="w-5 h-5" />
            </button>
            <button
                onClick={() => setViewMode('scroll')}
                title="Scroll Mode"
                className={`p-1 rounded-md ${viewMode === 'scroll' ? 'bg-rose-600 text-white' : 'text-stone-300 hover:bg-white/10'}`}
                aria-pressed={viewMode === 'scroll'}
            >
                <ScrollLayoutIcon className="w-5 h-5" />
            </button>
        </div>
    );
};
