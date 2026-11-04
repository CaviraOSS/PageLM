<script>
	let { children } = $props();
</script>

<svelte:head>
	<title>PageLM</title>
</svelte:head>

<main class="bg-zinc-950 h-svh relative text-zinc-300 overflow-x-hidden overflow-y-auto">
	{@render children()}
</main>