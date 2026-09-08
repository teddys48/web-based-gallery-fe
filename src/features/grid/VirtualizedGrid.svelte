<script lang="ts">
  import type { Photo } from '$lib/types/photo';
  import PhotoCard from './PhotoCard.svelte';
  import { lightboxStore } from '$lib/stores/uiStore';
  import { onMount } from 'svelte';

  interface Props {
    photos: Photo[];
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    onLoadMore?: () => void;
  }

  let { photos = [], hasNextPage = false, isFetchingNextPage = false, onLoadMore }: Props = $props();

  let containerRef = $state<HTMLDivElement | null>(null);

  const safePhotos = $derived(Array.isArray(photos) ? photos : []);

  function handlePhotoClick(photo: Photo, index: number) {
    lightboxStore.open(safePhotos, index);
  }

  // IntersectionObserver for infinite scroll
  let loadMoreRef = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!loadMoreRef || !onLoadMore || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(loadMoreRef);
    return () => observer.disconnect();
  });
</script>

<div
  bind:this={containerRef}
  class="relative w-full"
>
  <!-- Photos Responsive Grid Container -->
  <div class="grid gap-3 sm:gap-4 px-0.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mb-8">
    {#each safePhotos as photo, globalIdx (photo.id)}
      <PhotoCard
        {photo}
        onClick={() => handlePhotoClick(photo, globalIdx)}
      />
    {/each}
  </div>

  <!-- Dedicated Footer Section (prevents text collision with grid items) -->
  <div bind:this={loadMoreRef} class="w-full flex items-center justify-center py-6 my-4 border-t border-border/30">
    {#if isFetchingNextPage}
      <div class="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
        <div class="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <span>Loading more items...</span>
      </div>
    {:else if !hasNextPage && safePhotos.length > 0}
      <p class="text-xs text-muted-foreground font-semibold tracking-wide">
        All items loaded ({safePhotos.length})
      </p>
    {/if}
  </div>
</div>
