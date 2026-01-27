import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Updated with user's actual credentials
const firebaseConfig = {
    apiKey: "AIzaSyDkaUM3cflHJMd-3l11jNkzFJq-Pb7MvMU",
    authDomain: "xogta-qorshaynta-dds.firebaseapp.com",
    databaseURL: "https://xogta-qorshaynta-dds-default-rtdb.firebaseio.com",
    projectId: "xogta-qorshaynta-dds",
    storageBucket: "xogta-qorshaynta-dds.firebasestorage.app",
    messagingSenderId: "448570102808",
    appId: "1:448570102808:web:c7377c65285761bca29f6d",
    measurementId: "G-1F6NY2L8XG"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
