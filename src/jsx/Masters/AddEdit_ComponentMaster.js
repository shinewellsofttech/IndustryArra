import React, { Fragment, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import Select from "react-select";
import { API_WEB_URLS } from '../../constants/constAPI';
import { Fn_AddEditData, Fn_DisplayData, Fn_FillListData } from '../../store/Functions';
import { FaRulerCombined, FaBox } from 'react-icons/fa';

const NameSchema = Yup.object().shape({
  Name: Yup.string().required("Name is required"),
  F_ItemMaster: Yup.string().required("Item Master is required"),
});

const AddEdit_ComponentMaster = () => {
  const [images, setImages] = useState([]);
  const [state, setState] = useState({
    id: 0,
    formData: {
      Name: "",
      F_ItemMaster: "",
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
    },
    FillArray: [],
    FillArray2: [],
    FillArrayPhoto: [],
    isProgress: true,
  });
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ItemMaster`
  const API_URL_Category = `${API_WEB_URLS.MASTER}/0/token/Category`
  const API_URL1 = `${API_WEB_URLS.MASTER}/0/token/ComponentPhoto`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/UpdateComponentPhotoStatus`;
  const API_URL_SAVE = "ComponentMaster/0/token"
  const API_URL_SAVE_Photo = "AddComponentPhotoById/0/token"
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/ComponentMasterEdit/Id`
  // Define variables for PageTitle props
  const activeMenu = "Validation";
  const motherMenu = "Form";
  const pageContent = "Validation";
  const cardTitle = "Form with Name Field";

    useEffect(() => {
    Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`)
    Fn_FillListData(dispatch, setState, "FillArray2", `${API_URL_Category}/Id/0`)
    
    const Id = (location.state && location.state.Id) || 0
    if (Id > 0) {
      setState(prevState => ({ ...prevState, id: Id }))
      Fn_DisplayData(dispatch, setState, Id, API_URL_EDIT)
      Fn_FillListData(dispatch, setState, "FillArrayPhoto", `${API_URL1}/Id/${Id}`)
    }
  }, [dispatch, location.state])

  const handlePhotoDelete = (photo) => {
    console.log("Photo Data:", photo);
    Fn_FillListData(dispatch, setState, "FillArrayPhoto", `${API_URL2}/${photo.Id}/${photo.F_ComponentMaster}`)
  };

  const handleSubmit = async (values) => {
    try {
      console.log("Form Data:", values);
      const obj = JSON.parse(localStorage.getItem("authUser"))
      const formData = new FormData()
      formData.append("Name", values.Name)
      formData.append("F_ItemMaster", values.F_ItemMaster || "")
      formData.append("F_CategoryMaster", values.F_CategoryMaster || "")
      formData.append("L1", values.L1 || "")
      formData.append("W1", values.W1 || "")
      formData.append("T1", values.T1 || "")
      formData.append("Qty1", values.Qty1 || "")
      formData.append("L2", values.L2 || "")
      formData.append("W2", values.W2 || "")
      formData.append("T2", values.T2 || "")
      formData.append("Qty2", values.Qty2 || "")
      formData.append("L3", values.L3 || "")
      formData.append("W3", values.W3 || "")
      formData.append("T3", values.T3 || "")
      formData.append("Qty3", values.Qty3 || "")
      formData.append("IsActive", values.IsActive)

      // Append images to formData as Image1, Image2, etc. (only existing images)
     


   

  
    const response = await Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: state.id, formData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        
        "/ComponentMaster"
      )

      console.log("Response:", response.id);

      const Id = response.id
      
      // Loop through all images and upload each one
      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        const ImageName = image.name || `image_${i + 1}`
        const formDataPhoto = new FormData()
        formDataPhoto.append('F_ComponentMaster', Id)
        formDataPhoto.append('Name', ImageName)
        formDataPhoto.append('ImageData', image)
        
        await Fn_AddEditData(
          dispatch,
          setState,
          { arguList: { id: state.id, formData: formDataPhoto } },
          API_URL_SAVE_Photo,
          true,
          "memberid",
          navigate,
          
          "#"
        )

      }
      navigate('/ComponentMaster')
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

      <div className="row">
        <div className="col-lg-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">{cardTitle}</h4>
            </div>
            <div className="card-body">
              <div className="basic-form">
                <Formik
                  initialValues={state.formData}
                  enableReinitialize
                  validationSchema={NameSchema}
                  onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                      handleSubmit(values);
                      setSubmitting(false);
                    }, 400);
                  }}
                >
                  {({
                    values,
                    errors,
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    setFieldValue,
                    isSubmitting,
                  }) => {
                    // Transform FillArray to react-select options format
                    const itemMasterOptions = state.FillArray && state.FillArray.length > 0
                      ? state.FillArray.map((option) => ({
                          value: option.Id.toString(),
                          label: `${option.ItemCode} - ${option.Name}`
                        }))
                      : [];

                    // Find selected option based on values.F_ItemMaster
                    const selectedItemMaster = itemMasterOptions.find(
                      (option) => option.value === (values.F_ItemMaster || "").toString()
                    ) || null;

                    return (
                    <form onSubmit={handleSubmit}>
                      <div className="row mb-3">
                        <div className="col-md-4">
                          <div className="form-group">
                            <label className="text-label">Item Master *</label>
                            <Select
                              isSearchable
                              name="F_ItemMaster"
                              options={itemMasterOptions}
                              value={selectedItemMaster}
                              onChange={(selectedOption) => {
                                setFieldValue("F_ItemMaster", selectedOption ? selectedOption.value : "");
                              }}
                              onBlur={handleBlur}
                              placeholder="Select Item Master"
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  minHeight: 38,
                                  borderColor: errors.F_ItemMaster ? "#dc3545" : "#ced4da",
                                }),
                                menu: (base) => ({
                                  ...base,
                                  zIndex: 9999,
                                }),
                              }}
                              classNamePrefix="react-select"
                            />
                            {errors.F_ItemMaster && (
                              <div className="text-danger">{errors.F_ItemMaster}</div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="form-group">
                            <label className="text-label">Category *</label>
                            <select
                              className="form-control"
                              name="F_CategoryMaster"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.F_CategoryMaster || ""}
                            >
                              <option value="">Select Category</option>
                              {state.FillArray2 && state.FillArray2.length > 0 &&
                                state.FillArray2.map((option) => (
                                  <option key={option.Id} value={option.Id}>
                                    {option.Name}
                                  </option>
                                ))}
                            </select>
                            {errors.F_CategoryMaster && (
                              <div className="text-danger">{errors.F_CategoryMaster}</div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="form-group">
                            <label className="text-label">Name *</label>
                            <input
                              type="text"
                              className="form-control"
                              name="Name"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.Name}
                            />
                            {errors.Name && (
                              <div className="text-danger">{errors.Name}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Set 1: Final Finished Size (Centimeters - cm) */}
                      <div className="card mb-3 border" style={{ borderColor: '#b0c4de' }}>
                        <div className="card-header py-2 bg-light d-flex justify-content-between align-items-center">
                          <span className="fw-bold text-primary">
                            <FaRulerCombined className="me-1" /> Final Finished Size (Centimeters - cm)
                          </span>
                          <span className="badge bg-primary">Finished / Drawing Size (cm)</span>
                        </div>
                        <div className="card-body py-2">
                          <div className="row">
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label className="text-label fw-bold">L1 - Length (cm)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  name="L1"
                                  placeholder="e.g. 57.5 cm"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.L1 || ""}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label className="text-label fw-bold">W1 - Width (cm)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  name="W1"
                                  placeholder="e.g. 44.0 cm"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.W1 || ""}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label className="text-label fw-bold">T1 - Thickness (cm)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  name="T1"
                                  placeholder="e.g. 2.1 cm"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.T1 || ""}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label className="text-label fw-bold">Qty1 - Quantity (pcs)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  name="Qty1"
                                  placeholder="e.g. 2 pcs"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.Qty1 || ""}
                                />
                              </div>
                            </div>
                          </div>
                          <small className="text-muted d-block">
                            * Final finished component dimensions in <strong>Centimeters (cm)</strong> used on drawings & final assembly.
                          </small>
                        </div>
                      </div>

                      {/* Set 2: Wood Issue Size (Inches - inch) */}
                      <div className="card mb-3 border" style={{ borderColor: '#b0c4de' }}>
                        <div className="card-header py-2 bg-light d-flex justify-content-between align-items-center">
                          <span className="fw-bold text-success">
                            <FaBox className="me-1" /> Wood Issue Size (Inches - inch)
                          </span>
                          <span className="badge bg-success">Raw Issue Size (inch)</span>
                        </div>
                        <div className="card-body py-2">
                          <div className="row">
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label className="text-label fw-bold">L2 - Issue Length (inch)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  name="L2"
                                  placeholder="e.g. 24.0 inch"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.L2 || ""}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label className="text-label fw-bold">W2 - Issue Width (inch)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  name="W2"
                                  placeholder="e.g. 18.0 inch"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.W2 || ""}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label className="text-label fw-bold">T2 - Issue Thickness (inch)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  name="T2"
                                  placeholder="e.g. 1.5 inch"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.T2 || ""}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label className="text-label fw-bold">
                                  {values.F_CategoryMaster == 5 ? "Required Sheets (MDF)" : "Qty2 - Issue Qty (pcs)"}
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  name="Qty2"
                                  placeholder="e.g. 2"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.Qty2 || ""}
                                />
                              </div>
                            </div>
                          </div>
                          <small className="text-muted d-block">
                            * Raw Wood Cut dimensions in <strong>Inches (inch)</strong> used for Lumber CFT calculation: (L &times; W &times; T) / 1728.
                          </small>
                        </div>
                      </div>

                      {/* Set 3: Compact numeric fields - Set 3 (Optional) */}
                      <div className="card mb-3 border">
                        <div className="card-header py-1 bg-light">
                          <span className="text-muted small fw-bold">Additional / Alternate Size (Optional)</span>
                        </div>
                        <div className="card-body py-2">
                          <div className="row">
                            <div className="col-md-3">
                              <div className="form-group mb-1">
                                <label className="text-label">L3 (Alternate Length)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control form-control-sm"
                                  name="L3"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.L3 || ""}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-1">
                                <label className="text-label">W3 (Alternate Width)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control form-control-sm"
                                  name="W3"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.W3 || ""}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-1">
                                <label className="text-label">T3 (Alternate Thickness)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control form-control-sm"
                                  name="T3"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.T3 || ""}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-1">
                                <label className="text-label">Qty3 (Alternate Qty)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control form-control-sm"
                                  name="Qty3"
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  value={values.Qty3 || ""}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Existing Images Display */}
                      {state.FillArrayPhoto && state.FillArrayPhoto.length > 0 && (
                        <div className="form-group mb-3">
                          <label className="text-label">Existing Images</label>
                          <div className="d-flex flex-wrap gap-3 mt-2">
                            {state.FillArrayPhoto.map((photo, index) => (
                              <div key={photo.Id || index} className="text-center" style={{ width: "150px" }}>
                                <div className="position-relative mb-2" style={{ width: "150px", height: "150px" }}>
                                  <img
                                    src={`${API_WEB_URLS.IMAGEURL}${photo.ImageDataNew}`}
                                    alt={photo.Name || `Image ${index + 1}`}
                                    className="img-thumbnail"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={(e) => {
                                      e.target.src = "https://via.placeholder.com/150?text=Image+Not+Found";
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger position-absolute top-0 end-0"
                                    style={{ padding: "2px 6px", fontSize: "12px" }}
                                    onClick={() => handlePhotoDelete(photo)}
                                  >
                                    ×
                                  </button>
                                </div>
                                <small className="text-muted d-block" style={{ 
                                  wordBreak: "break-word", 
                                  fontSize: "12px",
                                  maxWidth: "150px"
                                }}>
                                  {photo.Name || `Image ${index + 1}`}
                                </small>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Multi Image Upload */}
                      <div className="form-group mb-3">
                        <label className="text-label">Upload New Images (Max 5)</label>
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            if (files.length > 5) {
                              alert("Maximum 5 images allowed");
                              e.target.value = "";
                              return;
                            }
                            setImages(files);
                          }}
                        />
                        {images.length > 0 && (
                          <div className="mt-2">
                            <small className="text-muted">
                              {images.length} image(s) selected
                            </small>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              {images.map((image, index) => (
                                <div key={index} className="position-relative" style={{ width: "100px", height: "100px" }}>
                                  <img
                                    src={URL.createObjectURL(image)}
                                    alt={`Preview ${index + 1}`}
                                    className="img-thumbnail"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger position-absolute top-0 end-0"
                                    style={{ padding: "2px 6px", fontSize: "12px" }}
                                    onClick={() => {
                                      const newImages = images.filter((_, i) => i !== index);
                                      setImages(newImages);
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* IsActive checkbox */}
                      <div className="form-group mb-3">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            name="IsActive"
                            onChange={(e) => setFieldValue("IsActive", e.target.checked)}
                            checked={values.IsActive || false}
                          />
                          <label className="form-check-label">Is Active</label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn me-2 btn-primary"
                        disabled={isSubmitting}
                      >
                        Submit
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-danger light"
                        onClick={() => navigate('/ComponentMaster')}
                      >
                        Cancel
                      </button>
                    </form>
                    );
                  }}
                </Formik>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddEdit_ComponentMaster;
