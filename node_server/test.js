// const databaseUrl = 'https://celeri.onrender.com';
const databaseUrl = 'http://localhost:3000';

const addUser = async (user_id) => {
    try {
        const response = await fetch(`${databaseUrl}/add-user`, {
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

const addSteps = async (user_id, steps) => {
    try {
        const response = await fetch(`${databaseUrl}/update-steps`, {
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
    } catch {
        console.error('Error adding steps:', error);
    }
}

const users = async () => {
    const response = await fetch(`${databaseUrl}/data`);
    const data = await response.json();
    return data;
}

const getUserInfo = async (user_id) => {
    const response = await fetch(`${databaseUrl}/user-info?user_id=${user_id}`);
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

const addUserButton = document.getElementById('add-user-button');
const fetchDataButton = document.getElementById('fetch-data-button');
const dataContainer = document.getElementById('data-container');
const addStepsButton = document.getElementById('add-steps-button');
const fetchUserInfoButton = document.getElementById('fetch-user-info-button');
const userInfoContainer = document.getElementById('user-info-container');

const grabData = async () => {
    users().then(data => {
        dataContainer.innerHTML = JSON.stringify(data, null, 2);
    }).catch(error => {
        console.error('Error fetching data:', error);
    });
}

addUserButton.addEventListener('click', async () => {
    const userId = document.getElementById('user-id-input').value.trim();
    console.log('User ID:', userId);
    if (userId) {
        await addUser(userId);
        await grabData();
    } else {
        console.error('Please enter a user ID');
    }
});

addStepsButton.addEventListener('click', async () => {
    const userId = document.getElementById('user-id-input-2').value.trim();
    const steps = parseInt(document.getElementById('user-steps-input').value.trim(), 10);
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
    const userId = document.getElementById('user-id-info').value.trim();
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