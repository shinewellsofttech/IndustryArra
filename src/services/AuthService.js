import axios from 'axios';
import swal from "sweetalert";
import {
    loginConfirmedAction,
    Logout,
} from '../store/actions/AuthActions';
import { isJwtExpired } from './jwtHelper';

export function signUp(email, password) {
    const postData = {
        email,
        password,
        returnSecureToken: true,
    };
    return axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyD3RPAp3nuETDn9OQimqn_YF6zdzqWITII`,
        postData,
    );
}

export function login(email, password) {
    const postData = {
        email,
        password,
        returnSecureToken: true,
    };
    return axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD3RPAp3nuETDn9OQimqn_YF6zdzqWITII`,
        postData,
    );
}

export function formatError(errorResponse) {
    switch (errorResponse.error.message) {
        case 'EMAIL_EXISTS':
            swal("Oops", "Email already exists", "error");
            break;
        case 'EMAIL_NOT_FOUND':
           swal("Oops", "Email not found", "error", { button: "Try Again!" });
           break;
        case 'INVALID_PASSWORD':
            swal("Oops", "Invalid Password", "error", { button: "Try Again!" });
            break;
        case 'USER_DISABLED':
            return 'User Disabled';

        default:
            return '';
    }
}

export function saveTokenInLocalStorage(tokenDetails) {
    tokenDetails.expireDate = new Date(
        new Date().getTime() + tokenDetails.expiresIn * 1000,
    );
    localStorage.setItem('userDetails', JSON.stringify(tokenDetails));
}

export function runLogoutTimer(dispatch, timer, navigate) {
    if (timer <= 0) {
        dispatch(Logout(navigate));
        return;
    }
    setTimeout(() => {
        dispatch(Logout(navigate));
    }, timer);
}

export function checkAutoLogin(dispatch, navigate) {
    const userDataString = localStorage.getItem('authUser');
    if (!userDataString) {
        dispatch(Logout(navigate));
        return;
    }

    try {
        const userData = JSON.parse(userDataString);
        const token = userData.jwtToken || userData.token;

        // 1. Check if JWT is present and expired
        if (token && isJwtExpired(token)) {
            console.warn("[checkAutoLogin] Stored JWT token has expired. Logging out.");
            dispatch(Logout(navigate));
            return;
        }

        // 2. Check session duration against expiresIn & dateOfCreation if present
        if (userData.dateOfCreation && userData.expiresIn) {
            const expireDate = new Date(userData.dateOfCreation);
            expireDate.setSeconds(expireDate.getSeconds() + userData.expiresIn);
            const todaysDate = new Date();

            if (todaysDate > expireDate) {
                console.warn("[checkAutoLogin] Session lifetime exceeded. Logging out.");
                dispatch(Logout(navigate));
                return;
            }

            const remainingMs = expireDate.getTime() - todaysDate.getTime();
            if (remainingMs > 0) {
                runLogoutTimer(dispatch, remainingMs, navigate);
            }
        }

        // Token is valid
        dispatch(loginConfirmedAction(userData));
    } catch (err) {
        console.error("Error parsing user session in checkAutoLogin:", err);
        dispatch(Logout(navigate));
    }
}
