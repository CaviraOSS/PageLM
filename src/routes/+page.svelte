<script>
	import { getIcon } from "$lib/icons/icons.js";

	import Dropdown from "$lib/components/Dropdown.svelte";
	import Aside from "$lib/includes/Aside.svelte";
	import Footer from "$lib/includes/Footer.svelte";
	import PromptBox from "$lib/components/PromptBox.svelte";
	import Alerts from "$lib/components/Alerts.svelte";
	import { showAlert } from '$lib/alerts.svelte.js';

	let prompts = [
		{
			l: "Could you explain how Large Language Models (LLMs) work, including their architecture, training process, and provide some common everyday use cases?",
			s: "Learn about LLMs",
			i: "book"
		},
		{
			l: "I want to learn Calculus from scratch. ",
			s: "Calculus keynotes",
			i: "dotTriangle"
		},
		{
			l: "I want to learn why the sky is blue. ",
			s: "Why is the sky blue?",
			i: "cloud"
		},
		{
			l: "I want to learn modern philosophy. ",
			s: "Essay on modern philosophy",
			i: "paintBrush"
		}
	]

	const currentHour = new Date().getHours();
	const greeting = currentHour < 12 ? "Good morning!" : currentHour < 18 ? "Good afternoon!" : "Good evening!";
</script>

<Aside />
<Alerts />

<main class="flex flex-col items-center justify-center min-h-screen p-2 lg:p-24 gap-1">
	<h1 class="text-3xl lg:text-4xl text-zinc-500">{greeting}</h1>
	<h1 class="text-2xl lg:text-4xl text-zinc-300 text-center">What are we studying today?</h1>

	<div class="w-full lg:max-w-3xl flex flex-col gap-4 p-4 mt-24">
		<PromptBox cyclePrompts="true" />

		<div class="flex gap-2.5 overflow-x-auto lg:mx-auto [&::-webkit-scrollbar-thumb]:bg-transparent">
			{#each prompts as prompt}
				<button
					onclick={(e) => setPrompt(e.currentTarget.dataset.prompt)}
					data-prompt={prompt.l}
					class="flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-medium transition-colors shrink-0 cursor-pointer"
				>
					{@html getIcon(prompt.i, "size-4")}
					<span>{prompt.s}</span>
				</button>
			{/each}
		</div>
	</div>

	<Footer class="fixed bottom-10" />
</main>