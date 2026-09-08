<script lang="ts">
  import type { Photo } from '$lib/types/photo';
  import { isVideoMedia, formatDuration } from '$lib/api/client';
  import {
    X,
    Calendar,
    Camera,
    HardDrive,
    Maximize2,
    MapPin,
    Folder,
    Hash,
    Clock,
    FileText,
    Eye,
    Play,
    Film
  } from 'lucide-svelte';
  import { format, parseISO } from 'date-fns';

  interface Props {
    photo: Photo;
    onClose: () => void;
  }

  let { photo, onClose }: Props = $props();

  const isVideo = $derived(isVideoMedia(photo));
  const durationFormatted = $derived(formatDuration(photo.duration));

  const formattedDate = $derived.by(() => {
    try {
      return format(parseISO(photo.taken_at), 'PPP p');
    } catch {
      return photo.taken_at;
    }
  });

  const fileSizeFormatted = $derived.by(() => {
    const bytes = photo.file_size;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  });
</script>

<aside class="flex h-full w-80 flex-col border-l border-white/10 bg-slate-950/95 text-slate-100 backdrop-blur-xl p-5 shadow-2xl overflow-y-auto">
  <!-- Top bar -->
  <div class="flex items-center justify-between pb-4 border-b border-white/10">
    <h3 class="text-sm font-bold uppercase tracking-wider text-slate-300">
      {isVideo ? 'Video Details' : 'Photo Details'}
    </h3>
    <button
      type="button"
      onclick={onClose}
      class="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
    >
      <X class="h-4 w-4" />
    </button>
  </div>

  <div class="mt-4 flex flex-col gap-6 text-xs">
    <!-- File Name & Info -->
    <div>
      <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">File Name</span>
      <p class="mt-1 font-semibold text-slate-100 break-all text-sm">{photo.file_name}</p>
    </div>

    <!-- Basic Info Grid -->
    <div class="space-y-3 rounded-xl bg-white/5 p-3.5 border border-white/10">
      <div class="flex items-center gap-3">
        <Film class="h-4 w-4 text-primary shrink-0" />
        <div>
          <span class="block text-[10px] text-slate-400">Media Type</span>
          <span class="font-medium capitalize">{photo.media_type || (isVideo ? 'Video' : 'Image')}</span>
        </div>
      </div>

      {#if isVideo && photo.duration !== undefined}
        <div class="flex items-center gap-3">
          <Clock class="h-4 w-4 text-amber-400 shrink-0" />
          <div>
            <span class="block text-[10px] text-slate-400">Duration</span>
            <span class="font-medium font-mono">{photo.duration}s ({durationFormatted})</span>
          </div>
        </div>
      {/if}

      {#if photo.mime_type}
        <div class="flex items-center gap-3">
          <FileText class="h-4 w-4 text-primary shrink-0" />
          <div>
            <span class="block text-[10px] text-slate-400">Format (MIME)</span>
            <span class="font-mono text-[11px] font-medium">{photo.mime_type}</span>
          </div>
        </div>
      {/if}

      <div class="flex items-center gap-3">
        <Calendar class="h-4 w-4 text-primary shrink-0" />
        <div>
          <span class="block text-[10px] text-slate-400">Date Taken</span>
          <span class="font-medium">{formattedDate}</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Maximize2 class="h-4 w-4 text-primary shrink-0" />
        <div>
          <span class="block text-[10px] text-slate-400">Dimensions</span>
          <span class="font-medium">{photo.width} × {photo.height} px</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <HardDrive class="h-4 w-4 text-primary shrink-0" />
        <div>
          <span class="block text-[10px] text-slate-400">File Size</span>
          <span class="font-medium">{fileSizeFormatted}</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Folder class="h-4 w-4 text-primary shrink-0" />
        <div class="truncate">
          <span class="block text-[10px] text-slate-400">Folder</span>
          <span class="font-mono text-[11px] truncate block">{photo.folder_path}</span>
        </div>
      </div>
    </div>

    <!-- Camera & EXIF Specs -->
    {#if photo.camera_make || photo.camera_model || photo.f_number || photo.iso}
      <div>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Camera Settings</span>
        <div class="space-y-2 rounded-xl bg-white/5 p-3.5 border border-white/10">
          {#if photo.camera_make || photo.camera_model}
            <div class="flex items-center gap-2 font-medium text-slate-200">
              <Camera class="h-4 w-4 text-amber-400" />
              <span>{[photo.camera_make, photo.camera_model].filter(Boolean).join(' ')}</span>
            </div>
          {/if}

          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-slate-300">
            {#if photo.f_number}
              <div>
                <span class="block text-[10px] text-slate-400">Aperture</span>
                <span class="font-mono font-medium">{photo.f_number}</span>
              </div>
            {/if}
            {#if photo.exposure_time}
              <div>
                <span class="block text-[10px] text-slate-400">Shutter</span>
                <span class="font-mono font-medium">{photo.exposure_time}</span>
              </div>
            {/if}
            {#if photo.iso}
              <div>
                <span class="block text-[10px] text-slate-400">ISO</span>
                <span class="font-mono font-medium">{photo.iso}</span>
              </div>
            {/if}
            {#if photo.focal_length}
              <div>
                <span class="block text-[10px] text-slate-400">Focal Length</span>
                <span class="font-mono font-medium">{photo.focal_length}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- GPS Location if available -->
    {#if photo.latitude && photo.longitude}
      <div>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Location</span>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${photo.latitude},${photo.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 rounded-xl bg-white/5 p-3 border border-white/10 text-primary hover:bg-white/10 transition-all"
        >
          <MapPin class="h-4 w-4 text-rose-400" />
          <span class="font-mono text-[11px] truncate">{photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}</span>
        </a>
      </div>
    {/if}

    <!-- Raw Path & Hash -->
    {#if photo.hash}
      <div class="pt-2 border-t border-white/10">
        <span class="text-[10px] text-slate-500">Hash:</span>
        <p class="font-mono text-[10px] text-slate-400 truncate">{photo.hash}</p>
      </div>
    {/if}
  </div>
</aside>
