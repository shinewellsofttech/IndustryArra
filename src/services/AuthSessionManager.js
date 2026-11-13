import swal from "sweetalert";
import { getAuthToken, isJwtExpired, isAuthEndpoint } from "./jwtHelper";

const LOGOUT_ACTION = '[Logout action] logout action';

// Store reference injected at runtime to avoid circular dependency with store.js
let appStore = null;
export const injectStore = (storeInstance) => {
  appStore = storeInstance;
};

// Guard to prevent multiple simultaneous 401 responses from spamming alerts and multiple redirects
let isSessionExpiring = false;

/**
 * Central Session Expired handler.
 * Clears credentials, notifies the user, and redirects cleanly to /login.
 */
export const handleSessionExpired = (reason = "Session Expired") => {
  // If already on /login page, no need to alert or redirect
  if (typeof window !== "undefined" && window.location.pathname.toLowerCase().includes("/login")) {
    return;
  }

  if (isSessionExpiring) {
    return;
  }
  isSessionExpiring = true;

  console.warn(`[AuthSessionManager] Session expired triggered (${reason}). Cleaning up and redirecting to login...`);

  // 1. Clear authentication data from localStorage
  try {
    localStorage.removeItem("authUser");
    localStorage.removeItem("userDetails");
  } catch (err) {
    console.error("Error clearing localStorage:", err);
  }

  // 2. Dispatch logout to Redux store if available
  try {
    if (appStore && typeof appStore.dispatch === "function") {
      appStore.dispatch({ type: LOGOUT_ACTION });
    }
  } catch (err) {
    console.error("Error dispatching LOGOUT_ACTION:", err);
  }

  // 3. User feedback via SweetAlert
  swal({
    title: "Session Expired",
    text: "Aapka session expire ho chuka hai ya authentication invalid hai. Kripya dobara login karein.",
    icon: "warning",
    button: {
      text: "Login Karein",
      closeModal: true,
    },
    closeOnClickOutside: false,
    closeOnEsc: false,
  }).then(() => {
    isSessionExpiring = false;
    window.location.href = "/login";
  });

  // 4. Fallback redirect after 2.5 seconds if user does not click the button
  setTimeout(() => {
    isSessionExpiring = false;
    if (typeof window !== "undefined" && !window.location.pathname.toLowerCase().includes("/login")) {
      window.location.href = "/login";
    }
  }, 2500);
};

export { getAuthToken, isJwtExpired, isAuthEndpoint };

const AuthSessionManager = {
  getAuthToken,
  isJwtExpired,
  isAuthEndpoint,
  handleSessionExpired,
  injectStore,
};

export default AuthSessionManager;
