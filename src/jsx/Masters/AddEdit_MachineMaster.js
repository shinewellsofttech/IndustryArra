import React, { Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import { API_WEB_URLS } from "../../constants/constAPI";
import { Fn_AddEditData, Fn_DisplayData } from "../../store/Functions";

const NameSchema = Yup.object().shape({
  Name: Yup.string().required("Name is required"),
  F_MachineTypeMaster: Yup.string().required("Machine Type is required"),
});

const AddEdit_MachineMaster = () => {
  const [state, setState] = useState({
    id: 0,
    formData: {
      Name: "",
      F_MachineTypeMaster: "",
    },
    FillArray: [
      { Id: 1, Name: "Wood" },
      { Id: 2, Name: "Metal" },
    ],
  });
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const API_URL_SAVE = "MachineMaster/0/token";
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/MachineMasterEdit/Id`;
  // Define variables for PageTitle props
  const activeMenu = "Masters";
  const motherMenu = "Masters";
  const pageContent = "Masters";
  const cardTitle = "Machine Master";

  useEffect(() => {
    const Id = (location.state && location.state.Id) || 0;
    if (Id > 0) {
      setState((prevState) => ({ ...prevState, id: Id }));
      Fn_DisplayData(dispatch, setState, Id, API_URL_EDIT);
    }
  }, [dispatch, location.state]);

  const handleSubmit = async (values) => {
    try {
      console.log("Form Data:", values);
      const formData = new FormData();
      formData.append("Name", values.Name);
      formData.append("F_MachineTypeMaster", values.F_MachineTypeMaster);

      Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: state.id, formData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        "/MachineMaster"
      );
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
                    isSubmitting,
                  }) => {
                    return (
                    <form onSubmit={handleSubmit}>
                      <div className="row mb-3">
                        <div className="col-md-6">
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
                        <div className="col-md-6">
                          <div className="form-group">
                            <label className="text-label">Machine Type *</label>
                            <select
                              className="form-control"
                              name="F_MachineTypeMaster"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.F_MachineTypeMaster}
                            >
                              <option value="">Select Machine Type</option>
                              {state.FillArray.map((type) => (
                                <option key={type.Id} value={type.Id}>
                                  {type.Name}
                                </option>
                              ))}
                            </select>
                            {errors.F_MachineTypeMaster && (
                              <div className="text-danger">
                                {errors.F_MachineTypeMaster}
                              </div>
                            )}
                          </div>
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
                        onClick={() => navigate('/MachineMaster')}
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

export default AddEdit_MachineMaster;
