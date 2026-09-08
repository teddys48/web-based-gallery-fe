<script lang="ts">
  import { ImageOff, FolderOpen, RefreshCw } from 'lucide-svelte';

  interface Props {
    title?: string;
    description?: string;
    icon?: 'image' | 'folder';
    actionLabel?: string;
    onAction?: () => void;
  }

  let {
    title = 'No photos found',
    description = 'There are no images to display in this view.',
    icon = 'image',
    actionLabel,
    onAction
  }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-12 text-center my-8 bg-card/40 backdrop-blur-sm">
  <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-inner">
    {#if icon === 'folder'}
      <FolderOpen class="h-7 w-7 stroke-[1.5]" />
    {:else}
      <ImageOff class="h-7 w-7 stroke-[1.5]" />
    {/if}
  </div>

  <h3 class="text-base font-semibold text-foreground mb-1">{title}</h3>
  <p class="max-w-sm text-xs sm:text-sm text-muted-foreground mb-6">{description}</p>

  {#if actionLabel && onAction}
    <button
      type="button"
      onclick={onAction}
      class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all"
    >
      <RefreshCw class="h-3.5 w-3.5" />
      <span>{actionLabel}</span>
    </button>
  {/if}
</div>
