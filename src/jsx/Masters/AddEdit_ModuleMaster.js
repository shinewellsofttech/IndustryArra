import React, { Fragment, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { Fn_AddEditData, Fn_DisplayData, Fn_FillListData } from "../../store/Functions";
import { useDispatch } from "react-redux";
import { API_WEB_URLS } from "../../constants/constAPI";
import { getAllUniqueMenuItems } from "../layouts/nav/Menu";



const ValidationSchema = Yup.object().shape({
  Name: Yup.string().required("Name is required"),
  Path: Yup.string().required("Path is required"),
});

const AddEdit_ModuleMaster = () => {
  const [state, setState] = useState({
    id: 0,
    formData: {
      Name: "",
      Path: "",
      IsActive: true,
    },
    isProgress: true,
  });
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ModuleMaster`
  const API_URL_SAVE = "ModuleMaster/0/token"
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/ModuleMaster/Id`
  
  // Define variables for PageTitle props
  const activeMenu = "Masters";
  const motherMenu = "Masters";
  const pageContent = "Masters";
  const cardTitle = "Form with Module Master";

  useEffect(() => {
    
    const Id = (location.state && location.state.Id) || 0
    if (Id > 0) {
      setState(prevState => ({ ...prevState, id: Id }))
      Fn_DisplayData(dispatch, setState, Id, API_URL_EDIT)
    }
  }, [dispatch, location.state])

  const handleSyncFromMenu = async () => {
    try {
      const menuItems = getAllUniqueMenuItems();
      let successCount = 0;
      let failCount = 0;

      for (const item of menuItems) {
        const formData = new FormData();
        formData.append("Name", item.title);
        formData.append("Path", item.to);
        formData.append("IsActive", "true");

        const response = await fetch(`${API_WEB_URLS.BASE}ModuleMaster/0/token`, {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        if (result && result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
      alert(`Sync completed! Success: ${successCount}, Failed: ${failCount}`);
      navigate("/ModuleMaster");
    } catch (error) {
      console.error("Error syncing menu items:", error);
      alert("An error occurred during sync. Please check console.");
    }
  };

  const handleSubmit = async (values) => {
    try {
      console.log("Form Data:", values);
      const formData = new FormData()
      formData.append("Name", values.Name)
      formData.append("Path", values.Path)
      formData.append("IsActive", values.IsActive)
      Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: state.id, formData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        "/ModuleMaster"
      )
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
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="card-title">{cardTitle}</h4>
              <button
                type="button"
                className="btn btn-info btn-sm"
                onClick={handleSyncFromMenu}
              >
                Sync all pages from Menu
              </button>
            </div>
            <div className="card-body">
              <div className="basic-form">
                <Formik
                  initialValues={state.formData}
                    enableReinitialize
                    validationSchema={ValidationSchema}
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
                    isSubmitting,
                    setFieldValue
                  }) => (
                    <form onSubmit={handleSubmit}>
                      <div className="form-group mb-3">
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
                      <div className="form-group mb-3">
                        <label className="text-label">Path *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="Path"
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.Path}
                        />
                        {errors.Path && (
                          <div className="text-danger">{errors.Path}</div>
                        )}
                      </div>
                      
                      <div className="form-group mb-3">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            name="IsActive"
                            id="IsActive"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            checked={values.IsActive}
                          />
                          <label className="form-check-label" htmlFor="IsActive">
                            Is Active
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn me-2 btn-primary"
                        disabled={isSubmitting}
                      >
                        Submit
                      </button>
                      <button type="button" className="btn btn-danger light" onClick={() => navigate("/ModuleMaster")}>
                        Cancel
                      </button>
                    </form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddEdit_ModuleMaster;
