<script lang="ts">
  import {
    lightboxStore,
    currentLightboxPhoto
  } from '$lib/stores/uiStore';
  import { getRawImageUrl, getThumbnailUrl, isVideoMedia } from '$lib/api/client';
  import { SAMPLE_FALLBACK_IMAGES } from '$lib/api/mockData';
  import {
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Info,
    Download,
    Play
  } from 'lucide-svelte';
  import MetadataPanel from './MetadataPanel.svelte';

  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isDragging = $state(false);
  let startX = $state(0);
  let startY = $state(0);

  // Mobile Touch Swipe variables
  let touchStartX = $state(0);
  let touchStartY = $state(0);
  let touchEndX = $state(0);
  let touchEndY = $state(0);

  const photo = $derived($currentLightboxPhoto);
  const isOpen = $derived($lightboxStore.isOpen);
  const showMetadata = $derived($lightboxStore.showMetadata);
  const currentIndex = $derived($lightboxStore.currentIndex);
  const totalPhotos = $derived($lightboxStore.photos.length);

  const isVideo = $derived(isVideoMedia(photo));

  let imageFallbackStep = $state(0);

  $effect(() => {
    if (photo) {
      imageFallbackStep = 0;
    }
  });

  const rawSrc = $derived(getRawImageUrl(photo));
  const thumbSrc = $derived(getThumbnailUrl(photo));

  const currentMediaSrc = $derived.by(() => {
    if (imageFallbackStep === 1) {
      return thumbSrc;
    }
    if (imageFallbackStep >= 2) {
      const idx = Math.abs(photo?.id || 1) % SAMPLE_FALLBACK_IMAGES.length;
      return SAMPLE_FALLBACK_IMAGES[idx];
    }
    return rawSrc;
  });

  function handleMediaError() {
    imageFallbackStep += 1;
  }

  function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  function handleZoomIn() {
    if (isVideo) return;
    zoom = Math.min(zoom + 0.5, 4);
  }

  function handleZoomOut() {
    if (isVideo) return;
    zoom = Math.max(zoom - 0.5, 1);
    if (zoom === 1) {
      panX = 0;
      panY = 0;
    }
  }

  function handleClose() {
    resetZoom();
    lightboxStore.close();
  }

  function handleNext() {
    resetZoom();
    lightboxStore.next();
  }

  function handlePrev() {
    resetZoom();
    lightboxStore.prev();
  }

  function toggleMetadata() {
    lightboxStore.toggleMetadata();
  }

  // Keyboard navigation
  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        handleClose();
        break;
      case 'ArrowRight':
        handleNext();
        break;
      case 'ArrowLeft':
        handlePrev();
        break;
      case 'm':
      case 'M':
        toggleMetadata();
        break;
      case '+':
      case '=':
        handleZoomIn();
        break;
      case '-':
      case '_':
        handleZoomOut();
        break;
      case '0':
        resetZoom();
        break;
    }
  }

  // Mouse Drag / Pan when zoomed
  function handleMouseDown(e: MouseEvent) {
    if (zoom <= 1 || isVideo) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || zoom <= 1 || isVideo) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
  }

  function handleMouseUp() {
    isDragging = false;
  }

  // Touch Swipe navigation
  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (zoom > 1) return; // Disable swipe when zoomed
    if (e.changedTouches.length === 1) {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;

      const diffX = touchStartX - touchEndX;
      const diffY = touchStartY - touchEndY;

      // Horizontal swipe threshold: 50px
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
      // Vertical swipe down to close threshold: 100px
      else if (diffY < -100 && Math.abs(diffY) > Math.abs(diffX)) {
        handleClose();
      }
    }
  }

  function handleDownload() {
    if (!photo) return;
    const url = getRawImageUrl(photo);
    const a = document.createElement('a');
    a.href = url;
    a.download = photo.file_name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen && photo}
  <div class="fixed inset-0 z-50 flex h-screen w-screen overflow-hidden bg-black/95 backdrop-blur-2xl animate-fade-in select-none">
    
    <!-- Main Content Area -->
    <div class="relative flex flex-1 flex-col h-full overflow-hidden">
      
      <!-- Top Action Bar -->
      <div class="absolute top-0 left-0 right-0 z-20 flex h-16 items-center justify-between px-4 bg-gradient-to-b from-black/80 to-transparent">
        <div class="flex items-center gap-3">
          <span class="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-xs text-white/90 backdrop-blur-md">
            {currentIndex + 1} / {totalPhotos}
          </span>
          <span class="hidden sm:inline-block max-w-xs truncate text-xs font-semibold text-white/90">
            {photo.file_name}
          </span>
        </div>

        <div class="flex items-center gap-1.5">
          <!-- Zoom Controls (Only for images) -->
          {#if !isVideo}
            <div class="hidden sm:flex items-center rounded-lg bg-white/10 p-1 backdrop-blur-md">
              <button
                type="button"
                onclick={handleZoomOut}
                disabled={zoom <= 1}
                title="Zoom out (-)"
                class="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <ZoomOut class="h-4 w-4" />
              </button>

              <span class="px-2 font-mono text-xs text-white/90">{Math.round(zoom * 100)}%</span>

              <button
                type="button"
                onclick={handleZoomIn}
                disabled={zoom >= 4}
                title="Zoom in (+)"
                class="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <ZoomIn class="h-4 w-4" />
              </button>

              {#if zoom > 1}
                <button
                  type="button"
                  onclick={resetZoom}
                  title="Reset zoom (0)"
                  class="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw class="h-3.5 w-3.5" />
                </button>
              {/if}
            </div>
          {/if}

          <!-- Metadata Toggle -->
          <button
            type="button"
            onclick={toggleMetadata}
            title="Toggle details (M)"
            class={`rounded-lg p-2 transition-all ${
              showMetadata
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Info class="h-4 w-4" />
          </button>

          <!-- Download Original -->
          <button
            type="button"
            onclick={handleDownload}
            title="Download original file"
            class="rounded-lg bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-all"
          >
            <Download class="h-4 w-4" />
          </button>

          <!-- Close Modal -->
          <button
            type="button"
            onclick={handleClose}
            title="Close viewer (Esc)"
            class="rounded-lg bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-all ml-2"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Center Media Viewport (Video / Image) -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="relative flex flex-1 items-center justify-center overflow-hidden p-4"
        onmousedown={handleMouseDown}
        onmousemove={handleMouseMove}
        onmouseup={handleMouseUp}
        ontouchstart={handleTouchStart}
        ontouchend={handleTouchEnd}
      >
        {#if isVideo}
          <!-- Video Player with HTTP Range Streaming Support & Thumbnail Poster -->
          <video
            src={currentMediaSrc}
            poster={thumbSrc}
            controls
            autoplay
            playsinline
            preload="metadata"
            onerror={handleMediaError}
            class="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
          >
            <track kind="captions" />
            Your browser does not support HTML video playback.
          </video>
        {:else}
          <!-- Image Viewer -->
          <img
            src={currentMediaSrc}
            alt={photo.file_name}
            onerror={handleMediaError}
            style={`transform: scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px); cursor: ${zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'};`}
            class="max-h-full max-w-full object-contain transition-transform duration-100 ease-out select-none shadow-2xl"
            draggable="false"
          />
        {/if}
      </div>

      <!-- Navigation Arrows -->
      {#if totalPhotos > 1}
        <button
          type="button"
          onclick={handlePrev}
          aria-label="Previous Media"
          class="absolute left-4 top-1/2 z-30 -translate-y-1/2 rounded-2xl bg-black/50 p-3 text-white/90 hover:bg-black/80 hover:scale-110 active:scale-95 transition-all border border-white/10 shadow-xl"
        >
          <ChevronLeft class="h-6 w-6" />
        </button>

        <button
          type="button"
          onclick={handleNext}
          aria-label="Next Media"
          class="absolute right-4 top-1/2 z-30 -translate-y-1/2 rounded-2xl bg-black/50 p-3 text-white/90 hover:bg-black/80 hover:scale-110 active:scale-95 transition-all border border-white/10 shadow-xl"
        >
          <ChevronRight class="h-6 w-6" />
        </button>
      {/if}

    </div>

    <!-- Metadata Sidebar Drawer -->
    {#if showMetadata}
      <MetadataPanel {photo} onClose={toggleMetadata} />
    {/if}
  </div>
{/if}
