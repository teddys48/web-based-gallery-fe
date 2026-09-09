import type { Photo, TimelineBucket, FolderNode, ScanStatus, PaginatedResponse, FolderContentsResponse, SubFolderNode, FolderDateGroup } from '../types/photo';
import { MOCK_PHOTOS_LIST, MOCK_TIMELINE_BUCKETS, MOCK_FOLDER_TREE, getMockPaginatedPhotos, SAMPLE_FALLBACK_IMAGES } from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

let isBackendAvailable = true;

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (FORCE_MOCK || !isBackendAvailable) {
    throw new Error('Using mock fallback');
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[API Client] Endpoint ${endpoint} failed, switching to mock fallback...`, err);
    isBackendAvailable = false;
    throw err;
  }
}

export function getThumbnailUrl(photo: Photo): string {
  if (!photo) return SAMPLE_FALLBACK_IMAGES[0];
  if (photo.thumbnail_path && photo.thumbnail_path.startsWith('http')) {
    return photo.thumbnail_path;
  }
  if (isBackendAvailable && photo.id) {
    return `${BASE_URL}/api/v1/photos/${photo.id}/thumbnail`;
  }
  const idx = Math.abs(photo.id || 1) % SAMPLE_FALLBACK_IMAGES.length;
  return SAMPLE_FALLBACK_IMAGES[idx];
}

export function getRawImageUrl(photo: Photo): string {
  if (!photo) return SAMPLE_FALLBACK_IMAGES[0];
  if (photo.thumbnail_path && photo.thumbnail_path.startsWith('http')) {
    return photo.thumbnail_path;
  }
  if (isBackendAvailable && photo.id) {
    return `${BASE_URL}/api/v1/photos/${photo.id}/raw`;
  }
  const idx = Math.abs(photo.id || 1) % SAMPLE_FALLBACK_IMAGES.length;
  return SAMPLE_FALLBACK_IMAGES[idx];
}

export function getFolderThumbnailUrl(folder: FolderNode | SubFolderNode): string {
  if (!folder) return SAMPLE_FALLBACK_IMAGES[0];
  if (folder.thumbnail_path && folder.thumbnail_path.startsWith('http')) {
    return folder.thumbnail_path;
  }
  if (folder.cover_photo_id && isBackendAvailable) {
    return `${BASE_URL}/api/v1/photos/${folder.cover_photo_id}/thumbnail`;
  }
  let hash = 0;
  const p = folder.path || folder.name || 'folder';
  for (let i = 0; i < p.length; i++) {
    hash = (hash << 5) - hash + p.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % SAMPLE_FALLBACK_IMAGES.length;
  return SAMPLE_FALLBACK_IMAGES[idx];
}

const VIDEO_EXTENSIONS_REGEX = /\.(mp4|mkv|mov|avi|webm|m4v|flv|3gp|ts|wmv)$/i;

export function isVideoMedia(photo: Photo | null | undefined): boolean {
  if (!photo) return false;
  if (photo.media_type === 'video') return true;
  if (photo.media_type === 'image') return false;
  if (photo.mime_type?.startsWith('video/')) return true;
  if (photo.file_name && VIDEO_EXTENSIONS_REGEX.test(photo.file_name)) return true;
  if (photo.file_path && VIDEO_EXTENSIONS_REGEX.test(photo.file_path)) return true;
  return false;
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) {
    return '';
  }
  const totalSec = Math.round(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper to normalize Go Fiber API responses ({ success: true, data: [...], pagination: { ... } })
export function normalizePaginatedPhotos(res: any, defaultPage = 1, defaultLimit = 50): PaginatedResponse<Photo> {
  if (!res) {
    return getMockPaginatedPhotos([], defaultPage, defaultLimit);
  }

  if (typeof res === 'object' && Array.isArray(res.data)) {
    const pag = res.pagination || {};
    const page = pag.page || defaultPage;
    const limit = pag.limit || defaultLimit;
    const total = pag.total_items ?? res.data.length;
    const total_pages = pag.total_pages ?? Math.ceil(total / limit);

    return {
      items: res.data,
      page,
      limit,
      total,
      total_pages,
      has_next: pag.has_next ?? (page < total_pages),
      has_prev: pag.has_prev ?? (page > 1)
    };
  }

  if (Array.isArray(res.items)) {
    return res;
  }

  if (Array.isArray(res)) {
    return {
      items: res,
      page: defaultPage,
      limit: defaultLimit,
      total: res.length,
      total_pages: 1,
      has_next: false,
      has_prev: false
    };
  }

  return { items: [], page: defaultPage, limit: defaultLimit, total: 0, total_pages: 1, has_next: false, has_prev: false };
}

// Helper to normalize tree nodes without duplicate redundant paths and preserve thumbnail_path & cover_photo_id
export function normalizeFolderTree(nodes: any[]): FolderNode[] {
  if (!Array.isArray(nodes)) return [];
  const seenPaths = new Set<string>();
  const result: FolderNode[] = [];

  for (const n of nodes) {
    if (!n || !n.path) continue;
    const cleanPath = n.path.replace(/^\/+|\/+$/g, '');
    const cleanName = n.name || cleanPath.split('/').pop() || cleanPath;

    if (seenPaths.has(cleanPath)) continue;
    seenPaths.add(cleanPath);

    const rawSub = n.sub_folders || n.children || [];
    const children = normalizeFolderTree(rawSub);

    result.push({
      name: cleanName,
      path: cleanPath,
      photo_count: n.photo_count || 0,
      thumbnail_path: n.thumbnail_path,
      thumbnail_url: n.thumbnail_url,
      cover_photo_id: n.cover_photo_id,
      sub_folders: children,
      children
    });
  }

  return result;
}

export function normalizeArray<T>(res: any, fallback: T[] = []): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && Array.isArray(res.data)) return res.data;
  return fallback;
}

// Helper to normalize GET /api/v1/folders/contents
export function normalizeFolderContents(res: any, defaultPath = '', defaultPage = 1, defaultLimit = 50): FolderContentsResponse {
  const current_folder = res?.data?.current_folder || defaultPath;
  const parent_folder = res?.data?.parent_folder !== undefined ? res.data.parent_folder : (current_folder.includes('/') ? current_folder.split('/').slice(0, -1).join('/') : '');
  const rawSubFolders = Array.isArray(res?.data?.sub_folders) ? res.data.sub_folders : [];

  const sub_folders: SubFolderNode[] = rawSubFolders.map((sub: any) => ({
    name: sub.name || (sub.path ? sub.path.split('/').pop() : 'Folder'),
    path: sub.path || '',
    photo_count: sub.photo_count || 0,
    thumbnail_path: sub.thumbnail_path,
    thumbnail_url: sub.thumbnail_url,
    cover_photo_id: sub.cover_photo_id
  }));

  const rawDateGroups = Array.isArray(res?.data?.date_groups) ? res.data.date_groups : [];
  let date_groups: FolderDateGroup[] = [];
  let photos: Photo[] = [];

  if (rawDateGroups.length > 0) {
    date_groups = rawDateGroups.map((dg: any) => ({
      date: dg.date || 'Unknown Date',
      count: dg.count || (Array.isArray(dg.photos) ? dg.photos.length : 0),
      photos: Array.isArray(dg.photos) ? dg.photos : []
    }));
    photos = date_groups.flatMap(g => g.photos);
  } else {
    photos = Array.isArray(res?.data?.photos) ? res.data.photos : [];
    const groupMap = new Map<string, Photo[]>();
    photos.forEach(p => {
      const dateKey = p.taken_at ? p.taken_at.split('T')[0] : 'Unknown Date';
      if (!groupMap.has(dateKey)) groupMap.set(dateKey, []);
      groupMap.get(dateKey)!.push(p);
    });
    date_groups = Array.from(groupMap.entries()).map(([date, groupPhotos]) => ({
      date,
      count: groupPhotos.length,
      photos: groupPhotos
    }));
  }

  const pag = res?.pagination || {};
  const page = pag.page || defaultPage;
  const limit = pag.limit || defaultLimit;
  const total = pag.total_items ?? photos.length;
  const total_pages = pag.total_pages ?? Math.ceil(total / limit);

  return {
    current_folder,
    parent_folder,
    sub_folders,
    date_groups,
    photos,
    page,
    limit,
    total,
    total_pages,
    has_next: pag.has_next ?? (page < total_pages),
    has_prev: pag.has_prev ?? (page > 1)
  };
}

// Mock fallback for GET /api/v1/folders/contents
function getMockFolderContents(folderPath: string, page = 1, limit = 50): FolderContentsResponse {
  const target = (folderPath || '').replace(/^\/+|\/+$/g, '');
  const parent = target.includes('/') ? target.split('/').slice(0, -1).join('/') : '';
  
  // Find sub-folders under target folder
  const sub_folders: SubFolderNode[] = [];
  if (!target || target === 'root') {
    sub_folders.push(
      { name: 'Vacation2025', path: 'Vacation2025', photo_count: 36, cover_photo_id: 1 },
      { name: 'Family', path: 'Family', photo_count: 18, cover_photo_id: 4 },
      { name: 'Nature', path: 'Nature', photo_count: 18, cover_photo_id: 7 },
      { name: 'Events', path: 'Events', photo_count: 18, cover_photo_id: 10 }
    );
  } else if (target === 'Vacation2025' || target.endsWith('/Vacation2025')) {
    sub_folders.push(
      { name: 'Bali', path: `${target}/Bali`, photo_count: 18, cover_photo_id: 1 },
      { name: 'Japan', path: `${target}/Japan`, photo_count: 18, cover_photo_id: 2 }
    );
  } else if (target === 'Family' || target.endsWith('/Family')) {
    sub_folders.push({ name: 'Birthdays', path: `${target}/Birthdays`, photo_count: 18, cover_photo_id: 4 });
  } else if (target === 'Nature' || target.endsWith('/Nature')) {
    sub_folders.push({ name: 'Landscapes', path: `${target}/Landscapes`, photo_count: 18, cover_photo_id: 7 });
  } else if (target === 'Events' || target.endsWith('/Events')) {
    sub_folders.push({ name: 'TechConf2026', path: `${target}/TechConf2026`, photo_count: 18, cover_photo_id: 10 });
  }

  // Find photos directly or under target folder
  let matchingPhotos = MOCK_PHOTOS_LIST.filter(p => {
    const cleanP = (p.folder_path || '').replace(/^\/+|\/+$/g, '');
    return cleanP === target || cleanP.endsWith(target) || target.endsWith(cleanP);
  });

  if (matchingPhotos.length === 0) {
    matchingPhotos = MOCK_PHOTOS_LIST.filter(p => !target || p.folder_path.includes(target));
  }

  if (matchingPhotos.length === 0 && target) {
    matchingPhotos = MOCK_PHOTOS_LIST.slice(0, 21);
  }

  const pag = getMockPaginatedPhotos(matchingPhotos, page, limit);

  // Group items into date_groups
  const groupMap = new Map<string, Photo[]>();
  pag.items.forEach(p => {
    const dateKey = p.taken_at ? p.taken_at.split('T')[0] : 'Unknown Date';
    if (!groupMap.has(dateKey)) groupMap.set(dateKey, []);
    groupMap.get(dateKey)!.push(p);
  });

  const date_groups: FolderDateGroup[] = Array.from(groupMap.entries()).map(([date, items]) => ({
    date,
    count: items.length,
    photos: items
  }));

  return {
    current_folder: target,
    parent_folder: parent,
    sub_folders,
    date_groups,
    photos: pag.items,
    page: pag.page,
    limit: pag.limit,
    total: pag.total,
    total_pages: pag.total_pages,
    has_next: pag.has_next,
    has_prev: pag.has_prev
  };
}

// Timeline API
export async function getTimelinePhotos(page = 1, limit = 50): Promise<PaginatedResponse<Photo>> {
  try {
    const raw = await fetchApi<any>(`/api/v1/photos/timeline?page=${page}&limit=${limit}`);
    return normalizePaginatedPhotos(raw, page, limit);
  } catch {
    return getMockPaginatedPhotos(MOCK_PHOTOS_LIST, page, limit);
  }
}

export async function getTimelineBuckets(): Promise<TimelineBucket[]> {
  try {
    const raw = await fetchApi<any>('/api/v1/photos/timeline/buckets');
    return normalizeArray<TimelineBucket>(raw, MOCK_TIMELINE_BUCKETS);
  } catch {
    return MOCK_TIMELINE_BUCKETS;
  }
}

// Folder Tree API: GET /api/v1/folders/tree
export async function getFolderTree(): Promise<FolderNode[]> {
  try {
    const raw = await fetchApi<any>('/api/v1/folders/tree');
    const arr = normalizeArray<any>(raw, MOCK_FOLDER_TREE);
    return normalizeFolderTree(arr);
  } catch {
    return normalizeFolderTree(MOCK_FOLDER_TREE);
  }
}

// Folder Contents API: GET /api/v1/folders/contents?folder_path={path}&page={page}&limit={limit}
export async function getFolderContents(folderPath: string, page = 1, limit = 50): Promise<FolderContentsResponse> {
  try {
    const encodedPath = encodeURIComponent(folderPath || '');
    const raw = await fetchApi<any>(`/api/v1/folders/contents?folder_path=${encodedPath}&page=${page}&limit=${limit}`);
    return normalizeFolderContents(raw, folderPath, page, limit);
  } catch {
    return getMockFolderContents(folderPath, page, limit);
  }
}

// Photo Detail API
export async function getPhotoDetail(id: number): Promise<Photo> {
  try {
    const raw = await fetchApi<any>(`/api/v1/photos/${id}`);
    if (raw && raw.data) return raw.data;
    return raw;
  } catch {
    const found = MOCK_PHOTOS_LIST.find(p => p.id === id);
    if (!found) throw new Error('Photo not found');
    return found;
  }
}

// Scanner API
export async function startScanner(): Promise<{ status: string }> {
  try {
    return await fetchApi<{ status: string }>('/api/v1/scan/start', { method: 'POST' });
  } catch {
    return { status: 'accepted' };
  }
}

export async function getScanStatus(): Promise<ScanStatus> {
  try {
    const raw = await fetchApi<any>('/api/v1/scan/status');
    if (raw && raw.data) return raw.data;
    return raw || { is_scanning: false, scanned_count: 90, new_count: 0, total_found: 90 };
  } catch {
    return {
      is_scanning: false,
      scanned_count: 90,
      new_count: 0,
      total_found: 90
    };
  }
}
