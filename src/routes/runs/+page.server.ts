import { getAllRuns, deleteRun, exportToCsv } from '$lib/server/database';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		runs: getAllRuns()
	};
};

export const actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) {
			return fail(400, { error: 'No run ID provided' });
		}

		const success = deleteRun(Number(id));

		if (!success) {
			return fail(404, { error: 'Run not found' });
		}

		return { success: true };
	},

	export: async () => {
		const csv = exportToCsv();
		return {
			success: true,
			csv
		};
	}
} satisfies Actions;
