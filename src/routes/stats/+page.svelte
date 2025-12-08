<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import DarkModeToggle from '$lib/components/DarkModeToggle.svelte';
	import { Chart, Svg } from 'layerchart';
	import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
	import { Area, Axis, Bars, Labels, Tooltip } from 'layerchart';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	// Prepare distance distribution data
	let distanceDistribution = $derived(() => {
		return Object.entries(data.distanceRanges).map(([range, count]) => ({
			range,
			count
		}));
	});

	function formatPace(pace: number): string {
		const mins = Math.floor(pace);
		const secs = Math.round((pace - mins) * 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<div class="container mx-auto py-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-4xl font-bold">Statistics & Trends</h1>
		<div class="flex items-center space-x-2">
			<DarkModeToggle />
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
										Distance: <span class="font-semibold">{data.distance.toFixed(1)} km</span>
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
										Distance: <span class="font-semibold">{data.distance.toFixed(1)} km</span>
									</div>
									<div class="text-sm">
										Avg Pace: <span class="font-semibold">{formatPace(data.pace)}/km</span>
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
