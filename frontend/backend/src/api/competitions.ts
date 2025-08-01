import { api } from '../api';
import axios from 'axios';

export const fetchCurrentCompetition = async () => {
    try {
        const response = await api.get(`/competitions/current-competition`);
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to fetch current competition:', error);
            return null;
        }
    }
};

export const fetchAllCompetitions = async () => {
    try {
        const response = await api.get(`/competitions/all-competitions`);
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to fetch all competitions:', error);
            return null;
        }
    }
};

export const startCompetition = async () => {
    try {
        const response = await api.post(`/competitions/start-competition`);
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to start competition:', error);
            return null;
        }
    }
};