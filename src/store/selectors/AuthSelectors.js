export const isAuthenticated = (state) => {
    const userData = localStorage.getItem('authUser');
    if (!userData) return false;

    try {
        const user = JSON.parse(userData);
        return Boolean(user && user.id && user.isLoginable);
    } catch (error) {
        console.warn('Failed to parse authUser from localStorage:', error, userData);
        return false;
    }
};
