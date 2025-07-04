
export interface Bookmark {
  page: number;
  name: string;
}

export interface OutlineItem {
  title: string;
  dest: string | any[];
  items: OutlineItem[];
  url?: string | null;
  unsafeUrl?: string | null;
}

export type ViewMode = 'book' | 'scroll';