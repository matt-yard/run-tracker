import { getAllRuns, getRunsByWeek, getRunsByMonth } from '$lib/server/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allRuns = getAllRuns();
	const weeklyData = getRunsByWeek(24); // Last 24 weeks
	const monthlyData = getRunsByMonth(12); // Last 12 months

	// Group runs by distance range
	const distanceRanges = {
		'0-5 km': 0,
		'5-10 km': 0,
		'10-15 km': 0,
		'15-21 km': 0,
		'21+ km': 0
	};

	for (const run of allRuns) {
		if (run.distance < 5) distanceRanges['0-5 km']++;
		else if (run.distance < 10) distanceRanges['5-10 km']++;
		else if (run.distance < 15) distanceRanges['10-15 km']++;
		else if (run.distance < 21) distanceRanges['15-21 km']++;
		else distanceRanges['21+ km']++;
	}

	return {
		weeklyData,
		monthlyData,
		distanceRanges,
		allRuns
	};
};
