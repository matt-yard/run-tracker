<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Chart, Svg } from 'layerchart';
	import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
	import { Area, Axis, Bars, Labels, Tooltip } from 'layerchart';
	import UnitToggle from '$lib/components/UnitToggle.svelte';
	import { unitPreference } from '$lib/stores/unitPreference.svelte';
	import { formatDistance, formatPace } from '$lib/utils/unitConversion';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Reactive unit from store
	let currentUnit = $derived(unitPreference.unit);

	// Prepare weekly distance data
	let weeklyChartData = $derived(() => {
		return data.weeklyData
			.reverse()
			.map((d: any) => ({
				week: d.week,
				distance: d.totalDistance || 0,
				count: d.count
			}));
	});

	// Prepare monthly data
	let monthlyChartData = $derived(() => {
		return data.monthlyData
			.reverse()
			.map((d: any) => ({
				month: d.month,
				distance: d.totalDistance || 0,
				pace: d.avgPace || 0
			}));
	});

	// Prepare distance distribution data with converted labels
	let distanceDistribution = $derived(() => {
		return Object.entries(data.distanceRanges).map(([range, count]) => {
			// Convert range labels (e.g., "0-5km" to "0-3.1mi" when imperial)
			let displayRange = range;
			if (currentUnit === 'imperial') {
				displayRange = convertRangeLabel(range);
			}
			return {
				range: displayRange,
				count
			};
		});
	});

	function convertRangeLabel(kmRange: string): string {
		// Convert km range labels to miles (e.g., "5-10km" -> "3.1-6.2mi")
		if (kmRange.includes('+')) {
			const km = parseFloat(kmRange.replace('km+', ''));
			const miles = (km * 0.621371).toFixed(1);
			return `${miles}mi+`;
		} else {
			const parts = kmRange.replace('km', '').split('-');
			const start = (parseFloat(parts[0]) * 0.621371).toFixed(1);
			const end = (parseFloat(parts[1]) * 0.621371).toFixed(1);
			return `${start}-${end}mi`;
		}
	}
</script>

<div class="container mx-auto py-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-4xl font-bold">Statistics & Trends</h1>
		<div class="flex items-center gap-4">
			<UnitToggle />
			<Button href="/">Back to Dashboard</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6">
		<!-- Weekly Distance Chart -->
		<Card>
			<CardHeader>
				<CardTitle>Weekly Distance (Last 24 Weeks)</CardTitle>
			</CardHeader>
			<CardContent>
				{#if weeklyChartData().length > 0}
					<div class="h-80">
						<Chart
							data={weeklyChartData()}
							x="week"
							y="distance"
							padding={{ left: 40, bottom: 40 }}
						>
							<Svg>
								<Axis placement="left" grid rule />
								<Axis placement="bottom" format={(d) => d.split('-W')[1]} rule />
								<Bars radius={4} strokeWidth={1} class="fill-primary" />
								<Labels format="integer" class="text-xs" />
							</Svg>
							<Tooltip header={(d) => `Week ${d.week.split('-W')[1]}`} let:data>
								<div class="space-y-1">
									<div class="text-sm">
										Distance: <span class="font-semibold">{formatDistance(data.distance, currentUnit, 1)}</span>
									</div>
									<div class="text-sm">
										Runs: <span class="font-semibold">{data.count}</span>
									</div>
								</div>
							</Tooltip>
						</Chart>
					</div>
				{:else}
					<div class="h-80 flex items-center justify-center text-muted-foreground">
						No data available
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Monthly Distance Chart -->
		<Card>
			<CardHeader>
				<CardTitle>Monthly Distance (Last 12 Months)</CardTitle>
			</CardHeader>
			<CardContent>
				{#if monthlyChartData().length > 0}
					<div class="h-80">
						<Chart
							data={monthlyChartData()}
							x="month"
							y="distance"
							padding={{ left: 40, bottom: 40 }}
						>
							<Svg>
								<Axis placement="left" grid rule />
								<Axis placement="bottom" format={(d) => {
									const [year, month] = d.split('-');
									const date = new Date(parseInt(year), parseInt(month) - 1);
									return date.toLocaleDateString('en', { month: 'short' });
								}} rule />
								<Area class="fill-primary/20" />
								<Bars radius={4} strokeWidth={1} class="fill-primary" />
							</Svg>
							<Tooltip header={(d) => {
								const [year, month] = d.month.split('-');
								const date = new Date(parseInt(year), parseInt(month) - 1);
								return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
							}} let:data>
								<div class="space-y-1">
									<div class="text-sm">
										Distance: <span class="font-semibold">{formatDistance(data.distance, currentUnit, 1)}</span>
									</div>
									<div class="text-sm">
										Avg Pace: <span class="font-semibold">{formatPace(data.pace, currentUnit)}</span>
									</div>
								</div>
							</Tooltip>
						</Chart>
					</div>
				{:else}
					<div class="h-80 flex items-center justify-center text-muted-foreground">
						No data available
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Distance Distribution Chart -->
		<Card>
			<CardHeader>
				<CardTitle>Run Distance Distribution</CardTitle>
			</CardHeader>
			<CardContent>
				{#if distanceDistribution().length > 0}
					<div class="h-80">
						<Chart
							data={distanceDistribution()}
							x="range"
							y="count"
							padding={{ left: 40, bottom: 60 }}
						>
							<Svg>
								<Axis placement="left" grid rule />
								<Axis placement="bottom" rule />
								<Bars radius={4} strokeWidth={1} class="fill-primary" />
								<Labels format="integer" class="text-xs font-semibold" />
							</Svg>
							<Tooltip header={(d) => d.range} let:data>
								<div class="text-sm">
									Runs: <span class="font-semibold">{data.count}</span>
								</div>
							</Tooltip>
						</Chart>
					</div>
				{:else}
					<div class="h-80 flex items-center justify-center text-muted-foreground">
						No data available
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
