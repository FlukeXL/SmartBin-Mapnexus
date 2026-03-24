// frontend/js/api.js - Optional centralized API calls
window.CityAPI = {
    getPM25: async () => {
        const res = await fetch(`${window.SuperMapAPI.baseUrl}/pm25`);
        return await res.json();
    },
    getEvents: async () => {
        const res = await fetch(`${window.SuperMapAPI.baseUrl}/event`);
        return await res.json();
    },
    login: async (email, password) => {
        const res = await fetch(`${window.SuperMapAPI.baseUrl}/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return await res.json();
    },
    register: async (username, email, password) => {
        const res = await fetch(`${window.SuperMapAPI.baseUrl}/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        return await res.json();
    },
    createCheckin: async (userId, placeId) => {
        const res = await fetch(`${window.SuperMapAPI.baseUrl}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, placeId })
        });
        return await res.json();
    },
    getProfile: async (userId) => {
        const res = await fetch(`${window.SuperMapAPI.baseUrl}/user/profile/${userId}`);
        return await res.json();
    }
};
