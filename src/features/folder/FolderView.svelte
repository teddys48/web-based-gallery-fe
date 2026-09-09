<script lang="ts">
  import { createInfiniteQuery } from '@tanstack/svelte-query';
  import { getFolderContents, getFolderThumbnailUrl } from '$lib/api/client';
  import PhotoCard from '$features/grid/PhotoCard.svelte';
  import EmptyState from '$lib/components/common/EmptyState.svelte';
  import ErrorBanner from '$lib/components/common/ErrorBanner.svelte';
  import { selectedFolderPathStore, lightboxStore } from '$lib/stores/uiStore';
  import { Folder, FolderOpen, ChevronRight, Home, ArrowLeft, Calendar, ChevronsUpDown } from 'lucide-svelte';
  import type { FolderContentsResponse, SubFolderNode, Photo } from '$lib/types/photo';
  import { format, parseISO, isToday, isYesterday } from 'date-fns';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  const folderPath = $derived($selectedFolderPathStore);

  // State for collapsible date groups
  let collapsedDates = $state<Record<string, boolean>>({});

  function toggleDateGroup(dateKey: string) {
    collapsedDates[dateKey] = !collapsedDates[dateKey];
  }

  function collapseAllDates() {
    const next: Record<string, boolean> = {};
    groupedPhotos.forEach(g => { next[g.dateKey] = true; });
    collapsedDates = next;
  }

  function expandAllDates() {
    collapsedDates = {};
  }

  const isAllCollapsed = $derived.by(() => {
    if (!groupedPhotos.length) return false;
    return groupedPhotos.every(g => collapsedDates[g.dateKey]);
  });

  // TanStack Query for /api/v1/folders/contents
  const query = createInfiniteQuery<FolderContentsResponse>({
    queryKey: ['folderContents', $selectedFolderPathStore],
    queryFn: ({ pageParam = 1 }) => getFolderContents($selectedFolderPathStore, pageParam as number, 50),
    getNextPageParam: (lastPage: FolderContentsResponse) => lastPage.has_next ? (lastPage.page + 1) : undefined,
    initialPageParam: 1
  });

  // Re-fetch query when selectedFolderPathStore changes
  $effect(() => {
    const current = $selectedFolderPathStore;
    if (current !== undefined) {
      $query.refetch();
    }
  });

  // Calculate breadcrumbs from folderPath
  const breadcrumbs = $derived.by(() => {
    if (!folderPath) return [];
    const parts = folderPath.split('/').filter(Boolean);
    const crumbs: { name: string; path: string }[] = [];
    let current = '';

    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      crumbs.push({ name: part, path: current });
    }
    return crumbs;
  });

  // Extract sub-folders directly from the latest API response payload
  const subfolders = $derived.by(() => {
    if (!$query.data || !$query.data.pages.length) return [];
    return $query.data.pages[0].sub_folders || [];
  });

  // Extract all photos across all paginated pages for lightbox
  const allPhotos = $derived.by(() => {
    if (!$query.data || !Array.isArray($query.data.pages)) return [];
    return $query.data.pages.flatMap((p) => {
      if (Array.isArray(p?.photos) && p.photos.length > 0) return p.photos;
      if (Array.isArray(p?.date_groups)) return p.date_groups.flatMap((dg) => dg.photos || []);
      return [];
    });
  });

  // Consolidate date_groups across paginated response pages
  interface DisplayDateGroup {
    dateKey: string;
    displayDate: string;
    photos: { photo: Photo; globalIndex: number }[];
  }

  const groupedPhotos = $derived.by(() => {
    const map = new Map<string, { photo: Photo; globalIndex: number }[]>();
    let currentIndex = 0;

    if ($query.data && Array.isArray($query.data.pages)) {
      $query.data.pages.forEach((page) => {
        if (Array.isArray(page.date_groups) && page.date_groups.length > 0) {
          page.date_groups.forEach((dg) => {
            const dateKey = dg.date || 'Unknown Date';
            if (!map.has(dateKey)) map.set(dateKey, []);
            (dg.photos || []).forEach((photo) => {
              map.get(dateKey)!.push({ photo, globalIndex: currentIndex++ });
            });
          });
        } else if (Array.isArray(page.photos) && page.photos.length > 0) {
          page.photos.forEach((photo) => {
            let dateKey = 'Unknown Date';
            if (photo.taken_at) {
              dateKey = photo.taken_at.split('T')[0];
            }
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)!.push({ photo, globalIndex: currentIndex++ });
          });
        }
      });
    }

    const groups: DisplayDateGroup[] = [];
    for (const [dateKey, items] of map.entries()) {
      let displayDate = dateKey;
      if (dateKey !== 'Unknown Date') {
        try {
          const parsed = parseISO(dateKey);
          if (isToday(parsed)) {
            displayDate = 'Today';
          } else if (isYesterday(parsed)) {
            displayDate = 'Yesterday';
          } else {
            displayDate = format(parsed, 'EEEE, MMMM d, yyyy');
          }
        } catch {
          displayDate = dateKey;
        }
      }

      groups.push({
        dateKey,
        displayDate,
        photos: items
      });
    }

    return groups;
  });

  // Parent folder path from response
  const parentFolder = $derived.by(() => {
    if ($query.data && $query.data.pages.length > 0 && $query.data.pages[0].parent_folder !== undefined) {
      return $query.data.pages[0].parent_folder;
    }
    if (breadcrumbs.length > 1) {
      return breadcrumbs.slice(0, -1).map(c => c.name).join('/');
    }
    return '';
  });

  function navigateTo(path: string) {
    selectedFolderPathStore.set(path);
  }

  function navigateUp() {
    if (parentFolder !== undefined) {
      selectedFolderPathStore.set(parentFolder);
    } else if (breadcrumbs.length > 1) {
      const parentPath = breadcrumbs.slice(0, -1).map(c => c.name).join('/');
      selectedFolderPathStore.set(parentPath);
    } else {
      selectedFolderPathStore.set('');
    }
  }

  function handlePhotoClick(photo: Photo, globalIndex: number) {
    lightboxStore.open(allPhotos, globalIndex);
  }

  const currentFolderTitle = $derived(
    breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : 'Root'
  );

  // Infinite Scroll Trigger Element
  let loadMoreRef = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!loadMoreRef || !$query.hasNextPage || $query.isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && $query.hasNextPage && !$query.isFetchingNextPage) {
          $query.fetchNextPage();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(loadMoreRef);
    return () => observer.disconnect();
  });
</script>

<div class="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
  
  <!-- Breadcrumb & Parent Navigation Header -->
  <div class="flex items-center justify-between gap-2 mb-4 shrink-0">
    <nav class="flex items-center gap-1.5 rounded-xl bg-card border border-border/50 px-4 py-2.5 shadow-sm overflow-x-auto text-xs sm:text-sm flex-1">
      {#if folderPath}
        <button
          type="button"
          onclick={navigateUp}
          title="Go to parent directory"
          class="mr-1 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-all shrink-0 flex items-center gap-1 text-xs font-semibold"
        >
          <ArrowLeft class="h-4 w-4" />
          <span class="hidden sm:inline">Up</span>
        </button>
      {/if}

      <button
        type="button"
        onclick={() => navigateTo('')}
        class={`flex items-center gap-1 font-medium transition-all shrink-0 ${
          !folderPath ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Home class="h-4 w-4" />
        <span>Root</span>
      </button>

      {#each breadcrumbs as crumb, i}
        <ChevronRight class="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        <button
          type="button"
          onclick={() => navigateTo(crumb.path)}
          class={`font-medium transition-all shrink-0 ${
            i === breadcrumbs.length - 1
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {crumb.name}
        </button>
      {/each}
    </nav>

    {#if groupedPhotos.length > 0}
      <button
        type="button"
        onclick={() => isAllCollapsed ? expandAllDates() : collapseAllDates()}
        class="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-all shadow-sm shrink-0"
        title={isAllCollapsed ? "Expand all date groups" : "Collapse all date groups"}
      >
        <ChevronsUpDown class="h-3.5 w-3.5 text-primary" />
        <span class="hidden sm:inline">{isAllCollapsed ? "Expand All" : "Collapse All"}</span>
      </button>
    {/if}
  </div>

  <!-- Internal Single Scroll Container -->
  <div class="flex-1 overflow-y-auto min-h-0 pr-1 space-y-6">
    
    <!-- Sub-Folders Section with Cover Thumbnails -->
    {#if subfolders.length > 0}
      <div>
        <div class="flex items-center justify-between mb-3 px-1">
          <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Folder class="h-3.5 w-3.5 text-amber-500" />
            <span>Sub-Folders ({subfolders.length})</span>
          </h3>
          <span class="text-[10px] text-muted-foreground">Click a folder to open</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {#each subfolders as sub (sub.path)}
            {@const folderThumbUrl = getFolderThumbnailUrl(sub)}
            <button
              type="button"
              onclick={() => navigateTo(sub.path)}
              class="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <!-- Folder Cover Thumbnail Image -->
              <img
                src={folderThumbUrl}
                alt={sub.name}
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-90 group-hover:brightness-100"
              />

              <!-- Dark Gradient Glass Overlay -->
              <div class="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/85 via-black/30 to-black/20 p-3">
                <!-- Top bar: Folder Icon & Count Pill -->
                <div class="flex items-center justify-between">
                  <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 backdrop-blur-md text-amber-400 shadow">
                    <FolderOpen class="h-4 w-4 fill-amber-400/20" />
                  </div>
                  <span class="rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 font-mono text-[10px] font-semibold text-white/90">
                    {sub.photo_count} items
                  </span>
                </div>

                <!-- Bottom info: Folder Name -->
                <div>
                  <p class="truncate text-xs font-bold text-white drop-shadow">
                    {sub.name}
                  </p>
                  <span class="text-[10px] text-white/70 truncate block font-mono">
                    {sub.path}
                  </span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Loading State -->
    {#if $query.isLoading}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-2">
        {#each Array(10) as _, i}
          <div class="aspect-square w-full rounded-xl bg-muted/60 animate-pulse"></div>
        {/each}
      </div>

    <!-- Error State -->
    {:else if $query.isError}
      <ErrorBanner
        message={$query.error?.message || 'Error loading folder contents'}
        onRetry={() => $query.refetch()}
      />

    <!-- Date Grouped Media View & Empty State -->
    {:else}
      {#if groupedPhotos.length > 0}
        <div class="space-y-6">
          <div class="mb-3 px-1">
            <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar class="h-3.5 w-3.5 text-primary" />
              <span>Media in {currentFolderTitle} ({allPhotos.length})</span>
            </h3>
          </div>

          {#each groupedPhotos as group (group.dateKey)}
            {@const isCollapsed = collapsedDates[group.dateKey] ?? false}
            <div class="space-y-3">
              <!-- Interactive Collapsible Date Header Banner -->
              <button
                type="button"
                onclick={() => toggleDateGroup(group.dateKey)}
                class="sticky top-0 z-20 flex w-full items-center justify-between rounded-xl bg-background/95 backdrop-blur-md px-3.5 py-2 border border-border/50 shadow-sm hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background select-none group"
              >
                <div class="flex items-center gap-2">
                  <ChevronRight class={`h-4 w-4 text-primary shrink-0 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} />
                  <Calendar class="h-4 w-4 text-primary/80 shrink-0" />
                  <h4 class="text-xs sm:text-sm font-bold text-foreground capitalize">
                    {group.displayDate}
                  </h4>
                </div>

                <div class="flex items-center gap-2">
                  {#if isCollapsed}
                    <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full animate-fade-in">
                      Collapsed
                    </span>
                  {/if}
                  <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground font-semibold">
                    {group.photos.length} items
                  </span>
                </div>
              </button>

              <!-- Smooth Sliding Photo Grid for Date Group -->
              {#if !isCollapsed}
                <div transition:slide={{ duration: 250, easing: cubicOut }} class="pt-1">
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 px-0.5">
                    {#each group.photos as item (item.photo.id)}
                      <PhotoCard
                        photo={item.photo}
                        onClick={() => handlePhotoClick(item.photo, item.globalIndex)}
                      />
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}

          <!-- Infinite Scroll Trigger Element -->
          <div bind:this={loadMoreRef} class="w-full flex items-center justify-center py-6 my-4 border-t border-border/30">
            {#if $query.isFetchingNextPage}
              <div class="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <div class="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                <span>Loading more items...</span>
              </div>
            {:else if !$query.hasNextPage && allPhotos.length > 0}
              <p class="text-xs text-muted-foreground font-semibold tracking-wide">
                All folder items loaded ({allPhotos.length})
              </p>
            {/if}
          </div>
        </div>
      {:else if subfolders.length === 0}
        <EmptyState
          title="This folder is empty"
          description={`No media files or subdirectories found inside "${folderPath || 'Root'}".`}
          icon="folder"
          actionLabel="Back to Root"
          onAction={() => navigateTo('')}
        />
      {/if}
    {/if}

  </div>
</div>
