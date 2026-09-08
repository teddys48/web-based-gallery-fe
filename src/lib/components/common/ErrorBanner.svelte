<script lang="ts">
  import { AlertCircle, RefreshCw } from 'lucide-svelte';

  interface Props {
    message?: string;
    onRetry?: () => void;
  }

  let { message = 'Failed to load photos. Please check your connection.', onRetry }: Props = $props();
</script>

<div class="my-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive backdrop-blur-md">
  <div class="flex items-center gap-3">
    <AlertCircle class="h-5 w-5 shrink-0" />
    <p class="text-xs sm:text-sm font-medium">{message}</p>
  </div>

  {#if onRetry}
    <button
      type="button"
      onclick={onRetry}
      class="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-background/50 px-3 py-1.5 text-xs font-semibold hover:bg-destructive/20 transition-all shrink-0"
    >
      <RefreshCw class="h-3.5 w-3.5" />
      <span>Retry</span>
    </button>
  {/if}
</div>
