import { store } from '@wordpress/interactivity';

export function getUserHeaders() {
	try {
		const authStore =
			store('prc-user-accounts/content-gate') ||
			store('prc-user-accounts/controller');
		return authStore?.actions?.getUserHeaders() ?? null;
	} catch {
		return null;
	}
}

export function isUserLoggedIn() {
	try {
		const authStore =
			store('prc-user-accounts/content-gate') ||
			store('prc-user-accounts/controller');
		return authStore?.actions?.isUserLoggedIn() ?? false;
	} catch {
		return false;
	}
}
