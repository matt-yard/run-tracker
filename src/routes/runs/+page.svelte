<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
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
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let searchTerm = $state('');
	let sortBy = $state<'date' | 'distance' | 'pace'>('date');
	let sortDirection = $state<'asc' | 'desc'>('desc');
	let deleteConfirmId = $state<number | null>(null);

	let filteredRuns = $derived(() => {
		let runs = [...data.runs];

		// Filter by search term
		if (searchTerm) {
			runs = runs.filter(
				(run) =>
					format(new Date(run.date), 'MMM d, yyyy').toLowerCase().includes(searchTerm.toLowerCase()) ||
					run.source.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Sort
		runs.sort((a, b) => {
			let comparison = 0;
			switch (sortBy) {
				case 'date':
					comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
					break;
				case 'distance':
					comparison = a.distance - b.distance;
					break;
				case 'pace':
					comparison = a.pace - b.pace;
					break;
			}
			return sortDirection === 'asc' ? comparison : -comparison;
		});

		return runs;
	});

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

	function toggleSort(column: 'date' | 'distance' | 'pace') {
		if (sortBy === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sortDirection = 'desc';
		}
	}

	function handleExport() {
		const csv = form?.csv;
		if (csv) {
			const blob = new Blob([csv], { type: 'text/csv' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `running-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
			a.click();
			URL.revokeObjectURL(url);
		}
	}

	// Auto-download CSV when export action completes
	$effect(() => {
		if (form?.csv) {
			handleExport();
		}
	});
</script>

<div class="container mx-auto py-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-4xl font-bold">All Runs</h1>
		<div class="space-x-2">
			<form method="POST" action="?/export" use:enhance>
				<Button type="submit" variant="outline">Export to CSV</Button>
			</form>
			<Button href="/">Back to Dashboard</Button>
		</div>
	</div>

	<Card>
		<CardHeader>
			<div class="flex justify-between items-center">
				<CardTitle>Run History ({data.runs.length} total)</CardTitle>
				<div class="w-64">
					<Input
						type="text"
						placeholder="Search runs..."
						bind:value={searchTerm}
					/>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			{#if filteredRuns().length === 0}
				<div class="text-center py-12">
					<p class="text-muted-foreground mb-4">
						{searchTerm ? 'No runs match your search' : 'No runs recorded yet'}
					</p>
					{#if !searchTerm}
						<Button href="/upload">Upload Your First Run</Button>
					{/if}
				</div>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								<button
									onclick={() => toggleSort('date')}
									class="flex items-center gap-1 hover:text-foreground"
								>
									Date
									{#if sortBy === 'date'}
										<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</button>
							</TableHead>
							<TableHead>
								<button
									onclick={() => toggleSort('distance')}
									class="flex items-center gap-1 hover:text-foreground"
								>
									Distance
									{#if sortBy === 'distance'}
										<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</button>
							</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead>
								<button
									onclick={() => toggleSort('pace')}
									class="flex items-center gap-1 hover:text-foreground"
								>
									Pace
									{#if sortBy === 'pace'}
										<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</button>
							</TableHead>
							<TableHead>Heart Rate</TableHead>
							<TableHead>Elevation</TableHead>
							<TableHead>Calories</TableHead>
							<TableHead>Source</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each filteredRuns() as run}
							<TableRow>
								<TableCell class="font-medium">
									{format(new Date(run.date), 'MMM d, yyyy')}
									<div class="text-xs text-muted-foreground">
										{format(new Date(run.date), 'h:mm a')}
									</div>
								</TableCell>
								<TableCell>{run.distance.toFixed(2)} km</TableCell>
								<TableCell>{formatDuration(run.duration)}</TableCell>
								<TableCell>{formatPace(run.pace)}</TableCell>
								<TableCell>
									{#if run.avgHeartRate}
										{run.avgHeartRate} bpm
										{#if run.maxHeartRate}
											<div class="text-xs text-muted-foreground">max: {run.maxHeartRate}</div>
										{/if}
									{:else}
										<span class="text-muted-foreground">-</span>
									{/if}
								</TableCell>
								<TableCell>
									{#if run.elevationGain}
										{run.elevationGain.toFixed(0)} m
									{:else}
										<span class="text-muted-foreground">-</span>
									{/if}
								</TableCell>
								<TableCell>
									{#if run.calories}
										{run.calories} kcal
									{:else}
										<span class="text-muted-foreground">-</span>
									{/if}
								</TableCell>
								<TableCell>
									<Badge variant="outline">{run.source}</Badge>
								</TableCell>
								<TableCell>
									{#if deleteConfirmId === run.id}
										<div class="flex gap-2">
											<form method="POST" action="?/delete" use:enhance>
												<input type="hidden" name="id" value={run.id} />
												<Button type="submit" variant="destructive" size="sm">Confirm</Button>
											</form>
											<Button
												variant="outline"
												size="sm"
												onclick={() => (deleteConfirmId = null)}
											>
												Cancel
											</Button>
										</div>
									{:else}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => (deleteConfirmId = run.id)}
										>
											Delete
										</Button>
									{/if}
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{/if}
		</CardContent>
	</Card>
</div>
