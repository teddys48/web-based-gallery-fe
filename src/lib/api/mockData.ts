import type { Photo, TimelineBucket, FolderNode, ScanStatus, PaginatedResponse } from '../types/photo';

export const SAMPLE_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
  'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=800&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80',
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80'
];

const UNSPLASH_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80', width: 1920, height: 1080, name: 'Mountain Lake Sunrise.jpg', make: 'Sony', model: 'A7 IV' },
  { url: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=800&q=80', width: 1920, height: 1280, name: 'Foggy Forest Trail.jpg', make: 'Canon', model: 'EOS R5' },
  { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80', width: 1920, height: 1080, name: 'Golden Hour Mountains.jpg', make: 'Fujifilm', model: 'X-T4' },
  { url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80', width: 1920, height: 1280, name: 'Yosemite Valley Stream.jpg', make: 'Nikon', model: 'Z7 II' },
  { url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80', width: 1920, height: 1080, name: 'Emerald Valley Sunset.jpg', make: 'Sony', model: 'A7R V' },
  { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', width: 1920, height: 1280, name: 'Highland Ridge.jpg', make: 'Leica', model: 'Q2' },
  { url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80', width: 1920, height: 1080, name: 'Autumn Woods Path.jpg', make: 'Canon', model: 'EOS R6' },
  { url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80', width: 1920, height: 1080, name: 'Coastal Sunset Reflection.jpg', make: 'Sony', model: 'A7 IV' },
  { url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80', width: 1920, height: 1280, name: 'Waterfall Canyon.jpg', make: 'Fujifilm', model: 'X-Pro3' },
  { url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80', width: 1920, height: 1080, name: 'Wildflower Field.jpg', make: 'Nikon', model: 'Z6 II' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', width: 1920, height: 1080, name: 'Tropical Paradise Beach.jpg', make: 'Apple', model: 'iPhone 15 Pro' },
  { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80', width: 1920, height: 1280, name: 'Starry Night Peak.jpg', make: 'Sony', model: 'A7S III' }
];

const FOLDERS = [
  'media/Vacation2025/Bali',
  'media/Vacation2025/Japan',
  'media/Family/Birthdays',
  'media/Nature/Landscapes',
  'media/Events/TechConf2026'
];

export function generateMockPhotos(count: number = 80): Photo[] {
  const photos: Photo[] = [];
  const now = new Date('2026-09-08T14:00:00Z').getTime();
  const dayMs = 86400000;

  const videoExts = ['mp4', 'mov', 'mkv', 'webm', 'avi'];
  const videoMimes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/x-msvideo'];

  for (let i = 1; i <= count; i++) {
    const unsplash = UNSPLASH_PHOTOS[(i - 1) % UNSPLASH_PHOTOS.length];
    const dateOffsetDays = Math.floor((i - 1) / 3) * 1.5 + ((i % 4) * 0.2);
    const takenTime = new Date(now - dateOffsetDays * dayMs);
    const folder = FOLDERS[(i - 1) % FOLDERS.length];
    const isVideo = i % 5 === 0;

    const extIdx = (i % videoExts.length);
    const ext = isVideo ? videoExts[extIdx] : 'jpg';
    const mime = isVideo ? videoMimes[extIdx] : 'image/jpeg';
    const baseName = unsplash.name.replace(/\.[^/.]+$/, "");
    const fileName = `${i.toString().padStart(3, '0')}_${baseName}.${ext}`;

    photos.push({
      id: i,
      file_path: `${folder}/${fileName}`,
      file_name: fileName,
      folder_path: folder,
      file_size: 2500000 + (i * 123456) % 3000000,
      media_type: isVideo ? 'video' : 'image',
      duration: isVideo ? parseFloat((12.5 + (i * 4.5) % 180).toFixed(1)) : undefined,
      hash: `hash_${i}_abcdef123456789`,
      mime_type: mime,
      width: unsplash.width,
      height: unsplash.height,
      taken_at: takenTime.toISOString(),
      camera_make: unsplash.make,
      camera_model: unsplash.model,
      f_number: `f/${(1.4 + (i % 5) * 0.7).toFixed(1)}`,
      exposure_time: `1/${100 + (i % 8) * 200}s`,
      iso: 100 * Math.pow(2, i % 5),
      focal_length: `${24 + (i % 6) * 15}mm`,
      latitude: -8.409518 + (i % 10) * 0.05,
      longitude: 115.188916 + (i % 10) * 0.05,
      thumbnail_path: unsplash.url,
      mod_time: takenTime.toISOString(),
      created_at: takenTime.toISOString(),
      updated_at: takenTime.toISOString()
    });
  }

  return photos;
}

export const MOCK_PHOTOS_LIST = generateMockPhotos(90);

export const MOCK_TIMELINE_BUCKETS: TimelineBucket[] = [
  { year: 2026, month: 9, count: 24 },
  { year: 2026, month: 8, count: 32 },
  { year: 2026, month: 7, count: 21 },
  { year: 2026, month: 6, count: 13 }
];

// Clean non-redundant folder tree matching GET /api/v1/folders/tree
export const MOCK_FOLDER_TREE: FolderNode[] = [
  {
    name: 'Vacation2025',
    path: 'media/Vacation2025',
    photo_count: 36,
    sub_folders: [
      { name: 'Bali', path: 'media/Vacation2025/Bali', photo_count: 18 },
      { name: 'Japan', path: 'media/Vacation2025/Japan', photo_count: 18 }
    ]
  },
  {
    name: 'Family',
    path: 'media/Family',
    photo_count: 18,
    sub_folders: [
      { name: 'Birthdays', path: 'media/Family/Birthdays', photo_count: 18 }
    ]
  },
  {
    name: 'Nature',
    path: 'media/Nature',
    photo_count: 18,
    sub_folders: [
      { name: 'Landscapes', path: 'media/Nature/Landscapes', photo_count: 18 }
    ]
  },
  {
    name: 'Events',
    path: 'media/Events',
    photo_count: 18,
    sub_folders: [
      { name: 'TechConf2026', path: 'media/Events/TechConf2026', photo_count: 18 }
    ]
  }
];

export function getMockPaginatedPhotos(
  photos: Photo[],
  page: number = 1,
  limit: number = 50
): PaginatedResponse<Photo> {
  const total = photos.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = photos.slice(start, start + limit);

  return {
    items,
    page,
    limit,
    total,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1,
    next_cursor: page < total_pages ? page + 1 : undefined
  };
}
