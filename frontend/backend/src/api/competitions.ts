import { api } from '../api';

export const fetchCurrentCompetition = async () => {
    const response = await api.get(`/competitions/current-competition`);
    return response.data;
};

export const fetchAllCompetitions = async () => {
    const response = await api.get(`/competitions/all-competitions`);
    return response.data;
};

export const startCompetition = async () => {
    const response = await api.post(`/competitions/start-competition`);
    if (response.status !== 200) {
        const err = await response.data;
        console.error('Failed to start competition:', err);
        return null;
    }
    return response.data;
};