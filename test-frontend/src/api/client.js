const BASE_URL = '/dev-api';

async function request(path, options = {}) {
    const token = localStorage.getItem('mindecho_token');

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (response.status === 401) {
        localStorage.removeItem('mindecho_token');
        window.location.hash = '#/login';
        throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
}

export function get(path) {
    return request(path, { method: 'GET' });
}

export function post(path, body) {
    return request(path, { method: 'POST', body: JSON.stringify(body) });
}

export function del(path) {
    return request(path, { method: 'DELETE' });
}
