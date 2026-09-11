<script lang="ts">
  import { createInfiniteQuery } from '@tanstack/svelte-query';
  import { derived } from 'svelte/store';
  import { getFolderContents, getFolderThumbnailUrl, downloadFolderZip } from '$lib/api/client';
  import PhotoCard from '$features/grid/PhotoCard.svelte';
  import EmptyState from '$lib/components/common/EmptyState.svelte';
  import ErrorBanner from '$lib/components/common/ErrorBanner.svelte';
  import Skeleton from '$lib/components/common/Skeleton.svelte';
  import { selectedFolderPathStore, lightboxStore } from '$lib/stores/uiStore';
  import { Folder, FolderOpen, ChevronRight, Home, ArrowLeft, Calendar, ChevronsUpDown, Download, X, ArrowUpDown, Filter } from 'lucide-svelte';
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
    sortedGroupedPhotos.forEach(g => { next[g.dateKey] = true; });
    collapsedDates = next;
  }

  function expandAllDates() {
    collapsedDates = {};
  }

  const isAllCollapsed = $derived.by(() => {
    if (!sortedGroupedPhotos.length) return false;
    return sortedGroupedPhotos.every(g => collapsedDates[g.dateKey]);
  });

  // TanStack Query for /api/v1/folders/contents derived dynamically from selectedFolderPathStore
  const folderQueryOptions = derived(selectedFolderPathStore, ($path: string) => ({
    queryKey: ['folderContents', $path ?? ''],
    queryFn: ({ pageParam = 1 }: { pageParam?: unknown }): Promise<FolderContentsResponse> =>
      getFolderContents($path ?? '', (pageParam as number) || 1, 50),
    getNextPageParam: (lastPage: FolderContentsResponse) => lastPage.has_next ? (lastPage.page + 1) : undefined,
    initialPageParam: 1
  }));

  const query = createInfiniteQuery(folderQueryOptions);

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

  type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';
  let sortBy = $state<SortOption>('newest');
  let groupSortBy = $state<Record<string, SortOption>>({});
  let selectedTimelineBucketKey = $state<string>('ALL');

  function getGroupSort(dateKey: string): SortOption {
    return groupSortBy[dateKey] || sortBy;
  }

  function setGroupSort(dateKey: string, option: SortOption) {
    groupSortBy[dateKey] = option;
  }

  $effect(() => {
    // Reset timeline filter and group sorts when folder changes
    folderPath;
    selectedTimelineBucketKey = 'ALL';
    groupSortBy = {};
  });

  interface FolderTimelineBucket {
    key: string;
    label: string;
    count: number;
  }

  // Generate timeline buckets (month/year) from folder media
  const folderTimelineBuckets = $derived.by(() => {
    if (!groupedPhotos.length) return [];

    const bucketMap = new Map<string, { label: string; count: number }>();
    let totalCount = 0;

    groupedPhotos.forEach(group => {
      const dateKey = group.dateKey;
      totalCount += group.photos.length;
      if (dateKey === 'Unknown Date') {
        const existing = bucketMap.get('UNKNOWN') || { label: 'Unknown Date', count: 0 };
        existing.count += group.photos.length;
        bucketMap.set('UNKNOWN', existing);
        return;
      }

      try {
        const yearMonthKey = dateKey.substring(0, 7); // "YYYY-MM"
        const parsed = parseISO(dateKey);
        const monthLabel = format(parsed, 'MMMM yyyy'); // e.g. "August 2024"

        const existing = bucketMap.get(yearMonthKey) || { label: monthLabel, count: 0 };
        existing.count += group.photos.length;
        bucketMap.set(yearMonthKey, existing);
      } catch {
        const existing = bucketMap.get('UNKNOWN') || { label: 'Unknown Date', count: 0 };
        existing.count += group.photos.length;
        bucketMap.set('UNKNOWN', existing);
      }
    });

    const sortedKeys = Array.from(bucketMap.keys()).sort((a, b) => b.localeCompare(a));

    const buckets: FolderTimelineBucket[] = [
      { key: 'ALL', label: 'All Timelines', count: totalCount }
    ];

    sortedKeys.forEach(k => {
      const b = bucketMap.get(k)!;
      buckets.push({
        key: k,
        label: `${b.label} (${b.count})`,
        count: b.count
      });
    });

    return buckets;
  });

  // Filter date groups by selected timeline bucket
  const timelineFilteredGroupedPhotos = $derived.by(() => {
    if (selectedTimelineBucketKey === 'ALL') return groupedPhotos;

    return groupedPhotos.filter(g => {
      if (selectedTimelineBucketKey === 'UNKNOWN') return g.dateKey === 'Unknown Date';
      return g.dateKey.startsWith(selectedTimelineBucketKey);
    });
  });

  // Sorted sub-folders according to selected SortOption
  const sortedSubfolders = $derived.by(() => {
    const list = [...subfolders];
    if (sortBy === 'name_asc') {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
    }
    if (sortBy === 'name_desc') {
      return list.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { numeric: true, sensitivity: 'base' }));
    }
    return list;
  });

  // Sorted date groups and photos according to selected SortOption, Timeline Filter, and per-group Sort
  const sortedGroupedPhotos = $derived.by(() => {
    if (!timelineFilteredGroupedPhotos.length) return [];

    const groups = timelineFilteredGroupedPhotos.map(g => ({
      dateKey: g.dateKey,
      displayDate: g.displayDate,
      photos: [...g.photos]
    }));

    // 1. Sort photos inside each date group according to its groupSort (or global sortBy)
    groups.forEach(g => {
      const gSort = groupSortBy[g.dateKey] || sortBy;
      if (gSort === 'name_asc') {
        g.photos.sort((a, b) => (a.photo.file_name || '').localeCompare(b.photo.file_name || '', undefined, { numeric: true, sensitivity: 'base' }));
      } else if (gSort === 'name_desc') {
        g.photos.sort((a, b) => (b.photo.file_name || '').localeCompare(a.photo.file_name || '', undefined, { numeric: true, sensitivity: 'base' }));
      } else if (gSort === 'oldest') {
        g.photos.sort((a, b) => (a.photo.taken_at || '').localeCompare(b.photo.taken_at || ''));
      } else {
        // default 'newest'
        g.photos.sort((a, b) => (b.photo.taken_at || '').localeCompare(a.photo.taken_at || ''));
      }
    });

    // 2. Sort the date groups themselves
    if (sortBy === 'oldest') {
      groups.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    } else if (sortBy === 'newest') {
      groups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    } else if (sortBy === 'name_asc') {
      groups.sort((a, b) => {
        const nameA = a.photos[0]?.photo?.file_name || '';
        const nameB = b.photos[0]?.photo?.file_name || '';
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      });
    } else if (sortBy === 'name_desc') {
      groups.sort((a, b) => {
        const nameA = a.photos[0]?.photo?.file_name || '';
        const nameB = b.photos[0]?.photo?.file_name || '';
        return nameB.localeCompare(nameA, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    // 3. Re-index globalIndex so Lightbox opens and navigates in exact sorted order
    let currentIndex = 0;
    groups.forEach(g => {
      g.photos = g.photos.map(p => ({
        photo: p.photo,
        globalIndex: currentIndex++
      }));
    });

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

  const displayPhotosList = $derived.by(() => {
    return sortedGroupedPhotos.flatMap(g => g.photos.map(p => p.photo));
  });

  function handlePhotoClick(photo: Photo, globalIndex: number) {
    lightboxStore.open(displayPhotosList, globalIndex);
  }

  const currentFolderTitle = $derived(
    breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : 'Root'
  );

  let isDownloadingZip = $state(false);
  let zipError = $state<string | null>(null);
  let zipErrorTimeout: ReturnType<typeof setTimeout> | null = null;

  async function handleDownloadZip() {
    if (isDownloadingZip) return;
    isDownloadingZip = true;
    if (zipErrorTimeout) clearTimeout(zipErrorTimeout);
    zipError = null;

    try {
      await downloadFolderZip(folderPath || '');
    } catch (err: any) {
      zipError = err?.message || 'Failed to download ZIP archive';
      // Automatically clear ZIP download error after 5 seconds
      zipErrorTimeout = setTimeout(() => {
        zipError = null;
      }, 5000);
    } finally {
      isDownloadingZip = false;
    }
  }

  function clearZipError() {
    if (zipErrorTimeout) clearTimeout(zipErrorTimeout);
    zipError = null;
  }

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

    <!-- Folder Action Buttons -->
    <div class="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
      <!-- Timeline Bucket Selector Dropdown -->
      {#if folderTimelineBuckets.length > 1}
        <div class="relative inline-flex items-center">
          <select
            value={selectedTimelineBucketKey}
            onchange={(e) => selectedTimelineBucketKey = e.currentTarget.value}
            class="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-all cursor-pointer appearance-none pr-7 pl-3"
            aria-label="Filter timeline bucket"
          >
            {#each folderTimelineBuckets as bucket}
              <option value={bucket.key}>{bucket.key === 'ALL' ? 'Timeline: All' : bucket.label}</option>
            {/each}
          </select>
          <div class="pointer-events-none absolute right-2 flex items-center text-muted-foreground">
            <Filter class="h-3.5 w-3.5 opacity-70 text-primary" />
          </div>
        </div>
      {/if}

      <!-- Sort Selector Dropdown -->
      <div class="relative inline-flex items-center">
        <select
          value={sortBy}
          onchange={(e) => sortBy = (e.currentTarget.value as SortOption)}
          class="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-all cursor-pointer appearance-none pr-7 pl-3"
          aria-label="Sort folder items"
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="name_asc">Sort: Name (A-Z)</option>
          <option value="name_desc">Sort: Name (Z-A)</option>
        </select>
        <div class="pointer-events-none absolute right-2 flex items-center text-muted-foreground">
          <ArrowUpDown class="h-3.5 w-3.5 opacity-70" />
        </div>
      </div>

      <!-- Download ZIP Button -->
      <button
        type="button"
        onclick={handleDownloadZip}
        disabled={isDownloadingZip}
        class="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 px-3.5 py-2.5 text-xs font-semibold transition-all shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        title="Download current folder as ZIP archive"
      >
        {#if isDownloadingZip}
          <div class="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0"></div>
          <span>Preparing ZIP...</span>
        {:else}
          <Download class="h-3.5 w-3.5 shrink-0" />
          <span class="hidden sm:inline">Download ZIP</span>
        {/if}
      </button>

      {#if sortedGroupedPhotos.length > 0}
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
  </div>

  <!-- ZIP Download Error Banner -->
  {#if zipError}
    <div class="mb-4 shrink-0">
      <ErrorBanner
        message={zipError}
        onRetry={handleDownloadZip}
        onClose={clearZipError}
      />
    </div>
  {/if}

  <!-- Internal Single Scroll Container -->
  <div class="flex-1 overflow-y-auto min-h-0 pr-1 space-y-6">
    
    <!-- Sub-Folders Section with Cover Thumbnails -->
    {#if sortedSubfolders.length > 0}
      <div>
        <div class="flex items-center justify-between mb-3 px-1">
          <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Folder class="h-3.5 w-3.5 text-amber-500" />
            <span>Sub-Folders ({sortedSubfolders.length})</span>
          </h3>
          <span class="text-[10px] text-muted-foreground">Click a folder to open</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {#each sortedSubfolders as sub (sub.path)}
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
      <Skeleton type="folder-view" count={12} />

    <!-- Error State -->
    {:else if $query.isError}
      <ErrorBanner
        message={$query.error?.message || 'Error loading folder contents'}
        onRetry={() => $query.refetch()}
      />

    <!-- Date Grouped Media View & Empty State -->
    {:else}
      {#if sortedGroupedPhotos.length > 0}
        <div class="space-y-6">
          <div class="mb-3 px-1 flex items-center justify-between flex-wrap gap-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar class="h-3.5 w-3.5 text-primary" />
              <span>Media in {currentFolderTitle} ({displayPhotosList.length})</span>
            </h3>
            {#if selectedTimelineBucketKey !== 'ALL'}
              <button
                type="button"
                onclick={() => selectedTimelineBucketKey = 'ALL'}
                class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-sm"
              >
                <span>Timeline Filter: {folderTimelineBuckets.find(b => b.key === selectedTimelineBucketKey)?.label.split(' (')[0]}</span>
                <X class="h-3.5 w-3.5" />
              </button>
            {/if}
          </div>

          {#each sortedGroupedPhotos as group (group.dateKey)}
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
                  <!-- Sort dropdown per timeline date card -->
                  <div class="relative inline-flex items-center">
                    <select
                      value={getGroupSort(group.dateKey)}
                      onchange={(e) => {
                        e.stopPropagation();
                        setGroupSort(group.dateKey, e.currentTarget.value as SortOption);
                      }}
                      onclick={(e) => e.stopPropagation()}
                      onkeydown={(e) => e.stopPropagation()}
                      class="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary/50 shadow-xs cursor-pointer appearance-none pr-5 pl-2"
                      aria-label="Sort timeline card items"
                    >
                      <option value="newest">Sort: Newest</option>
                      <option value="oldest">Sort: Oldest</option>
                      <option value="name_asc">Sort: Name (A-Z)</option>
                      <option value="name_desc">Sort: Name (Z-A)</option>
                    </select>
                    <div class="pointer-events-none absolute right-1.5 flex items-center text-muted-foreground">
                      <ArrowUpDown class="h-3 w-3 opacity-60" />
                    </div>
                  </div>

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
            {:else if !$query.hasNextPage && displayPhotosList.length > 0}
              <p class="text-xs text-muted-foreground font-semibold tracking-wide">
                All folder items loaded ({displayPhotosList.length})
              </p>
            {/if}
          </div>
        </div>
      {:else if selectedTimelineBucketKey !== 'ALL'}
        <EmptyState
          title="No media in selected timeline"
          description="There are no photos matching the selected timeline filter in this folder."
          icon="image"
          actionLabel="Clear Timeline Filter"
          onAction={() => selectedTimelineBucketKey = 'ALL'}
        />
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
