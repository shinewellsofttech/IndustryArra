import React, { Fragment, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { Fn_AddEditData, Fn_DisplayData, Fn_FillListData } from "../../store/Functions";
import { useDispatch } from "react-redux";
import { API_WEB_URLS } from "../../constants/constAPI";
import swal from "sweetalert";

const ValidationSchema = Yup.object().shape({
  Name: Yup.string().required("Name is required"),
  UserName: Yup.string().required("User Name is required"),
  EmployeeCode: Yup.string().required("Employee Code is required"),
  PasswordHash: Yup.string().required("Password is required"),
  F_UserRole: Yup.number().min(1, "User Role is required"),
  Email: Yup.string().email("Invalid email format").nullable(),
  MobileNo: Yup.string().nullable(),
});

const AddEdit_UserMasterCrud = () => {
  const [state, setState] = useState({
    id: 0,
    formData: {
      Name: "",
      EmployeeCode: "",
      UserName: "",
      PasswordHash: "",
      F_UserRole: 0,
      F_MachineMaster: 0,
      MobileNo: "",
      Email: "",
      DateOfJoining: "",
      IsActive: true,
    },
    roles: [],
    machines: [],
    isProgress: true,
  });
  
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  
  const API_URL_SAVE = "UserMaster/0/token"
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/UserMaster/Id`
  const ROLE_API_URL = `${API_WEB_URLS.MASTER}/0/token/UserRole/Id/0`
  
  const activeMenu = "Masters";
  const motherMenu = "Masters";
  const pageContent = "Masters";
  const cardTitle = "Form with User Master";

  useEffect(() => {
    // Fetch User Roles and Machines for dropdowns
    Fn_FillListData(dispatch, setState, "roles", ROLE_API_URL);
    Fn_FillListData(dispatch, setState, "machines", `${API_WEB_URLS.MASTER}/0/token/MachineMaster/Id/0`);

    const Id = (location.state && location.state.Id) || 0
    if (Id > 0) {
      setState(prevState => ({ ...prevState, id: Id }))
      Fn_DisplayData(dispatch, setState, Id, API_URL_EDIT)
    }
  }, [dispatch, location.state])

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.split("T")[0];
  };

  const handleSubmit = async (values) => {
    try {
      console.log("Form Data:", values);
      const formData = new FormData()
      formData.append("Name", values.Name || "")
      formData.append("EmployeeCode", values.EmployeeCode || "")
      formData.append("UserName", values.UserName || "")
      formData.append("PasswordHash", values.PasswordHash || "")
      formData.append("F_UserRole", values.F_UserRole || 0)
      
      if (String(values.F_UserRole) === "2") {
        if (!values.F_MachineMaster || values.F_MachineMaster == 0) {
          alert("Please select a Machine.");
          return;
        }
        formData.append("F_MachineMaster", values.F_MachineMaster);
      } else {
        formData.append("F_MachineMaster", 0);
      }
      
      formData.append("MobileNo", values.MobileNo || "")
      formData.append("Email", values.Email || "")
      formData.append("DateOfJoining", values.DateOfJoining || "")
      formData.append("IsActive", !!values.IsActive)
      
      Fn_AddEditData(
        dispatch,
        () => {},
        { arguList: { id: state.id, formData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        null
      ).then((res) => {
        console.log("AddEdit_UserMasterCrud resolved with:", res);
        swal("Success", state.id === 0 ? "User Master created successfully!" : "User Master updated successfully!", "success", {
          buttons: false,
          timer: 1500,
        }).then(() => {
          navigate("/UserMasterCrud");
        });
      }).catch((err) => {
        console.error("AddEdit_UserMasterCrud rejected with:", err);
        swal("Error", typeof err === "string" ? err : "Failed to save data", "error");
      });
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
                  initialValues={{
                    ...state.formData,
                    DateOfJoining: formatDateForInput(state.formData.DateOfJoining)
                  }}
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
                      <div className="row">
                        <div className="col-md-6 form-group mb-3">
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

                        <div className="col-md-6 form-group mb-3">
                          <label className="text-label">User Name *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="UserName"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.UserName || ""}
                          />
                          {errors.UserName && (
                            <div className="text-danger">{errors.UserName}</div>
                          )}
                        </div>

                        <div className="col-md-6 form-group mb-3">
                          <label className="text-label">Employee Code *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="EmployeeCode"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.EmployeeCode || ""}
                          />
                          {errors.EmployeeCode && (
                            <div className="text-danger">{errors.EmployeeCode}</div>
                          )}
                        </div>

                        <div className="col-md-6 form-group mb-3">
                          <label className="text-label">Password *</label>
                          <input
                            type="password"
                            className="form-control"
                            name="PasswordHash"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.PasswordHash || ""}
                          />
                          {errors.PasswordHash && (
                            <div className="text-danger">{errors.PasswordHash}</div>
                          )}
                        </div>

                        <div className="col-md-6 form-group mb-3">
                          <label className="text-label">User Role *</label>
                          <select
                            className="form-control"
                            name="F_UserRole"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.F_UserRole || 0}
                          >
                            <option value={0}>-- Select Role --</option>
                            {state.roles && state.roles.map(role => (
                              <option key={role.Id} value={role.Id}>{role.Name}</option>
                            ))}
                          </select>
                            {errors.F_UserRole && (
                            <div className="text-danger">{errors.F_UserRole}</div>
                          )}
                        </div>

                        {String(values.F_UserRole) === "2" && (
                          <div className="col-md-6 form-group mb-3">
                            <label className="text-label">Machine Master *</label>
                            <select
                              className="form-control"
                              name="F_MachineMaster"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.F_MachineMaster || 0}
                            >
                              <option value={0}>-- Select Machine --</option>
                              {state.machines && state.machines.map(m => (
                                <option key={m.Id} value={m.Id}>{m.Name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="col-md-6 form-group mb-3">
                          <label className="text-label">Mobile No</label>
                          <input
                            type="text"
                            className="form-control"
                            name="MobileNo"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.MobileNo || ""}
                          />
                          {errors.MobileNo && (
                            <div className="text-danger">{errors.MobileNo}</div>
                          )}
                        </div>

                        <div className="col-md-6 form-group mb-3">
                          <label className="text-label">Email</label>
                          <input
                            type="email"
                            className="form-control"
                            name="Email"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.Email || ""}
                          />
                          {errors.Email && (
                            <div className="text-danger">{errors.Email}</div>
                          )}
                        </div>

                        <div className="col-md-6 form-group mb-3">
                          <label className="text-label">Date of Joining</label>
                          <input
                            type="date"
                            className="form-control"
                            name="DateOfJoining"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.DateOfJoining || ""}
                          />
                        </div>
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
                      <button type="button" className="btn btn-danger light" onClick={() => navigate("/UserMasterCrud")}>
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

export default AddEdit_UserMasterCrud;
