<script lang="ts">
  import { RefreshCw, CheckCircle2 } from 'lucide-svelte';
  import type { ScanStatus } from '$lib/types/photo';

  interface Props {
    status: ScanStatus | null;
  }

  let { status }: Props = $props();
</script>

{#if status && status.is_scanning}
  <div class="mb-4 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs sm:text-sm text-primary backdrop-blur-md animate-fade-in">
    <div class="flex items-center gap-3">
      <RefreshCw class="h-4 w-4 animate-spin text-primary shrink-0" />
      <div>
        <p class="font-semibold">Media Scanner Active</p>
        <p class="text-xs text-primary/80">
          Scanned {status.scanned_count} of {status.total_found || '...'} files. {status.new_count || 0} new detected.
        </p>
      </div>
    </div>

    {#if status.current_file}
      <span class="hidden md:inline-block truncate max-w-xs text-xs opacity-75 font-mono">
        {status.current_file}
      </span>
    {/if}
  </div>
{/if}
