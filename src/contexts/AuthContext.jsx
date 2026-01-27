import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, get, query, orderByChild, equalTo, child } from 'firebase/database';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Force re-login on every refresh by clearing session
        setUser(null);
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        // 1. Check Admin
        if (username.toLowerCase() === 'admin') {
            const adminSnapshot = await get(child(ref(db), 'users/admin'));
            if (adminSnapshot.exists()) {
                const adminData = adminSnapshot.val();
                if (adminData.password === password) {
                    const u = { username: 'admin', role: 'ADMIN' };
                    setUser(u);
                    return { success: true };
                }
            }
            return { success: false, message: 'Invalid admin credentials' };
        }

        // 2. Check Districts
        const distQuery = query(ref(db, 'districts'), orderByChild('username'), equalTo(username));
        const snapshot = await get(distQuery);

        if (snapshot.exists()) {
            const distId = Object.keys(snapshot.val())[0];
            const distData = snapshot.val()[distId];

            if (distData.password === password) {
                const u = {
                    username: distData.username,
                    role: 'DISTRICT',
                    districtId: distId,
                    zoneId: distData.zoneId,
                    name: distData.name
                };
                setUser(u);
                return { success: true };
            } else {
                return { success: false, message: 'Invalid password' };
            }
        }

        return { success: false, message: 'User not found' };
    };

    const logout = () => {
        setUser(null);
    };

    const value = {
        user,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
