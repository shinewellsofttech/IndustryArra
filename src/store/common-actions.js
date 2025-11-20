import * as base_acTypes from './actionTypes';

export const callFill_GridData = (data) => ({
    type: base_acTypes.FILL_GRID_DATA,
    data: data,
});
export const callGet_Data = (data) => ({
    type: base_acTypes.GET_DATA,
    data: data,
});
export const callAdd_Data_Multipart = (data) => ({
    type: base_acTypes.ADD_DATA_MULTIPART,
    data: data,
});
export const callEdit_Data_Multipart = (data) => ({
    type: base_acTypes.EDIT_DATA_MULTIPART,
    data: data,
});
export const callAdd_Data = (data) => {
    return {
        type: base_acTypes.ADD_DATA,
        data: data,
    };
};
export const callEdit_Data = (data) => ({
    type: base_acTypes.EDIT_DATA,
    data: data,
});
export const callDelete_Data = (data) => ({
    type: base_acTypes.DELETE_DATA,
    data: data,
});
  