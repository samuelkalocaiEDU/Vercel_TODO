const API_BASE_URL = 'https://samkal.pythonanywhere.com'.replace(/\/$/, '');

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type TodoItem = {
	id: string;
	title: string;
	priority: 'normal' | 'important';
	completed: boolean;
	created_at: string;
	updated_at: string;
};

export type ProfileItem = {
	id: string;
	name: string;
	email: string;
};

function getCookieValue(name: string): string {
	if (typeof document === 'undefined') return '';
	const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : '';
}

async function apiRequest<T>(path: string, method: HttpMethod, body?: unknown): Promise<T> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (method !== 'GET') {
		const csrfToken = getCookieValue('csrf_access_token');
		if (csrfToken) {
			headers['X-CSRF-TOKEN'] = csrfToken;
		}
	}

	const response = await fetch(`${API_BASE_URL}${path}`, {
		method,
		credentials: 'include',
		headers,
		body: body ? JSON.stringify(body) : undefined
	});

	if (!response.ok) {
		const fallbackMessage = `HTTP ${response.status}`;
		let message = fallbackMessage;
		try {
			const data = (await response.json()) as { error?: string; message?: string };
			message = data.error || data.message || fallbackMessage;
		} catch {
			message = fallbackMessage;
		}
		throw new Error(message);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

export const api = {
	login: (email: string, password: string) => apiRequest<{ email: string; message: string }>('/login', 'POST', { email, password }),
	signup: (email: string, password: string, name?: string) => apiRequest<{ id: string; email: string }>('/signup', 'POST', { email, password, name }),
	logout: () => apiRequest<{ message: string }>('/logout', 'POST'),
	profile: () => apiRequest<ProfileItem>('/profile', 'GET'),
	updateProfile: (payload: { name?: string }) => apiRequest<ProfileItem>('/profile', 'POST', payload),
	updatePassword: (payload: { current_password: string; new_password: string }) => apiRequest<{ message: string }>('/profile/password', 'POST', payload),
	getTodos: () => apiRequest<TodoItem[]>('/todos', 'GET'),
	createTodo: (title: string, priority: 'normal' | 'important' = 'normal') => apiRequest<TodoItem>('/todos', 'POST', { title, priority }),
	updateTodo: (id: string, payload: { title?: string; priority?: 'normal' | 'important'; completed?: boolean }) => apiRequest<TodoItem>(`/todos/${id}`, 'PATCH', payload),
	deleteTodo: (id: string) => apiRequest<{ message: string }>(`/todos/${id}`, 'DELETE')
};