import { Node, Edge } from 'reactflow';
import api from './api';

export interface ConversationMessage {
    user?: string;
    assistant?: string;
}

export interface RabbitHoleExport {
    version: string;
    type?: string;
    query?: string;
    currentConcept?: string;
    conversationHistory?: ConversationMessage[];
    nodes?: Node[];
    edges?: Edge[];
    branchQuestions?: string[];
}

export interface HistorySession extends RabbitHoleExport {
    id: string;
    timestamp: number;
}


const getToken = () => localStorage.getItem('auth_token');

export const getHistorySessions = async (): Promise<HistorySession[]> => {
    try {
        const token = getToken();
        if (token) {
            const response = await api.get('/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data || [];
        } else {
            // Do not use localStorage, return empty if not logged in
            return [];
        }
    } catch (error) {
        console.error('Failed to parse history sessions', error);
        return [];
    }
};

export const saveHistorySession = async (session: HistorySession): Promise<HistorySession | void> => {
    try {
        if (!session.query) {
            session.query = 'Untitled Journey';
        }

        const token = getToken();
        if (token) {
            await api.post('/history', session, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return session;
        }
        // If not logged in, we do not auto-save history
    } catch (error) {
        console.error('Failed to save history session', error);
    }
};

export const deleteHistorySession = async (id: string): Promise<void> => {
    try {
        const token = getToken();
        if (token) {
            await api.delete(`/history/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        }
    } catch (error) {
        console.error('Failed to delete history session', error);
    }
};

export const renameHistorySession = async (id: string, newName: string): Promise<void> => {
    try {
        const token = getToken();
        if (token) {
            await api.put(`/history/${id}`, { newName }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        }
    } catch (error) {
        console.error('Failed to rename history session', error);
    }
};
