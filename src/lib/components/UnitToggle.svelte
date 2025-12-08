<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { unitPreference } from '$lib/stores/unitPreference.svelte';

	// Bind checked state to derived imperial preference
	let isImperial = $derived.by(() => unitPreference.unit === 'imperial');

	// Update store when switch changes
	$effect(() => {
		// This effect runs when we manually set isImperialState
		// The actual toggling is done via onclick
	});
</script>

<div class="flex items-center gap-3">
	<span class="text-sm font-medium" class:text-muted-foreground={isImperial}>
		Metric (km)
	</span>
	<button
		type="button"
		onclick={() => unitPreference.toggle()}
		class="peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
		class:bg-primary={isImperial}
		class:bg-input={!isImperial}
		role="switch"
		aria-checked={isImperial}
		aria-label="Toggle between metric and imperial units"
	>
		<span
			class="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform"
			class:translate-x-5={isImperial}
			class:translate-x-0={!isImperial}
		></span>
	</button>
	<span class="text-sm font-medium" class:text-muted-foreground={!isImperial}>
		Imperial (mi)
	</span>
</div>
