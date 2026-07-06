import React from 'react';
//import { useNavigate } from "react-router-dom";


import {
    formatError,
    login,
    runLogoutTimer,
    saveTokenInLocalStorage,
    signUp,
} from '../../services/AuthService';
import axios from 'axios';
import { API_WEB_URLS } from '../../constants/constAPI';


export const SIGNUP_CONFIRMED_ACTION = '[signup action] confirmed signup';
export const SIGNUP_FAILED_ACTION = '[signup action] failed signup';
export const LOGIN_CONFIRMED_ACTION = '[login action] confirmed login';
export const LOGIN_FAILED_ACTION = '[login action] failed login';
export const LOADING_TOGGLE_ACTION = '[Loading action] toggle loading';
export const LOGOUT_ACTION = '[Logout action] logout action';



export function signupAction(email, password, navigate) {
	
    return (dispatch) => {
        signUp(email, password)
        .then((response) => {
            saveTokenInLocalStorage(response.data);
            runLogoutTimer(
                dispatch,
                response.data.expiresIn * 1000,
                //history,
            );
            dispatch(confirmedSignupAction(response.data));
            navigate('/dashboard');
			//history.push('/dashboard');
        })
        .catch((error) => {
            const errorMessage = formatError(error.response.data);
            dispatch(signupFailedAction(errorMessage));
        });
    };
}

export function Logout(navigate) {
    localStorage.removeItem('authUser');
    navigate('/login');
    
    return {
        type: LOGOUT_ACTION,
    };
}


export function loginAction(email, password, navigate) {
    return (dispatch) => {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);

        axios.post(API_WEB_URLS.BASE+'ValidateLogin/0/token', formData)
            .then((response) => { 
                console.log("-------------------------",response.data.data.response)
               if (response.data.data.response[0].Id == -1  || response.data.data.response[0].Id == -2){
                dispatch(loginFailedAction('Incorrect Username or Password'));
               }
               else {
                const userRole = parseInt(response.data.data.response[0].F_UserRole, 10);
                
                // Fetch RoleWisePermission
                axios.get(API_WEB_URLS.BASE + 'Masters/0/token/RoleWisePermission/Id/' + userRole)
                    .then((permResponse) => {
                        const permissions = permResponse.data.data?.dataList || [];
                        
                        // Set user data in localStorage
                        const userData = {
                            id: response.data.data.response[0].Id,
                            userName: response.data.data.response[0].UserName,
                            isLoginable: response.data.data.response[0].IsActive,
                            dateOfCreation: response.data.data.response[0].DateOfCreation,
                            userType: userRole,
                            machineMaster: response.data.data.response[0].F_MachineMaster,
                            name: response.data.data.response[0].Name,
                            roleNames: response.data.data.response[0].RoleNames,
                            expiresIn: 3600, // 1 hour in seconds
                            permissions: permissions
                        };
                        
                        // Save to localStorage
                        localStorage.setItem('authUser', JSON.stringify(userData));
                        
                        // Run logout timer
                        runLogoutTimer(
                            dispatch,
                            userData.expiresIn * 1000,
                            navigate
                        );
                        
                        // Dispatch login success
                        dispatch(loginConfirmedAction(userData));
                        
                        // Navigate to dashboard
                        navigate('/dashboard');
                    })
                    .catch((err) => {
                        console.error("Failed to fetch permissions", err);
                        // Fallback without permissions
                        const userData = {
                            id: response.data.data.response[0].Id,
                            userName: response.data.data.response[0].UserName,
                            isLoginable: response.data.data.response[0].IsActive,
                            dateOfCreation: response.data.data.response[0].DateOfCreation,
                            userType: userRole,
                            machineMaster: response.data.data.response[0].F_MachineMaster,
                            name: response.data.data.response[0].Name,
                            roleNames: response.data.data.response[0].RoleNames,
                            expiresIn: 3600,
                            permissions: []
                        };
                        localStorage.setItem('authUser', JSON.stringify(userData));
                        runLogoutTimer(dispatch, userData.expiresIn * 1000, navigate);
                        dispatch(loginConfirmedAction(userData));
                        navigate('/dashboard');
                    });
               }                
            })
            .catch((error) => {
                const errorMessage = formatError(error.response.data);
                dispatch(loginFailedAction(errorMessage));
            });
    };
}



// export function loginAction(email, password, navigate) {
//     return (dispatch) => {
//          login(email, password)
//             .then((response) => { 
//                 console.log(response.data);
//                 saveTokenInLocalStorage(response.data);
//                 runLogoutTimer(
//                     dispatch,
//                     response.data.expiresIn * 1000,
//                     navigate,
//                 );
//                dispatch(loginConfirmedAction(response.data));
// 			   //console.log('kk------1');
// 			   //console.log(kk);
// 			   //console.log(response.data);
// 			   //console.log('kk------2');
// 			   //return response.data;
// 				//return 'success';
// 				//history.push('/dashboard');                
// 				navigate('/dashboard');                
//             })
//             .catch((error) => {
// 				//console.log('error');
// 				//console.log(error);
//                 const errorMessage = formatError(error.response.data);
//                 dispatch(loginFailedAction(errorMessage));
//             });
//     };
// }


export function loginFailedAction(data) {
    return {
        type: LOGIN_FAILED_ACTION,
        payload: data,
    };
}

export function loginConfirmedAction(data) {
    return {
        type: LOGIN_CONFIRMED_ACTION,
        payload: data,
    };
}

export function confirmedSignupAction(payload) {
    return {
        type: SIGNUP_CONFIRMED_ACTION,
        payload,
    };
}

export function signupFailedAction(message) {
    return {
        type: SIGNUP_FAILED_ACTION,
        payload: message,
    };
}

export function loadingToggleAction(status) {
    return {
        type: LOADING_TOGGLE_ACTION,
        payload: status,
    };
}
