<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import Header from '$lib/components/common/Header.svelte';
  import Sidebar from '$lib/components/common/Sidebar.svelte';
  import TimelineView from '$features/timeline/TimelineView.svelte';
  import FolderView from '$features/folder/FolderView.svelte';
  import LightboxModal from '$features/lightbox/LightboxModal.svelte';
  import ScannerBar from '$lib/components/common/ScannerBar.svelte';
  import { activeViewStore } from '$lib/stores/uiStore';
  import { getScanStatus } from '$lib/api/client';
  import { onMount } from 'svelte';
  import type { ScanStatus } from '$lib/types/photo';

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  });

  let scanStatus = $state<ScanStatus | null>(null);

  onMount(() => {
    async function checkScan() {
      try {
        scanStatus = await getScanStatus();
      } catch {
        // ignore
      }
    }
    checkScan();
    const interval = setInterval(checkScan, 5000);
    return () => clearInterval(interval);
  });
</script>

<QueryClientProvider client={queryClient}>
  <div class="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col antialiased">
    <!-- Header -->
    <Header />

    <!-- Main App Body -->
    <div class="flex-1 flex min-h-0 max-w-[1600px] w-full mx-auto overflow-hidden">
      <!-- Left Sidebar (Folder Tree & Timeline Scrubber) -->
      <Sidebar />

      <!-- Main View Content Area -->
      <main class="flex-1 flex flex-col min-w-0 min-h-0 p-4 sm:p-6 lg:p-8 overflow-hidden">
        <ScannerBar status={scanStatus} />

        {#if $activeViewStore === 'timeline'}
          <TimelineView />
        {:else if $activeViewStore === 'folder'}
          <FolderView />
        {/if}
      </main>
    </div>

    <!-- Lightbox Fullscreen Modal -->
    <LightboxModal />
  </div>
</QueryClientProvider>
