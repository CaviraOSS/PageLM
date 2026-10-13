<script>
	import { page } from "$app/state";
	import { getIcon } from "$lib/icons/icons.js";

	import Dropdown from "$lib/components/Dropdown.svelte";
	import Aside from "$lib/includes/Aside.svelte";
	import Footer from "$lib/includes/Footer.svelte";
	import PromptBox from "$lib/components/PromptBox.svelte";
	import Alerts from "$lib/components/Alerts.svelte";
	import { showAlert } from "$lib/alerts.svelte.js";

	let genBtns = [
		{
			icon: "headphones",
			label: "Audio",
		},
		{
			icon: "presentationChart",
			label: "Infographic",
		},
		{
			icon: "videoPlay",
			label: "Video",
		},
		{
			icon: "medalStar",
			label: "Quiz",
		},
		{
			icon: "squareStack3",
			label: "Flashcards",
		},
		{
			icon: "textFile",
			label: "Notes",
		},
	];

	let curTab = $state("Keynotes");

	const { prompt = "", sources = [], model = "Gemini 3.1 Pro", mode = "default" } = $derived(page.state);
</script>

<Aside />
<Alerts />

<main class="relative max-w-7xl mx-auto py-8 gap-8 flex items-start">
	<div class="relative w-full space-y-6 pb-4 text-zinc-300">
		<div class="relative group">
			<h3 class="text-xs uppercase font-semibold tracking-[0.2em] text-amber-500/80 mb-3">FIBONACCI SEQUENCE</h3>
			<h2 class="text-2xl font-light text-white tracking-tight sm:text-3xl">{prompt}</h2>
			<p class="text-base text-zinc-400 mt-4 leading-relaxed font-light">
				The Fibonacci sequence is an infinite progression where
				<span class="text-white font-normal underline decoration-amber-500/40 underline-offset-4">each number is the exact sum of the two preceding it</span>. It gracefully unfolds from the simplest possible primitives:
				<code class="font-mono text-xs text-amber-400 bg-white/5 border border-white/10 px-2 py-1 rounded-md mx-1">0</code> and
				<code class="font-mono text-xs text-amber-400 bg-white/5 border border-white/10 px-2 py-1 rounded-md mx-1">1</code>.
			</p>
		</div>

		<div class="h-[1px] w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent"></div>

		<div class="space-y-6">
			<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
				<div>
					<h3 class="text-xs uppercase font-semibold tracking-[0.2em] text-zinc-500 mb-2">Progression</h3>
					<h2 class="text-xl font-light text-white tracking-tight">How It Builds</h2>
				</div>
				<div class="inline-flex items-center font-mono text-xs tracking-wider text-zinc-400 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm shadow-sm">
					<span class="text-zinc-500 mr-2">Formula:</span> F(n) = F(n-1) + F(n-2)
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
				<div class="p-5 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:border-white/20 backdrop-blur-sm">
					<span class="text-zinc-500 block uppercase tracking-widest text-[10px] mb-2">01 / Origin</span>
					<span class="text-sm text-zinc-200 tracking-tight">0 , 1</span>
				</div>
				<div class="p-5 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:border-white/20 backdrop-blur-sm">
					<span class="text-zinc-500 block uppercase tracking-widest text-[10px] mb-2">02 / First Sum (0 + 1)</span>
					<span class="text-sm text-zinc-200 tracking-tight">0 , 1 , <strong class="text-amber-400 font-medium">1</strong></span>
				</div>
				<div class="p-5 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:border-white/20 backdrop-blur-sm">
					<span class="text-zinc-500 block uppercase tracking-widest text-[10px] mb-2">03 / Iteration (1 + 1)</span>
					<span class="text-sm text-zinc-200 tracking-tight">0 , 1 , 1 , <strong class="text-amber-400 font-medium">2</strong></span>
				</div>
			</div>
		</div>

		<div class="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 backdrop-blur-md">
			<h3 class="text-xs uppercase font-semibold tracking-[0.2em] text-zinc-400 mb-2">The Natural Order</h3>
			<p class="text-sm text-zinc-400 leading-relaxed font-light">
				This elegant sequence builds a geometric curve known globally as the <strong class="text-white font-normal">Golden Spiral</strong>. From the microscopic structural packing of seeds in sunflowers, to the structural chambers of marine nautiluses, up to the breathtaking rotational
				mechanics of cosmic galaxies—nature relies on this singular mathematical blueprint to scale efficiently.
			</p>
		</div>
	</div>
	<div class="sticky top-4 w-72 lg:w-96 flex flex-col h-[calc(100vh-4rem)]">
		<h1 class="text-lg">Generate based on response:</h1>
		<div class="flex flex-wrap gap-2 mt-4">
			{#each genBtns as prompt}
				<button class="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors shrink-0 cursor-pointer">
					{@html getIcon(prompt.icon, "size-4")}
					<span>{prompt.label}</span>
				</button>
			{/each}
		</div>
		<div class="mt-8 w-full">
			<div class="grid grid-cols-3 gap-1">
				{#each ["Keynotes", "Flashcards", "Studio"] as i}
					<button onclick={(curTab = i)} class="w-full py-2 first:rounded-l-full last:rounded-r-full bg-white/5 hover:bg-white/10 rounded-sm transition-all duration-300 {curTab === i ? 'bg-zinc-800 text-zinc-200 rounded-l-full rounded-r-full' : 'text-zinc-400 hover:text-zinc-300'}">
						<span class="text-sm">{i}</span>
					</button>
				{/each}
			</div>
			<div class="w-full mt-4 max-h-[calc(100vh-26rem)] overflow-y-auto flex flex-col gap-1 pr-1 text-zinc-400">
				{#each Array(10) as _, i}
					<div class="w-full p-4 bg-white/5 hover:text-zinc-300 first:rounded-t-2xl last:rounded-b-2xl rounded-sm flex flex-col gap-2">
						<p class="text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
					</div>
				{/each}
			</div>
		</div>
		<div class="w-full flex flex-col gap-4 mt-auto">
			<PromptBox />
		</div>
	</div>
</main>
