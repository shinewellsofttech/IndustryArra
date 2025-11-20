import React, { Fragment, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import Select from "react-select";
import { API_WEB_URLS } from '../../constants/constAPI';
import { Fn_AddEditData, Fn_DisplayData, Fn_FillListData } from '../../store/Functions';

const NameSchema = Yup.object().shape({
  Name: Yup.string().required("Name is required"),
  F_ItemMaster: Yup.string().required("Item Master is required"),
});

const AddEdit_ComponentMaster = () => {
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
      IsActive: true,
    },
    FillArray: [],
    FillArray2: [],
    isProgress: true,
  });
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ItemMaster`
  const API_URL_Category = `${API_WEB_URLS.MASTER}/0/token/Category`

  const API_URL_SAVE = "ComponentMaster/0/token"
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
    }
  }, [dispatch, location.state])

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
      formData.append("IsActive", values.IsActive ? "1" : "0")

  
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

      for(let i = 0; i < values.ComponentImages.length; i++) {
        const file = values.ComponentImages[i]
        const formData = new FormData()
        formData.append("ComponentImage", file)
        formData.append("ComponentID", response.id)
     
      }

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

                      {/* Compact numeric fields - Set 1 */}
                      <div className="row mb-3">
                        <div className="col-md-3">
                          <div className="form-group">
                            <label className="text-label">L1</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="L1"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.L1 || ""}
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="form-group">
                            <label className="text-label">W1</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="W1"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.W1 || ""}
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="form-group">
                            <label className="text-label">T1</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="T1"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.T1 || ""}
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="form-group">
                            <label className="text-label">Qty1</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="Qty1"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.Qty1 || ""}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Compact numeric fields - Set 2 */}
                      <div className="row mb-3">
                        <div className="col-md-3">
                          <div className="form-group">
                            <label className="text-label">L2</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="L2"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.L2 || ""}
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="form-group">
                            <label className="text-label">W2</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="W2"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.W2 || ""}
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="form-group">
                            <label className="text-label">T2</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="T2"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.T2 || ""}
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="form-group">
                            <label className="text-label">Qty2</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              name="Qty2"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.Qty2 || ""}
                            />
                          </div>
                        </div>
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
