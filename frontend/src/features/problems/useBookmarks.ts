import { useEffect, useState } from "react";
import { BOOKMARKS_KEY, readBookmarks, saveBookmarks, toggleBookmarkId } from "./bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(readBookmarks);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === BOOKMARKS_KEY || event.key === null) setBookmarks(readBookmarks());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const toggleBookmark = (id: string) => {
    const next = toggleBookmarkId(bookmarks, id);
    saveBookmarks(next);
    setBookmarks(next);
  };

  return { bookmarks, toggleBookmark };
}
