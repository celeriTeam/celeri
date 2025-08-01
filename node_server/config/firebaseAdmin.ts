import { cert, initializeApp, getApps } from 'firebase-admin/app'
import { readFileSync } from 'fs';

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
console.log('Firebase Admin: ', JSON.parse(readFileSync(serviceAccount!, 'utf8')).project_id);
const serviceAccountKey = JSON.parse(readFileSync(serviceAccount!, 'utf8'));

if (!getApps().length) { // to prevent re-initialization
    initializeApp({
        credential: cert(serviceAccountKey),
    });
}

export { };