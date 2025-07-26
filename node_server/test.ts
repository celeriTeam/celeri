// const databaseUrl = 'https://celeri.onrender.com';
const databaseUrl = 'http://localhost:3000';
// COMPETITIONS API
const fetchCompetitions = async () => {
    const response = await fetch(`${databaseUrl}/competitions/current-competition`);
    if (!response.ok) {
        const err = await response.text();
        console.error('Failed to add user:', err);
    }
    return response.json();
}

const startCompetition = async () => {
    try {
        const response = await fetch(`${databaseUrl}/competitions/start-competition`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.text();
            console.error('Failed to start competition:', err);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Network error:', error);
    }
}

// COMPETITION STEPS API
const addUser = async (user_id: string) => {
    try {
        const response = await fetch(`${databaseUrl}/competition-steps/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id }),
        })
        console.log('Response:', response);
        if (!response.ok) {
            const err = await response.text();
            console.error('Failed to add user:', err);
        }
        return response.json();
    } catch (error) {
        console.error('Network error:', error)
    }
}

const addSteps = async (user_id: string, steps: number) => {
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

const users = async () => {
    const response = await fetch(`${databaseUrl}/competition-steps/data`);
    const data = await response.json();
    return data;
}

const getUserInfo = async (user_id: string) => {
    const response = await fetch(`${databaseUrl}/competition-steps/user-info?user_id=${user_id}`);
    if (!response.ok) {
        const err = await response.text();
        console.error('Failed to fetch user info:', err);
        return null;
    }
    const data = await response.json();
    return data;
}

// for (let i = 0; i < 10; i++) {
//     addUser(`user_${i+3}`);
// }

const fetchCompetitionsButton = document.getElementById('fetch-competitions-button') as HTMLButtonElement;
const fetchCompetitionsContainer = document.getElementById('competitions-container') as HTMLDivElement;
const startCompetitionButton = document.getElementById('start-competition-button') as HTMLButtonElement;
const startCompetitionContainer = document.getElementById('start-competition-container') as HTMLDivElement;

fetchCompetitionsButton.addEventListener('click', async () => {
    await fetchCompetitions().then(data => {
        fetchCompetitionsContainer.innerHTML = JSON.stringify(data, null, 2);
    }).catch(error => {
        console.error('Error fetching competitions:', error);
    });
});

startCompetitionButton.addEventListener('click', async () => {
    const result = await startCompetition();
    if (result) {
        startCompetitionContainer.innerHTML = JSON.stringify(result, null, 2);
        await grabData();
    } else {
        startCompetitionContainer.innerHTML = 'Competition already active';
    }
});

const addUserButton = document.getElementById('add-user-button') as HTMLButtonElement;
const fetchDataButton = document.getElementById('fetch-data-button') as HTMLButtonElement;
const dataContainer = document.getElementById('data-container') as HTMLDivElement;
const addStepsButton = document.getElementById('add-steps-button') as HTMLButtonElement;
const fetchUserInfoButton = document.getElementById('fetch-user-info-button') as HTMLButtonElement;
const userInfoContainer = document.getElementById('user-info-container') as HTMLDivElement;

const grabData = async () => {
    users().then(data => {
        dataContainer.innerHTML = JSON.stringify(data, null, 2);
    }).catch(error => {
        console.error('Error fetching data:', error);
    });
}

addUserButton.addEventListener('click', async () => {
    const userId = (document.getElementById('user-id-input') as HTMLInputElement).value.trim();
    console.log('User ID:', userId);
    if (userId) {
        await addUser(userId);
        await grabData();
    } else {
        console.error('Please enter a user ID');
    }
});

addStepsButton.addEventListener('click', async () => {
    const userId = (document.getElementById('user-id-input-2') as HTMLInputElement).value.trim();
    const steps = parseInt((document.getElementById('user-steps-input') as HTMLInputElement).value.trim(), 10);
    console.log('User ID:', userId, 'Steps:', steps);
    if (userId && !isNaN(steps)) {
        await addSteps(userId, steps);
        await grabData();
    } else {
        console.error('Please enter a valid user ID and steps');
    }
    
});

fetchDataButton.addEventListener('click', () => {
    grabData();
});

fetchUserInfoButton.addEventListener('click', async () => {
    const userId = (document.getElementById('user-id-info') as HTMLInputElement).value.trim();
    console.log('User ID for info:', userId);
    if (userId) {
        const userInfo = await getUserInfo(userId);
        if (userInfo) {
            userInfoContainer.innerHTML = JSON.stringify(userInfo, null, 2);
        } else {
            userInfoContainer.innerHTML = 'User not found';
        }
    } else {
        console.error('Please enter a user ID for info');
    }
});

grabData(); // Initial data fetch on page load