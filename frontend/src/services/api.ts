import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const searchRabbitHole = async (params: {
    query: string;
    previousConversation?: Array<{ user?: string; assistant?: string }>;
    concept?: string;
    followUpMode?: "expansive" | "focused";
}, signal?: AbortSignal) => {
    const response = await api.post('/rabbitholes/search', params, { signal });
    return response.data;
};

// Global interceptor to catch 401/403 Authorization errors (expired or invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Token is invalid/expired
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            window.location.reload(); // Reload the window to reset the AuthContext and UI state
        }
        return Promise.reject(error);
    }
);

export default api; 