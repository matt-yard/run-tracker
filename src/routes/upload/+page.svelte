<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import DarkModeToggle from '$lib/components/DarkModeToggle.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let uploading = $state(false);
	let fileInput: HTMLInputElement;
	let selectedFile = $state<File | null>(null);

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
		}
	}

	function handleSubmit() {
		uploading = true;
	}
</script>

<div class="container mx-auto py-8 max-w-4xl">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-4xl font-bold">Upload Run Data</h1>
		<div class="flex items-center space-x-2">
			<DarkModeToggle />
			<Button href="/">Back to Dashboard</Button>
		</div>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Import from File</CardTitle>
		</CardHeader>
		<CardContent>
			<form method="POST" action="?/upload" enctype="multipart/form-data" onsubmit={handleSubmit}>
				<div class="space-y-4">
					<div>
						<label for="file" class="block text-sm font-medium mb-2">
							Select a file to upload
						</label>
						<Input
							id="file"
							name="file"
							type="file"
							accept=".xml,.gpx,.csv"
							bind:this={fileInput}
							onchange={handleFileChange}
							required
						/>
						<p class="text-sm text-muted-foreground mt-2">
							Supported formats: Apple Health XML, GPX, CSV
						</p>
					</div>

					{#if selectedFile}
						<div class="text-sm">
							<p class="font-medium">Selected file:</p>
							<p class="text-muted-foreground">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</p>
						</div>
					{/if}

					<Button type="submit" disabled={uploading || !selectedFile}>
						{uploading ? 'Uploading...' : 'Upload and Import'}
					</Button>
				</div>
			</form>

			{#if form?.success}
				<div class="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
					<p class="text-green-800 dark:text-green-200 font-medium">Upload successful!</p>
					<p class="text-green-700 dark:text-green-300 text-sm mt-1">
						Imported {form.imported} runs, skipped {form.skipped} duplicates out of {form.total} total runs.
					</p>
				</div>
			{/if}

			{#if form?.error}
				<div class="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<p class="text-red-800 dark:text-red-200 font-medium">Upload failed</p>
					<p class="text-red-700 dark:text-red-300 text-sm mt-1">{form.error}</p>
				</div>
			{/if}
		</CardContent>
	</Card>

	<div class="mt-8">
		<Card>
			<CardHeader>
				<CardTitle>Supported File Formats</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div>
						<h3 class="font-semibold mb-1">Apple Health XML</h3>
						<p class="text-sm text-muted-foreground">
							Export your health data from iPhone Settings → Privacy → Health → Export Health Data.
							The app will extract running workouts with distance, duration, and calories.
						</p>
					</div>

					<div>
						<h3 class="font-semibold mb-1">GPX Files</h3>
						<p class="text-sm text-muted-foreground">
							GPS track files with coordinates, elevation, and timestamps. Common export format from
							fitness apps and watches.
						</p>
					</div>

					<div>
						<h3 class="font-semibold mb-1">CSV Files</h3>
						<p class="text-sm text-muted-foreground">
							Spreadsheet data with columns for date, distance, duration, and optional fields like
							heart rate and elevation. The app will auto-detect column names.
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
