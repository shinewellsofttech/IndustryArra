import React, { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import PageTitle from "../../../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";

const loginSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, "Your username must consist of at least 3 characters ")
    .max(50, "Your username must consist of at least 3 characters ")
    .required("Please enter a username"),
  password: Yup.string()
    .min(5, "Your password must be at least 5 characters long")
    .max(50, "Your password must be at least 5 characters long")
    .required("Please provide a password"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Please enter an email"),
  phone: Yup.string()
    .matches(
      /^[0-9]{10}$/,
      "Phone number must be 10 digits"
    )
    .required("Please enter a phone number"),
});

const cardTitle = "Add User Master"; 

const activeMenu = "Validation";
const motherMenu = "Form";
const pageContent = "Validation";

const AddEdit_UserMaster = () => {
  const [showPassword, setShowPassword] = useState(false);

  // State to store form data
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    phone: "",
  });

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
                  initialValues={formData}
                  validationSchema={loginSchema}
                  onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                      alert(JSON.stringify(values, null, 2));
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
                        <div className="col-md-6">
                          <div
                            className={`form-group mb-3 ${
                              values.username
                                ? errors.username
                                  ? "is-invalid"
                                  : "is-valid"
                                : ""
                            }`}
                          >
                            <label className="text-label">Username</label>
                            <div className="input-group">
                              <span className="input-group-text ">
                                <i className="fa fa-user" />{" "}
                              </span>
                              <input
                                type="text"
                                className="form-control"
                                id="val-username1"
                                placeholder="Enter a username.."
                                name="username"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.username}
                              />
                              <div
                                id="val-username1-error"
                                className="invalid-feedback animated fadeInUp"
                                style={{ display: "block" }}
                              >
                                {errors.username && errors.username}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div
                            className={`form-group mb-3 ${
                              values.password
                                ? errors.password
                                  ? "is-invalid"
                                  : "is-valid"
                                : ""
                            }`}
                          >
                            <label className="text-label">Password *</label>
                            <div className="input-group transparent-append mb-2">
                              <span className="input-group-text">
                                {" "}
                                <i className="fa fa-lock" />{" "}
                              </span>
                              <input
                                type={`${showPassword ? "text" : "password"}`}
                                className="form-control"
                                id="val-password1"
                                name="password"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.password}
                                placeholder="Choose a safe one.."
                              />
                              <div
                                className="input-group-text show-validate"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword === false ? (
                                  <i className="fa fa-eye-slash" />
                                ) : (
                                  <i className="fa fa-eye" />
                                )}
                              </div>
                              <div
                                id="val-password1-error"
                                className="invalid-feedback animated fadeInUp"
                                style={{ display: "block" }}
                              >
                                {errors.password && errors.password}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-md-6">
                          <div
                            className={`form-group mb-3 ${
                              values.email
                                ? errors.email
                                  ? "is-invalid"
                                  : "is-valid"
                                : ""
                            }`}
                          >
                            <label className="text-label">Email *</label>
                            <div className="input-group">
                              <span className="input-group-text">
                                <i className="fa fa-envelope" />
                              </span>
                              <input
                                type="email"
                                className="form-control"
                                id="val-email"
                                placeholder="Enter your email"
                                name="email"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.email}
                              />
                              <div
                                id="val-email-error"
                                className="invalid-feedback animated fadeInUp"
                                style={{ display: "block" }}
                              >
                                {errors.email && errors.email}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div
                            className={`form-group mb-3 ${
                              values.phone
                                ? errors.phone
                                  ? "is-invalid"
                                  : "is-valid"
                                : ""
                            }`}
                          >
                            <label className="text-label">Phone *</label>
                            <div className="input-group">
                              <span className="input-group-text">
                                <i className="fa fa-phone" />
                              </span>
                              <input
                                type="text"
                                className="form-control"
                                id="val-phone"
                                placeholder="Enter your phone number"
                                name="phone"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.phone}
                              />
                              <div
                                id="val-phone-error"
                                className="invalid-feedback animated fadeInUp"
                                style={{ display: "block" }}
                              >
                                {errors.phone && errors.phone}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Checkbox */}
                      <div className="form-group mb-3">
                        <div className="form-check">
                          <input
                            id="checkbox1"
                            className="form-check-input"
                            type="checkbox"
                          />
                          <label htmlFor="checkbox1" className="form-check-label">
                            Check me out
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
                      <button className="btn btn-danger light">Cancel</button>
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

export default AddEdit_UserMaster;
