<script lang="ts">
  interface Props {
    type?: 'photo' | 'folder' | 'date-header' | 'timeline' | 'folder-view';
    count?: number;
  }

  let { type = 'photo', count = 12 }: Props = $props();
</script>

{#if type === 'photo'}
  <div class="aspect-square w-full rounded-xl bg-muted/60 border border-border/30 overflow-hidden relative animate-shimmer animate-pulse">
    <div class="absolute top-2 right-2 h-4 w-12 rounded-full bg-muted-foreground/20"></div>
    <div class="absolute bottom-2 left-2 right-2 space-y-1">
      <div class="h-3 w-3/4 rounded bg-muted-foreground/20"></div>
      <div class="h-2.5 w-1/2 rounded bg-muted-foreground/15"></div>
    </div>
  </div>

{:else if type === 'folder'}
  <div class="aspect-[4/3] w-full rounded-2xl bg-muted/60 border border-border/40 overflow-hidden relative animate-shimmer animate-pulse p-3 flex flex-col justify-between">
    <div class="flex items-center justify-between">
      <div class="h-7 w-7 rounded-lg bg-amber-500/20"></div>
      <div class="h-4 w-14 rounded-full bg-muted-foreground/20"></div>
    </div>
    <div class="space-y-1.5">
      <div class="h-3.5 w-2/3 rounded bg-muted-foreground/25"></div>
      <div class="h-2.5 w-1/3 rounded bg-muted-foreground/15"></div>
    </div>
  </div>

{:else if type === 'date-header'}
  <div class="h-9 w-full rounded-xl bg-muted/50 border border-border/40 animate-shimmer animate-pulse px-3.5 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="h-4 w-4 rounded bg-primary/20"></div>
      <div class="h-4 w-36 rounded bg-muted-foreground/20"></div>
    </div>
    <div class="h-5 w-16 rounded-full bg-muted-foreground/20"></div>
  </div>

{:else if type === 'timeline'}
  <div class="space-y-6 w-full animate-fade-in">
    <!-- Date Header 1 -->
    <div class="space-y-3">
      <div class="h-9 w-full rounded-xl bg-muted/50 border border-border/40 animate-shimmer animate-pulse px-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-4 w-4 rounded bg-primary/20"></div>
          <div class="h-4 w-40 rounded bg-muted-foreground/25"></div>
        </div>
        <div class="h-5 w-16 rounded-full bg-muted-foreground/20"></div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {#each Array(6) as _, i}
          <div class="aspect-square w-full rounded-xl bg-muted/60 border border-border/30 overflow-hidden relative animate-shimmer animate-pulse"></div>
        {/each}
      </div>
    </div>

    <!-- Date Header 2 -->
    <div class="space-y-3">
      <div class="h-9 w-full rounded-xl bg-muted/50 border border-border/40 animate-shimmer animate-pulse px-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-4 w-4 rounded bg-primary/20"></div>
          <div class="h-4 w-32 rounded bg-muted-foreground/25"></div>
        </div>
        <div class="h-5 w-16 rounded-full bg-muted-foreground/20"></div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {#each Array(count > 6 ? count - 6 : 6) as _, i}
          <div class="aspect-square w-full rounded-xl bg-muted/60 border border-border/30 overflow-hidden relative animate-shimmer animate-pulse"></div>
        {/each}
      </div>
    </div>
  </div>

{:else if type === 'folder-view'}
  <div class="space-y-6 w-full animate-fade-in">
    <!-- Subfolders Skeleton Header & Grid -->
    <div>
      <div class="flex items-center justify-between mb-3 px-1">
        <div class="h-4 w-32 rounded bg-muted-foreground/20 animate-pulse"></div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {#each Array(4) as _, i}
          <div class="aspect-[4/3] w-full rounded-2xl bg-muted/60 border border-border/40 overflow-hidden relative animate-shimmer animate-pulse p-3 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <div class="h-7 w-7 rounded-lg bg-amber-500/20"></div>
              <div class="h-4 w-12 rounded-full bg-muted-foreground/20"></div>
            </div>
            <div class="space-y-1.5">
              <div class="h-3.5 w-2/3 rounded bg-muted-foreground/25"></div>
              <div class="h-2.5 w-1/3 rounded bg-muted-foreground/15"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Media Grid Skeleton -->
    <div class="space-y-3">
      <div class="h-9 w-full rounded-xl bg-muted/50 border border-border/40 animate-shimmer animate-pulse px-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-4 w-4 rounded bg-primary/20"></div>
          <div class="h-4 w-36 rounded bg-muted-foreground/25"></div>
        </div>
        <div class="h-5 w-16 rounded-full bg-muted-foreground/20"></div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {#each Array(count) as _, i}
          <div class="aspect-square w-full rounded-xl bg-muted/60 border border-border/30 overflow-hidden relative animate-shimmer animate-pulse"></div>
        {/each}
      </div>
    </div>
  </div>
{/if}
