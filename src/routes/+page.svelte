<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { format } from 'date-fns';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatPace(pace: number): string {
		const mins = Math.floor(pace);
		const secs = Math.round((pace - mins) * 60);
		return `${mins}:${secs.toString().padStart(2, '0')} /km`;
	}

	function formatDuration(minutes: number): string {
		const hrs = Math.floor(minutes / 60);
		const mins = Math.round(minutes % 60);
		if (hrs > 0) {
			return `${hrs}h ${mins}m`;
		}
		return `${mins}m`;
	}
</script>

<div class="container mx-auto py-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-4xl font-bold">Running Tracker</h1>
		<div class="space-x-2">
			<Button href="/upload">Upload Data</Button>
			<Button href="/runs" variant="outline">View All Runs</Button>
			<Button href="/stats" variant="outline">Statistics</Button>
		</div>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<Card>
			<CardHeader>
				<CardTitle>This Week</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					<div>
						<p class="text-3xl font-bold">{data.stats.week.count}</p>
						<p class="text-sm text-muted-foreground">runs</p>
					</div>
					<div>
						<p class="text-2xl font-semibold">{(data.stats.week.totalDistance || 0).toFixed(1)} km</p>
						<p class="text-sm text-muted-foreground">total distance</p>
					</div>
					{#if data.stats.week.avgPace}
						<div>
							<p class="text-lg">{formatPace(data.stats.week.avgPace)}</p>
							<p class="text-sm text-muted-foreground">avg pace</p>
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>This Month</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					<div>
						<p class="text-3xl font-bold">{data.stats.month.count}</p>
						<p class="text-sm text-muted-foreground">runs</p>
					</div>
					<div>
						<p class="text-2xl font-semibold">{(data.stats.month.totalDistance || 0).toFixed(1)} km</p>
						<p class="text-sm text-muted-foreground">total distance</p>
					</div>
					{#if data.stats.month.avgPace}
						<div>
							<p class="text-lg">{formatPace(data.stats.month.avgPace)}</p>
							<p class="text-sm text-muted-foreground">avg pace</p>
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>This Year</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					<div>
						<p class="text-3xl font-bold">{data.stats.year.count}</p>
						<p class="text-sm text-muted-foreground">runs</p>
					</div>
					<div>
						<p class="text-2xl font-semibold">{(data.stats.year.totalDistance || 0).toFixed(1)} km</p>
						<p class="text-sm text-muted-foreground">total distance</p>
					</div>
					{#if data.stats.year.avgPace}
						<div>
							<p class="text-lg">{formatPace(data.stats.year.avgPace)}</p>
							<p class="text-sm text-muted-foreground">avg pace</p>
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Personal Records -->
	<Card class="mb-8">
		<CardHeader>
			<CardTitle>Personal Records</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#if data.personalRecords.fastestPace}
					<div>
						<p class="text-sm font-medium text-muted-foreground mb-1">Fastest Pace</p>
						<p class="text-2xl font-bold">{formatPace(data.personalRecords.fastestPace.pace)}</p>
						<p class="text-sm text-muted-foreground mt-1">
							{format(new Date(data.personalRecords.fastestPace.date), 'MMM d, yyyy')}
						</p>
					</div>
				{/if}

				{#if data.personalRecords.longestDistance}
					<div>
						<p class="text-sm font-medium text-muted-foreground mb-1">Longest Distance</p>
						<p class="text-2xl font-bold">{data.personalRecords.longestDistance.distance.toFixed(2)} km</p>
						<p class="text-sm text-muted-foreground mt-1">
							{format(new Date(data.personalRecords.longestDistance.date), 'MMM d, yyyy')}
						</p>
					</div>
				{/if}

				{#if data.personalRecords.longestDuration}
					<div>
						<p class="text-sm font-medium text-muted-foreground mb-1">Longest Duration</p>
						<p class="text-2xl font-bold">{formatDuration(data.personalRecords.longestDuration.duration)}</p>
						<p class="text-sm text-muted-foreground mt-1">
							{format(new Date(data.personalRecords.longestDuration.date), 'MMM d, yyyy')}
						</p>
					</div>
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Recent Runs -->
	<Card>
		<CardHeader>
			<CardTitle>Recent Runs</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.recentRuns.length === 0}
				<div class="text-center py-12">
					<p class="text-muted-foreground mb-4">No runs recorded yet</p>
					<Button href="/upload">Upload Your First Run</Button>
				</div>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Distance</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead>Pace</TableHead>
							<TableHead>Source</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.recentRuns as run}
							<TableRow>
								<TableCell>{format(new Date(run.date), 'MMM d, yyyy')}</TableCell>
								<TableCell>{run.distance.toFixed(2)} km</TableCell>
								<TableCell>{formatDuration(run.duration)}</TableCell>
								<TableCell>{formatPace(run.pace)}</TableCell>
								<TableCell>
									<Badge variant="outline">{run.source}</Badge>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</CardContent>
	</Card>
</div>
