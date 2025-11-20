import React, { Fragment, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import { API_WEB_URLS } from "../../constants/constAPI";
import { Fn_AddEditData, Fn_DisplayData, Fn_FillListData } from "../../store/Functions";

const CardMasterSchema = Yup.object().shape({
  F_CategoryMaster: Yup.string().required("Category is required"),
  F_ComponentMaster: Yup.string().required("Component Name is required"),
  Picture: Yup.mixed(),
  L1: Yup.number().required("L1 is required").positive(),
  W1: Yup.number().required("W1 is required").positive(),
  T1: Yup.number().required("T1 is required").positive(),
  Qty1: Yup.number().required("Qty1 is required").positive(),
  L2: Yup.number().required("L2 is required").positive(),
  W2: Yup.number().required("W2 is required").positive(),
  T2: Yup.number().required("T2 is required").positive(),
  Qty2: Yup.number().required("Qty2 is required").positive(),
});



const AddEdit_CardMaster = () => {
  const [state, setState] = useState({
    id: 0,
    formData: {
      F_CategoryMaster: "",
      F_ComponentMaster: "",
      Picture: null,
      L1: "",
      W1: "",
      T1: "",
      Qty1: "",
      L2: "",
      W2: "",
      T2: "",
      Qty2: "",
    },
    FillArray:[],
    FillArray2:[],
    isProgress: true,
  });
const dispatch = useDispatch()
const location = useLocation()
const navigate = useNavigate()
const API_URL = `${API_WEB_URLS.MASTER}/0/token/Category`
const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Components`
const API_URL_SAVE = "MainMaster/0/token"
const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/MainMaster/Id`



  
  useEffect(() => {
    Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`)
    Fn_FillListData(dispatch, setState, "FillArray2", `${API_URL2}/Id/0`)
    
    const Id = (location.state && location.state.Id) || 0
    if (Id > 0) {
      setState(prevState => ({ ...prevState, id: Id }))
      Fn_DisplayData(dispatch, setState, Id, API_URL_EDIT)
    }
  }, [dispatch, location.state])


  const handleSubmit = async (values) => {
    try {
      console.log("Form Data:", values);
      // Add your API call here
      const formData = new FormData()
      formData.append("F_CategoryMaster", values.F_CategoryMaster)
      formData.append("F_ComponentMaster", values.F_ComponentMaster)
      formData.append("Picture", values.Picture)
      formData.append("L1", values.L1)
      formData.append("W1", values.W1)
      formData.append("T1", values.T1)
      formData.append("Qty1", values.Qty1)
      formData.append("L2", values.L2)
      formData.append("W2", values.W2)
      formData.append("T2", values.T2)
      formData.append("Qty2", values.Qty2)
      formData.append("UserID", 1)

     
      Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: state.id, formData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        "/CardMaster"
      )
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while submitting the form. Please try again.");
    }
  };

  return (
    <Fragment>
      <PageTitle
        activeMenu="Validation"
        motherMenu="Form"
        pageContent="Validation"
      />

      <div className="row" style={{ fontFamily: 'Times New Roman' }}>
        <div className="col-lg-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title" style={{ fontFamily: 'Times New Roman' }}>Card Master Form</h4>
            </div>
            <div className="card-body">
              <div className="basic-form">
                <Formik
                  initialValues={ state.formData }
                  enableReinitialize
                  validationSchema={CardMasterSchema}
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
                    setFieldValue,
                    handleSubmit,
                    isSubmitting,
                  }) => (
                    <form onSubmit={handleSubmit}>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <div className="form-group">
                            <label className="text-label" style={{ fontFamily: 'Times New Roman' }}>Category *</label>
                            <select
                              className="form-control"
                              name="F_CategoryMaster"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.F_CategoryMaster}
                              style={{ fontFamily: 'Times New Roman' }}
                            >
                              <option value="">Select Category</option>
                              {state.FillArray.length>0 && state.FillArray.map((option) => (
                                <option key={option.Id} value={option.Id}>
                                  {option.Name}
                                </option>
                              ))}
                            </select>
                            {errors.F_CategoryMaster && (
                              <div className="text-danger">
                                {errors.F_CategoryMaster}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-6">
                          <div className="form-group">
                            <label className="text-label">Component *</label>
                            <select
                              className="form-control"
                              name="F_ComponentMaster"
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values.F_ComponentMaster}
                            >
                              <option value="">Select Component</option>
                              {state.FillArray2.length>0 && state.FillArray2.map((option) => (
                                <option key={option.Id} value={option.Id}>
                                  {option.Name}
                                </option>
                              ))}
                            </select>
                            {errors.F_ComponentMaster && (
                              <div className="text-danger">
                                {errors.F_ComponentMaster}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-group">
                            <label className="text-label">Picture *</label>
                            <input
                              type="file"
                              className="form-control"
                              name="Picture"
                              onChange={(event) =>
                                setFieldValue("Picture", event.target.files[0])
                              }
                              onBlur={handleBlur}
                            />
                            {errors.Picture && (
                              <div className="text-danger">{errors.Picture}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {["1", "2"].map((key) => (
                        <div key={key} className="row">
                          <div className="form-group col-md-3 mb-3">
                            <label className="text-label">L{key} *</label>
                            <input
                              type="number"
                              className="form-control"
                              name={`L${key}`}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values[`L${key}`]}
                            />
                            {errors[`L${key}`] && (
                              <div className="text-danger">
                                {errors[`L${key}`]}
                              </div>
                            )}
                          </div>
                          <div className="form-group col-md-3 mb-3">
                            <label className="text-label">W{key} *</label>
                            <input
                              type="number"
                              className="form-control"
                              name={`W${key}`}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values[`W${key}`]}
                            />
                            {errors[`W${key}`] && (
                              <div className="text-danger">
                                {errors[`W${key}`]}
                              </div>
                            )}
                          </div>
                          <div className="form-group col-md-3 mb-3">
                            <label className="text-label">T{key} *</label>
                            <input
                              type="number"
                              className="form-control"
                              name={`T${key}`}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values[`T${key}`]}
                            />
                            {errors[`T${key}`] && (
                              <div className="text-danger">
                                {errors[`T${key}`]}
                              </div>
                            )}
                          </div>
                          <div className="form-group col-md-3 mb-3">
                            <label className="text-label">Qty{key} *</label>
                            <input
                              type="number"
                              className="form-control"
                              name={`Qty${key}`}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              value={values[`Qty${key}`]}
                            />
                            {errors[`Qty${key}`] && (
                              <div className="text-danger">
                                {errors[`Qty${key}`]}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        type="submit"
                        className="btn me-2 btn-primary"
                        disabled={isSubmitting}
                      >
                        Submit
                      </button>
                      <button type="button" className="btn btn-danger light">
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

export default AddEdit_CardMaster;
