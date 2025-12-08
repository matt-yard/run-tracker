import { browser } from '$app/environment';

function createDarkModeStore() {
	let darkMode = $state(false);

	function updateDOMClass(isDark: boolean) {
		if (browser) {
			if (isDark) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	}

	// Initialize from localStorage or system preference
	if (browser) {
		const stored = localStorage.getItem('darkMode');
		if (stored !== null) {
			darkMode = stored === 'true';
		} else {
			// Check system preference
			darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		// Apply initial state
		updateDOMClass(darkMode);
	}

	return {
		get value() {
			return darkMode;
		},
		toggle() {
			darkMode = !darkMode;
			if (browser) {
				localStorage.setItem('darkMode', darkMode.toString());
				updateDOMClass(darkMode);
			}
		},
		set(value: boolean) {
			darkMode = value;
			if (browser) {
				localStorage.setItem('darkMode', darkMode.toString());
				updateDOMClass(darkMode);
			}
		}
	};
}

export const darkModeStore = createDarkModeStore();
