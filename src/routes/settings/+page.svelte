<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Settings, Heart, Info } from 'lucide-svelte';
	import { browser } from '$app/environment';

	let maxHeartRate = $state(190);
	let age = $state(30);
	let savedSuccessfully = $state(false);

	// Load saved preferences from localStorage
	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem('userPreferences');
			if (saved) {
				try {
					const prefs = JSON.parse(saved);
					if (prefs.maxHeartRate) {
						maxHeartRate = prefs.maxHeartRate;
					}
					if (prefs.age) {
						age = prefs.age;
					}
				} catch (e) {
					console.error('Failed to load preferences:', e);
				}
			}
		}
	});

	function calculateMaxHRFromAge() {
		// Using the more accurate Tanaka formula: 208 - (0.7 × age)
		maxHeartRate = Math.round(208 - 0.7 * age);
	}

	function savePreferences() {
		if (browser) {
			const prefs = {
				maxHeartRate,
				age
			};
			localStorage.setItem('userPreferences', JSON.stringify(prefs));
			savedSuccessfully = true;
			setTimeout(() => {
				savedSuccessfully = false;
			}, 3000);
		}
	}

	// Calculate HR zones based on max HR
	const hrZones = $derived([
		{
			zone: 1,
			min: Math.round(maxHeartRate * 0.5),
			max: Math.round(maxHeartRate * 0.6),
			color: 'bg-gray-200 dark:bg-gray-700',
			name: 'Zone 1 - Recovery',
			description: 'Very light activity, warm up'
		},
		{
			zone: 2,
			min: Math.round(maxHeartRate * 0.6),
			max: Math.round(maxHeartRate * 0.7),
			color: 'bg-blue-200 dark:bg-blue-700',
			name: 'Zone 2 - Aerobic',
			description: 'Base building, fat burning'
		},
		{
			zone: 3,
			min: Math.round(maxHeartRate * 0.7),
			max: Math.round(maxHeartRate * 0.8),
			color: 'bg-green-200 dark:bg-green-700',
			name: 'Zone 3 - Tempo',
			description: 'Moderate intensity, sustainable pace'
		},
		{
			zone: 4,
			min: Math.round(maxHeartRate * 0.8),
			max: Math.round(maxHeartRate * 0.9),
			color: 'bg-orange-200 dark:bg-orange-700',
			name: 'Zone 4 - Threshold',
			description: 'Hard effort, lactate threshold'
		},
		{
			zone: 5,
			min: Math.round(maxHeartRate * 0.9),
			max: maxHeartRate,
			color: 'bg-red-200 dark:bg-red-700',
			name: 'Zone 5 - Maximum',
			description: 'Maximum effort, anaerobic'
		}
	]);
</script>

<div class="container mx-auto py-8 max-w-4xl">
	<div class="flex justify-between items-center mb-8">
		<div>
			<h1 class="text-4xl font-bold flex items-center gap-3">
				<Settings class="h-8 w-8" />
				Settings
			</h1>
			<p class="text-muted-foreground mt-2">Customize your running tracker preferences</p>
		</div>
		<Button href="/" variant="outline">Back to Dashboard</Button>
	</div>

	<!-- Max Heart Rate Configuration -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Heart class="h-5 w-5 text-red-500" />
				Maximum Heart Rate
			</CardTitle>
			<p class="text-sm text-muted-foreground mt-2">
				Set your maximum heart rate to accurately calculate training zones. You can enter it manually
				or estimate it based on your age.
			</p>
		</CardHeader>
		<CardContent class="space-y-6">
			<!-- Manual Max HR Input -->
			<div class="space-y-2">
				<label for="maxHR" class="text-sm font-medium">
					Maximum Heart Rate (bpm)
				</label>
				<div class="flex gap-4 items-end">
					<div class="flex-1">
						<Input
							id="maxHR"
							type="number"
							bind:value={maxHeartRate}
							min="100"
							max="220"
							class="text-lg"
						/>
					</div>
				</div>
			</div>

			<!-- Age-based Estimation -->
			<div class="border-t pt-6">
				<h3 class="text-sm font-medium mb-3">Or estimate from age</h3>
				<div class="flex gap-4 items-end">
					<div class="flex-1">
						<label for="age" class="text-sm text-muted-foreground">Your Age</label>
						<Input
							id="age"
							type="number"
							bind:value={age}
							min="10"
							max="100"
							class="mt-1"
						/>
					</div>
					<Button onclick={calculateMaxHRFromAge} variant="outline">
						Calculate Max HR
					</Button>
				</div>
				<p class="text-xs text-muted-foreground mt-2">
					Uses the Tanaka formula: 208 - (0.7 × age) = {Math.round(208 - 0.7 * age)} bpm
				</p>
			</div>

			<!-- Info Box -->
			<div class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
				<div class="flex gap-3">
					<Info class="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
					<div class="text-sm">
						<p class="font-medium text-blue-900 dark:text-blue-100 mb-1">
							How to find your max heart rate
						</p>
						<ul class="text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
							<li>Use a fitness test under professional supervision</li>
							<li>Check your watch/tracker for the highest HR recorded during intense exercise</li>
							<li>Use age-based formulas as a rough estimate (less accurate)</li>
						</ul>
					</div>
				</div>
			</div>

			<!-- Save Button -->
			<div class="flex gap-3 items-center">
				<Button onclick={savePreferences} class="w-full sm:w-auto">
					Save Preferences
				</Button>
				{#if savedSuccessfully}
					<Badge variant="outline" class="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
						Saved successfully!
					</Badge>
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Heart Rate Zones Preview -->
	<Card>
		<CardHeader>
			<CardTitle>Your Heart Rate Zones</CardTitle>
			<p class="text-sm text-muted-foreground mt-2">
				Based on your maximum heart rate of {maxHeartRate} bpm
			</p>
		</CardHeader>
		<CardContent>
			<div class="space-y-3">
				{#each hrZones as zone}
					<div class="flex items-center gap-3">
						<div class="w-32 text-sm font-medium">{zone.name.split(' - ')[0]}</div>
						<div class="flex-1">
							<div class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
								<div
									class={`h-full ${zone.color} flex items-center px-3 text-sm font-medium`}
									style="width: 100%"
								>
									<span class="text-gray-800 dark:text-gray-100">
										{zone.min}-{zone.max} bpm
									</span>
								</div>
							</div>
							<p class="text-xs text-muted-foreground mt-1">
								{zone.description}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>
</div>
