const handleError = (response) => {
    return {
      status: response.status,
      success: response.success,
      data: response.data,
      message: response.message,
    };
  };
  
  const apiGET = (url) => {
    const requestOptions = {
      method: 'GET',
      headers: {'Content-Type': 'application/json'},
    };
  
    return fetch(url, requestOptions)
      .then((response) => response.json())
      .then((json) => {
        return handleError(json);
      })
      .catch((error) => {
        console.error(error);
      });
  };
  const apiPOST = (url, data) => {
    const requestOptions = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    };
  
    return fetch(url, requestOptions)
      .then((response) => response.json())
      .then((json) => {
        return handleError(json);
      })
      .catch((error) => {
        console.error(error);
      });
  };
  const apiPOST_Multipart = (url, formdata) => {
    const requestOptions = {
      method: 'POST',
      body: formdata,
    };
    return fetch(url, requestOptions)
      .then((response) => response.json())
      .then((data) => {
        return handleError(data);
      })
      .catch((error) => {
        console.error(error);
      });
  };
  const apiPUT_Multipart = (url, formdata) => {
    const requestOptions = {
      method: 'PUT',
      body: formdata,
    };
    return fetch(url, requestOptions)
      .then((response) => response.json())
      .then((data) => {
        return handleError(data);
      })
      .catch((error) => {
        console.error(error);
      });
  };
  
  const apiPUT = (url, data) => {
    const requestOptions = {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    };
  
    return fetch(url, requestOptions)
      .then((response) => response.json())
      .then((json) => {
        return handleError(json);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const apiDELETE = (url, data) => {
      const requestOptions = {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
      };
  
      return fetch(url, requestOptions)
      .then((response) => response.json())
      .then((json) => {
        return handleError(json);
      })
      .catch((error) => {
        console.error(error);
      });
  }
  
  const apiVERIFY = (url, data) => {
    const requestOptions = {
        method: 'VERIFY',
        headers: { 'Content-Type': 'application/json' }
    };

    return fetch(url, requestOptions)
    .then((response) => response.json())
    .then((json) => {
      return handleError(json);
    })
    .catch((error) => {
      console.error(error);
    });
}
  export const API_HELPER = {
    apiGET,
    apiPOST,
    apiPUT,
    apiDELETE,
    apiPOST_Multipart,
    apiPUT_Multipart,
    apiVERIFY,

  };
  