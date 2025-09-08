import axios from 'axios';
import { api } from './api';

export const addCompetitionUser = async (user_id: string, referral_id: string | null) => {
    try {
        const response = await api.post(`/competition-steps/add-user`,
            { user_id, referral_id }
        );
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to add user:', error);
            return null;
        }
    }
};

export const updateCompetitionSteps = async (user_id: string, steps: number, minute: number) => {
    try {
        const response = await api.post(`/competition-steps/update-steps`,
            { user_id, steps, minute }
        );
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data  ;
        } else {
            console.error('Failed to add steps:', error);
            return null;
        }
    }
};

export const setCompetitionSteps = async (user_id: string, totalSteps: number, elapsedMin: number) => {
    try {
        const response = await api.post(`/competition-steps/set-steps`,
            { user_id, totalSteps, elapsedMin }
        );
        return response.data;
    } catch (error: any) {
        console.error('Failed to set steps:', error);
        return null;
    }
};
export const getCurrentCompetitionData = async () => {
    try {
        const response = await api.get(`/competition-steps/current-data`);
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to fetch competition data:', error);
            return null;
        }
    }
}

export const getCompetitionData = async (competition_id: string) => {
    try {
        const response = await api.get(`/competition-steps/data?competition_id=${competition_id}`);
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to fetch competition data:', error);
            return null;
        }
    }
}

export const getCompetitionUserInfo = async (user_id: string) => {
    try {
        const response = await api.get(`/competition-steps/user-info?user_id=${user_id}`);
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to fetch user info:', error);
            return null;
        }
    }
}

export const getCompetitionHasSeenResults = async (user_id: string) => {
    try {
        const response = await api.get(`/competition-steps/has-seen-results?user_id=${user_id}`);
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to fetch competition has seen results:', error);
            return null;
        }
    }
}

export const setCompetitionHasSeenResults = async (user_id: string, competition_id: string) => {
    try {
        const response = await api.post(`/competition-steps/has-seen-results`,
            { user_id, competition_id }
        );
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to set competition has seen results:', error);
            return null;
        }
    }
}

export const getReferralsData = async (competition_id: string) => {
    try {
        const response = await api.get(`/competition-steps/referrals?competition_id=${competition_id}`);
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to fetch referrals data:', error);
            return null;
        }
    }
}

export const getCompetitionTallyingResults = async () => {
    try {
        const response = await api.get(`/competition-steps/tallying-results`);
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            return error.response.data;
        } else {
            console.error('Failed to fetch referrals data:', error);
            return null;
        }
    }
}