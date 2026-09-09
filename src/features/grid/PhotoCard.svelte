<script lang="ts">
  import type { Photo } from '$lib/types/photo';
  import { getThumbnailUrl, getThumbnailByPath, isVideoMedia, formatDuration } from '$lib/api/client';
  import { SAMPLE_FALLBACK_IMAGES } from '$lib/api/mockData';
  import { Camera, Calendar, Play } from 'lucide-svelte';
  import { format, parseISO } from 'date-fns';

  interface Props {
    photo: Photo;
    onClick?: () => void;
  }

  let { photo, onClick }: Props = $props();

  let fallbackStep = $state(0);

  const thumbnailUrl = $derived(getThumbnailUrl(photo));

  const imageSrc = $derived.by(() => {
    if (fallbackStep === 1 && (photo?.file_path || photo?.thumbnail_path)) {
      return getThumbnailByPath(photo.file_path || photo.thumbnail_path!);
    }
    if (fallbackStep >= 2 || (fallbackStep === 1 && !photo?.file_path && !photo?.thumbnail_path)) {
      const idx = Math.abs(photo?.id || 1) % SAMPLE_FALLBACK_IMAGES.length;
      return SAMPLE_FALLBACK_IMAGES[idx];
    }
    return thumbnailUrl;
  });

  function handleImageError() {
    fallbackStep += 1;
  }

  const isVideo = $derived(isVideoMedia(photo));
  const durationText = $derived(formatDuration(photo.duration));

  const formattedDate = $derived.by(() => {
    if (!photo.taken_at) return '';
    try {
      return format(parseISO(photo.taken_at), 'd MMM yyyy');
    } catch {
      return photo.taken_at?.split('T')[0] || '';
    }
  });

  const fileSizeMb = $derived(
    photo.file_size ? (photo.file_size / (1024 * 1024)).toFixed(1) : '0.0'
  );
</script>

<div
  role="button"
  tabindex="0"
  onclick={onClick}
  onkeydown={(e) => e.key === 'Enter' && onClick?.()}
  class="group relative aspect-square w-full overflow-hidden rounded-xl bg-muted/80 border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary/60 cursor-pointer"
>
  <!-- Video Play Badge & Duration Overlay -->
  {#if isVideo}
    <div class="absolute top-2 right-2 z-2 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-white backdrop-blur-md shadow text-[10px] font-mono font-medium border border-white/10">
      <Play class="h-3 w-3 fill-white" />
      {#if durationText}
        <span>{durationText}</span>
      {/if}
    </div>
  {/if}

  <!-- Image / Thumbnail (Direct rendering without opacity-0 hiding) -->
  <img
    src={imageSrc}
    alt={photo.file_name || 'Photo'}
    loading="lazy"
    onerror={handleImageError}
    class="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
  />

  <!-- Hover Glass Overlay -->
  <div class="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    <!-- Top info tags (Positioned on top-left to avoid colliding with top-right video play badge) -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 max-w-[75%] truncate">
        <span class="inline-flex items-center gap-1 rounded-md bg-black/65 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-white/90 shadow-sm border border-white/10">
          {fileSizeMb}MB
        </span>

        {#if photo.camera_make || photo.camera_model}
          <span class="inline-flex items-center gap-1 rounded-md bg-black/65 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white/90 shadow-sm border border-white/10 truncate">
            <Camera class="h-3 w-3 shrink-0" />
            <span class="truncate">{photo.camera_model || photo.camera_make}</span>
          </span>
        {/if}
      </div>
    </div>

    <!-- Bottom info bar -->
    <div>
      <p class="truncate text-xs font-semibold text-white drop-shadow-sm">
        {photo.file_name}
      </p>
      {#if formattedDate}
        <div class="mt-0.5 flex items-center gap-2 text-[11px] text-white/70">
          <span class="inline-flex items-center gap-1">
            <Calendar class="h-3 w-3" />
            {formattedDate}
          </span>
        </div>
      {/if}
    </div>
  </div>
</div>
