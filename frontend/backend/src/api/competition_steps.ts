import { api } from '../api';

export const addCompetitionUser = async (user_id: string) => {
    const response = await api.post(`/competition-steps/add-user`, {
        params: { user_id }
    });
    if (response.status !== 200) {
        const err = await response.data;
        console.error('Failed to add user:', err);
        return null;
    }
    return response.data;
};

export const addCompetitionSteps = async (user_id: string, steps: number) => {
    const response = await api.post(`/competition-steps/update-steps`, {
        params: { user_id, steps }
    });
    if (response.status !== 200) {
        const err = await response.data;
        console.error('Failed to add steps:', err);
        return null;
    }
    return response.data;
};

export const getCompetitionData = async () => {
    const response = await api.get(`/competition-steps/data`);
    if (response.status !== 200) {
        const err = await response.data;
        console.error('Failed to fetch competition data:', err);
        return null;
    }
    return response.data;
}

export const getCompetitionUserInfo = async (user_id: string) => {
    const response = await api.get(`/competition-steps/user-info?user_id=${user_id}`);
    if (response.status !== 200) {
        const err = await response.data;
        console.error('Failed to fetch user info:', err);
        return null;
    }
    return response.data;
}