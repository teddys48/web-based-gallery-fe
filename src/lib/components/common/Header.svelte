<script lang="ts">
  import {
    Image as ImageIcon,
    Folder as FolderIcon,
    Calendar,
    Sun,
    Moon,
    Menu,
    RefreshCw,
    CheckCircle2,
    HardDrive
  } from 'lucide-svelte';
  import {
    activeViewStore,
    themeStore,
    mobileSidebarOpenStore,
    type ViewMode
  } from '$lib/stores/uiStore';
  import { startScanner, getScanStatus } from '$lib/api/client';
  import { onMount } from 'svelte';
  import type { ScanStatus } from '$lib/types/photo';

  let scanStatus = $state<ScanStatus | null>(null);
  let isScanning = $state(false);

  async function checkScan() {
    try {
      const status = await getScanStatus();
      scanStatus = status;
      isScanning = status.is_scanning;
    } catch {
      // Ignore poll error
    }
  }

  async function handleTriggerScan() {
    isScanning = true;
    try {
      await startScanner();
      await checkScan();
    } catch (e) {
      console.error(e);
    }
  }

  onMount(() => {
    checkScan();
    const interval = setInterval(checkScan, 5000);
    return () => clearInterval(interval);
  });

  function setView(view: ViewMode) {
    activeViewStore.set(view);
  }

  function toggleTheme() {
    themeStore.toggle();
  }

  function toggleMobileMenu() {
    mobileSidebarOpenStore.update(v => !v);
  }
</script>

<header class="sticky top-0 z-30 shrink-0 w-full border-b border-border/50 bg-background/80 backdrop-blur-md transition-colors">
  <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
    
    <!-- Left: Brand & Mobile Menu Button -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={toggleMobileMenu}
        aria-label="Toggle Navigation Menu"
        class="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
      >
        <Menu class="h-5 w-5" />
      </button>

      <div class="flex items-center gap-2.5">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
          <ImageIcon class="h-5 w-5" />
        </div>
        <div class="hidden sm:block">
          <h1 class="text-base font-bold leading-none tracking-tight">Gallery</h1>
          <p class="text-xs text-muted-foreground font-medium">Timeline & Folders</p>
        </div>
      </div>
    </div>

    <!-- Center: View Switcher Tabs -->
    <nav class="flex items-center rounded-lg bg-muted/60 p-1 border border-border/40">
      <button
        type="button"
        onclick={() => setView('timeline')}
        class={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
          $activeViewStore === 'timeline'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Calendar class="h-4 w-4" />
        <span>Timeline</span>
      </button>

      <button
        type="button"
        onclick={() => setView('folder')}
        class={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
          $activeViewStore === 'folder'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <FolderIcon class="h-4 w-4" />
        <span>Folders</span>
      </button>
    </nav>

    <!-- Right: Scanner Button & Dark Mode Toggle -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={handleTriggerScan}
        disabled={isScanning}
        title="Scan media folder"
        class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all disabled:opacity-50"
      >
        <RefreshCw class={`h-3.5 w-3.5 ${isScanning ? 'animate-spin text-primary' : ''}`} />
        <span class="hidden sm:inline">{isScanning ? 'Scanning...' : 'Scan Media'}</span>
      </button>

      <button
        type="button"
        onclick={toggleTheme}
        aria-label="Toggle theme"
        class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-all"
      >
        {#if $themeStore === 'dark'}
          <Sun class="h-4 w-4 text-amber-400" />
        {:else}
          <Moon class="h-4 w-4 text-slate-700" />
        {/if}
      </button>
    </div>
  </div>
</header>
