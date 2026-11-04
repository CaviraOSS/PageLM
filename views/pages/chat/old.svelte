<script>
	import { getIcon } from "$lib/icons/icons.js";

	import Dropdown from "$lib/components/Dropdown.svelte";
	import Aside from "$lib/includes/Aside.svelte";
	import Footer from "$lib/includes/Footer.svelte";
	import PromptBox from "$lib/components/PromptBox.svelte";

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

	let length = $state(10);

	let sequence = $derived.by(() => {
		let num = Math.min(Math.max(parseInt(length) || 1, 1), 30); // Cap at 30
		let seq = [0];
		if (num > 1) seq.push(1);

		for (let i = 2; i < num; i++) {
			seq.push(seq[i - 1] + seq[i - 2]);
		}
		return seq;
	});
</script>

<Aside />

<main class="flex flex-col items-center min-h-screen pb-40 lg:px-20">
	<div class="w-full flex items-start gap-4 [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]">
		<div class="relative w-full lg:w-2/3 pt-16 lg:pt-8 p-8 lg:pr-0 flex">
			<div class="w-full overflow-y-auto max-h-[calc(100vh-15rem)] pr-8">
				<div class="w-full space-y-6 text-zinc-300">
					<div class="relative group">
						<h3 class="text-xs uppercase font-semibold tracking-[0.2em] text-amber-500/80 mb-3">FIBONACCI SEQUENCE</h3>
						<h2 class="text-2xl font-light text-white tracking-tight sm:text-3xl">The Core Concept</h2>
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
							This elegant sequence builds a geometric curve known globally as the <strong class="text-white font-normal">Golden Spiral</strong>. From the microscopic structural packing of seeds in sunflowers, to the structural chambers of marine nautiluses, up to the breathtaking
							rotational mechanics of cosmic galaxies—nature relies on this singular mathematical blueprint to scale efficiently.
						</p>
					</div>

					<div class="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl space-y-8">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
							<div>
								<h2 class="text-xl font-light tracking-tight text-white">Interactive Generation</h2>
								<p class="text-xs text-zinc-500 mt-1 font-mono">Observe the exponential scale in real-time</p>
							</div>

							<div class="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm self-start sm:self-auto">
								<label for="length-input" class="text-xs uppercase font-medium tracking-widest text-zinc-400">Terms</label>
								<input
									id="length-input"
									type="number"
									bind:value={length}
									min="1"
									max="30"
									class="w-16 py-0.5 rounded-lg bg-white/5 border border-white/10 text-amber-400 text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<input type="range" bind:value={length} min="1" max="30" class="w-full h-1 rounded-lg appearance-none cursor-pointer bg-white/10 accent-amber-500 focus:outline-none transition-all" />
							<div class="flex justify-between text-[10px] text-zinc-600 font-mono tracking-widest px-0.5">
								<span>MIN (1)</span>
								<span>MID (12)</span>
								<span>MAX (30)</span>
							</div>
						</div>

						<div class="flex flex-wrap gap-2.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
							{#each sequence as num, index}
								<div
									class="flex flex-col items-center justify-center min-w-[4rem] h-16 p-2 rounded-xl border transition-all duration-300 transform hover:-translate-y-0.5
					{index === sequence.length - 1 ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'}"
								>
									<span class="text-[9px] uppercase tracking-widest font-mono text-zinc-500 block mb-1">F({index})</span>
									<span class="text-sm font-mono font-light tracking-tight">{num}</span>
								</div>
							{/each}
						</div>

						{#if sequence.length >= 3}
							<div class="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-zinc-400 font-mono tracking-wide backdrop-blur-sm">
								<span class="text-zinc-500 text-[10px] uppercase tracking-widest block mb-1.5">Last Equation Component</span>
								<div class="flex items-center justify-center gap-2 text-sm">
									<span class="text-zinc-300">{sequence[sequence.length - 3]}</span>
									<span class="text-zinc-600 font-light">+</span>
									<span class="text-zinc-300">{sequence[sequence.length - 2]}</span>
									<span class="text-amber-500/60">=</span>
									<span class="text-amber-400 font-medium font-mono">{sequence[sequence.length - 1]}</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
		<div class="absolute hidden lg:block lg:relative lg:w-1/3 py-8 overflow-y-auto px-4">
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
				<div class="grid grid-cols-3">
					<button class="w-full py-2 border-b border-white/20 hover:bg-white/5 transition-colors">
						<span class="text-sm">Keynotes</span>
					</button>
					<button class="w-full py-2 border-b border-white/5 hover:bg-white/5 transition-colors">
						<span class="text-sm">Flashcards</span>
					</button>
					<button class="w-full py-2 border-b border-white/5 hover:bg-white/5 transition-colors">
						<span class="text-sm">Studio</span>
					</button>
				</div>
				<div class="w-full mt-2 max-h-[calc(100vh-28rem)] overflow-y-auto flex flex-col gap-2 pr-2">
					{#each Array(10) as _, i}
						<div class="w-full p-4 bg-white/5 rounded-lg flex flex-col gap-2">
							<span class="text-sm text-white/50">Keynote {i + 1}</span>
							<span class="text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<div class="w-screen bg-zinc-950 flex flex-col items-center justify-center fixed bottom-0 gap-4 p-4">
		<div class="w-full lg:max-w-3xl flex flex-col gap-4">
			<PromptBox />
		</div>

		<Footer class="w-full" warn="true" />
	</div>
</main>
