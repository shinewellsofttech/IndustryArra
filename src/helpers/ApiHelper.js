import { getAuthToken, handleSessionExpired, isAuthEndpoint } from '../services/AuthSessionManager';

const handleError = (response) => {
  if (!response) {
    return { status: 500, success: false, data: null, message: "No response data" };
  }
  return {
    status: response.status !== undefined ? response.status : (response.Status || 200),
    success: response.success !== undefined ? response.success : (response.Success || false),
    data: response.data !== undefined ? response.data : (response.Data || null),
    message: response.message || response.Message || "",
  };
};

const getAuthHeader = () => {
  const token = getAuthToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
};

const handleFetchResponse = async (response, url = '') => {
  if (response.status === 401 && !isAuthEndpoint(url)) {
    handleSessionExpired(`FETCH_401 from [${url}]`);
    return {
      status: 401,
      success: false,
      message: "Unauthorized / Session Expired",
      data: null,
    };
  }

  // Handle empty or non-JSON responses gracefully
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      const json = await response.json();
      return handleError(json);
    } catch (e) {
      console.warn("Failed to parse JSON response:", e);
      return { status: response.status, success: response.ok, data: null };
    }
  }

  return { status: response.status, success: response.ok, data: null };
};

const apiGET = (url) => {
  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
  };

  return fetch(url, requestOptions)
    .then((response) => handleFetchResponse(response, url))
    .catch((error) => {
      console.error("apiGET Error:", error);
      return { status: 500, success: false, data: null, message: error?.message };
    });
};

const apiPOST = (url, data) => {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data),
  };

  return fetch(url, requestOptions)
    .then((response) => handleFetchResponse(response, url))
    .catch((error) => {
      console.error("apiPOST Error:", error);
      return { status: 500, success: false, data: null, message: error?.message };
    });
};

const apiPOST_Multipart = (url, formdata) => {
  const requestOptions = {
    method: 'POST',
    headers: {
      ...getAuthHeader()
    },
    body: formdata,
  };
  return fetch(url, requestOptions)
    .then((response) => handleFetchResponse(response, url))
    .catch((error) => {
      console.error("apiPOST_Multipart Error:", error);
      return { status: 500, success: false, data: null, message: error?.message };
    });
};

const apiPUT_Multipart = (url, formdata) => {
  const requestOptions = {
    method: 'PUT',
    headers: {
      ...getAuthHeader()
    },
    body: formdata,
  };
  return fetch(url, requestOptions)
    .then((response) => handleFetchResponse(response, url))
    .catch((error) => {
      console.error("apiPUT_Multipart Error:", error);
      return { status: 500, success: false, data: null, message: error?.message };
    });
};

const apiPUT = (url, data) => {
  const requestOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data),
  };

  return fetch(url, requestOptions)
    .then((response) => handleFetchResponse(response, url))
    .catch((error) => {
      console.error("apiPUT Error:", error);
      return { status: 500, success: false, data: null, message: error?.message };
    });
};

const apiDELETE = (url, data) => {
  const requestOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  };

  return fetch(url, requestOptions)
    .then((response) => handleFetchResponse(response, url))
    .catch((error) => {
      console.error("apiDELETE Error:", error);
      return { status: 500, success: false, data: null, message: error?.message };
    });
};

const apiVERIFY = (url, data) => {
  const requestOptions = {
    method: 'VERIFY',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  };

  return fetch(url, requestOptions)
    .then((response) => handleFetchResponse(response, url))
    .catch((error) => {
      console.error("apiVERIFY Error:", error);
      return { status: 500, success: false, data: null, message: error?.message };
    });
};

export const API_HELPER = {
  apiGET,
  apiPOST,
  apiPUT,
  apiDELETE,
  apiPOST_Multipart,
  apiPUT_Multipart,
  apiVERIFY,
};
