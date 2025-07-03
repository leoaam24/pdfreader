
import React, { useRef } from 'react';
import { UploadIcon, BookOpenIcon } from './icons';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="w-full max-w-lg text-center p-8 bg-stone-100 rounded-lg shadow-2xl border-4 border-stone-300">
            <BookOpenIcon className="w-20 h-20 mx-auto text-stone-500 mb-4" />
            <h1 className="text-3xl font-bold text-stone-800 mb-2">PDF Book Reader</h1>
            <p className="text-stone-600 mb-6">Upload a PDF to start reading in a beautiful book format.</p>
            <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
                disabled={isLoading}
            />
            <button
                onClick={handleButtonClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-all duration-300 transform hover:scale-105 disabled:bg-rose-400 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading PDF...
                    </>
                ) : (
                    <>
                        <UploadIcon className="w-6 h-6" />
                        Select PDF File
                    </>
                )}
            </button>
        </div>
    );
};
