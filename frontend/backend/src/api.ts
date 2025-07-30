import axios from 'axios';

const databaseUrl = 'https://celeri.onrender.com'; // or your dev URL

export const api = axios.create({
    baseURL: databaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});