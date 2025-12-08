/**
 * Unit conversion utilities for distance and pace
 */

import type { UnitSystem } from '$lib/stores/unitPreference.svelte';

// Conversion constants
const KM_TO_MILES = 0.621371;
const MILES_TO_KM = 1.60934;

/**
 * Convert distance from kilometers to the target unit
 * @param km Distance in kilometers
 * @param targetUnit Target unit system
 * @returns Distance in the target unit
 */
export function convertDistance(km: number, targetUnit: UnitSystem): number {
	if (targetUnit === 'imperial') {
		return km * KM_TO_MILES;
	}
	return km;
}

/**
 * Convert pace from min/km to the target unit
 * @param minPerKm Pace in minutes per kilometer
 * @param targetUnit Target unit system
 * @returns Pace in the target unit (min/km or min/mi)
 */
export function convertPace(minPerKm: number, targetUnit: UnitSystem): number {
	if (targetUnit === 'imperial') {
		return minPerKm * MILES_TO_KM;
	}
	return minPerKm;
}

/**
 * Format distance with appropriate unit label
 * @param km Distance in kilometers (source data)
 * @param unit Unit system to display in
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted distance string (e.g., "5.2 km" or "3.2 mi")
 */
export function formatDistance(km: number, unit: UnitSystem, decimals: number = 2): string {
	const distance = convertDistance(km, unit);
	const unitLabel = unit === 'metric' ? 'km' : 'mi';
	return `${distance.toFixed(decimals)} ${unitLabel}`;
}

/**
 * Format pace with appropriate unit label
 * @param minPerKm Pace in minutes per kilometer (source data)
 * @param unit Unit system to display in
 * @returns Formatted pace string (e.g., "5:30/km" or "8:51/mi")
 */
export function formatPace(minPerKm: number, unit: UnitSystem): string {
	const pace = convertPace(minPerKm, unit);
	const mins = Math.floor(pace);
	const secs = Math.round((pace - mins) * 60);
	const unitLabel = unit === 'metric' ? 'km' : 'mi';
	return `${mins}:${secs.toString().padStart(2, '0')}/${unitLabel}`;
}

/**
 * Format duration (unchanged by unit system)
 * @param minutes Duration in minutes
 * @returns Formatted duration string (e.g., "1h 15m" or "45m")
 */
export function formatDuration(minutes: number): string {
	const hrs = Math.floor(minutes / 60);
	const mins = Math.round(minutes % 60);
	if (hrs > 0) {
		return `${hrs}h ${mins}m`;
	}
	return `${mins}m`;
}
