<script>
	import { getIcon } from "$lib/icons/icons.js";
	import { fly, fade } from "svelte/transition";
	import { onMount, onDestroy, tick } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { showAlert } from "$lib/alerts.svelte.js";
	import Dropdown from "$lib/components/Dropdown.svelte";

	let { cyclePrompts = false } = $props();

	let sources = $state([]);
	let activeSource = $state(null);
	let promptText = $state("");
	let promptInput;
	let fileInput = $state();
	let textareaEl = $state();
	let placeholderText = $state("Ask anything...");
	onMount(() => {
		if (textareaEl) {
			const handleKeydown = (event) => {
				if (!event.ctrlKey && !event.metaKey && event.key.length === 1) {
					textareaEl?.focus();
				}
			};
			window.addEventListener("keydown", handleKeydown);
		}
	});

	let placeholders = ["Ask anything ...", "Explain how LLMs work? ", "I want to learn Calculus from scratch. ", "I want to learn why the sky is blue. ", "I want to learn modern philosophy. "];

	const delay = (ms) => new Promise((res) => setTimeout(res, ms));
	async function cyclePlaceholders() {
		let index = 0;
		while (true) {
			let goal = placeholders[index];
			for (let i = 0; i <= goal.length; i++) {
				placeholderText = goal.slice(0, i);
				await delay(50);
			}
			await delay(1000);
			index = (index + 1) % placeholders.length;
		}
	}
	// svelte-ignore state_referenced_locally
	if (cyclePrompts) {
		cyclePlaceholders();
	}
	onMount(() => {
		if (textareaEl) {
			const handleKeydown = (event) => {
				if (!event.ctrlKey && !event.metaKey && event.key.length === 1) {
					textareaEl?.focus();
				}
			};
			window.addEventListener("keydown", handleKeydown);
		}
	});

	let selectedModel = $state("Gemini 3.1 Pro");
	let selectedChatMode = $state("Standard");

	const models = ["Gemini 3.1 Pro", "Gemini 3.1 Flash", "Claude 3.5 Sonnet", "GPT-4o"];
	const chatModes = ["Small", "Standard", "Extended"];

	let totalTokens = $derived(sources.reduce((acc, curr) => acc + Math.ceil(curr.file.size / 100), 0));
	let formattedTokens = $derived(totalTokens < 1000 ? totalTokens.toString() : totalTokens < 1000000 ? (totalTokens / 1000).toFixed(1) + "k" : (totalTokens / 1000000).toFixed(1) + "M");

	function handleFileSelect(event) {
		if (!event.target.files.length) return;

		const newSources = Array.from(event.target.files).map((file) => {
			const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
			return {
				file,
				name: file.name,
				isVideo: file.type.startsWith("video/"),
				previewUrl: isMedia ? URL.createObjectURL(file) : null,
			};
		});

		sources = [...sources, ...newSources];
		event.target.value = "";
	}

	function removeSource(index) {
		if (sources[index].previewUrl) URL.revokeObjectURL(sources[index].previewUrl);
		if (activeSource === sources[index]) activeSource = null;
		sources = sources.filter((_, i) => i !== index);
	}

	function autoResize() {
		if (!textareaEl) return;
		textareaEl.style.height = "auto";
		textareaEl.style.height = textareaEl.scrollHeight + "px";
	}

	async function setPrompt(text) {
		promptText = text;
		await tick();
		autoResize();
		textareaEl?.focus();
	}

	function handleKeydown(event) {
		if (event instanceof KeyboardEvent) {
			if (event.key !== "Enter" || event.shiftKey) return;
			event.preventDefault();
		}

		const trimmed = promptText.trim();
		if (!trimmed) {
			showAlert("Please enter a prompt before sending.");
			return;
		}

		if ($page.url.pathname !== "/chat") {
			goto("/chat", {
				state: { prompt: trimmed, sources: $state.snapshot(sources), model: $state.snapshot(selectedModel), mode: $state.snapshot(selectedChatMode) },
			});
		}
	}

	onDestroy(() => {
		sources.forEach((source) => {
			if (source.previewUrl) URL.revokeObjectURL(source.previewUrl);
		});
	});
</script>

{#if activeSource}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_media_has_caption -->
	<div class="fixed inset-0 bg-black/90 backdrop-blur-sm z-40 flex items-center justify-center p-4 lg:p-12" transition:fade={{ duration: 200 }} onclick={() => (activeSource = null)}>
		<div class="relative w-full h-full flex items-center justify-center" onclick={(e) => e.stopPropagation()}>
			<button onclick={() => (activeSource = null)} class="absolute top-0 right-0 p-3 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition-colors z-50 cursor-pointer">
				{@html getIcon("x", "size-6")}
			</button>
			{#if activeSource.isVideo}
				<video src={activeSource.previewUrl} controls autoplay class="max-w-full max-h-full rounded-xl shadow-2xl object-contain"></video>
			{:else}
				<img src={activeSource.previewUrl} alt={activeSource.name} class="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
			{/if}
		</div>
	</div>
{/if}

<div class="bg-[#18181b] rounded-2xl p-3 shadow-lg border border-white/5 relative">
	<input type="file" bind:this={fileInput} onchange={handleFileSelect} class="hidden" multiple />

	<div class="flex items-center flex-wrap gap-2 text-[13px] text-[#71717a] font-medium {sources.length >= 1 ? 'mb-3' : ''}">
		{#each sources as source, index}
			<div class="relative group flex items-center gap-2 bg-[#242424] border border-white/10 rounded-lg p-1 pr-3">
				{#if source.previewUrl}
					<button onclick={() => (activeSource = source)} class="w-8 h-8 relative rounded-md overflow-hidden shrink-0 cursor-pointer">
						{#if source.isVideo}
							<video src={source.previewUrl} class="w-full h-full object-cover" muted playsinline></video>
							<div class="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-colors">
								<svg class="w-4 h-4 text-white pl-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
							</div>
						{:else}
							<img src={source.previewUrl} alt={source.name} class="w-full h-full object-cover hover:scale-105 transition-transform" />
						{/if}
					</button>
				{:else}
					<div class="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-md">
						{@html getIcon("textFile", "size-4")}
					</div>
				{/if}

				<span class="truncate max-w-25 text-zinc-400" title={source.name}>{source.name}</span>

				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button
					class="absolute -top-1.5 -right-1.5 bg-zinc-700 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
					onclick={(e) => {
						e.stopPropagation();
						removeSource(index);
					}}
				>
					<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		{/each}
	</div>

	<div class="bg-[#242424] rounded-xl flex items-end justify-center overflow-hidden gap-2 border border-white/5 relative group pb-1 pt-1">
		<div class="absolute inset-0 pointer-events-none z-0">
			<svg class="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
				<style>
					@keyframes border-spin {
						0% {
							stroke-dashoffset: 0;
						}
						100% {
							stroke-dashoffset: -100;
						}
					}
					.animate-border-spin {
						animation: border-spin 4s linear infinite;
					}
				</style>
				<defs>
					<linearGradient id="gggg" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#4385f3" />
						<stop offset="25%" stop-color="#e84235" />
						<stop offset="50%" stop-color="#fabd05" />
						<stop offset="75%" stop-color="#32a951" />
						<stop offset="100%" stop-color="#e94337" />
					</linearGradient>
				</defs>
				<rect x="0" y="0" width="100%" height="100%" rx="12" ry="12" fill="none" stroke="url(#gggg)" stroke-width="20" pathLength="100" stroke-dasharray="15 92" class="animate-border-spin blur-[6px]" />
				<rect x="0" y="0" width="100%" height="100%" rx="12" ry="12" fill="none" stroke="url(#gggg)" stroke-width="10" pathLength="100" stroke-dasharray="15 85" stroke-linecap="round" class="animate-border-spin" />
			</svg>
		</div>
		<div class="absolute inset-px bg-[#2222259d] rounded-[11px] z-10 backdrop-blur-lg"></div>

		<div class="relative flex items-end px-2 pl-1 w-full">
			<button onclick={() => fileInput.click()} class="text-[#71717a] hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg relative z-10 cursor-pointer mb-0.5">
				{@html getIcon("plus", "size-5")}
			</button>

			<div class="w-px mx-1 h-4 bg-white/10 z-10 relative mb-3"></div>

			<textarea
				bind:this={textareaEl}
				bind:value={promptText}
				oninput={autoResize}
				onkeydown={handleKeydown}
				placeholder={placeholderText}
				class="py-2 px-3 w-full bg-transparent border-none outline-none flex-1 text-[#e4e4e7] placeholder-[#71717a] text-[15px] focus:ring-0 z-10 resize-none max-h-48 overflow-y-auto block"
				rows="1"
			></textarea>

			<button onclick={handleKeydown} class="text-[#71717a] hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg z-10 cursor-pointer mb-0.5">
				{@html getIcon("send", "size-5")}
			</button>
		</div>
	</div>

	<div class="w-full flex items-center lg:gap-2 mt-3 text-[12px] lg:text-sm text-[#71717a] font-medium pl-1">
		{#if sources.length === 0}
			<div class="flex items-center gap-2">
				{@html getIcon("warning", "size-4")}
				<span class="truncate">0 sources.</span>
			</div>
		{:else}
			<div class="flex items-center gap-2 text-zinc-400">
				<span class="truncate">{sources.length} source{sources.length !== 1 ? "s" : ""} added ({formattedTokens} tokens).</span>
			</div>
		{/if}

		<Dropdown class="ml-auto" options={chatModes} bind:selected={selectedChatMode} />
		<Dropdown options={models} bind:selected={selectedModel} />
	</div>
</div>
