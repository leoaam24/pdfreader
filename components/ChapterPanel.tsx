import React from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { OutlineItem } from '../types';
import type { ViewMode } from '../App';
import { CloseIcon, TableOfContentsIcon } from './icons';

interface ChapterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    outline: OutlineItem[];
    pdfDoc: PDFDocumentProxy | null;
    onGoToPage: (page: number) => void;
    viewMode: ViewMode;
}

const OutlineItemComponent: React.FC<{
    item: OutlineItem;
    onNavigate: (item: OutlineItem) => void;
    level: number;
}> = ({ item, onNavigate, level }) => {
    return (
        <>
            <li key={item.title}>
                <button 
                    onClick={() => onNavigate(item)}
                    className="w-full text-left p-2 rounded-md text-stone-700 hover:bg-stone-200 transition-colors disabled:text-stone-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    style={{ paddingLeft: `${1 + level * 1.5}rem` }}
                    disabled={!item.dest}
                    title={item.dest ? item.title : `${item.title} (No destination link)`}
                >
                    {item.title}
                </button>
            </li>
            {item.items && item.items.length > 0 && (
                 <ul className="list-none p-0 m-0">
                    {item.items.map((subItem) => (
                        <OutlineItemComponent
                            key={subItem.title + subItem.dest}
                            item={subItem}
                            onNavigate={onNavigate}
                            level={level + 1}
                        />
                    ))}
                </ul>
            )}
        </>
    );
};

export const ChapterPanel: React.FC<ChapterPanelProps> = ({ isOpen, onClose, outline, pdfDoc, onGoToPage, viewMode }) => {
    if (!isOpen) return null;

    const handleNavigate = async (item: OutlineItem) => {
        if (!pdfDoc || !item.dest) return;
        try {
            const dest = typeof item.dest === 'string' ? await pdfDoc.getDestination(item.dest) : item.dest;

            if (!Array.isArray(dest) || !dest[0]) {
                console.warn('Could not resolve destination:', item.dest);
                alert(`Could not find destination for "${item.title}".`);
                return;
            }

            const pageIndex = await pdfDoc.getPageIndex(dest[0]);
            const pageNumber = pageIndex + 1;
            
            onGoToPage(pageNumber);

            if (viewMode === 'scroll') {
                const pageElement = document.getElementById(`page-container-${pageNumber}`);
                if (pageElement) {
                    pageElement.dataset.userScrolled = 'true';
                }
            }
            onClose();

        } catch (error) {
            console.error('Failed to navigate to outline item:', error);
            alert(`Failed to navigate to "${item.title}". The link may be invalid.`);
        }
    };
    
    return (
        <div 
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="chapters-panel-title"
        >
            <div 
                className="relative w-full max-w-md bg-stone-100 rounded-lg shadow-2xl p-6 flex flex-col h-auto max-h-[80vh] border-2 border-stone-300"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 flex items-center justify-between mb-4">
                    <h2 id="chapters-panel-title" className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                        <TableOfContentsIcon className="w-7 h-7" />
                        Table of Contents
                    </h2>
                     <button onClick={onClose} className="p-1 text-stone-500 hover:text-stone-800 rounded-full hover:bg-stone-200" aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 -mr-4">
                    {outline && outline.length > 0 ? (
                        <ul className="space-y-1 list-none p-0 m-0">
                           {outline.map(item => (
                                <OutlineItemComponent key={item.title + item.dest} item={item} onNavigate={handleNavigate} level={0} />
                           ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-stone-500 text-center py-10">No table of contents found in this document.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
