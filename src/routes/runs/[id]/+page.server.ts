import { getRun } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const runId = parseInt(params.id);

	if (isNaN(runId)) {
		throw error(400, 'Invalid run ID');
	}

	const run = getRun(runId);

	if (!run) {
		throw error(404, 'Run not found');
	}

	return {
		run
	};
};
