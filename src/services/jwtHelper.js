/**
 * Standalone JWT & Token Utility
 * Pure functions with zero external dependencies to prevent any circular imports.
 */

/**
 * Safely extracts the current JWT access token from localStorage.
 */
export const getAuthToken = () => {
  try {
    const authUserStr = localStorage.getItem("authUser");
    if (authUserStr) {
      const authUser = JSON.parse(authUserStr);
      const token = authUser?.jwtToken || authUser?.token || authUser?.UserToken || authUser?.UserTokenNew;
      if (token && typeof token === "string" && token.trim().length > 0) {
        return token.trim();
      }
    }

    const userDetailsStr = localStorage.getItem("userDetails");
    if (userDetailsStr) {
      const userDetails = JSON.parse(userDetailsStr);
      const token = userDetails?.idToken || userDetails?.token;
      if (token && typeof token === "string" && token.trim().length > 0) {
        return token.trim();
      }
    }
  } catch (err) {
    console.error("Error reading auth token from localStorage:", err);
  }
  return null;
};

/**
 * Decodes JWT and checks if it is expired.
 */
export const isJwtExpired = (token) => {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false; // not a standard JWT, let server validate
    const payload = JSON.parse(atob(parts[1]));
    if (payload && payload.exp) {
      // payload.exp is in seconds
      return Date.now() >= payload.exp * 1000;
    }
  } catch (err) {
    console.warn("Could not decode JWT payload:", err);
  }
  return false;
};

/**
 * Checks whether the given URL is an auth/login endpoint.
 */
export const isAuthEndpoint = (url = "") => {
  const lower = (url || "").toLowerCase();
  return (
    lower.includes("validatelogin") ||
    lower.includes("authentication/login") ||
    lower.includes("adminlogin") ||
    lower.includes("/login")
  );
};

