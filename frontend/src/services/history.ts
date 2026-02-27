import { Node, Edge } from 'reactflow';

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

const HISTORY_KEY = 'rabbitholes_history';

export const getHistorySessions = (): HistorySession[] => {
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed.sort((a, b) => b.timestamp - a.timestamp) : [];
    } catch (error) {
        console.error('Failed to parse history sessions', error);
        return [];
    }
};

export const saveHistorySession = (session: HistorySession): void => {
    try {
        const sessions = getHistorySessions();
        const existingIndex = sessions.findIndex(s => s.id === session.id);

        if (existingIndex >= 0) {
            sessions[existingIndex] = session;
        } else {
            sessions.push(session);
        }

        // Quick validation before saving
        if (!session.query) {
            // If the node has only loading or no labels, we might extract something, but fallback
            session.query = 'Untitled Journey';
        }

        localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
    } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded. Try deleting old sessions.');
        } else {
            console.error('Failed to save history session', error);
        }
    }
};

export const deleteHistorySession = (id: string): void => {
    try {
        const sessions = getHistorySessions();
        const updated = sessions.filter(s => s.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Failed to delete history session', error);
    }
};

export const renameHistorySession = (id: string, newName: string): void => {
    try {
        const sessions = getHistorySessions();
        const existingIndex = sessions.findIndex(s => s.id === id);
        if (existingIndex >= 0) {
            sessions[existingIndex].query = newName;
            localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
        }
    } catch (error) {
        console.error('Failed to rename history session', error);
    }
};
