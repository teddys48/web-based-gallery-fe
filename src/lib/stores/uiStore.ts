import { writable, derived } from "svelte/store";
import type { Photo } from "../types/photo";

// Theme store
export type Theme = "dark" | "light" | "system";

function createThemeStore() {
  const initialTheme: Theme =
    (typeof localStorage !== "undefined" &&
      (localStorage.getItem("theme") as Theme)) ||
    "dark";
  const { subscribe, set, update } = writable<Theme>(initialTheme);

  return {
    subscribe,
    setTheme: (theme: Theme) => {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", theme);
      }
      if (
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      set(theme);
    },
    toggle: () => {
      update((current) => {
        const next = current === "dark" ? "light" : "dark";
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("theme", next);
        }
        if (next === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        return next;
      });
    },
  };
}

export const themeStore = createThemeStore();

// View navigation store
export type ViewMode = "timeline" | "folder";
export const activeViewStore = writable<ViewMode>("timeline");

// Folder navigation state (Default to empty string '' for Root folder)
export const selectedFolderPathStore = writable<string>("");

// Timeline / Date filter state
export interface BucketFilter {
  year?: number;
  month?: number;
  date?: string;
  start_date?: string;
  end_date?: string;
  media_type?: string;
  expected_count?: number;
}
export const activeBucketFilterStore = writable<BucketFilter | null>(null);

// Mobile sidebar open state
export const mobileSidebarOpenStore = writable<boolean>(false);

// Lightbox state
export interface LightboxState {
  isOpen: boolean;
  photos: Photo[];
  currentIndex: number;
  showMetadata: boolean;
}

const initialLightboxState: LightboxState = {
  isOpen: false,
  photos: [],
  currentIndex: 0,
  showMetadata: false,
};

function createLightboxStore() {
  const { subscribe, set, update } =
    writable<LightboxState>(initialLightboxState);

  return {
    subscribe,
    open: (photos: Photo[], index: number) => {
      set({
        isOpen: true,
        photos,
        currentIndex: Math.max(0, Math.min(index, photos.length - 1)),
        showMetadata: false,
      });
    },
    close: () => {
      update((s) => ({ ...s, isOpen: false }));
    },
    next: () => {
      update((s) => {
        if (!s.isOpen || s.photos.length === 0) return s;
        const nextIndex = (s.currentIndex + 1) % s.photos.length;
        return { ...s, currentIndex: nextIndex };
      });
    },
    prev: () => {
      update((s) => {
        if (!s.isOpen || s.photos.length === 0) return s;
        const prevIndex =
          (s.currentIndex - 1 + s.photos.length) % s.photos.length;
        return { ...s, currentIndex: prevIndex };
      });
    },
    setIndex: (index: number) => {
      update((s) => ({
        ...s,
        currentIndex: Math.max(0, Math.min(index, s.photos.length - 1)),
      }));
    },
    toggleMetadata: () => {
      update((s) => ({ ...s, showMetadata: !s.showMetadata }));
    },
  };
}

export const lightboxStore = createLightboxStore();

// Derived current photo
export const currentLightboxPhoto = derived(lightboxStore, ($l) => {
  if (!$l.isOpen || $l.photos.length === 0) return null;
  return $l.photos[$l.currentIndex] || null;
});
