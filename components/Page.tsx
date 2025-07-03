import React, { useRef, useEffect, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

interface PageProps {
    pdfDoc: PDFDocumentProxy;
    pageNum: number;
    width: number;
}

export const Page: React.FC<PageProps> = ({ pdfDoc, pageNum, width }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<RenderTask | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setError(false);
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Handle invalid page numbers or missing width by clearing the canvas.
        if (pageNum <= 0 || pageNum > pdfDoc.numPages || !width) {
            setIsLoading(false);
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }
        
        let isEffectCancelled = false;

        pdfDoc.getPage(pageNum).then(page => {
            if (isEffectCancelled || !canvasRef.current) return;

            // Get the viewport at scale 1.0 to get original dimensions
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Calculate the scale to fit the page into the container's width
            const scale = width / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            const canvas = canvasRef.current; // Re-check canvas existence inside promise
            const context = canvas.getContext('2d');
            if (!context) return;
            
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport
            };

            // This is the key fix: cancel any render task that may still be running.
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }

            // Start the new render task and store it in the ref.
            renderTaskRef.current = page.render(renderContext);

            renderTaskRef.current.promise.then(() => {
                if (!isEffectCancelled) {
                    setIsLoading(false);
                }
                renderTaskRef.current = null; // Task is complete
            }).catch(err => {
                // A "RenderingCancelledException" is expected and should not be treated as an error.
                if (err.name !== 'RenderingCancelledException') {
                    if (!isEffectCancelled) {
                        console.error("Error rendering page:", pageNum, err);
                        setError(true);
                        setIsLoading(false);
                    }
                }
                renderTaskRef.current = null; // Task is no longer active
            });

        }).catch(err => {
             if (!isEffectCancelled) {
                console.error("Error getting page:", pageNum, err);
                setError(true);
                setIsLoading(false);
            }
        });
        
        // The cleanup function for the effect.
        return () => {
            isEffectCancelled = true;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
        };

    }, [pdfDoc, pageNum, width]);

    return (
        <div className="relative w-full h-full bg-stone-50 shadow-inner overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800"></div>
                </div>
            )}
            {error && !isLoading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-500">
                    <p>Error rendering page.</p>
                </div>
            )}
            <canvas ref={canvasRef} className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} />
        </div>
    );
};