const databaseUrl = 'https://celeri.onrender.com'; // or your dev URL

export const fetchCurrentCompetition = async () => {
    const response = await fetch(`${databaseUrl}/competitions/current-competition`);
    if (!response.ok) {
        const err = await response.text();
        console.error('Failed to fetch current competition:', err);
        return null;
    }
    return response.json();
};

export const fetchAllCompetitions = async () => {
    const response = await fetch(`${databaseUrl}/competitions/all-competitions`);
    if (!response.ok) {
        const err = await response.text();
        console.error('Failed to fetch competitions:', err);
        return null;
    }
    return response.json();
};

export const startCompetition = async () => {
    try {
        const response = await fetch(`${databaseUrl}/competitions/start-competition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            const err = await response.text();
            console.error('Failed to start competition:', err);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Network error:', error);
        return null;
    }
};

export const addUser = async (user_id: string) => {
    try {
        const response = await fetch(`${databaseUrl}/competition-steps/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id }),
        });
        console.log('Response status:', response.status);

        if (!response.ok) {
            const err = await response.text();
            console.error('Failed to add user:', err);
            return null;
        }

        // Only parse as JSON if the response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            const text = await response.text();
            console.error('Unexpected response (not JSON):', text);
            return null;
        }
    } catch (error) {
        console.error('Network error:', error);
        return null;
    }
};

export const addSteps = async (user_id: string, steps: number) => {
    try {
        const response = await fetch(`${databaseUrl}/competition-steps/update-steps`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id, steps }),
        })
        console.log('Response:', response);
        if (!response.ok) {
            const err = await response.text();
            console.error('Failed to add steps:', err);
        }
    } catch (error) {
        console.error('Error adding steps:', error);
    }
}

export const users = async () => {
    const response = await fetch(`${databaseUrl}/competition-steps/data`);
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    } else {
        const text = await response.text();
        console.error('Unexpected response (not JSON):', text);
        return null;
    }
}

export const getUserInfo = async (user_id: string) => {
    const response = await fetch(`${databaseUrl}/competition-steps/user-info?user_id=${user_id}`);
    if (!response.ok) {
        const err = await response.text();
        console.error('Failed to fetch user info:', err);
        return null;
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    } else {
        const text = await response.text();
        console.error('Unexpected response (not JSON):', text);
        return null;
    }
}