<script lang="ts">
	import { goto } from '$app/navigation';
	import { format } from 'date-fns';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Chart, Svg, Axis, Bars, Area, Labels, Tooltip } from 'layerchart';
	import { scaleLinear, scaleBand, scaleTime } from 'd3-scale';
	import { ArrowLeft, Calendar, Clock, TrendingUp, Flame, Mountain, Heart } from 'lucide-svelte';

	let { data } = $props();
	const run = $derived(data.run);

	// Format helpers
	function formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = Math.floor(minutes % 60);
		const secs = Math.floor((minutes % 1) * 60);
		if (hours > 0) {
			return `${hours}h ${mins}m ${secs}s`;
		}
		return `${mins}m ${secs}s`;
	}

	function formatPace(pace: number): string {
		const mins = Math.floor(pace);
		const secs = Math.floor((pace % 1) * 60);
		return `${mins}:${secs.toString().padStart(2, '0')} /km`;
	}

	// Parse splits data
	interface Split {
		duration: number;
		durationUnit: string;
		date: string;
	}

	const splits = $derived<Split[]>(() => {
		if (!run.splits) return [];
		try {
			return JSON.parse(run.splits);
		} catch {
			return [];
		}
	});

	// Calculate split metrics
	interface SplitMetric {
		splitNumber: number;
		duration: number;
		pace: number;
		distance: number;
		isFastest: boolean;
		isSlowest: boolean;
	}

	const splitMetrics = $derived<SplitMetric[]>(() => {
		if (splits.length === 0) return [];

		// Assume equal distance splits (1km each)
		const splitDistance = 1; // km
		const metrics = splits.map((split, index) => {
			const durationMinutes = split.durationUnit === 'min' ? split.duration : split.duration / 60;
			const pace = durationMinutes / splitDistance;

			return {
				splitNumber: index + 1,
				duration: durationMinutes,
				pace: pace,
				distance: splitDistance,
				isFastest: false,
				isSlowest: false
			};
		});

		if (metrics.length > 0) {
			const paces = metrics.map((m) => m.pace);
			const minPace = Math.min(...paces);
			const maxPace = Math.max(...paces);

			metrics.forEach((m) => {
				m.isFastest = m.pace === minPace;
				m.isSlowest = m.pace === maxPace;
			});
		}

		return metrics;
	});

	// Parse GPX data for pace/elevation over time
	interface GpxPoint {
		lat: number;
		lon: number;
		ele?: number;
		time?: string;
	}

	const gpxPoints = $derived<GpxPoint[]>(() => {
		if (!run.gpxData) return [];
		try {
			return JSON.parse(run.gpxData);
		} catch {
			return [];
		}
	});

	// Calculate pace over distance from GPX data
	interface PacePoint {
		distance: number;
		pace: number;
		elevation?: number;
	}

	const paceOverDistance = $derived<PacePoint[]>(() => {
		if (gpxPoints.length < 2) return [];

		const points: PacePoint[] = [];
		let cumulativeDistance = 0;
		let lastPoint: GpxPoint | null = null;
		let lastTime: Date | null = null;

		for (const point of gpxPoints) {
			if (lastPoint && point.time && lastTime) {
				// Calculate distance using Haversine formula
				const R = 6371; // Earth's radius in km
				const dLat = ((point.lat - lastPoint.lat) * Math.PI) / 180;
				const dLon = ((point.lon - lastPoint.lon) * Math.PI) / 180;
				const a =
					Math.sin(dLat / 2) * Math.sin(dLat / 2) +
					Math.cos((lastPoint.lat * Math.PI) / 180) *
						Math.cos((point.lat * Math.PI) / 180) *
						Math.sin(dLon / 2) *
						Math.sin(dLon / 2);
				const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
				const segmentDistance = R * c;

				cumulativeDistance += segmentDistance;

				// Calculate pace (min/km)
				const currentTime = new Date(point.time);
				const timeDiff = (currentTime.getTime() - lastTime.getTime()) / 1000 / 60; // minutes
				const pace = segmentDistance > 0 ? timeDiff / segmentDistance : 0;

				// Only add point if pace is reasonable (between 2 and 20 min/km)
				if (pace >= 2 && pace <= 20 && cumulativeDistance > 0.1) {
					points.push({
						distance: cumulativeDistance,
						pace: pace,
						elevation: point.ele
					});
				}

				lastTime = currentTime;
			} else if (point.time) {
				lastTime = new Date(point.time);
			}

			lastPoint = point;
		}

		return points;
	});

	// Elevation profile data
	const elevationProfile = $derived<{ distance: number; elevation: number }[]>(() => {
		if (gpxPoints.length === 0) return [];

		const points: { distance: number; elevation: number }[] = [];
		let cumulativeDistance = 0;
		let lastPoint: GpxPoint | null = null;

		for (const point of gpxPoints) {
			if (point.ele === undefined) continue;

			if (lastPoint) {
				// Calculate distance
				const R = 6371;
				const dLat = ((point.lat - lastPoint.lat) * Math.PI) / 180;
				const dLon = ((point.lon - lastPoint.lon) * Math.PI) / 180;
				const a =
					Math.sin(dLat / 2) * Math.sin(dLat / 2) +
					Math.cos((lastPoint.lat * Math.PI) / 180) *
						Math.cos((point.lat * Math.PI) / 180) *
						Math.sin(dLon / 2) *
						Math.sin(dLon / 2);
				const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
				cumulativeDistance += R * c;
			}

			points.push({
				distance: cumulativeDistance,
				elevation: point.ele
			});

			lastPoint = point;
		}

		return points;
	});

	// Heart rate zones (using 220 - 30 as default max HR if age not available)
	const maxHR = 190; // Estimated max HR
	const hrZones = [
		{ zone: 1, min: maxHR * 0.5, max: maxHR * 0.6, color: 'bg-gray-200', name: 'Zone 1' },
		{ zone: 2, min: maxHR * 0.6, max: maxHR * 0.7, color: 'bg-blue-200', name: 'Zone 2' },
		{ zone: 3, min: maxHR * 0.7, max: maxHR * 0.8, color: 'bg-green-200', name: 'Zone 3' },
		{ zone: 4, min: maxHR * 0.8, max: maxHR * 0.9, color: 'bg-orange-200', name: 'Zone 4' },
		{ zone: 5, min: maxHR * 0.9, max: maxHR * 1.0, color: 'bg-red-200', name: 'Zone 5' }
	];

	const avgHRZone = $derived(() => {
		if (!run.avgHeartRate) return null;
		const zone = hrZones.find((z) => run.avgHeartRate >= z.min && run.avgHeartRate < z.max);
		return zone || hrZones[hrZones.length - 1];
	});
</script>

<div class="container mx-auto p-6 max-w-7xl">
	<!-- Header with back button -->
	<div class="mb-6">
		<Button variant="outline" onclick={() => window.history.back()} class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back
		</Button>

		<h1 class="text-4xl font-bold mb-2">Run Details</h1>
		<p class="text-muted-foreground">
			{format(new Date(run.date), 'EEEE, MMMM d, yyyy')} at {format(
				new Date(run.date),
				'h:mm a'
			)}
		</p>
	</div>

	<!-- Run Summary Header -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<TrendingUp class="h-5 w-5" />
				Run Summary
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Distance</p>
					<p class="text-2xl font-bold">{run.distance.toFixed(2)} km</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Duration</p>
					<p class="text-2xl font-bold">{formatDuration(run.duration)}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Average Pace</p>
					<p class="text-2xl font-bold">{formatPace(run.pace)}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Calories</p>
					<p class="text-2xl font-bold">{run.calories || 'N/A'}</p>
				</div>
			</div>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
				{#if run.elevationGain}
					<div class="space-y-1">
						<p class="text-sm text-muted-foreground flex items-center gap-1">
							<Mountain class="h-4 w-4" />
							Elevation Gain
						</p>
						<p class="text-lg font-semibold">{run.elevationGain.toFixed(0)} m</p>
					</div>
				{/if}
				{#if run.avgHeartRate}
					<div class="space-y-1">
						<p class="text-sm text-muted-foreground flex items-center gap-1">
							<Heart class="h-4 w-4" />
							Avg Heart Rate
						</p>
						<p class="text-lg font-semibold">
							{run.avgHeartRate} bpm
							{#if avgHRZone()}
								<Badge variant="outline" class="ml-2">{avgHRZone().name}</Badge>
							{/if}
						</p>
					</div>
				{/if}
				{#if run.maxHeartRate}
					<div class="space-y-1">
						<p class="text-sm text-muted-foreground">Max Heart Rate</p>
						<p class="text-lg font-semibold">{run.maxHeartRate} bpm</p>
					</div>
				{/if}
				{#if run.stepCount}
					<div class="space-y-1">
						<p class="text-sm text-muted-foreground">Step Count</p>
						<p class="text-lg font-semibold">{run.stepCount.toLocaleString()}</p>
					</div>
				{/if}
			</div>

			{#if run.avgRunningPower || run.avgStrideLength || run.avgGroundContactTime}
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
					{#if run.avgRunningPower}
						<div class="space-y-1">
							<p class="text-sm text-muted-foreground">Avg Power</p>
							<p class="text-lg font-semibold">{run.avgRunningPower.toFixed(0)} W</p>
						</div>
					{/if}
					{#if run.avgStrideLength}
						<div class="space-y-1">
							<p class="text-sm text-muted-foreground">Avg Stride Length</p>
							<p class="text-lg font-semibold">{run.avgStrideLength.toFixed(2)} m</p>
						</div>
					{/if}
					{#if run.avgGroundContactTime}
						<div class="space-y-1">
							<p class="text-sm text-muted-foreground">Avg Ground Contact</p>
							<p class="text-lg font-semibold">{run.avgGroundContactTime.toFixed(0)} ms</p>
						</div>
					{/if}
					{#if run.avgVerticalOscillation}
						<div class="space-y-1">
							<p class="text-sm text-muted-foreground">Avg Vertical Oscillation</p>
							<p class="text-lg font-semibold">{run.avgVerticalOscillation.toFixed(1)} cm</p>
						</div>
					{/if}
				</div>
			{/if}

			{#if run.source}
				<div class="mt-4 pt-4 border-t">
					<Badge variant="outline">Source: {run.source}</Badge>
					{#if run.workoutName}
						<Badge variant="outline" class="ml-2">{run.workoutName}</Badge>
					{/if}
					{#if run.indoorWorkout}
						<Badge variant="outline" class="ml-2">Indoor</Badge>
					{/if}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Split Analysis -->
	{#if splitMetrics.length > 0}
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>Split Analysis</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Split</TableHead>
								<TableHead>Distance</TableHead>
								<TableHead>Time</TableHead>
								<TableHead>Pace</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each splitMetrics as split}
								<TableRow
									class={split.isFastest
										? 'bg-green-50 dark:bg-green-950'
										: split.isSlowest
											? 'bg-red-50 dark:bg-red-950'
											: ''}
								>
									<TableCell class="font-medium">
										{split.splitNumber}
										{#if split.isFastest}
											<Badge variant="outline" class="ml-2 bg-green-100 dark:bg-green-900"
												>Fastest</Badge
											>
										{/if}
										{#if split.isSlowest}
											<Badge variant="outline" class="ml-2 bg-red-100 dark:bg-red-900"
												>Slowest</Badge
											>
										{/if}
									</TableCell>
									<TableCell>{split.distance.toFixed(2)} km</TableCell>
									<TableCell>{formatDuration(split.duration)}</TableCell>
									<TableCell>{formatPace(split.pace)}</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</div>

				<!-- Split Times Bar Chart -->
				<div class="mt-6 h-64">
					<Chart
						data={splitMetrics}
						x="splitNumber"
						xScale={scaleBand().padding(0.2)}
						y="duration"
						yScale={scaleLinear()}
						yDomain={[0, Math.max(...splitMetrics.map((s) => s.duration)) * 1.1]}
						padding={{ top: 16, bottom: 24, left: 40, right: 16 }}
					>
						<Svg>
							<Axis placement="left" grid rule />
							<Axis placement="bottom" rule />
							<Bars
								radius={4}
								strokeWidth={1}
								class="fill-primary stroke-primary"
								getClass={(d) =>
									d.isFastest
										? 'fill-green-500 stroke-green-600'
										: d.isSlowest
											? 'fill-red-500 stroke-red-600'
											: 'fill-primary stroke-primary'}
							/>
							<Labels format={(d) => `Split ${d.splitNumber}`} />
						</Svg>
						<Tooltip
							header={(data) => `Split ${data.splitNumber}`}
							let:data
						>
							<div class="text-sm">
								<div>Time: {formatDuration(data.duration)}</div>
								<div>Pace: {formatPace(data.pace)}</div>
							</div>
						</Tooltip>
					</Chart>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Pace Over Time Chart -->
	{#if paceOverDistance.length > 0}
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>Pace Over Distance</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="h-80">
					<Chart
						data={paceOverDistance}
						x="distance"
						xScale={scaleLinear()}
						y="pace"
						yScale={scaleLinear()}
						yDomain={[
							Math.min(...paceOverDistance.map((p) => p.pace)) * 0.9,
							Math.max(...paceOverDistance.map((p) => p.pace)) * 1.1
						]}
						padding={{ top: 16, bottom: 40, left: 50, right: 16 }}
					>
						<Svg>
							<Axis placement="left" grid rule label="Pace (min/km)" />
							<Axis placement="bottom" rule label="Distance (km)" />
							<Area class="fill-primary/20" line={{ class: 'stroke-primary stroke-2' }} />
						</Svg>
						<Tooltip header={(data) => `${data.distance.toFixed(2)} km`} let:data>
							<div class="text-sm">
								<div>Pace: {formatPace(data.pace)}</div>
								{#if data.elevation !== undefined}
									<div>Elevation: {data.elevation.toFixed(0)} m</div>
								{/if}
							</div>
						</Tooltip>
					</Chart>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Heart Rate Analysis -->
	{#if run.avgHeartRate || run.maxHeartRate}
		<Card class="mb-6">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Heart class="h-5 w-5" />
					Heart Rate Analysis
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						{#if run.avgHeartRate}
							<div class="p-4 border rounded-lg">
								<p class="text-sm text-muted-foreground">Average Heart Rate</p>
								<p class="text-3xl font-bold mt-1">{run.avgHeartRate} <span class="text-base font-normal text-muted-foreground">bpm</span></p>
								{#if avgHRZone()}
									<Badge variant="outline" class="mt-2">{avgHRZone().name} ({Math.round(avgHRZone().min)}-{Math.round(avgHRZone().max)} bpm)</Badge>
								{/if}
							</div>
						{/if}
						{#if run.maxHeartRate}
							<div class="p-4 border rounded-lg">
								<p class="text-sm text-muted-foreground">Maximum Heart Rate</p>
								<p class="text-3xl font-bold mt-1">{run.maxHeartRate} <span class="text-base font-normal text-muted-foreground">bpm</span></p>
								<p class="text-sm text-muted-foreground mt-2">{((run.maxHeartRate / maxHR) * 100).toFixed(0)}% of estimated max</p>
							</div>
						{/if}
					</div>

					<!-- Heart Rate Zones -->
					<div class="mt-6">
						<h4 class="font-semibold mb-3">Heart Rate Zones (Estimated Max: {maxHR} bpm)</h4>
						<div class="space-y-2">
							{#each hrZones as zone}
								<div class="flex items-center gap-3">
									<div class="w-24 text-sm font-medium">{zone.name}</div>
									<div class="flex-1 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
										<div
											class={`h-full ${zone.color} dark:opacity-70 flex items-center px-3 text-sm`}
											style="width: 100%"
										>
											<span class="text-gray-700 dark:text-gray-200"
												>{Math.round(zone.min)}-{Math.round(zone.max)} bpm</span
											>
										</div>
										{#if run.avgHeartRate && avgHRZone()?.zone === zone.zone}
											<div
												class="absolute top-0 h-full w-1 bg-black dark:bg-white"
												style="left: {((run.avgHeartRate - zone.min) / (zone.max - zone.min)) * 100}%"
											></div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Elevation Profile -->
	{#if elevationProfile.length > 0}
		<Card class="mb-6">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Mountain class="h-5 w-5" />
					Elevation Profile
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if run.elevationGain}
					<div class="mb-4 grid grid-cols-2 gap-4">
						<div class="p-3 border rounded-lg">
							<p class="text-sm text-muted-foreground">Total Elevation Gain</p>
							<p class="text-2xl font-bold mt-1">{run.elevationGain.toFixed(0)} m</p>
						</div>
					</div>
				{/if}

				<div class="h-64">
					<Chart
						data={elevationProfile}
						x="distance"
						xScale={scaleLinear()}
						y="elevation"
						yScale={scaleLinear()}
						yDomain={[
							Math.min(...elevationProfile.map((p) => p.elevation)) * 0.98,
							Math.max(...elevationProfile.map((p) => p.elevation)) * 1.02
						]}
						padding={{ top: 16, bottom: 40, left: 50, right: 16 }}
					>
						<Svg>
							<Axis placement="left" grid rule label="Elevation (m)" />
							<Axis placement="bottom" rule label="Distance (km)" />
							<Area class="fill-amber-200 dark:fill-amber-900" line={{ class: 'stroke-amber-600 dark:stroke-amber-400 stroke-2' }} />
						</Svg>
						<Tooltip header={(data) => `${data.distance.toFixed(2)} km`} let:data>
							<div class="text-sm">
								<div>Elevation: {data.elevation.toFixed(0)} m</div>
							</div>
						</Tooltip>
					</Chart>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Notes -->
	{#if run.notes}
		<Card>
			<CardHeader>
				<CardTitle>Notes</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-muted-foreground">{run.notes}</p>
			</CardContent>
		</Card>
	{/if}
</div>
