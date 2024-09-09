import React, { createContext, useContext, useState, useEffect } from 'react';
import { app } from "@firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const auth = getAuth(app);

export interface UserContextType {
    userID: string;
    loading: boolean;
}

const UserContext = createContext<UserContextType>({ userID: '', loading: true });

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userID, setUserID] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserID(user.uid);
            } else {
                setUserID('');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <UserContext.Provider value={{ userID, loading }}>
            {children}
        </UserContext.Provider>
    );
};
