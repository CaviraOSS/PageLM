<script>
	import { getIcon } from "$lib/icons/icons.js";
	import { fly, fade } from "svelte/transition";
	import { quintOut, backOut } from "svelte/easing";
	import { tick } from "svelte";

	let isOpen = $state(false);

	function typewriter(node, { speed = 40, delay = 0 }) {
		const textNode = Array.from(node.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim().length > 0);
		if (!textNode) return {};
		const text = textNode.nodeValue;
		textNode.nodeValue = "";

		return {
			delay,
			duration: text.trim().length * speed,
			tick: (t) => (textNode.nodeValue = text.slice(0, Math.trunc(text.length * t))),
		};
	}

	function popIn(node, { delay = 0, duration = 600, x = -50 }) {
		return {
			delay,
			duration,
			easing: backOut, // Keeps the bouncy overshoot at the end
			css: (t) => {
				// t goes from 0 to 1 during the animation
				const currentX = x * (1 - t);

				// Math.sin creates an arc. At t=0.5 (halfway), sin is 1.
				// 1 * 0.25 = 0.25. Added to our base scale of 1, we hit 1.25 max scale!
				const scale = 1 + 0.1 * Math.sin(t * Math.PI);

				return `
                    transform: translateX(${currentX}px) scale(${scale});
                    opacity: ${t};
                    transform-origin: left center; /* Ensures it scales out from the edge */
                `;
			},
		};
	}
</script>

<button onclick={() => (isOpen = true)} class="fixed top-4 left-4 p-2 rounded-xl border border-white/10 bg-[#121214] hover:bg-[#1e1e21] text-[#a1a1aa] text-[13px] font-medium transition-colors shrink-0 cursor-pointer z-30">
	{@html getIcon("sidebar", "size-5 lg:size-6")}
</button>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="absolute top-0 inset-0 bg-black/20 backdrop-blur-sm z-30 overflow-hidden flex items-end" transition:fade={{ duration: 300 }} onclick={() => (isOpen = false)}>
		<svg viewBox="0 0 1000 150" class="absolute lg:top-1/2 lg:-translate-y-1/2 lg:right-20 lg:translate-x-1/2 lg:rotate-90 text-zinc-400 lg:text-zinc-600 font-funnel">
			<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="50" font-weight="semibold"> CaviraOSS / PageLM </text>
		</svg>
	</div>

	<aside transition:popIn={{ x: -50, duration: 600 }} class="absolute bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 z-40 max-w-xl w-full h-fit lg:left-4 top-4 p-6 pb-5 lg:p-10 lg:pb-9 flex justify-between shadow-2xl">
		<div class="flex flex-col gap-4 font-funnel text-4xl">
			{#each [{ text: "Home", href: "/" }, { text: "History", href: "/history" }, { text: "Notes", href: "/notes" }, { text: "Settings", href: "/settings" }] as item, i}
				<a href={item.href} transition:fly={{ x: -20, duration: 400, delay: 150 + (i + 1) * 50, easing: quintOut }} class="text-left group hover:text-zinc-100 rounded-xl duration-150 transition-all flex flex-col h-12 overflow-hidden">
					<span in:typewriter={{ delay: 200 + (i + 1) * 50 }} class="group-hover:-mt-12 duration-300 transition-all">{item.text}</span>
					<span in:typewriter={{ delay: 200 + (i + 1) * 50 }} class="mt-2 duration-300 transition-all">{item.text}</span>
				</a>
			{/each}
		</div>

		<div class="flex flex-col gap-4 font-funnel text-4xl items-end text-xl text-zinc-400 pb-1">
			<button onclick={() => (isOpen = false)} transition:fade={{ duration: 300, delay: 200 }} class="flex items-center gap-4 hover:bg-zinc-800 px-2 pl-3 py-1 rounded-xl hover:text-zinc-200 ml-auto cursor-pointer">
				<span in:typewriter={{ delay: 250 }}>Close</span>
				{@html getIcon("x", "size-5 mt-0.5")}
			</button>

			<div class="mt-auto items-end flex flex-col gap-2">
				{#each [{ text: "GitHub", href: "https://github.com/CaviraOSS" }, { text: "Discord", href: "https://cavira.app/discord" }, { text: "Website", href: "https://cavira.app" }] as link, i}
					<a href={link.href} target="_blank" transition:fly={{ y: 10, duration: 400, delay: 300 + (i + 1) * 50, easing: quintOut }} class="flex flex-col h-10 group overflow-hidden py-1 hover:text-zinc-100 ml-auto cursor-pointer">
						<div class="flex items-center gap-4 group-hover:-mt-10 duration-300 transition-all">
							<span in:typewriter={{ delay: 350 + (i + 1) * 50 }}>{link.text}</span>
							{@html getIcon("arrowTop", "size-5 rotate-45 mt-px")}
						</div>
						<div class="flex items-center gap-4">
							<span in:typewriter={{ delay: 350 + (i + 1) * 50 }}>{link.text}</span>
							{@html getIcon("arrowTop", "size-5 rotate-45 mt-px")}
						</div>
					</a>
				{/each}
			</div>
		</div>
	</aside>
{/if}