<script lang="ts">
  import { AlertCircle, RefreshCw, X } from 'lucide-svelte';

  interface Props {
    message?: string;
    onRetry?: () => void;
    onClose?: () => void;
  }

  let { message = 'Failed to load photos. Please check your connection.', onRetry, onClose }: Props = $props();
</script>

<div class="my-3 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-destructive backdrop-blur-md animate-fade-in">
  <div class="flex items-center gap-3 min-w-0 flex-1">
    <AlertCircle class="h-5 w-5 shrink-0 text-destructive" />
    <p class="text-xs sm:text-sm font-medium leading-tight truncate">{message}</p>
  </div>

  <div class="flex items-center gap-2 shrink-0">
    {#if onRetry}
      <button
        type="button"
        onclick={onRetry}
        class="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-background/50 px-3 py-1.5 text-xs font-semibold hover:bg-destructive/20 transition-all shrink-0 cursor-pointer"
      >
        <RefreshCw class="h-3.5 w-3.5" />
        <span>Retry</span>
      </button>
    {/if}

    {#if onClose}
      <button
        type="button"
        onclick={onClose}
        aria-label="Close error message"
        class="rounded-lg p-1 text-destructive/80 hover:bg-destructive/20 hover:text-destructive transition-all shrink-0 cursor-pointer"
      >
        <X class="h-4 w-4" />
      </button>
    {/if}
  </div>
</div>
