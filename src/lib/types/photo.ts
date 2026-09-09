export interface Photo {
  id: number;
  file_path: string;
  file_name: string;
  folder_path: string;
  file_size: number;
  media_type?: 'image' | 'video' | string;
  duration?: number; // Video duration in seconds (e.g. 3.0, 125.4)
  hash?: string;
  mime_type?: string;
  width: number;
  height: number;
  taken_at: string; // ISO date string
  camera_make?: string;
  camera_model?: string;
  f_number?: string;
  exposure_time?: string;
  iso?: number;
  focal_length?: string;
  latitude?: number;
  longitude?: number;
  thumbnail_path?: string;
  thumbnail_url?: string;
  mod_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimelineBucket {
  year: number;
  month: number; // 1-12
  count: number;
}

export interface ByDateParams {
  date?: string; // YYYY-MM-DD or YYYY-MM
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  year?: number;
  month?: number; // 1-12
  media_type?: 'image' | 'video' | string;
  page?: number;
  limit?: number;
}

export interface SubFolderNode {
  name: string;
  path: string;
  photo_count: number;
  thumbnail_path?: string;
  thumbnail_url?: string;
  cover_photo_id?: number;
}

export interface FolderNode {
  name: string;
  path: string;
  photo_count: number;
  thumbnail_path?: string;
  thumbnail_url?: string;
  cover_photo_id?: number;
  sub_folders?: FolderNode[];
  children?: FolderNode[];
}

export interface FolderDateGroup {
  date: string;
  count: number;
  photos: Photo[];
}

export interface FolderContentsData {
  current_folder: string;
  parent_folder?: string;
  sub_folders: SubFolderNode[];
  date_groups?: FolderDateGroup[];
  photos: Photo[];
}

export interface FolderContentsResponse {
  current_folder: string;
  parent_folder?: string;
  sub_folders: SubFolderNode[];
  date_groups?: FolderDateGroup[];
  photos: Photo[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ScanStatus {
  is_scanning: boolean;
  scanned_count: number;
  new_count: number;
  updated_count?: number;
  deleted_count?: number;
  total_found: number;
  current_file?: string;
  start_time?: string;
  duration_ms?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_cursor?: string | number;
}
