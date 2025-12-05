import { fail } from '@sveltejs/kit';
import { parseFile } from '$lib/server/parsers';
import { insertRun, runExists } from '$lib/server/database';
import type { Actions } from './$types';

export const actions = {
	upload: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file || file.size === 0) {
			return fail(400, { error: 'No file uploaded' });
		}

		try {
			const content = await file.text();
			const parsedRuns = parseFile(file.name, content);

			let imported = 0;
			let skipped = 0;

			for (const run of parsedRuns) {
				// Check for duplicates
				if (runExists(run.date, run.distance, run.duration)) {
					skipped++;
					continue;
				}

				insertRun(run);
				imported++;
			}

			return {
				success: true,
				imported,
				skipped,
				total: parsedRuns.length
			};
		} catch (error) {
			console.error('Error parsing file:', error);
			return fail(500, {
				error: error instanceof Error ? error.message : 'Failed to parse file'
			});
		}
	}
} satisfies Actions;
