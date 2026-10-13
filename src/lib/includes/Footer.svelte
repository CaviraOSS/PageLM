<script>
	const { class: classes, warn = false } = $props();
	import { getIcon } from "$lib/icons/icons.js";
</script>

<footer class="{classes} w-screen text-center flex flex-wrap items-center justify-between lg:justify-center text-zinc-500 z-20 gap-2 lg:gap-4 px-6 text-[10px] md:text-xs lg:text-sm font-medium">
	{#if warn == false}
		<span class="text-zinc-400">PageLM</span>

		<span class="text-zinc-600">•</span>

		<span>From <a href="https://cavira.app" class="text-zinc-400 hover:text-zinc-200 transition-colors">CaviraOSS</a></span>

		<span class="text-zinc-600">•</span>

		<span>License: <a href="https://github.com/CaviraOSS/PageLM/blob/main/LICENSE.md" class="text-zinc-400 hover:text-zinc-200 transition-colors">MIT</a></span> <!-- Repo will change its License to MIT later -->

		<span class="text-zinc-600">•</span>
	{/if}
	{#if warn !== false}
		<span>PageLM can make mistakes. Check important information.</span>
	{/if}

	<span class="flex items-center gap-1.5 text-zinc-400">
		{@html getIcon("gitCommit", "size-2.5 lg:size-4")}
		bd6087d
		<!-- Update commit hash above, its only purpose is to look cool. -->
	</span>
</footer>
