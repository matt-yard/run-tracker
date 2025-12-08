/**
 * Unit preference store using Svelte 5 runes
 * Manages user preference for metric vs imperial units
 */

import { browser } from '$app/environment';

export type UnitSystem = 'metric' | 'imperial';

// Load initial value from localStorage
function getInitialUnit(): UnitSystem {
	if (browser) {
		const stored = localStorage.getItem('unitPreference');
		if (stored === 'metric' || stored === 'imperial') {
			return stored;
		}
	}
	return 'metric';
}

class UnitPreferenceStore {
	unit = $state<UnitSystem>(getInitialUnit());

	toggle() {
		this.unit = this.unit === 'metric' ? 'imperial' : 'metric';
		this.save();
	}

	setUnit(unit: UnitSystem) {
		this.unit = unit;
		this.save();
	}

	private save() {
		if (browser) {
			localStorage.setItem('unitPreference', this.unit);
		}
	}
}

export const unitPreference = new UnitPreferenceStore();
