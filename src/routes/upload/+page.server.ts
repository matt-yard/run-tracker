import { fail } from '@sveltejs/kit';
import { parseFileFromPath } from '$lib/server/parsers';
import { insertRun, runExists } from '$lib/server/database';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { Actions } from './$types';

export const actions = {
	upload: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file || file.size === 0) {
			return fail(400, { error: 'No file uploaded' });
		}

		// Create a temporary file path
		const tempDir = join(tmpdir(), 'run-tracker');
		const tempFileName = `${randomBytes(16).toString('hex')}-${file.name}`;
		const tempFilePath = join(tempDir, tempFileName);

		try {
			// Ensure temp directory exists
			await mkdir(tempDir, { recursive: true });

			// Write uploaded file to disk
			const arrayBuffer = await file.arrayBuffer();
			await writeFile(tempFilePath, Buffer.from(arrayBuffer));

			// Parse from file path (supports large files via streaming)
			const parsedRuns = await parseFileFromPath(file.name, tempFilePath);

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

			// Clean up temp file
			await unlink(tempFilePath);

			return {
				success: true,
				imported,
				skipped,
				total: parsedRuns.length
			};
		} catch (error) {
			// Clean up temp file on error
			try {
				await unlink(tempFilePath);
			} catch {
				// Ignore cleanup errors
			}

			console.error('Error parsing file:', error);
			return fail(500, {
				error: error instanceof Error ? error.message : 'Failed to parse file'
			});
		}
	}
} satisfies Actions;
