/**
 * Unit preference store using Svelte 5 runes
 * Manages user preference for metric vs imperial units
 */

import { browser } from '$app/environment';

export type UnitSystem = 'metric' | 'imperial';

class UnitPreferenceStore {
	unit = $state<UnitSystem>('metric');

	constructor() {
		// Load from localStorage on initialization (browser only)
		if (browser) {
			const stored = localStorage.getItem('unitPreference');
			if (stored === 'metric' || stored === 'imperial') {
				this.unit = stored;
			}
		}

		// Watch for changes and persist to localStorage
		$effect(() => {
			if (browser) {
				localStorage.setItem('unitPreference', this.unit);
			}
		});
	}

	toggle() {
		this.unit = this.unit === 'metric' ? 'imperial' : 'metric';
	}

	setUnit(unit: UnitSystem) {
		this.unit = unit;
	}
}

export const unitPreference = new UnitPreferenceStore();
