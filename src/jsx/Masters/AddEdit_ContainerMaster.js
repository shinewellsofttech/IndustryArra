import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import Select from "react-select";
import { API_WEB_URLS } from "../../constants/constAPI";
import { Fn_AddEditData, Fn_DisplayData, Fn_FillListData } from "../../store/Functions";
import { Button, FormControl } from "react-bootstrap";

const ContainerMasterSchema = Yup.object().shape({
  InspectionDate: Yup.date().required("Inspection Date is required"),
  ContainerNumber: Yup.string().required("Container Number is required"),
  ItemName: Yup.string().required("Item Name is required"),
  Quantity: Yup.number().required("Quantity is required").positive().integer(),
  JobCardInitial: Yup.string().required("Job Card Initial is required"),
  ContractNo: Yup.string().required("Contract No is required"),
});

const AddEdit_ContainerMaster = () => {
  const [state, setState] = useState({
    id: 0,
    FillArray: [],
    FillArrayItem: [],
    isProgress: true,
  });
  
  const [gridData, setGridData] = useState([
    {
      id: 1,
      InspectionDate: "",
      ContainerNumber: "",
      ItemName: "",
      Quantity: "",
      JobCardInitial: "",
      ContractNo: "",
    }
  ]);
  
  const [errors, setErrors] = useState({});
  const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 });
  const inputRefs = useRef({});
  
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`
  const API_URL_ITEM = `${API_WEB_URLS.MASTER}/0/token/ItemMaster`
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/State`
  const API_URL_SAVE = "ManualContainermaster/0/token"
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/Container/Id`
  
  // Define variables for PageTitle props
  const activeMenu = "Master Entry";
  const motherMenu = "Forms";
  const pageContent = "Container Master";
  const cardTitle = "Container Master - Smart Grid Entry";

  useEffect(() => {
    Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`)
    Fn_FillListData(dispatch, setState, "FillArrayItem", `${API_URL_ITEM}/Id/0`)
    
    const Id = (location.state && location.state.Id) || 0
    if (Id > 0) {
      setState(prevState => ({ ...prevState, id: Id }))
    }
  }, [dispatch, location.state])

  // Professional styling object
  const styles = {
    container: {
      fontFamily: 'Times New Roman',
      fontSize: '14px',
      lineHeight: '1.6',
    },
    tableContainer: {
      background: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      border: '1px solid #d1d5db',
    },
    tableHeader: {
      background: '#f9fafb',
      color: '#374151',
      fontWeight: '600',
      fontSize: '13px',
      letterSpacing: '0.5px',
      textAlign: 'center',
      padding: '16px 12px',
      borderBottom: '2px solid #e5e7eb',
    },
    tableCell: {
      padding: '12px 8px',
      borderBottom: '1px solid #f3f4f6',
      verticalAlign: 'middle',
      backgroundColor: '#ffffff',
    },
    input: {
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      padding: '10px 12px',
      fontSize: '14px',
      fontFamily: 'Times New Roman',
      width: '100%',
      backgroundColor: '#ffffff',
    },
    inputFocused: {
      borderColor: '#374151',
      backgroundColor: '#f3f4f6',
      boxShadow: '0 0 0 3px rgba(55, 65, 81, 0.15)',
      outline: 'none',
      transform: 'scale(1.02)',
    },
    inputError: {
      borderColor: '#ef4444',
      boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.1)',
    },
    button: {
      fontFamily: 'Times New Roman',
      fontWeight: '600',
      borderRadius: '6px',
      padding: '10px 20px',
      border: '1px solid #d1d5db',
      cursor: 'pointer',
      background: '#ffffff',
      color: '#374151',
    },
    addButton: {
      background: '#ffffff',
      color: '#374151',
      fontSize: '18px',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      border: '1px solid #d1d5db',
    },
    deleteButton: {
      background: '#ffffff',
      color: '#374151',
      fontSize: '16px',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      border: '1px solid #d1d5db',
    },
    submitButton: {
      background: '#374151',
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '600',
      padding: '14px 32px',
      borderRadius: '8px',
      minWidth: '180px',
      border: '1px solid #374151',
    },
    cancelButton: {
      background: '#ffffff',
      color: '#374151',
      fontSize: '16px',
      fontWeight: '600',
      padding: '14px 32px',
      borderRadius: '8px',
      minWidth: '120px',
      border: '1px solid #d1d5db',
    }
  };

  const itemOptions = useMemo(() => {
    return (state.FillArrayItem || []).map((item) => ({
      value: item.Id?.toString() || "",
      label: `${item.Name} (${item.ItemCode || item.Id})`,
    }));
  }, [state.FillArrayItem]);

  const removeFieldError = (currentErrors, index, field) => {
    if (!currentErrors[index]?.[field]) {
      return currentErrors;
    }

    const updatedErrors = { ...currentErrors };
    const rowErrors = { ...updatedErrors[index] };
    delete rowErrors[field];

    if (Object.keys(rowErrors).length === 0) {
      delete updatedErrors[index];
    } else {
      updatedErrors[index] = rowErrors;
    }

    return updatedErrors;
  };

  const addGridRow = () => {
    const newRow = {
      id: gridData.length + 1,
      InspectionDate: "",
      ContainerNumber: "",
      ItemName: "",
      Quantity: "",
      JobCardInitial: "",
      ContractNo: "",
    };
    setGridData([...gridData, newRow]);
    // Focus the first field of the new row
    setTimeout(() => {
      const newRowIndex = gridData.length;
      focusCell(newRowIndex, 0);
    }, 100);
  };

  const removeGridRow = (index) => {
    if (gridData.length > 1) {
      const updatedData = gridData.filter((_, i) => i !== index);
      setGridData(updatedData);
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const updateGridRow = (index, field, value) => {
    const updatedData = [...gridData];
    updatedData[index][field] = value;
    setGridData(updatedData);

    setErrors((prevErrors) => {
      return removeFieldError(prevErrors, index, field);
    });
  };

  // Enhanced keyboard navigation
  const handleKeyDown = (e, rowIndex, colIndex) => {
    const fields = ['InspectionDate', 'ContainerNumber', 'ItemName', 'Quantity', 'JobCardInitial', 'ContractNo'];
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Move to next field
      if (colIndex < fields.length - 1) {
        focusCell(rowIndex, colIndex + 1);
      } else if (rowIndex < gridData.length - 1) {
        // Move to first field of next row
        focusCell(rowIndex + 1, 0);
      } else {
        // Add new row and focus first field
        addGridRow();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < gridData.length - 1) {
        focusCell(rowIndex + 1, colIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        focusCell(rowIndex - 1, colIndex);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (colIndex < fields.length - 1) {
        focusCell(rowIndex, colIndex + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (colIndex > 0) {
        focusCell(rowIndex, colIndex - 1);
      }
    }
  };

  const focusCell = (rowIndex, colIndex) => {
    const fields = ['InspectionDate', 'ContainerNumber', 'ItemName', 'Quantity', 'JobCardInitial', 'ContractNo'];
    const fieldName = fields[colIndex];
    const refKey = `${rowIndex}-${fieldName}`;
    
    if (inputRefs.current[refKey]) {
      inputRefs.current[refKey].focus();
      setFocusedCell({ row: rowIndex, col: colIndex });
    }
  };

  const getInputRef = (rowIndex, fieldName) => {
    const refKey = `${rowIndex}-${fieldName}`;
    return (ref) => {
      if (ref) {
        inputRefs.current[refKey] = ref;
      }
    };
  };

  const validateAllRows = () => {
    const newErrors = {};
    let isValid = true;
    
    gridData.forEach((row, index) => {
      try {
        ContainerMasterSchema.validateSync(row, { abortEarly: false });
      } catch (validationErrors) {
        newErrors[index] = {};
        validationErrors.inner.forEach((error) => {
          newErrors[index][error.path] = error.message;
        });
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateAllRows()) {
      alert("Please fix validation errors before submitting.");
      return;
    }

    try {
      console.log("Grid Data:", gridData);
      
      // Map gridData and add ItemCode to each row
      const dataWithItemCode = gridData.map(row => {
        // Find ItemCode from FillArrayItem based on ItemName (which now contains Id)
        const selectedItem = state.FillArrayItem?.find(item => item.Id == row.ItemName);
        const itemCode = selectedItem ? selectedItem.ItemCode || selectedItem.Id : '';
        const Name = selectedItem ? selectedItem.Name || selectedItem.Id : '';
        
        return {
          InspectionDate: row.InspectionDate,
          ContainerNumber: row.ContainerNumber,
          ItemName: Name,
          ItemCode: itemCode,
          Quantity: row.Quantity,
          JobCardInitial: row.JobCardInitial,
          ContractNo: row.ContractNo,
        
        };
      });

    	const vformData = new FormData();
		vformData.append("UserId", 1);
		vformData.append("Data", JSON.stringify(dataWithItemCode));
	

		const res = await Fn_AddEditData(
			dispatch,
			setState,
			{ arguList: { id: 0, formData: vformData } },
			API_URL_SAVE,
			true,
			"memberid",
			navigate,
			"/ContainerMaster"
		  );
      
      alert("All records saved successfully!");
      navigate("/ContainerMaster");
      
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while submitting the form. Please try again.");
    }
  };

  return (
    <Fragment>
      <PageTitle
        activeMenu={activeMenu}
        motherMenu={motherMenu}
        pageContent={pageContent}
      />

      <div style={styles.container}>
        <div className="row">
          <div className="col-lg-12">
            <div className="card" style={styles.tableContainer}>
              <div className="card-header d-flex justify-content-between align-items-center" 
                   style={{ background: '#f9fafb', 
                           color: '#374151', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h4 className="card-title mb-0" style={{ fontFamily: 'Times New Roman', fontWeight: '600', fontSize: '20px' }}>
                  {cardTitle}
                </h4>
                <button
                  onClick={addGridRow}
                  style={{...styles.button, ...styles.addButton}}
                  title="Add New Row (Enter to auto-add)"
                >
                  +
                </button>
              </div>
              
              <div className="card-body" style={{ padding: '0' }}>
                <div className="table-responsive">
                  <table className="table mb-0" style={{ fontSize: '14px' }}>
                    <thead>
                      <tr>
                        <th style={{...styles.tableHeader, minWidth: '160px'}}>
                          📅 Inspection Date *
                        </th>
                        <th style={{...styles.tableHeader, minWidth: '180px'}}>
                          📦 Container Number *
                        </th>
                        <th style={{...styles.tableHeader, minWidth: '180px'}}>
                          🏷️ Item Name *
                        </th>
                        <th style={{...styles.tableHeader, minWidth: '120px'}}>
                          🔢 Quantity *
                        </th>
                        <th style={{...styles.tableHeader, minWidth: '160px'}}>
                          📋 Job Card Initial *
                        </th>
                        <th style={{...styles.tableHeader, minWidth: '160px'}}>
                          📄 Contract No *
                        </th>
                        <th style={{...styles.tableHeader, minWidth: '100px'}}>
                          ⚡ Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {gridData.map((row, index) => (
                                                 <tr key={row.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                          <td style={styles.tableCell}>
                            <input
                              ref={getInputRef(index, 'InspectionDate')}
                              type="date"
                              value={row.InspectionDate}
                              onChange={(e) => updateGridRow(index, 'InspectionDate', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 0)}
                              style={{
                                ...styles.input,
                                ...(errors[index]?.InspectionDate ? styles.inputError : {}),
                                ...(focusedCell.row === index && focusedCell.col === 0 ? styles.inputFocused : {})
                              }}
                            />
                                                         {errors[index]?.InspectionDate && (
                               <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                 {errors[index].InspectionDate}
                               </small>
                             )}
                          </td>
                          
                          <td style={styles.tableCell}>
                            <input
                              ref={getInputRef(index, 'ContainerNumber')}
                              type="text"
                              value={row.ContainerNumber}
                              onChange={(e) => updateGridRow(index, 'ContainerNumber', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 1)}
                              style={{
                                ...styles.input,
                                ...(errors[index]?.ContainerNumber ? styles.inputError : {}),
                                ...(focusedCell.row === index && focusedCell.col === 1 ? styles.inputFocused : {})
                              }}
                              placeholder="Enter container number"
                            />
                            {errors[index]?.ContainerNumber && (
                              <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                {errors[index].ContainerNumber}
                              </small>
                            )}
                          </td>
                          
                          <td style={styles.tableCell}>
                            <Select
                              ref={getInputRef(index, 'ItemName')}
                              value={
                                itemOptions.find(
                                  (option) => option.value === (row.ItemName || "").toString()
                                ) || null
                              }
                              onChange={(selectedOption) =>
                                updateGridRow(index, 'ItemName', selectedOption ? selectedOption.value : '')
                              }
                              onKeyDown={(e) => handleKeyDown(e, index, 2)}
                              options={itemOptions}
                              placeholder="Select Item Name"
                              isSearchable
                              isClearable
                              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                              styles={{
                                control: (base, stateControl) => ({
                                  ...base,
                                  ...styles.input,
                                  borderColor: errors[index]?.ItemName
                                    ? styles.inputError.borderColor
                                    : stateControl.isFocused
                                      ? styles.inputFocused.borderColor
                                      : '#d1d5db',
                                  boxShadow: stateControl.isFocused
                                    ? styles.inputFocused.boxShadow
                                    : 'none',
                                  transform: stateControl.isFocused ? styles.inputFocused.transform : 'none',
                                  backgroundColor: stateControl.isFocused
                                    ? styles.inputFocused.backgroundColor
                                    : styles.input.backgroundColor,
                                }),
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                              }}
                              classNamePrefix="react-select"
                            />
                            {errors[index]?.ItemName && (
                              <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                {errors[index].ItemName}
                              </small>
                            )}
                          </td>
                          
                          <td style={styles.tableCell}>
                            <input
                              ref={getInputRef(index, 'Quantity')}
                              type="number"
                              value={row.Quantity}
                              onChange={(e) => updateGridRow(index, 'Quantity', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 3)}
                              style={{
                                ...styles.input,
                                ...(errors[index]?.Quantity ? styles.inputError : {}),
                                ...(focusedCell.row === index && focusedCell.col === 3 ? styles.inputFocused : {})
                              }}
                              placeholder="Enter quantity"
                            />
                            {errors[index]?.Quantity && (
                              <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                {errors[index].Quantity}
                              </small>
                            )}
                          </td>
                          
                          <td style={styles.tableCell}>
                            <input
                              ref={getInputRef(index, 'JobCardInitial')}
                              type="text"
                              value={row.JobCardInitial}
                              onChange={(e) => updateGridRow(index, 'JobCardInitial', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 4)}
                              style={{
                                ...styles.input,
                                ...(errors[index]?.JobCardInitial ? styles.inputError : {}),
                                ...(focusedCell.row === index && focusedCell.col === 4 ? styles.inputFocused : {})
                              }}
                              placeholder="Enter initials"
                            />
                            {errors[index]?.JobCardInitial && (
                              <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                {errors[index].JobCardInitial}
                              </small>
                            )}
                          </td>
                          
                          <td style={styles.tableCell}>
                            <input
                              ref={getInputRef(index, 'ContractNo')}
                              type="text"
                              value={row.ContractNo}
                              onChange={(e) => updateGridRow(index, 'ContractNo', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, 5)}
                              style={{
                                ...styles.input,
                                ...(errors[index]?.ContractNo ? styles.inputError : {}),
                                ...(focusedCell.row === index && focusedCell.col === 5 ? styles.inputFocused : {})
                              }}
                              placeholder="Enter contract number"
                            />
                            {errors[index]?.ContractNo && (
                              <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                {errors[index].ContractNo}
                              </small>
                            )}
                          </td>
                          
                          <td style={{...styles.tableCell, textAlign: 'center'}}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={addGridRow}
                                style={{...styles.button, ...styles.addButton}}
                                title="Add New Row"
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeGridRow(index)}
                                disabled={gridData.length === 1}
                                style={{
                                  ...styles.button, 
                                  ...styles.deleteButton,
                                  opacity: gridData.length === 1 ? 0.5 : 1,
                                  cursor: gridData.length === 1 ? 'not-allowed' : 'pointer'
                                }}
                                title="Delete Row"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div style={{ 
                  padding: '24px', 
                  background: '#f9fafb',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleSubmit}
                      style={{...styles.button, ...styles.submitButton}}
                    >
                      💾 Submit All Records
                    </button>
                    <button
                      onClick={() => navigate("/ContainerMaster")}
                      style={{...styles.button, ...styles.cancelButton}}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                  
                                      <div style={{ 
                      marginTop: '16px', 
                      textAlign: 'center', 
                      fontSize: '13px', 
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                    💡 <strong>Pro Tip:</strong> Use Enter to move to next field, Arrow keys to navigate, Enter at last field auto-adds new row
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddEdit_ContainerMaster;
