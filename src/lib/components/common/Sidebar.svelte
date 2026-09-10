<script lang="ts">
  import {
    Folder,
    FolderOpen,
    ChevronRight,
    ChevronDown,
    Calendar,
    Images,
    X,
    LayoutGrid
  } from 'lucide-svelte';
  import {
    activeViewStore,
    selectedFolderPathStore,
    activeBucketFilterStore,
    mobileSidebarOpenStore
  } from '$lib/stores/uiStore';
  import type { FolderNode, TimelineBucket } from '$lib/types/photo';
  import { getFolderTree, getTimelineBuckets, getFolderThumbnailUrl, normalizeArray } from '$lib/api/client';
  import { onMount } from 'svelte';

  let rawFolderTree = $state<FolderNode[]>([]);
  let rawBuckets = $state<TimelineBucket[]>([]);
  let expandedFolders = $state<Record<string, boolean>>({});
  let isLoadingSidebar = $state(true);

  const buckets = $derived(normalizeArray<TimelineBucket>(rawBuckets));
  const folderTree = $derived(normalizeArray<FolderNode>(rawFolderTree));

  onMount(async () => {
    try {
      const bRes = await getTimelineBuckets();
      rawBuckets = bRes;
      const fRes = await getFolderTree();
      rawFolderTree = fRes;
    } catch (e) {
      console.error('Sidebar load error', e);
    } finally {
      isLoadingSidebar = false;
    }
  });

  function toggleFolder(path: string, e: MouseEvent) {
    e.stopPropagation();
    expandedFolders[path] = !expandedFolders[path];
  }

  function selectFolder(path: string) {
    selectedFolderPathStore.set(path);
    activeViewStore.set('folder');
    mobileSidebarOpenStore.set(false);
  }

  function selectBucket(year: number, month?: number, count?: number) {
    activeBucketFilterStore.set({ year, month, expected_count: count });
    activeViewStore.set('timeline');
    mobileSidebarOpenStore.set(false);
  }

  function clearBucketFilter() {
    activeBucketFilterStore.set(null);
  }

  function switchView(view: 'timeline' | 'folder') {
    activeViewStore.set(view);
    mobileSidebarOpenStore.set(false);
  }

  const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const totalPhotosCount = $derived(
    Array.isArray(buckets) ? buckets.reduce((acc, b) => acc + (b?.count || 0), 0) || 90 : 90
  );
</script>

{#snippet renderFolderItem(node: FolderNode, level: number = 0)}
  {@const children = node.sub_folders || node.children || []}
  {@const isSelected = $selectedFolderPathStore === node.path}
  {@const isExpanded = expandedFolders[node.path] ?? false}
  {@const hasChildren = children.length > 0}
  {@const folderThumbUrl = getFolderThumbnailUrl(node)}

  <div>
    <button
      type="button"
      onclick={() => selectFolder(node.path)}
      class={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
        isSelected && $activeViewStore === 'folder'
          ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      style={`padding-left: ${level * 12 + 10}px;`}
    >
      <div class="flex items-center gap-2 truncate">
        {#if hasChildren}
          <span
            role="button"
            tabindex="0"
            onclick={(e) => toggleFolder(node.path, e)}
            onkeydown={(e) => e.key === 'Enter' && toggleFolder(node.path, e as any)}
            class="p-0.5 hover:bg-white/20 rounded cursor-pointer"
          >
            {#if isExpanded}
              <ChevronDown class="h-3.5 w-3.5 shrink-0" />
            {:else}
              <ChevronRight class="h-3.5 w-3.5 shrink-0" />
            {/if}
          </span>
        {:else}
          <span class="w-3.5"></span>
        {/if}

        {#if folderThumbUrl && (node.thumbnail_path || node.cover_photo_id)}
          <img src={folderThumbUrl} alt={node.name} class="h-4 w-4 rounded object-cover shrink-0 border border-white/20" />
        {:else if isExpanded}
          <FolderOpen class={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-amber-500'}`} />
        {:else}
          <Folder class={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-amber-500'}`} />
        {/if}

        <span class="truncate">{node.name}</span>
      </div>

      <span
        class={`rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
          isSelected && $activeViewStore === 'folder'
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {node.photo_count}
      </span>
    </button>

    {#if hasChildren && isExpanded}
      <div class="mt-0.5 space-y-0.5">
        {#each children as child, idx (child.path || idx)}
          {@render renderFolderItem(child, level + 1)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<!-- Mobile Backdrop -->
{#if $mobileSidebarOpenStore}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onclick={() => mobileSidebarOpenStore.set(false)}
    class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
  ></div>
{/if}

<!-- Sidebar Drawer Container (Full Height Flex on Desktop) -->
<aside
  class={`fixed top-0 bottom-0 left-0 z-50 w-72 h-full border-r border-border/50 bg-background/95 backdrop-blur-xl transition-transform duration-300 shrink-0 lg:relative lg:top-auto lg:bottom-auto lg:left-auto lg:z-10 lg:translate-x-0 ${
    $mobileSidebarOpenStore ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
  }`}
>
  <div class="flex h-full flex-col justify-between overflow-hidden">
    
    <!-- Scrollable Navigation Items -->
    <div class="flex-1 overflow-y-auto space-y-6 p-4 pr-3">
      
      <!-- Mobile Navigation Drawer Header -->
      <div class="pb-3 border-b border-border/40 lg:hidden">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <LayoutGrid class="h-4 w-4 text-primary" />
            <span class="text-xs font-bold uppercase tracking-wider text-foreground">Navigation Menu</span>
          </div>
          <button
            type="button"
            onclick={() => mobileSidebarOpenStore.set(false)}
            aria-label="Close menu"
            class="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Mobile View Switcher Buttons inside Drawer -->
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            onclick={() => switchView('timeline')}
            class={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              $activeViewStore === 'timeline'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar class="h-3.5 w-3.5" />
            <span>Timeline</span>
          </button>

          <button
            type="button"
            onclick={() => switchView('folder')}
            class={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              $activeViewStore === 'folder'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Folder class="h-3.5 w-3.5" />
            <span>Folders</span>
          </button>
        </div>
      </div>

      <!-- Timeline Buckets Scrubber -->
      <div>
        <div class="flex items-center justify-between mb-2 px-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Timeline Buckets</span>
          {#if $activeBucketFilterStore}
            <button
              type="button"
              onclick={clearBucketFilter}
              class="text-[10px] text-primary hover:underline font-medium"
            >
              Reset Filter
            </button>
          {/if}
        </div>

        {#if isLoadingSidebar}
          <div class="space-y-1.5 px-1">
            {#each Array(4) as _}
              <div class="h-7 w-full rounded-lg bg-muted/60 animate-shimmer animate-pulse"></div>
            {/each}
          </div>
        {:else}
          <div class="space-y-1">
            {#each buckets as bucket (bucket.year + '-' + bucket.month)}
              {@const isSelected = $activeBucketFilterStore?.year === bucket.year && $activeBucketFilterStore?.month === bucket.month}
              <button
                type="button"
                onclick={() => selectBucket(bucket.year, bucket.month, bucket.count)}
                class={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected && $activeViewStore === 'timeline'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <div class="flex items-center gap-2">
                  <Calendar class="h-3.5 w-3.5 opacity-70" />
                  <span>{MONTH_NAMES[bucket.month]} {bucket.year}</span>
                </div>
                <span class="font-mono text-[10px] opacity-80">{bucket.count}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Folder Tree Section -->
      <div>
        <div class="mb-2 px-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Folder Hierarchy</span>
        </div>

        {#if isLoadingSidebar}
          <div class="space-y-1.5 px-1">
            {#each Array(4) as _}
              <div class="h-7 w-full rounded-lg bg-muted/60 animate-shimmer animate-pulse"></div>
            {/each}
          </div>
        {:else}
          <div class="space-y-0.5">
            {#each folderTree as rootNode, idx (rootNode.path || idx)}
              {@render renderFolderItem(rootNode, 0)}
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Fixed Pinned Total Media Card at Bottom -->
    <div class="p-4 border-t border-border/40 shrink-0 bg-background/95 backdrop-blur-xl">
      <div class="flex items-center justify-between rounded-xl bg-card p-3 border border-border/50 shadow-sm">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Images class="h-4 w-4" />
          </div>
          <div>
            <p class="text-xs font-bold text-foreground">Total Media</p>
            <p class="text-[10px] text-muted-foreground font-medium">Gallery Collection</p>
          </div>
        </div>
        <span class="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 font-mono text-xs font-semibold text-primary">
          {totalPhotosCount} items
        </span>
      </div>
    </div>

  </div>
</aside>
