import React, { Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { Fn_AddEditData, Fn_DisplayData, Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { useDispatch } from "react-redux";
import { API_WEB_URLS } from "../../constants/constAPI";
import { Col, Row } from "react-bootstrap";

const NameSchema = Yup.object().shape({
  DepartmentFrom: Yup.string().required("Department From is required"),
  DepartmentTo: Yup.string().required("Department To is required"),
  Container: Yup.string().required("Container is required"),
  ItemsByContainer: Yup.string().required("Item is required"),
  Quantity: Yup.number().positive("Quantity must be positive").required("Quantity is required"),
  StartDate: Yup.date().required("Start Date is required"),
  EndDate: Yup.date().required("End Date is required").min(
    Yup.ref('StartDate'),
    'End Date must be after Start Date'
  ),
});

const AddEdit_Transfer = () => {
  const [state, setState] = useState({
    id: 0,
    formData: {
      DepartmentFrom: "",
      DepartmentTo: "",
      Container: "",
      ItemsByContainer: "",
      Quantity: "",
      StartDate: new Date().toISOString().split('T')[0],
      EndDate: new Date().toISOString().split('T')[0],
    },
    isProgress: true,
    FillArray1: [],
    FillArray2: [],
    FillArray3: [],
  });
  const [TotalQuantity, setTotalQuantity] = useState(0);
  const [TransferdQuantity, setTransferdQuantity] = useState(0);

  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/DepartmentMaster`;
  const API_URL1 = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/ItemsByContainer`;
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/Transfer/Id`;
  const API_URL_SAVE = "Transfer/0/token";


  // PageTitle props
  const activeMenu = "Masters";
  const motherMenu = "Department Transfer";
  const pageContent = "Masters";
  const cardTitle = "Transfer Master";

  useEffect(() => {
     Fn_FillListData(dispatch, setState, "FillArray1", `${API_URL}/Id/0`);
     Fn_FillListData(dispatch, setState, "FillArray2", `${API_URL1}/Id/0`);
     Fn_FillListData(dispatch, setState, "FillArray3", `${API_URL2}/Id/0`);
    const Id = (location.state && location.state.Id) || 0;
    if (Id > 0) {
      setState((prevState) => ({ ...prevState, id: Id }));
      Fn_DisplayData(dispatch, setState, Id, API_URL_EDIT);
    }
  }, [dispatch, location.state]);
useEffect(()=>{
    if(state.formData.ItemsByContainer>0 && state.formData.DepartmentFrom>0 && state.formData.DepartmentTo>0){
      GetTransferdQuantity();
    }
},[state.formData.ItemsByContainer, state.formData.DepartmentFrom, state.formData.DepartmentTo]);
  // Common handleChange function
  const handleChange = async (e, setFieldValue, setFieldTouched) => {
    const { name, value } = e.target;
    if(name=="Container"){
      Fn_FillListData(dispatch, setState, "FillArray3", `${API_URL2}/Id/${value}`);
    }
    if(name=="ItemsByContainer"){
      const obj = state.FillArray3.find(x=>x.Id==value);
      setTotalQuantity(obj.Quantity);
    }
    setFieldValue(name, value); 
    setFieldTouched(name, true);
    
    // Update state.formData to trigger useEffect
    setState(prevState => ({
      ...prevState,
      formData: {
        ...prevState.formData,
        [name]: value
      }
    }));
  };

  const GetTransferdQuantity = async () => {
    const obj = state.FillArray3.find(x=>x.Id==state.formData.ItemsByContainer);
    
    if (!obj) {
      console.log("No item found for ItemsByContainer:", state.formData.ItemsByContainer);
      return;
    }
    
    let vformData = new FormData();
    vformData.append("F_ContainerMasterL", obj.F_ContainerMasterL);
    vformData.append("DepartmentFrom", state.formData.DepartmentFrom);
    vformData.append("DepartmentTo", state.formData.DepartmentTo);

    // Fetch job cards and machines for selected container
   const res = await Fn_GetReport(
      dispatch,
      setState,
      "GetTransferdQuantity",
      "GetTransferdQuantity/0/token",
      { arguList: { id: 0, formData: vformData } },
      true
    );
    console.log("GetTransferdQuantity",res);
    
    // Update transferred quantity if response contains it
    if (res && res.length > 0) {
      setTransferdQuantity(res[0].Quantity || 0);
    }
  }

  // Format date for SQL Server (YYYY-MM-DD)
  const formatDateForSQL = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (values) => {
    try {
      console.log("Form Data:", values);
      const user = JSON.parse(localStorage.getItem("authUser"));
      const obj = state.FillArray3.find(x=>x.Id==values.ItemsByContainer);
      const formData = new FormData();
      formData.append("DepartmentFrom", values.DepartmentFrom);
      formData.append("DepartmentTo", values.DepartmentTo);
      formData.append("F_ContainerMasterL", obj.F_ContainerMasterL);
      formData.append("Actual", values.Quantity);
      formData.append("UserId", user.id);
      formData.append("StartDate", formatDateForSQL(values.StartDate));
      formData.append("EndDate", formatDateForSQL(values.EndDate));

      Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: state.id, formData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        "/Transfer"
      );
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while submitting the form. Please try again.");
    }
  };

  return (
    <Fragment>
      <PageTitle activeMenu={activeMenu} motherMenu={motherMenu} pageContent={pageContent} />

      <div className="row" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
        <div className="col-lg-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', fontWeight: '600', fontSize: '20px' }}>{cardTitle}</h4>
            </div>
            <div className="card-body">
              <div className="basic-form">
                <Formik
                  initialValues={state.formData}
                  enableReinitialize
                  validationSchema={NameSchema}
                  onSubmit={(values, { setSubmitting }) => {
                    handleSubmit(values);
                    setSubmitting(false);
                  }}
                >
                  {({ values, errors, handleChange: formikHandleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue, setFieldTouched }) => {
                    // Sort departments by Sequence
                    const sortedDepartments = [...state.FillArray1].sort((a, b) => a.Sequence - b.Sequence);
                    // Get selected DepartmentFrom's Sequence
                    const selectedFromDept = sortedDepartments.find(dept => dept.Id == values.DepartmentFrom);
                    const fromSequence = selectedFromDept ? selectedFromDept.Sequence : null;
                    // Filter DepartmentTo list
                    const departmentToList = fromSequence
                      ? sortedDepartments.filter(dept => dept.Sequence > fromSequence)
                      : sortedDepartments;
                    return (
                    <form onSubmit={handleSubmit}>
                           <Row className="mb-3">
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>Container *</label>
                        </Col>
                        <Col lg="4">
                          <select
                            className="form-control"
                            name="Container"
                            onChange={(e) => 
                                handleChange(e, setFieldValue, setFieldTouched)
                            }
                            onBlur={handleBlur}
                            value={values.Container}
                            style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}
                          >
                            <option value="">Select Container</option>
                            {state.FillArray2 && state.FillArray2.map((container) => (
                              <option key={container.Id} value={container.Id}>
                                {container.Name}
                              </option>
                            ))}
                          </select>
                          {errors.Container && <div className="text-danger" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>{errors.Container}</div>}
                        </Col>
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>Item *</label>
                        </Col>
                        <Col lg="4">
                          <select
                            className="form-control"
                            name="ItemsByContainer"
                            onChange={(e) => handleChange(e, setFieldValue, setFieldTouched)}
                            onBlur={handleBlur}
                            value={values.ItemsByContainer}
                            style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}
                          >
                            <option value="">Select Item</option>
                            {state.FillArray3 && state.FillArray3.map((item) => (
                              <option key={item.Id} value={item.Id}>
                                {item.Name}
                              </option>
                            ))}
                          </select>
                          {errors.ItemsByContainer && <div className="text-danger" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>{errors.ItemsByContainer}</div>}
                        </Col>
                      </Row>
                      <Row>
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>Department From *</label>
                        </Col>
                        <Col lg="4">
                          <select
                            className="form-control"
                            name="DepartmentFrom"
                            onChange={(e) => handleChange(e, setFieldValue, setFieldTouched)}
                            onBlur={handleBlur}
                            value={values.DepartmentFrom}
                            style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}
                          >
                            <option value="">Select Department From</option>
                            {sortedDepartments.map((dept) => (
                              <option key={dept.Id} value={dept.Id}>
                                {dept.Name}
                              </option>
                            ))}
                          </select>
                          {errors.DepartmentFrom && <div className="text-danger" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>{errors.DepartmentFrom}</div>}
                        </Col>
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>Department To *</label>
                        </Col>
                        <Col lg="4">
                          <select
                            className="form-control"
                            name="DepartmentTo"
                            onChange={(e) => handleChange(e, setFieldValue, setFieldTouched)}
                            onBlur={handleBlur}
                            value={values.DepartmentTo}
                            style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}
                          >
                            <option value="">Select Department To</option>
                            {departmentToList.map((dept) => (
                              <option key={dept.Id} value={dept.Id}>
                                {dept.Name}
                              </option>
                            ))}
                          </select>
                          {errors.DepartmentTo && <div className="text-danger" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>{errors.DepartmentTo}</div>}
                        </Col>
                      </Row>

                   

                      <Row className="mt-3">
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Times New Roman' }}>Quantity *</label>
                        </Col>
                        <Col lg="4">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            className="form-control"
                            name="Quantity"
                            onChange={(e) => handleChange(e, setFieldValue, setFieldTouched)}
                            onBlur={handleBlur}
                            value={values.Quantity}
                            placeholder="Enter quantity"
                            style={{ fontFamily: 'Times New Roman' }}
                          />
                          <div className="mt-2">
                            <div className="d-flex justify-content-between">
                              <span className="badge badge-primary" style={{ fontFamily: 'Times New Roman', fontSize: '12px', padding: '5px 10px' }}>
                                Total Quantity: <strong>{TotalQuantity}</strong>
                              </span>
                              <span className="badge badge-info" style={{ fontFamily: 'Times New Roman', fontSize: '12px', padding: '5px 10px' }}>
                                Transferred Quantity: <strong>{TransferdQuantity}</strong>
                              </span>
                            </div>
                            <div className="mt-1">
                              <span className="badge badge-warning" style={{ fontFamily: 'Times New Roman', fontSize: '12px', padding: '5px 10px' }}>
                                Available Quantity: <strong>{TotalQuantity - TransferdQuantity}</strong>
                              </span>
                            </div>
                          </div>
                          {errors.Quantity && <div className="text-danger" style={{ fontFamily: 'Times New Roman' }}>{errors.Quantity}</div>}
                        </Col>
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Times New Roman' }}>Start Date *</label>
                        </Col>
                        <Col lg="4">
                          <input
                            type="date"
                            className="form-control"
                            name="StartDate"
                            onChange={(e) => handleChange(e, setFieldValue, setFieldTouched)}
                            onBlur={handleBlur}
                            value={values.StartDate}
                            style={{ fontFamily: 'Times New Roman' }}
                          />
                          {errors.StartDate && <div className="text-danger" style={{ fontFamily: 'Times New Roman' }}>{errors.StartDate}</div>}
                        </Col>
                      </Row>

                      <Row className="mt-3">
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Times New Roman' }}>End Date *</label>
                        </Col>
                        <Col lg="4">
                          <input
                            type="date"
                            className="form-control"
                            name="EndDate"
                            onChange={(e) => handleChange(e, setFieldValue, setFieldTouched)}
                            onBlur={handleBlur}
                            value={values.EndDate}
                            style={{ fontFamily: 'Times New Roman' }}
                          />
                          {errors.EndDate && <div className="text-danger" style={{ fontFamily: 'Times New Roman' }}>{errors.EndDate}</div>}
                        </Col>
                      </Row>

                      <button type="submit" className="btn me-2 btn-primary" disabled={isSubmitting} style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
                        Submit
                      </button>
                      <button type="button" className="btn btn-danger light" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
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

export default AddEdit_Transfer;
