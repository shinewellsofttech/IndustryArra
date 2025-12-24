import React, { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { useDispatch } from "react-redux";
import Select from "react-select";
import { API_WEB_URLS } from '../../constants/constAPI';
import { Fn_AddEditData, Fn_FillListData } from '../../store/Functions';
import { Button, Table, FormControl } from "react-bootstrap";

const AddMultiple_ComponentMaster = () => {
  const [state, setState] = useState({
    FillArray: [],
    FillArray2: [],
    isProgress: true,
  });
  
  const [selectedItemMaster, setSelectedItemMaster] = useState(null);
  const [rows, setRows] = useState([
    {
      F_CategoryMaster: "",
      Name: "",
      L1: "",
      W1: "",
      T1: "",
      Qty1: "",
      L2: "",
      W2: "",
      T2: "",
      Qty2: "",
      L3: "",
      W3: "",
      T3: "",
      Qty3: "",
      IsActive: true,
      images: [],
    }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ItemMaster`;
  const API_URL_Category = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL_SAVE = "ComponentMaster/0/token";
  const API_URL_SAVE_Photo = "AddComponentPhotoById/0/token";

  const focusField = (rowIndex, fieldName) => {
    const element = document.getElementById(`field-${rowIndex}-${fieldName}`);
    if (element) {
      element.focus();
    }
  };

  useEffect(() => {
    Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
    Fn_FillListData(dispatch, setState, "FillArray2", `${API_URL_Category}/Id/0`);
  }, [dispatch, API_URL, API_URL_Category]);

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        F_CategoryMaster: "",
        Name: "",
        L1: "",
        W1: "",
        T1: "",
        Qty1: "",
        L2: "",
        W2: "",
        T2: "",
        Qty2: "",
        L3: "",
        W3: "",
        T3: "",
        Qty3: "",
        IsActive: true,
        images: [],
      }
    ]);

    // Focus first row, Category, when adding at the end via top button
    setTimeout(() => {
      focusField(rows.length, "F_CategoryMaster");
    }, 0);
  };

  const handleAddRowAtIndex = (index) => {
    const newRow = {
      F_CategoryMaster: "",
      Name: "",
      L1: "",
      W1: "",
      T1: "",
      Qty1: "",
      L2: "",
      W2: "",
      T2: "",
      Qty2: "",
      L3: "",
      W3: "",
      T3: "",
      Qty3: "",
      IsActive: true,
      images: [],
    };
    const updatedRows = [...rows];
    updatedRows.splice(index + 1, 0, newRow);
    setRows(updatedRows);

    // Focus newly added row's Category
    setTimeout(() => {
      focusField(index + 1, "F_CategoryMaster");
    }, 0);
  };

  const handleRemoveRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index] = {
      ...updatedRows[index],
      [field]: field === 'IsActive' ? value : (field.includes('F_CategoryMaster') ? value : value)
    };
    setRows(updatedRows);
  };

  const handleImageChange = (index, e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert("Maximum 5 images allowed per row");
      e.target.value = "";
      return;
    }
    const updatedRows = [...rows];
    updatedRows[index] = {
      ...updatedRows[index],
      images: files
    };
    setRows(updatedRows);
  };

  const handleRemoveImage = (rowIndex, imageIndex) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex].images = updatedRows[rowIndex].images.filter((_, i) => i !== imageIndex);
    setRows(updatedRows);
  };

  const validateRows = () => {
    if (!selectedItemMaster) {
      alert("Please select Item Master");
      return false;
    }
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.Name || !row.Name.trim()) {
        alert(`Row ${i + 1}: Name is required`);
        return false;
      }
      if (!row.F_CategoryMaster) {
        alert(`Row ${i + 1}: Category is required`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateRows()) {
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const formData = new FormData();
          formData.append("Name", row.Name);
          formData.append("F_ItemMaster", selectedItemMaster.value);
          formData.append("F_CategoryMaster", row.F_CategoryMaster || "");
          formData.append("L1", row.L1 || "");
          formData.append("W1", row.W1 || "");
          formData.append("T1", row.T1 || "");
          formData.append("Qty1", row.Qty1 || "");
          formData.append("L2", row.L2 || "");
          formData.append("W2", row.W2 || "");
          formData.append("T2", row.T2 || "");
          formData.append("Qty2", row.Qty2 || "");
          formData.append("L3", row.L3 || "");
          formData.append("W3", row.W3 || "");
          formData.append("T3", row.T3 || "");
          formData.append("Qty3", row.Qty3 || "");
          formData.append("IsActive", row.IsActive);

          const response = await Fn_AddEditData(
            dispatch,
            setState,
            { arguList: { id: 0, formData } },
            API_URL_SAVE,
            true,
            "memberid",
            navigate,
            "#"
          );

          const componentId = response?.id || response?.Id || 0;

          // Upload images for this component if any
          if (componentId > 0 && row.images && row.images.length > 0) {
            for (let j = 0; j < row.images.length; j++) {
              const image = row.images[j];
              try {
                const ImageName = image.name || `image_${j + 1}`;
                const formDataPhoto = new FormData();
                formDataPhoto.append('F_ComponentMaster', componentId);
                formDataPhoto.append('Name', ImageName);
                formDataPhoto.append('ImageData', image);
                
                await Fn_AddEditData(
                  dispatch,
                  setState,
                  { arguList: { id: 0, formData: formDataPhoto } },
                  API_URL_SAVE_Photo,
                  true,
                  "memberid",
                  navigate,
                  "#"
                );
              } catch (imageError) {
                console.error(`Error uploading image ${j + 1} for row ${i + 1}:`, imageError);
              }
            }
          }

          successCount++;
        } catch (error) {
          console.error(`Error saving row ${i + 1}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        alert(`Successfully saved ${successCount} component(s).${failCount > 0 ? ` ${failCount} component(s) failed.` : ''}`);
        navigate('/ComponentMaster');
      } else {
        alert('Failed to save components. Please try again.');
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while submitting the form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transform FillArray to react-select options format
  const itemMasterOptions = state.FillArray && state.FillArray.length > 0
    ? state.FillArray.map((option) => ({
        value: option.Id.toString(),
        label: `${option.ItemCode} - ${option.Name}`
      }))
    : [];

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
              <h4 className="card-title">Add Multiple Components</h4>
            </div>
            <div className="card-body">
              <div className="basic-form">
                {/* Common Item Master Dropdown */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="text-label">Item Master *</label>
                      <Select
                        isSearchable
                        options={itemMasterOptions}
                        value={selectedItemMaster}
                        onChange={(selectedOption) => {
                          setSelectedItemMaster(selectedOption);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusField(0, "F_CategoryMaster");
                          }
                        }}
                        placeholder="Select Item Master"
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: 38,
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999,
                          }),
                        }}
                        classNamePrefix="react-select"
                      />
                    </div>
                  </div>
                  <div className="col-md-6 d-flex align-items-end">
                    <Button
                      variant="success"
                      onClick={handleAddRow}
                      className="me-2"
                    >
                      <i className="fas fa-plus me-1"></i>Add Row
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !selectedItemMaster}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          Saving...
                        </>
                      ) : (
                        'Submit All'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Tabular Form */}
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th style={{ minWidth: '150px' }}>Category *</th>
                        <th style={{ minWidth: '150px' }}>Name *</th>
                        <th>L1</th>
                        <th>W1</th>
                        <th>T1</th>
                        <th>Qty1</th>
                        <th>L2</th>
                        <th>W2</th>
                        <th>T2</th>
                        <th>{rows[0]?.F_CategoryMaster == 5 ? "Required_Sheet" : "Qty2"}</th>
                        <th>L3</th>
                        <th>W3</th>
                        <th>T3</th>
                        <th>Qty3</th>
                        <th>Is Active</th>
                        <th style={{ minWidth: '200px' }}>Images (Max 5)</th>
                        <th style={{ width: '80px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>
                            <FormControl
                              id={`field-${index}-F_CategoryMaster`}
                              as="select"
                              size="sm"
                              value={row.F_CategoryMaster || ""}
                              onChange={(e) => handleRowChange(index, 'F_CategoryMaster', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "Name");
                                }
                              }}
                            >
                              <option value="">Select</option>
                              {state.FillArray2 && state.FillArray2.length > 0 &&
                                state.FillArray2.map((option) => (
                                  <option key={option.Id} value={option.Id}>
                                    {option.Name}
                                  </option>
                                ))}
                            </FormControl>
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-Name`}
                              type="text"
                              size="sm"
                              value={row.Name}
                              onChange={(e) => handleRowChange(index, 'Name', e.target.value)}
                              placeholder="Name"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "L1");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-L1`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.L1}
                              onChange={(e) => handleRowChange(index, 'L1', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "W1");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-W1`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.W1}
                              onChange={(e) => handleRowChange(index, 'W1', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "T1");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-T1`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.T1}
                              onChange={(e) => handleRowChange(index, 'T1', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "Qty1");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-Qty1`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.Qty1}
                              onChange={(e) => handleRowChange(index, 'Qty1', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "L2");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-L2`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.L2}
                              onChange={(e) => handleRowChange(index, 'L2', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "W2");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-W2`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.W2}
                              onChange={(e) => handleRowChange(index, 'W2', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "T2");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-T2`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.T2}
                              onChange={(e) => handleRowChange(index, 'T2', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "Qty2");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-Qty2`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.Qty2}
                              onChange={(e) => handleRowChange(index, 'Qty2', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "L3");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-L3`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.L3}
                              onChange={(e) => handleRowChange(index, 'L3', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "W3");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-W3`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.W3}
                              onChange={(e) => handleRowChange(index, 'W3', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "T3");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-T3`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.T3}
                              onChange={(e) => handleRowChange(index, 'T3', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "Qty3");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-Qty3`}
                              type="number"
                              step="0.01"
                              size="sm"
                              value={row.Qty3}
                              onChange={(e) => handleRowChange(index, 'Qty3', e.target.value)}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "IsActive");
                                }
                              }}
                            />
                          </td>
                          <td>
                            <FormControl
                              id={`field-${index}-IsActive`}
                              as="select"
                              size="sm"
                              value={row.IsActive ? 'true' : 'false'}
                              onChange={(e) => handleRowChange(index, 'IsActive', e.target.value === 'true')}
                              style={{ width: '80px' }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusField(index, "Images");
                                }
                              }}
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </FormControl>
                          </td>
                          <td>
                            <div>
                              <FormControl
                                id={`field-${index}-Images`}
                                type="file"
                                size="sm"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleImageChange(index, e)}
                                style={{ fontSize: '11px', padding: '2px' }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const btn = document.getElementById(`btn-add-${index}`);
                                    if (btn) {
                                      btn.focus();
                                    }
                                  }
                                }}
                              />
                              {row.images && row.images.length > 0 && (
                                <div className="d-flex flex-wrap gap-1 mt-2">
                                  {row.images.map((image, imgIndex) => (
                                    <div key={imgIndex} className="position-relative" style={{ width: "50px", height: "50px" }}>
                                      <img
                                        src={URL.createObjectURL(image)}
                                        alt={`Preview ${imgIndex + 1}`}
                                        className="img-thumbnail"
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger position-absolute top-0 end-0"
                                        style={{ padding: "1px 3px", fontSize: "10px", lineHeight: "1" }}
                                        onClick={() => handleRemoveImage(index, imgIndex)}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {row.images && row.images.length > 0 && (
                                <small className="text-muted d-block mt-1" style={{ fontSize: '10px' }}>
                                  {row.images.length} image(s) selected
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                id={`btn-add-${index}`}
                                variant="success"
                                size="sm"
                                onClick={() => handleAddRowAtIndex(index)}
                                title="Add row below"
                              >
                                +
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRemoveRow(index)}
                                disabled={rows.length === 1}
                                title="Remove row"
                              >
                                ×
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <div className="mt-3">
                  <Button
                    variant="danger"
                    onClick={() => navigate('/ComponentMaster')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddMultiple_ComponentMaster;

