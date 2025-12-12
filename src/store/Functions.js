// functions.js
// import toastr from "toastr";
// import "toastr/build/toastr.css";
import { callAdd_Data, callAdd_Data_Multipart, callDelete_Data, callEdit_Data, callEdit_Data_Multipart, callFill_GridData, callGet_Data } from './common-actions';



export const convertToArray = (str) => {
    return str.split(',');  
  };

export const Fn_FillListData = (dispatch, setState, gridName, apiURL, setKey, setSearchKeyArray) => { 
    return new Promise((resolve, reject) => {
        const request = {
            apiURL: apiURL,
            callback: (response) => {
                if (response && response.status === 200 && response.data) {
                   
                    const dataList = response.data.dataList;
                    
                    if (gridName === "gridDataSearch") {
                        const firstObject = dataList[0];
                        const keysArray = Object.keys(firstObject).filter((item) => item !== 'Id');
                        setSearchKeyArray(keysArray);
                        setState(dataList);
                        setKey(keysArray[0]);
                    } else if (gridName === "productData" || gridName === "OtherDataScore") {
                        setState(prevState => ({
                            ...prevState,
                            [gridName]: dataList,
                            rows: [Object.keys(dataList[0])],
                            isProgress: false
                        }));
                    } else if (gridName == 'gridData' || gridName=='rows') {
                        setState(dataList);
                    } else if (gridName == 'FileNo') {
                        setState(prevState => ({
                            ...prevState,
                            ['FileNo']: dataList[0].FileNo
                        }));
                    } else {
                        setState(prevState => ({
                            ...prevState,
                            [gridName]: dataList,
                            isProgress: false
                        }));
                    }
                    
                 //   showToastWithCloseButton("success", "Data loaded successfully");
                    resolve(dataList); // Resolve the promise with the response data
                } else {
                   // showToastWithCloseButton("error", "Error loading data");
                    reject(new Error("Error loading data")); // Reject the promise if there's an error
                }
            }
        };

        dispatch(callFill_GridData(request));
    });
};


export const Fn_DisplayData = (dispatch, setState, id, apiURL, gridname) => {
    return new Promise((resolve, reject) => {
        const request = {
            id: id,
            apiURL: apiURL,
            callback: response => {
                if (response && response.status === 200 && response.data) {
                    setState(prevState => ({
                        ...prevState,
                        formData: response.data.dataList[0],
                    }));
                //    showToastWithCloseButton("success", "Data displayed successfully");
                    resolve(response.data); // Resolve the Promise with the data
                } else {
                //    showToastWithCloseButton("error", "Error displaying data");
                    reject(new Error("Error displaying data")); // Reject the Promise with an error
                }
            },
        };
        dispatch(callGet_Data(request));
    });
};

export const Fn_DeleteData = (dispatch, setState, id, apiURL, apiURL_Display) => {
    return new Promise((resolve, reject) => {
      const request = {
        id: id,
        apiURL: apiURL,
        callback: response => {
          if (response && response.status === 200) {
            setState(prevState => ({
              ...prevState,
              confirm_alert: false,
              success_dlg: true,
              dynamic_title: "Deleted",
              dynamic_description: "Selected data has been deleted.",
            }));
          //  showToastWithCloseButton("success", "Data deleted successfully");
  
            // If apiURL_Display is provided, refresh the list
            if (apiURL_Display) {
            //   Fn_FillListData(dispatch, setState, "gridData", apiURL_Display);
            //   Fn_FillListData(dispatch, setState, "Invoice", apiURL_Display);
            window.location.reload();
            }
  
            resolve(response); // Resolve the Promise with the response
          } else {
            setState(prevState => ({
              ...prevState,
              confirm_alert: false,
              dynamic_title: "Error",
              dynamic_description: "Some error occurred while deleting data.",
            }));
           // showToastWithCloseButton( "error", "Some error occurred while deleting data"  );
            reject(new Error("Error deleting data")); // Reject the Promise with an error
          }
        },
      };
  
      // Dispatch the delete action
      dispatch(callDelete_Data(request));
    });
  };

  
  export const Fn_AddEditData = (
    dispatch,
    setState,
    data,
    apiURL,
    isMultiPart = false,
    getid,
    navigate,
    forward
) => {
 
    return new Promise((resolve, reject) => {
        const { arguList } = data;
        const request = {
            arguList: arguList,
            apiURL: apiURL,
            callback: response => {
                // Handle error response with success: false and id: -2
                if (response?.data?.success === false && (response?.data?.data?.id === -2 || response?.data?.id === -2 || response?.data?.id === -1)) {
                    const errorMessage = response.data.message || 'Add details first.';
                    alert(errorMessage);
                    reject(errorMessage);
                    return; // stop further code
                }

                if (response && response.status === 200) {
                    console.log('arguList', arguList);

                    // Safely extract resData
                    const resData = response.data.response ? response.data.response[0] : response.data.data;

                    // Handle conflict (-2) immediately
                    if (resData.Id === -2) {
                        // Show toast/alert if you want
                        // showToastWithCloseButton("error", "Add item details first.");
                        console.log('Add item details first.');
                        reject('Add item details first.');
                        return; // stop further code
                    }

                    // Now process based on getid and resData
                    if (getid === 'certificate') {
                        if (resData.Id > 0) {
                            setState(resData.RegNo);
                        }
                    } else if (resData && resData.Id > 0) {
                        setState(true);
                        localStorage.setItem("YesBank", JSON.stringify(resData));
                    } else if (getid === 'TenderH') {
                        setState(prevState => ({
                            ...prevState,
                            F_TenderFileMasterH: resData.id
                        }));
                    }

                    // Success: Add / Update
                    if (arguList.id === 0) {
                        // showToastWithCloseButton("success", "Data added successfully");
                        resolve(resData);
                        navigate(forward, { state: { Id: 0 } });
                    } else {
                        // showToastWithCloseButton("success", "Data updated successfully");
                        resolve(resData);
                        navigate(forward, { state: { Id: 0 } });
                    }

                }else if (response?.data?.data?.id==-2) {
                   
                    alert('Add item details first.');
                    // reject('Add item details first.');
                    // return; // stop further code
                } 
                else if (response?.data?.data?.id==-1) {
                    alert('Data already exists.');
                    // reject('Add item details first.');
                    // return; // stop further code
                }
                else {
                    // Failure Case
                    if (arguList.id === 0) {
                        reject('Some error occurred while adding data');
                    } else {
                        reject('Some error occurred while updating data');
                    }
                }
            },
        };

        // Call API based on ID and multipart
        if (arguList.id == 0) {
            if (isMultiPart) dispatch(callAdd_Data_Multipart(request));
            else dispatch(callAdd_Data(request)); // Missing dispatch
        } else {
            if (isMultiPart) dispatch(callEdit_Data_Multipart(request));
            else dispatch(callEdit_Data(request)); // Missing dispatch
        }
    });
};


export const Fn_GetReport = async (dispatch, setState, gridName, apiURL, data, isMultiPart = false, index, Arr, name) => {

    
    return new Promise((resolve, reject) => {
        const { arguList } = data;
        const request = {
            arguList: arguList,
            apiURL: apiURL,
            callback: (response) => {
                if (response && response.status === 200 && response.data) {
                    const responseData = response.data.response;
                    
                    if (gridName === "productData" || gridName === "productDataAssest" || gridName == "MachineSequenceData") {
                        setState(prevState => ({
                            ...prevState,
                            [gridName]: responseData,
                            rows: [Object.keys(responseData[0])],
                            isProgress: false
                        }));
                    } else if (gridName === 'tenderData') {
                        setState(responseData);
                    } else if (gridName === 'ItemArray') {
                        // Corrected update logic for 'ItemArray'
                        if (Arr[index]) {
                            Arr[index] = responseData;
                        } else {
                            Arr.push(responseData);
                        }
                        setState(prevState => ({
                            ...prevState,
                            [name]: Arr,
                            isProgress: false
                        }));
                    } else {
                        setState(prevState => ({
                            ...prevState,
                            [gridName]: responseData,
                            isProgress: false
                        }));
                    }

                  //  showToastWithCloseButton("success", "Report generated successfully");
                    resolve(responseData); // Resolve the promise with the response data
                } else {
                   // showToastWithCloseButton("warning", "Data not found");
                    reject(new Error("Data not found")); // Reject the promise
                }
            }
        };

        dispatch(callAdd_Data_Multipart(request));
    });
};


// export function showToastWithCloseButton(toastType, message) {
//     toastr.options = {
//         closeButton: true,
//         preventDuplicates: true,
//         newestOnTop: true,
//         progressBar: true,
//         timeOut: 2000,
//     };

//     if (toastType === "success") {
//         toastr.success(message);
//     } else if (toastType === "error") {
//         toastr.error(message);
//     } else if (toastType === "warning") {
//         toastr.warning(message);
//     }
// }
