import axios from 'axios';

const databaseUrl = 'https://celeri.onrender.com'; // or your dev URL
// const databaseUrl = `http://10.168.89.219:3000`; // for local development: 'IPv4 Address' when you run 'ipconfig' in terminal

export const api = axios.create({
    baseURL: databaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});