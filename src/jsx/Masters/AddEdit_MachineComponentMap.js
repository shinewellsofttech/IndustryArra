import React, { Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { useDispatch } from "react-redux";
import { API_WEB_URLS } from "../../constants/constAPI";
import { Fn_AddEditData, Fn_DisplayData,Fn_FillListData } from "../../store/Functions";
import readXlsxFile from "read-excel-file";
import {OutTable, ExcelRenderer} from 'react-excel-renderer';
import * as XLSX from "xlsx";

const AddEdit_MachineComponentMap = () => {
  const [state, setState] = useState({
    id: 0,
    excelData: null,
    Data: null,
    isProgress: true,
    FillArray:[]
  });

  const dispatch = useDispatch();
  const location = useLocation();
  const [F_ItemMaster , setItemMaster]  =  useState(0);
  const navigate = useNavigate();
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/Items`
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/CustomerMasterEdit/Id`;
  const API_URL_SAVE = "MachineComponentMap/0/token";
  const [data, setData] = useState([]);
  const [uploadedRowCount, setUploadedRowCount] = useState(0);

  useEffect(() => {
    const Id = (location.state && location.state.Id) || 0;
    Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
    if (Id > 0) {
      setState((prevState) => ({ ...prevState, id: Id }));
      
      Fn_DisplayData(dispatch, setState, Id, API_URL_EDIT);
    }
  }, [dispatch, location.state]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      
      const formData = new FormData();
      formData.append("F_ItemMaster", F_ItemMaster);
      formData.append("UserId", 1);
      formData.append("Data", JSON.stringify(state.Data));

      Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: state.id, formData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        "/ComponentMaster"
      );
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while submitting the form. Please try again.");
    }
  };

  const fileHandler = (event) => {
    const file = event.target.files[0];
  
    if (file) {
      const reader = new FileReader();
  
      reader.onload = (e) => {
        const binaryStr = e.target.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
  
        // Get all sheet names
        const sheetNames = workbook.SheetNames;
  
        if (sheetNames.length >= 4) {
          // Get the 3rd and 4th sheets
          const thirdSheet = workbook.Sheets[sheetNames[2]];
          const fourthSheet = workbook.Sheets[sheetNames[3]];
  
          const processSheet = (sheet) => {
            const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const columns = sheetData[1];
            const data = sheetData.slice(2);
  
            return data.map((row) => {
              const rowData = {};
              columns.forEach((column, index) => {
                rowData[column] = row[index];
              });
              return rowData;
            });
          };
  
          // Process both sheets
          const transformedData = [...processSheet(thirdSheet), ...processSheet(fourthSheet)];
          console.log(transformedData);
          let result = [];
  
          transformedData.forEach((obj) => {
            const machineNo = obj["MACHINE NUMBER"];
  
            Object.keys(obj).forEach((key) => {
              if (obj[key] !== undefined && key !== "MACHINE NAME" && key !== "MACHINE NUMBER") {
                let seriesNo = obj[key];
  
                result.push({
                  Component: key,
                  MachineNo: machineNo,
                  SeriesNo: seriesNo,
                  F_MachineTypeMaster: 1
                });
              }
            });
          });
  
          const filteredAndSortedData = result
            .filter((item) => item.SeriesNo !== "")
            .sort((a, b) => a.Component.localeCompare(b.Component));
  
          // Validate and convert types for each object
          const validatedData = filteredAndSortedData
            .map(item => {
              // Convert SeriesNo and MachineNo to numbers
              const seriesNum = Number(item.SeriesNo);
              const machineNum = Number(item.MachineNo);
              
              // Check if all required fields are present and of correct type
              if (!isNaN(seriesNum) && 
                  !isNaN(machineNum) && 
                  typeof item.Component === 'string' &&
                  item.Component.trim() !== '') {
                return {
                  Component: item.Component.trim(),
                  MachineNo: machineNum,
                  SeriesNo: seriesNum,
                  F_MachineTypeMaster: 2
                };
              }
              return null;
            })
            .filter(item => item !== null); // Remove any invalid items
  
          if (validatedData.length === 0) {
            alert("No valid data found after validation!");
            return;
          }
  
          if (validatedData.length !== filteredAndSortedData.length) {
            alert(`Warning: ${filteredAndSortedData.length - validatedData.length} invalid rows were removed`);
          }
          console.log(validatedData);
          setState((prevState) => ({ ...prevState, Data: validatedData }));
          setUploadedRowCount(validatedData?.length || 0);
        } else {
          alert("The Excel file must have at least 4 sheets!");
        }
      };
  
      reader.readAsBinaryString(file);
    }
  };

  const handleChange =(e) =>{
    setItemMaster(e.target.value);
    
  }

  return (
    <Fragment>
      <PageTitle
        activeMenu="Validation"
        motherMenu="Form"
        pageContent="Validation"
      />

      <div className="row">
        <div className="col-lg-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Machine Component Map</h4>
            </div>
            <div className="card-body">
              <div className="basic-form">
                <form onSubmit={handleSubmit}>

                <div className="form-group">
                            <label className="text-label">Item *</label>
                            <select
                              className="form-control"
                              name="F_ItemMaster"
                              onChange={handleChange}
                              // onBlur={handleBlur}
                              value={F_ItemMaster}
                            >
                              <option value="">Select Item</option>
                              {state.FillArray.length>0 && state.FillArray.map((option) => (
                                <option key={option.Id} value={option.Id}>
                                  {option.Name}
                                </option>
                              ))}
                            </select>
                          </div>
                  <div className="form-group mb-3">
                    <label className="text-label">Upload Excel File</label>
                    <div className="d-flex flex-column">
                      <div className="d-flex align-items-center">
                        <input
                          type="file"
                          className="form-control"
                          accept=".xlsx, .xlsm"
                          onChange={fileHandler}
                        />
                        {uploadedRowCount > 0 && (
                          <span className="badge bg-success ms-2">
                            {uploadedRowCount} rows uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary me-2">
                    Submit
                  </button>
                  <button type="button" className="btn btn-danger light">
                    Cancel
                  </button>
                </form>

                {/* Display Uploaded Excel Data */}
                {state.excelData && (
                  <div className="mt-4">
                    <h5>Uploaded Excel Data:</h5>
                    <div
                      style={{
                        maxHeight: "400px",
                        overflowY: "auto",
                        overflowX: "auto",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            {state.excelData[0].map((col, index) => (
                              <th key={index}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {state.excelData.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddEdit_MachineComponentMap;
