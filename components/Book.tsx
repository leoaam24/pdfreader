
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Page } from './Page';
import { BookmarkIcon, ZoomInIcon, ZoomOutIcon, ArrowLeftIcon, ArrowRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, BookLayoutIcon, ScrollLayoutIcon, TableOfContentsIcon } from './icons';
import type { Bookmark, OutlineItem } from '../types';
import type { ViewMode } from '../types';
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
    outline: OutlineItem[];
    onShowChapters: () => void;
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

    useEffect(() => {
        if (viewMode === 'scroll') {
            const pageElement = document.getElementById(`page-container-${currentPage}`);
            if (pageElement) {
                // Smooth scroll for user-initiated jumps, auto for initial loads
                const isUserJump = pageElement.dataset.userScrolled === 'true';
                pageElement.scrollIntoView({ 
                    behavior: isUserJump ? 'smooth' : 'auto', 
                    block: 'start' 
                });
                if (isUserJump) {
                    delete pageElement.dataset.userScrolled;
                }
            }
        }
    }, [viewMode, currentPage]);

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
    if (viewMode === 'scroll' || !isLandscape) {
        return <ScrollView {...props} handleBookmarkClick={handleBookmarkClick} />;
    }
    
    // Book mode is only possible in landscape.
    return <BookView {...props} isLandscape={isLandscape} handleBookmarkClick={handleBookmarkClick} />;
};


// --- Scroll View Component ---
const ScrollView: React.FC<BookProps & { handleBookmarkClick: (pageNum: number) => void; }> = (props) => {
    const { pdfDoc, setViewMode, viewMode, onGoToPage, currentPage, orientation, bookmarks, handleBookmarkClick, setCurrentPage, outline, onShowChapters } = props;
    
    const [pageWidth, setPageWidth] = useState(0);
    const [pageAspectRatio, setPageAspectRatio] = useState(1.414); // A4-like default

    // Virtualization state: stores page numbers that should be rendered.
    const [visiblePages, setVisiblePages] = useState<Set<number>>(() => new Set([1,2])); // Always show first two pages
    const observer = useRef<IntersectionObserver | null>(null);

    // Get page aspect ratio from the PDF for accurate placeholder heights
    useEffect(() => {
        let isCancelled = false;
        pdfDoc.getPage(1).then(page => {
            if (isCancelled) return;
            const viewport = page.getViewport({ scale: 1 });
            setPageAspectRatio(viewport.height / viewport.width);
        }).catch(err => {
            if (!isCancelled) {
                console.error("Could not get page 1 for aspect ratio", err);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [pdfDoc]);

    // Update page width on resize
    useEffect(() => {
        const handleResize = () => {
            // Use clientWidth for a more reliable measurement that excludes scrollbar width
            // and provides a more stable value during orientation changes.
            setPageWidth(document.documentElement.clientWidth * 0.9);
        };
        
        handleResize(); // Set initial size correctly on mount.
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty array ensures this runs only on mount and unmount.


    const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
        entries.forEach(entry => {
            const pageNum = parseInt(entry.target.getAttribute('data-page-num') || '0', 10);
            if (!pageNum) return;

            if (entry.isIntersecting) {
                setVisiblePages(prev => new Set(prev).add(pageNum)); // Render page
                if (entry.intersectionRatio > 0.4) {
                    setCurrentPage(pageNum); // Update current page number
                }
            }
        });
    }, [setCurrentPage]);

    // Setup the Intersection Observer
    useEffect(() => {
        observer.current = new IntersectionObserver(observerCallback, {
            root: null, // observe against the viewport
            rootMargin: '500px', // pre-load pages that are 500px away from the viewport
            threshold: [0, 0.4] // trigger when element enters view and when it's 40% visible
        });
        return () => observer.current?.disconnect();
    }, [observerCallback]);

    // A stable callback ref to attach the observer to each page's container
    const pageContainerRef = useCallback((node: HTMLDivElement | null) => {
        if (node) observer.current?.observe(node);
    }, []);

    const handleJumpToPage = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const input = form.elements.namedItem('page-jump-input') as HTMLInputElement;
        const pageNum = parseInt(input.value, 10);
        if (!isNaN(pageNum)) {
            const pageElement = document.getElementById(`page-container-${pageNum}`);
            if (pageElement) {
                // Mark element so the main effect knows to use 'smooth' scrolling
                pageElement.dataset.userScrolled = 'true';
            }
            onGoToPage(pageNum);
            input.value = '';
            input.blur();
        }
    };
    
    const pageHeight = pageWidth * pageAspectRatio;
    
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center bg-transparent" role="main">
            <div className="w-full h-full overflow-y-auto pt-20 pb-24">
                <div className="flex flex-col items-center gap-4">
                    {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map(pageNum => (
                        <div 
                            key={pageNum} 
                            id={`page-container-${pageNum}`} 
                            ref={pageContainerRef}
                            data-page-num={pageNum}
                            className="shadow-lg relative bg-stone-200"
                            style={{ width: `${pageWidth}px`, height: `${pageHeight}px` }}
                        >
                            {visiblePages.has(pageNum) && pageWidth > 0 ? (
                                <>
                                    <Page pdfDoc={pdfDoc} pageNum={pageNum} width={pageWidth} />
                                    {renderBookmarkIconFn(pageNum, bookmarks, handleBookmarkClick, 'right', pdfDoc.numPages)}
                                </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-400"></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
             {/* Bottom Control Bar */}
             <div className="fixed bottom-4 left-1/2 -translate-x-1/2 p-2 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center flex-wrap gap-x-2 sm:gap-x-4 gap-y-2 z-10 rounded-xl shadow-lg">
                <ViewModeControl {...props} />

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
    const { pdfDoc, currentPage, setCurrentPage, onGoToPage, bookmarks, viewMode, setViewMode, isLandscape, orientation, handleBookmarkClick, outline, onShowChapters } = props;
    const [isTurning, setIsTurning] = useState(false);
    const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
    const [containerWidth, setContainerWidth] = useState(1000);
    const [pageHeight, setPageHeight] = useState(700);
    const [zoom, setZoom] = useState(1);
    const [pageAspectRatio, setPageAspectRatio] = useState(1.414);
    const [jumpToPageInput, setJumpToPageInput] = useState('');
    const [startAnimation, setStartAnimation] = useState(false);
    
    const pageIncrement = 2; // BookView is always landscape

    const containerRef = useRef<HTMLDivElement>(null);
    const leftPageRef = useRef<HTMLDivElement>(null);
    const rightPageRef = useRef<HTMLDivElement>(null);
    const bottomControlsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        pdfDoc.getPage(1).then(page => {
            setPageAspectRatio(page.getViewport({ scale: 1 }).height / page.getViewport({ scale: 1 }).width);
        });
    }, [pdfDoc]);

    useEffect(() => {
        const updateSize = () => {
            // Define available space for the book container.
            const verticalPadding = 32; // Corresponds to p-4 on the main container.
            const controlsHeight = bottomControlsRef.current?.offsetHeight || 60;
            const availableHeight = window.innerHeight - verticalPadding - controlsHeight;
            const availableWidth = window.innerWidth;
            const targetWidthPercentage = 0.9;

            // Calculate width based on viewport width constraint.
            const widthIfLimitedByWidth = availableWidth * targetWidthPercentage;
            // Calculate width based on viewport height constraint.
            const widthIfLimitedByHeight = availableHeight * (2 / pageAspectRatio);

            // The final width is the smaller of the two, ensuring the book fits both vertically and horizontally.
            const newWidth = Math.min(widthIfLimitedByWidth, widthIfLimitedByHeight);
            
            setContainerWidth(newWidth);
            // The page height is derived from the final calculated width and the page's aspect ratio.
            setPageHeight((newWidth / 2) * pageAspectRatio);
        };

        // Run calculation once after a short delay to allow controls to render for accurate height.
        const timeoutId = setTimeout(updateSize, 50);
        window.addEventListener('resize', updateSize);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updateSize);
        };
    }, [pageAspectRatio]);
    
    const page_width = containerWidth / 2;

    useEffect(() => {
        setZoom(1);
        if (leftPageRef.current) leftPageRef.current.scrollTop = 0;
        if (rightPageRef.current) rightPageRef.current.scrollTop = 0;
    }, [currentPage, containerWidth]);

    const turnPage = (dir: 'next' | 'prev') => {
        if (isTurning) return;
        const canTurnNext = (currentPage + pageIncrement -1) < pdfDoc.numPages;
        const canTurnPrev = currentPage > 1;

        if ((dir === 'next' && !canTurnNext) || (dir === 'prev' && !canTurnPrev)) return;

        setIsTurning(true);
        setDirection(dir);
    };

    useEffect(() => {
        if (isTurning) {
            // Use a minimal timeout to allow React to render the element in its "from" state
            // before we apply the "to" state to trigger the CSS transition.
            const id = setTimeout(() => setStartAnimation(true), 10);
            return () => clearTimeout(id);
        } else {
            setStartAnimation(false);
        }
    }, [isTurning]);

    const onAnimationEnd = () => {
        if (!isTurning) return; // Prevent handler from firing on initial render or other transitions

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
    
    const renderScannerAnimation = () => {
        if (!isTurning) return null;

        const style: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            height: '100%',
            width: '1px',
            backgroundColor: 'black',
            filter: 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.7))',
            transition: 'left 1s ease-in-out',
            zIndex: 30,
            left: startAnimation 
                ? (direction === 'next' ? '0%' : '100%') 
                : (direction === 'next' ? '100%' : '0%')
        };

        return <div style={style} onTransitionEnd={onAnimationEnd} />;
    };
    
    const leftPageNum = currentPage;
    const rightPageNum = currentPage + 1;

    const renderBookmarkIcon = (pageNum: number, side: 'left' | 'right') => {
        return renderBookmarkIconFn(pageNum, bookmarks, handleBookmarkClick, side, pdfDoc.numPages);
    }
    
    const finalContainerWidth = containerWidth + 32;
    const finalContainerHeight = pageHeight + 32;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4" role="main">
            <div className="flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center w-full">
                    <div className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-[60] flex-col items-center gap-4">
                          <button onClick={() => onGoToPage(1)} disabled={currentPage <= 1 || isTurning} className="p-1.5 bg-stone-900/40 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="First Page"><ChevronDoubleLeftIcon className="w-5 h-5" /></button>
                          <button onClick={() => turnPage('prev')} disabled={currentPage <= 1 || isTurning} className="p-2 bg-stone-900/40 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Previous Page"><ArrowLeftIcon className="w-7 h-7" /></button>
                    </div>

                    <div ref={containerRef} className="relative bg-stone-800 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] p-4 shadow-2xl rounded-lg" style={{ width: `${finalContainerWidth}px`, height: `${finalContainerHeight}px` }}>
                        <div className="relative w-full h-full">
                            <div className="relative w-full h-full flex" style={{ height: `${pageHeight}px`, width: `${containerWidth}px` }}>
                                {/* Left Page */}
                                <div ref={leftPageRef} className="h-full relative overflow-auto w-1/2" style={{boxShadow: 'inset -5px 0 15px -5px rgba(0,0,0,0.4)'}}>
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
                                {renderScannerAnimation()}
                            </div>
                        </div>
                    </div>
                    
                    <div className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-[60] flex-col items-center gap-4">
                         <button onClick={() => turnPage('next')} disabled={currentPage + pageIncrement - 1 >= pdfDoc.numPages || isTurning} className="p-2 bg-stone-900/40 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Next Page"><ArrowRightIcon className="w-7 h-7" /></button>
                         <button onClick={() => onGoToPage(pdfDoc.numPages)} disabled={currentPage + pageIncrement -1 >= pdfDoc.numPages || isTurning} className="p-1.5 bg-stone-900/40 backdrop-blur-sm rounded-full text-stone-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Last Page"><ChevronDoubleRightIcon className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Bottom Control Bar */}
                <div ref={bottomControlsRef} className="w-full max-w-4xl p-1 bg-stone-900/60 backdrop-blur-sm rounded-lg flex items-center justify-center flex-wrap gap-x-2 sm:gap-x-4 gap-y-2">
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
                        <ViewModeControl {...props} />
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
        </div>
    );
};

interface ViewModeControlProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    orientation: Orientation;
    outline: OutlineItem[];
    onShowChapters: () => void;
}

// --- View Mode and Chapters Control ---
const ViewModeControl: React.FC<ViewModeControlProps> = ({ viewMode, setViewMode, orientation, outline, onShowChapters }) => {
    const isPortrait = orientation === 'portrait';
    const hasChapters = outline && outline.length > 0;

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
            {hasChapters && (
                <>
                    <div className="h-4 w-px bg-stone-600 mx-1"></div>
                    <button
                        onClick={onShowChapters}
                        title="Table of Contents"
                        className="p-1 rounded-md text-stone-300 hover:text-white"
                        aria-label="Show table of contents"
                    >
                        <TableOfContentsIcon className="w-5 h-5" />
                    </button>
                </>
            )}
        </div>
    );
};
