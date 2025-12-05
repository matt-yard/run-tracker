import { getRuns, getStats, getPersonalRecords, getRunsByWeek } from '$lib/server/database';
import { subDays, subMonths, subYears, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const now = new Date();
	const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
	const monthStart = startOfMonth(now);
	const yearStart = startOfYear(now);

	const allRuns = getRuns(10); // Get last 10 runs for recent runs list
	const weekStats = getStats(weekStart.toISOString());
	const monthStats = getStats(monthStart.toISOString());
	const yearStats = getStats(yearStart.toISOString());
	const personalRecords = getPersonalRecords();
	const weeklyData = getRunsByWeek(12);

	return {
		recentRuns: allRuns,
		stats: {
			week: weekStats,
			month: monthStats,
			year: yearStats
		},
		personalRecords,
		weeklyData
	};
};
