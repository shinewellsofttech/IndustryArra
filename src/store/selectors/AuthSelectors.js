import { isJwtExpired } from '../../services/jwtHelper';

export const isAuthenticated = (state) => {
    const userData = localStorage.getItem('authUser');
    if (!userData) return false;

    try {
        const user = JSON.parse(userData);
        if (!user || !user.id || !user.isLoginable) {
            return false;
        }

        const token = user.jwtToken || user.token;
        if (token && isJwtExpired(token)) {
            return false;
        }

        return true;
    } catch (error) {
        console.warn('Failed to parse authUser from localStorage:', error, userData);
        return false;
    }
};
