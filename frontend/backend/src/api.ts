import axios from 'axios';

// const databaseUrl = 'https://celeri.onrender.com'; // or your dev URL
const databaseUrl = 'http://10.1.103.157:3000'; // for local development

export const api = axios.create({
    baseURL: databaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});