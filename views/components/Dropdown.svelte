<script>
	import { getIcon } from "$lib/icons/icons.js";
	import { fly } from "svelte/transition";

	let { class: classes, options, selected = $bindable() } = $props();
	let isOpen = $state(false);

	let buttonRef = $state();

	function reposition(node) {
		function update() {
			if (!buttonRef) return;

			const buttonRect = buttonRef.getBoundingClientRect();
			const dropdownRect = node.getBoundingClientRect();

			const spaceBelow = window.innerHeight - buttonRect.bottom;
			const spaceAbove = buttonRect.top;

			if (spaceBelow < dropdownRect.height + 10 && spaceAbove > spaceBelow) {
				node.style.top = "auto";
				node.style.bottom = "100%";
				node.style.marginTop = "0";
				node.style.marginBottom = "0.5rem";
			} else {
				node.style.bottom = "auto";
				node.style.top = "100%";
				node.style.marginTop = "0.5rem";
				node.style.marginBottom = "0";
			}

			if (buttonRect.right - dropdownRect.width < 0) {
				node.style.right = "auto";
				node.style.left = "0";
			} else {
				node.style.left = "auto";
				node.style.right = "-0.75rem";
			}
		}

		requestAnimationFrame(update);

		window.addEventListener("scroll", update, true);
		window.addEventListener("resize", update);

		return {
			destroy() {
				window.removeEventListener("scroll", update, true);
				window.removeEventListener("resize", update);
			},
		};
	}
</script>

<div class="relative flex items-center {classes}">
	{#if isOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-10" onclick={() => (isOpen = false)}></div>
	{/if}

	<button bind:this={buttonRef} onclick={() => (isOpen = !isOpen)} class="w-max flex items-center gap-2 hover:bg-zinc-800 px-2 pl-3 py-1 rounded-xl hover:text-zinc-300 transition-colors cursor-pointer relative z-20">
		<span>{selected}</span>
		{@html getIcon("chevronUpDown", "size-4")}
	</button>

	{#if isOpen}
		<div use:reposition transition:fly={{ y: 5, duration: 150 }} class="absolute w-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-30 p-1">
			{#each options as option}
				<button
					onclick={() => {
						selected = option;
						isOpen = false;
					}}
					class="w-full text-left px-3 py-2 text-sm rounded-lg text-zinc-300 hover:backdrop-blur-sm hover:bg-white/5 hover:text-white transition-colors cursor-pointer flex items-center justify-between"
				>
					{option}
					{#if selected === option}
						{@html getIcon("check", "size-4")}
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
