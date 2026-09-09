<script lang="ts">
  import { createInfiniteQuery } from '@tanstack/svelte-query';
  import { getTimelinePhotos } from '$lib/api/client';
  import PhotoCard from '$features/grid/PhotoCard.svelte';
  import EmptyState from '$lib/components/common/EmptyState.svelte';
  import ErrorBanner from '$lib/components/common/ErrorBanner.svelte';
  import { activeBucketFilterStore, lightboxStore } from '$lib/stores/uiStore';
  import { Calendar, Filter, X, ChevronRight, ChevronsUpDown } from 'lucide-svelte';
  import type { Photo, PaginatedResponse } from '$lib/types/photo';
  import { format, parseISO, isToday, isYesterday } from 'date-fns';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  const filter = $derived($activeBucketFilterStore);

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

  // TanStack Query Infinite Query for Timeline
  const query = createInfiniteQuery<PaginatedResponse<Photo>>({
    queryKey: ['photos', 'timeline'],
    queryFn: ({ pageParam = 1 }) => getTimelinePhotos(pageParam as number, 50),
    getNextPageParam: (lastPage: PaginatedResponse<Photo>) => lastPage.has_next ? (lastPage.page + 1) : undefined,
    initialPageParam: 1
  });

  // Flatten all page photo items safely
  const allPhotos = $derived.by(() => {
    if (!$query.data || !Array.isArray($query.data.pages)) return [];
    return $query.data.pages.flatMap((page) => (page && Array.isArray(page.items)) ? page.items : []);
  });

  // Filter photos by active bucket if selected
  const filteredPhotos = $derived.by(() => {
    if (!filter) return allPhotos;
    return allPhotos.filter((photo) => {
      if (!photo?.taken_at) return false;
      const date = new Date(photo.taken_at);
      const matchYear = date.getFullYear() === filter.year;
      const matchMonth = filter.month ? (date.getMonth() + 1) === filter.month : true;
      return matchYear && matchMonth;
    });
  });

  // Group photos by date
  interface DateGroup {
    dateKey: string;
    displayDate: string;
    photos: { photo: Photo; globalIndex: number }[];
  }

  const groupedPhotos = $derived.by(() => {
    const map = new Map<string, { photo: Photo; globalIndex: number }[]>();

    filteredPhotos.forEach((photo, index) => {
      let dateKey = 'Unknown Date';
      if (photo?.taken_at) {
        try {
          dateKey = format(parseISO(photo.taken_at), 'yyyy-MM-dd');
        } catch {
          dateKey = photo.taken_at.split('T')[0] || 'Unknown Date';
        }
      }

      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push({ photo, globalIndex: index });
    });

    const groups: DateGroup[] = [];
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

  function clearFilter() {
    activeBucketFilterStore.set(null);
  }

  function handlePhotoClick(photo: Photo, globalIndex: number) {
    lightboxStore.open(filteredPhotos, globalIndex);
  }

  // IntersectionObserver for Infinite Scroll
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
  
  <!-- Header / Filter Bar -->
  <div class="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
    <div>
      <h2 class="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
        <Calendar class="h-5 w-5 text-primary" />
        <span>Timeline View</span>
      </h2>
      <p class="text-xs text-muted-foreground">
        Grouped by date ({filteredPhotos.length} media items)
      </p>
    </div>

    <div class="flex items-center gap-2">
      {#if groupedPhotos.length > 0}
        <button
          type="button"
          onclick={() => isAllCollapsed ? expandAllDates() : collapseAllDates()}
          class="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-all shadow-sm"
          title={isAllCollapsed ? "Expand all date groups" : "Collapse all date groups"}
        >
          <ChevronsUpDown class="h-3.5 w-3.5 text-primary" />
          <span>{isAllCollapsed ? "Expand All" : "Collapse All"}</span>
        </button>
      {/if}

      {#if filter}
        <div class="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary animate-fade-in">
          <Filter class="h-3.5 w-3.5" />
          <span class="font-medium">Filter: {filter.year}{filter.month ? ` / Month ${filter.month}` : ''}</span>
          <button
            type="button"
            onclick={clearFilter}
            aria-label="Clear filter"
            class="rounded-md p-0.5 hover:bg-primary/20 transition-all"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Loading State -->
  {#if $query.isLoading}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
      {#each Array(15) as _, i}
        <div class="aspect-square w-full rounded-xl bg-muted/60 animate-pulse"></div>
      {/each}
    </div>

  <!-- Error State -->
  {:else if $query.isError}
    <ErrorBanner
      message={$query.error?.message || 'Error loading timeline photos'}
      onRetry={() => $query.refetch()}
    />

  <!-- Empty State -->
  {:else if filteredPhotos.length === 0}
    <EmptyState
      title="No photos in timeline"
      description="No photos were found matching your current timeline selection."
      actionLabel="Clear Filter"
      onAction={clearFilter}
    />

  <!-- Date Grouped Timeline View -->
  {:else}
    <div class="flex-1 overflow-y-auto min-h-0 pr-1 space-y-6">
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
              <h3 class="text-xs sm:text-sm font-bold text-foreground capitalize">
                {group.displayDate}
              </h3>
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
      <div bind:this={loadMoreRef} class="h-12 w-full flex items-center justify-center my-4">
        {#if $query.isFetchingNextPage}
          <div class="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
            <div class="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <span>Loading more timeline media...</span>
          </div>
        {:else if !$query.hasNextPage && filteredPhotos.length > 0}
          <p class="text-xs text-muted-foreground font-medium">All timeline media loaded ({filteredPhotos.length})</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
