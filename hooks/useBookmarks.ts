
import { useState, useEffect, useCallback } from 'react';
import type { Bookmark } from '../types';

const STORAGE_KEY_PREFIX = 'pdf-bookmarks-';

export const useBookmarks = (fileName: string) => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const storageKey = fileName ? `${STORAGE_KEY_PREFIX}${fileName}` : '';

    // Effect 1: Load bookmarks from localStorage when the file (and thus storageKey) changes.
    useEffect(() => {
        if (storageKey) {
            try {
                const storedBookmarks = localStorage.getItem(storageKey);
                if (storedBookmarks) {
                    setBookmarks(JSON.parse(storedBookmarks));
                } else {
                    // If no bookmarks are stored for this file, reset the state.
                    setBookmarks([]); 
                }
            } catch (error) {
                console.error("Failed to parse bookmarks from localStorage", error);
                setBookmarks([]);
            }
        } else {
            // If there's no file, there are no bookmarks.
            setBookmarks([]);
        }
    }, [storageKey]);

    // Effect 2: Save bookmarks to localStorage whenever the bookmarks state changes.
    useEffect(() => {
        // Only save if a storageKey is present, to avoid writing an empty key.
        if (storageKey) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(bookmarks));
            } catch (error) {
                console.error("Failed to save bookmarks to localStorage", error);
            }
        }
    }, [bookmarks, storageKey]);

    const addBookmark = useCallback((page: number, name: string) => {
        const newBookmark: Bookmark = { page, name };
        setBookmarks(prevBookmarks => {
            // Prevent adding a duplicate bookmark for the same page.
            if (prevBookmarks.some(b => b.page === page)) {
                return prevBookmarks;
            }
            return [...prevBookmarks, newBookmark].sort((a, b) => a.page - b.page);
        });
    }, []); // Empty dependency array because we use a functional update.

    const removeBookmark = useCallback((pageToRemove: number) => {
        setBookmarks(prevBookmarks => 
            prevBookmarks.filter(bookmark => bookmark.page !== pageToRemove)
        );
    }, []); // Empty dependency array because we use a functional update.

    const setAllBookmarks = useCallback((newBookmarks: Bookmark[]) => {
        if (Array.isArray(newBookmarks) && newBookmarks.every(b => typeof b.name === 'string' && typeof b.page === 'number')) {
            setBookmarks(newBookmarks.sort((a, b) => a.page - b.page));
        } else {
            console.error("Invalid bookmark data provided during upload.");
            alert("The provided file contains invalid bookmark data.");
        }
    }, []);

    return { bookmarks, addBookmark, removeBookmark, setAllBookmarks };
};
