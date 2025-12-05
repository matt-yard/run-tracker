import { browser } from '$app/environment';

export interface UserPreferences {
	maxHeartRate: number;
	age?: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
	maxHeartRate: 190,
	age: 30
};

export function getUserPreferences(): UserPreferences {
	if (!browser) {
		return DEFAULT_PREFERENCES;
	}

	const saved = localStorage.getItem('userPreferences');
	if (saved) {
		try {
			const prefs = JSON.parse(saved);
			return {
				maxHeartRate: prefs.maxHeartRate || DEFAULT_PREFERENCES.maxHeartRate,
				age: prefs.age
			};
		} catch (e) {
			console.error('Failed to load preferences:', e);
			return DEFAULT_PREFERENCES;
		}
	}

	return DEFAULT_PREFERENCES;
}

export function saveUserPreferences(prefs: UserPreferences): void {
	if (browser) {
		localStorage.setItem('userPreferences', JSON.stringify(prefs));
	}
}

export function getHeartRateZones(maxHeartRate: number) {
	return [
		{
			zone: 1,
			min: maxHeartRate * 0.5,
			max: maxHeartRate * 0.6,
			color: 'bg-gray-200 dark:bg-gray-700',
			name: 'Zone 1',
			description: 'Recovery'
		},
		{
			zone: 2,
			min: maxHeartRate * 0.6,
			max: maxHeartRate * 0.7,
			color: 'bg-blue-200 dark:bg-blue-700',
			name: 'Zone 2',
			description: 'Aerobic'
		},
		{
			zone: 3,
			min: maxHeartRate * 0.7,
			max: maxHeartRate * 0.8,
			color: 'bg-green-200 dark:bg-green-700',
			name: 'Zone 3',
			description: 'Tempo'
		},
		{
			zone: 4,
			min: maxHeartRate * 0.8,
			max: maxHeartRate * 0.9,
			color: 'bg-orange-200 dark:bg-orange-700',
			name: 'Zone 4',
			description: 'Threshold'
		},
		{
			zone: 5,
			min: maxHeartRate * 0.9,
			max: maxHeartRate * 1.0,
			color: 'bg-red-200 dark:bg-red-700',
			name: 'Zone 5',
			description: 'Maximum'
		}
	];
}
