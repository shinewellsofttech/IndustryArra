import React, { Fragment, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { Fn_AddEditData, Fn_DisplayData, Fn_FillListData } from "../../store/Functions";
import { useDispatch } from "react-redux";
import { API_WEB_URLS } from "../../constants/constAPI";

const ValidationSchema = Yup.object().shape({
  Name: Yup.string().required("Name is required"),
  Code: Yup.string().required("Code is required"),
  Description: Yup.string(),
});

const AddEdit_UserRole = () => {
  const [state, setState] = useState({
    id: 0,
    formData: {
      Name: "",
      Code: "",
      Description: "",
      IsActive: true,
    },
    isProgress: true,
  });
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/UserRole`
  const API_URL_SAVE = "UserRole/0/token"
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/UserRole/Id`
  
  const activeMenu = "Masters";
  const motherMenu = "Masters";
  const pageContent = "Masters";
  const cardTitle = "Form with User Role";

  useEffect(() => {
    const Id = (location.state && location.state.Id) || 0
    if (Id > 0) {
      setState(prevState => ({ ...prevState, id: Id }))
      Fn_DisplayData(dispatch, setState, Id, API_URL_EDIT)
    }
  }, [dispatch, location.state])

  const handleSubmit = async (values) => {
    try {
      console.log("Form Data:", values);
      const formData = new FormData()
      formData.append("Name", values.Name || "")
      formData.append("Code", values.Code || "")
      formData.append("Description", values.Description || "")
      formData.append("IsActive", !!values.IsActive)
      Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: state.id, formData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        "/UserRole"
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
            <div className="card-header">
              <h4 className="card-title">{cardTitle}</h4>
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
                          value={values.Name || ""}
                        />
                        {errors.Name && (
                          <div className="text-danger">{errors.Name}</div>
                        )}
                      </div>
                      <div className="form-group mb-3">
                        <label className="text-label">Code *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="Code"
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.Code || ""}
                        />
                        {errors.Code && (
                          <div className="text-danger">{errors.Code}</div>
                        )}
                      </div>
                      <div className="form-group mb-3">
                        <label className="text-label">Description</label>
                        <input
                          type="text"
                          className="form-control"
                          name="Description"
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.Description || ""}
                        />
                        {errors.Description && (
                          <div className="text-danger">{errors.Description}</div>
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
                            checked={!!values.IsActive}
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
                      <button type="button" className="btn btn-danger light" onClick={() => navigate("/UserRole")}>
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

export default AddEdit_UserRole;
