<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { api } from '$lib/api';

	onMount(async () => {
		try {
			await api.profile();
			goto('/dashboard');
		} catch {
			goto('/login');
		}
	});
</script>

<p style="padding: 1rem; color: #64748b;">Přesměrování...</p>
