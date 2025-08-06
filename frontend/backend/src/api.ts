import axios from 'axios';

// const databaseUrl = 'https://celeri.onrender.com'; // or your dev URL
const databaseUrl = 'http://172.20.10.2:3000'; // for local development

export const api = axios.create({
    baseURL: databaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});