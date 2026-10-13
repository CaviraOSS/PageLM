<script>
    import { fly, fade } from 'svelte/transition';
    import { flip } from 'svelte/animate';
    import { alertStore } from '../alerts.svelte.js';
    import { getIcon } from "$lib/icons/icons.js";
</script>

<div class="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 pt-24">
    {#each alertStore.items as item (item.id)}
        <div
            animate:flip={{ duration: 250 }}
            in:fly={{ y: -20, duration: 250 }}
            out:fade={{ duration: 200 }}
            class="pointer-events-auto h-fit w-fit rounded-full border border-white/10 bg-white/5 px-5 pr-2 py-2 text-sm text-white shadow-lg backdrop-blur-lg flex items-center gap-2"
        >
            <span class="">{item.text}</span>
            <button class="p-2 w-fit rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors" on:click={() => alertStore.remove(item.id)}>
                {@html getIcon('x', "size-4")}
            </button>
        </div>
    {/each}
</div>