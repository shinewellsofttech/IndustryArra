import React, { Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { Fn_AddEditData, Fn_DisplayData, Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { useDispatch } from "react-redux";
import { API_WEB_URLS } from "../../constants/constAPI";
import { Col, Row } from "react-bootstrap";

const machineOptions = [
  { Id: 1, Name: "Machine A" },
  { Id: 2, Name: "Machine B" },
  // ... more machines ...
];

// Single array for Job Card + Item Name + Component Name
// Status: 0 = Not Started, 1 = In Progress, 2 = Completed
const initialJobCardComboOptions = [
  { Id: 1, Name: "JobCard001 - ItemX - ComponentAlpha", Status: 1 },
  { Id: 2, Name: "JobCard002 - ItemY - ComponentBeta", Status: 0 },
  { Id: 3, Name: "JobCard003 - ItemZ - ComponentGamma", Status: 2 },
  // ... more combos ...
];

const NameSchema = Yup.object().shape({
  MachineId: Yup.string().required("Machine is required").test('not-default', 'Machine is required', value => value !== '-1'),
  JobCardComboId: Yup.string().required("Job Card/Item/Component is required").test('not-default', 'Job Card/Item/Component is required', value => value !== '-1'),
  Quantity: Yup.number()
    .when("JobCardComboId", {
      is: (val) => {
        if (!val || val === '-1') return false;
        const selected = initialJobCardComboOptions.find((opt) => String(opt.Id) === String(val));
        return selected && selected.Status === 1;
      },
      then: (schema) => schema.required("Quantity is required").min(1, "Min 1"),
      otherwise: (schema) => schema.notRequired(),
    }),
  StartDateTime: Yup.string().when("JobCardComboId", {
    is: (val) => {
      if (!val || val === '-1') return false;
      const selected = initialJobCardComboOptions.find((opt) => String(opt.Id) === String(val));
      return selected && selected.Status === 0;
    },
    then: (schema) => schema.required("Start Date and Time is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  EndDateTime: Yup.string().when("JobCardComboId", {
    is: (val) => {
      if (!val || val === '-1') return false;
      const selected = initialJobCardComboOptions.find((opt) => String(opt.Id) === String(val));
      return selected && selected.Status === 1;
    },
    then: (schema) => schema.required("End Date and Time is required"),
    otherwise: (schema) => schema.notRequired(),
  })
});

const SupervisorEntry = () => {
  const [state, setState] = useState({
    id: 0,
    FillArray: [],
    FillArray1: [],
    FillArray2: [],
    FillArray3: [],
    FillArray4: [],
    FillArray5: [],
    formData: {
      MachineId: "-1",
      ContainerId: "-1",
      ItemId: "-1",
      ComponentId: "-1",
      JobCardComboId: "-1",
      Quantity: "",
      StartDateTime: "",
      EndDateTime: ""
    },
    isProgress: true,
  });

  const [jobCardComboOptions, setJobCardComboOptions] = useState(initialJobCardComboOptions);
  const [selectedJobCardCombo, setSelectedJobCardCombo] = useState({});
  const [F_ContainerMaster, setContainerMaster] = useState("");
  const [F_CategoryMaster, setCategoryMaster] = useState("");
  const [F_ItemMaster, setItemMaster] = useState("");
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/MachineMaster`;
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/MachineMaster/Id`;
  const API_URL_SAVE = "SupervisorEntry/0/token";
  const API_URL_Report = "GetNextMachineJobByStatus/0/token";
  const API_URL_Report1 = "GetComponentByMachine/0/token";

  const API_URL1 = `${API_WEB_URLS.MASTER}/0/token/ContainerByMachine`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/ItemByMachine`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  // PageTitle props
  const activeMenu = "Masters";
  const motherMenu = "Masters";
  const pageContent = "Masters";
  const cardTitle = "Form with Name Field";

  // Add these helper functions at the top of the component
  const formatDateTimeForSQL = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    // Ensure we preserve the local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatDateTimeForInput = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    // Ensure we preserve the local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateTimeForDisplay = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const formatDateForDisplay = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    const Id = (location.state && location.state.Id) || 0;
    Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`)
    
  
    if (Id > 0) {
      setState((prevState) => ({ ...prevState, id: Id }));
      Fn_DisplayData(dispatch, setState, Id, API_URL_EDIT);
    }
  }, [dispatch, location.state]);

  useEffect(() => {
    const selectedObj = state.FillArray2.find(opt => String(opt.Id) === String(state.formData.JobCardComboId)) || {};
    setSelectedJobCardCombo(selectedObj);
  }, [state.formData.JobCardComboId, state.FillArray2]);

  // Find the active job card
  const activeJobCard = jobCardComboOptions.find((opt) => opt.Status === 1);

  // Find the selected machine name (if you want to show it)
  const selectedMachine =
    machineOptions.find((m) => String(m.Id) === String(state.formData.MachineId)) || {};

  // Find the selected combo's status

  // Handler to start a job
  const handleStart = async (selectedId, status, resetForm, values) => {
    setJobCardComboOptions((prev) =>
      prev.map((opt) =>
        opt.Id === Number(selectedId)
          ? { ...opt, Status: status }
          : (status === 1 && opt.Status === 1)
          ? { ...opt, Status: 2 }
          : opt
      )
    );
  
    // Handle statuses
    const formData = new FormData();
    formData.append("Id", selectedId);
    formData.append("F_JobCardMaster", selectedJobCardCombo.JobCardMasterId);
    formData.append("Status", status);
    formData.append("StartDateTime", formatDateTimeForSQL(values.StartDateTime));
  
    await Fn_AddEditData(
      dispatch,
      setState,
      { arguList: { id: state.id, formData } },
      'UpdateProcess/0/token',
      true,
      "memberid",
      navigate,
      "#"
    );
  
    // Reset states and form
    setState((prev) => ({
      ...prev,
      formData: {
        MachineId: "-1",
        ContainerId: "-1",
        ItemId: "-1",
        ComponentId: "-1",
        JobCardComboId: "-1",
        Quantity: "",
        StartDateTime: "",
        EndDateTime: ""
      },
      FillArray2: [],
      FillArray3: [],
      FillArray4: [],
      FillArray5: []
    }));
    setSelectedJobCardCombo({});
    
    // Reset Formik form
    if (resetForm) {
      resetForm({
        values: {
          MachineId: "-1",
          ContainerId: "-1",
          ItemId: "-1",
          ComponentId: "-1",
          JobCardComboId: "-1",
          Quantity: "",
          StartDateTime: "",
          EndDateTime: ""
        }
      });
    }
  };
  

  // Function to handle machine change


  const handleDropdownChange = async (e, setFieldValue) => {
    const { name, value } = e.target;
    setFieldValue(name, value);

    switch (name) {
      case 'MachineId':
        // Reset all dependent fields when machine changes
        setFieldValue('ContainerId', '-1');
        setFieldValue('ItemId', '-1');
        setFieldValue('ComponentId', '-1');
        setState(prevState => ({ 
          ...prevState, 
          FillArray3: [], 
          FillArray4: [], 
          FillArray5: [],
          formData: {
            ...prevState.formData,
            MachineId: value
          }
        }));
        
        // Fetch containers for selected machine
        if (value !== '-1') {
          Fn_FillListData(dispatch, setState, "FillArray3", `${API_URL1}/Id/${value}`);
        }
        break;

      case 'ContainerId':
        // Reset Item and Component when Container changes
        setFieldValue('ItemId', '-1');
        setFieldValue('ComponentId', '-1');
        setState(prevState => ({ 
          ...prevState, 
          FillArray4: [], 
          FillArray5: [],
          formData: {
            ...prevState.formData,
            ContainerId: value
          }
        }));
        
        if (value !== '-1') {
          Fn_FillListData(dispatch, setState, "FillArray4", `${API_URL3}/${value}/${state.formData.MachineId}`);
        }
        break;

      case 'ItemId':
        // Reset Component when Item changes
        setFieldValue('ComponentId', '-1');
        setState(prevState => ({ 
          ...prevState, 
          FillArray5: [],
          formData: {
            ...prevState.formData,
            ItemId: value
          }
        }));
        const obj = state.FillArray4.find(x => x.Id == value);
        if (value !== '-1') {
          let vformData = new FormData();
          vformData.append("Id", state.formData.MachineId);
          vformData.append("F_ContainerMasterL", obj.F_ContainerMasterL);
          vformData.append("F_ItemMaster", value);

          await Fn_GetReport(
            dispatch,
            setState,
            "FillArray5",
            API_URL_Report1,
            { arguList: { id: 0, formData: vformData } },
            true
          );
        }
        break;

      case 'ComponentId':
        if (value !== '-1') {
          const obj = state.FillArray4.find(x => x.Id == state.formData.ItemId);
          let vformData = new FormData();
          vformData.append("Id", state.formData.MachineId);
          vformData.append("F_ContainerMasterL", obj.F_ContainerMasterL);
          vformData.append("F_ItemMaster", state.formData.ItemId);
          vformData.append("F_ComponentMaster", value);

          await Fn_GetReport(
            dispatch,
            setState,
            "FillArray2",
            API_URL_Report,
            { arguList: { id: 0, formData: vformData } },
            true
          );
        }
        break;

      default:
        break;
    }
  };

  const handleJobCardComboChange = (e, setFieldValue) => {
    const value = e.target.value;
    setFieldValue("JobCardComboId", value);
    setFieldValue("Quantity", "");
    // Find and set the selected job card combo object
    const selectedObj = state.FillArray2.find(opt => String(opt.Id) === String(value)) || {};

    console.log(selectedObj);
    setSelectedJobCardCombo(selectedObj);
    
  };

  const handleSubmit = async (values, { resetForm }) => {
    try {
      console.log("Form Data:", values);
      const formData = new FormData();
      formData.append("Id", values.JobCardComboId);
      formData.append("F_JobCardMaster", selectedJobCardCombo.JobCardMasterId);
      if (parseFloat(selectedJobCardCombo.Quantity) < parseFloat(values.Quantity) + parseFloat(selectedJobCardCombo.PreparedQty)) {
        alert("Prepared Quantity is more than Needed Quantity");
        return;
      }
      if (selectedJobCardCombo.Status == 1) {
        formData.append("Quantity", values.Quantity);
        formData.append("Status", 2);
        formData.append("EndDateTime", formatDateTimeForSQL(values.EndDateTime));
        
        await Fn_AddEditData(
          dispatch,
          setState,
          { arguList: { id: state.id, formData } },
          'UpdateProcess/0/token',
          true,
          "memberid",
          navigate,
          "#"
        );

        // Reset all states
        setState(prevState => ({
          ...prevState,
          formData: {
            MachineId: "-1",
            JobCardComboId: "-1",
            Quantity: "",
            StartDateTime: "",
            EndDateTime: ""
          },
          FillArray2: [],
          FillArray3: [],
          FillArray4: [],
          FillArray5: []
        }));
        setSelectedJobCardCombo({});
        
        // Reset Formik form
        resetForm({
          values: {
            MachineId: "-1",
            ContainerId: "-1",
            ItemId: "-1",
            ComponentId: "-1",
            JobCardComboId: "-1",
            Quantity: "",
            StartDateTime: "",
            EndDateTime: ""
          }
        });
        
        // No need to refresh job card data after resetting everything
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while submitting the form. Please try again.");
    }
  };

  const anotherJobRunning = state.FillArray2.some(
    (opt) => opt.Status === 1 && opt.Id !== selectedJobCardCombo.Id
  );

  return (
    <Fragment>
      <PageTitle activeMenu={activeMenu} motherMenu={motherMenu} pageContent={pageContent} />

      {/* Show active job card and machine status at the top */}
      <div className="row mb-3">
        <div className="col-lg-12">
          <div className="alert alert-info d-flex align-items-center" role="alert">
            <span>
              <strong>Active Job Card:</strong>{" "}
              {activeJobCard ? activeJobCard.Name : "None"}
              {" | "}
              <strong>Status:</strong> {activeJobCard ? "Active" : "No Active Job Card"}
              {selectedMachine.Name && (
                <>
                  {" | "}
                  <strong>Selected Machine:</strong> {selectedMachine.Name}
                </>
              )}
            </span>
          </div>
        </div>
      </div>

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
                  validateOnChange={false}
                  validateOnBlur={false}
                  onSubmit={(values, { setSubmitting, resetForm }) => {
                    handleSubmit(values, { resetForm });
                    setSubmitting(false);
                  }}
                >
                  {({
                    values,
                    errors,
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    isSubmitting,
                    setFieldValue,
                    resetForm
                  }) => {
                    return (
                      <form onSubmit={handleSubmit}>
                        <Row>
                          <Col lg="6">
                            <label className="text-label">Machine *</label>
                            <select
                              className="form-control"
                              name="MachineId"
                              onChange={(e) => handleDropdownChange(e, setFieldValue)}
                              onBlur={handleBlur}
                              value={values.MachineId}
                            >
                              <option value="-1">Select Machine</option>
                              {state.FillArray.map((opt) => (
                                <option key={opt.Id} value={opt.Id}>
                                  {opt.Name}
                                </option>
                              ))}
                            </select>
                            {errors.MachineId && (
                              <div className="text-danger">{errors.MachineId}</div>
                            )}
                          </Col>
                          <Col lg="6">
                            <label className="text-label">Container *</label>
                            <select
                              className="form-control"
                              name="ContainerId"
                              onChange={(e) => handleDropdownChange(e, setFieldValue)}
                              onBlur={handleBlur}
                              value={values.ContainerId}
                            >
                              <option value="-1">Select Container</option>
                              {state.FillArray3.map((opt) => (
                                <option key={opt.Id} value={opt.Id}>
                                  {opt.Name}
                                </option>
                              ))}
                            </select>
                            {errors.ContainerId && (
                              <div className="text-danger">{errors.ContainerId}</div>
                            )}
                          </Col>
                          <Col lg="6">
                            <label className="text-label">Item *</label>
                            <select
                              className="form-control"
                              name="ItemId"
                              onChange={(e) => handleDropdownChange(e, setFieldValue)}
                              onBlur={handleBlur}
                              value={values.ItemId}
                            >
                              <option value="-1">Select Item</option>
                              {state.FillArray4.map((opt) => (
                                <option key={opt.Id} value={opt.Id}>
                                  {opt.Name}
                                </option>
                              ))}
                            </select>
                            {errors.ItemId && (
                              <div className="text-danger">{errors.ItemId}</div>
                            )}
                          </Col>
                          <Col lg="6">
                            <label className="text-label">Component *</label>
                            <select
                              className="form-control"
                              name="ComponentId"
                              onChange={(e) => handleDropdownChange(e, setFieldValue)}
                              onBlur={handleBlur}
                              value={values.ComponentId}
                            >
                              <option value="-1">Select Component</option>
                              {state.FillArray5.map((opt) => (
                                <option key={opt.Id} value={opt.Id}>
                                  {opt.Name}
                                </option>
                              ))}
                            </select>
                            {errors.ComponentId && (
                              <div className="text-danger">{errors.ComponentId}</div>
                            )}
                          </Col>
                          <Col lg="6">
                            <label className="text-label">Job Card + Item + Component *</label>
                            <select
                              className="form-control"
                              name="JobCardComboId"
                              onChange={e => handleJobCardComboChange(e, setFieldValue)}
                              onBlur={handleBlur}
                              value={values.JobCardComboId}
                            >
                              <option value="-1">Select Job Card + Item + Component</option>
                              {state.FillArray2.map((opt) => (
                                <option key={opt.Id} value={opt.Id}>
                                  {opt.Name}
                                </option>
                              ))}
                            </select>
                            {errors.JobCardComboId && (
                              <div className="text-danger">{errors.JobCardComboId}</div>
                            )}
                          </Col>
                        </Row>
                        {/* If status is 0, show pause/start message and button */}
                        {selectedJobCardCombo.Status == 0 && (
                          <Row className="mt-3">
                            <Col lg="12">
                              {anotherJobRunning ? (
                                <div className="alert alert-warning">
                                  A process is already running. Please complete it before starting a new one.
                                </div>
                              ) : (
                                <>
                                  <Col lg="4" className="mb-3">
                                    <label className="text-label">Start Date and Time *</label>
                                    <div className="input-group">
                                      <input
                                        type="datetime-local"
                                        className="form-control"
                                        name="StartDateTime"
                                        onChange={e => {
                                          const formattedValue = formatDateTimeForInput(e.target.value);
                                          setFieldValue("StartDateTime", formattedValue);
                                        }}
                                        onBlur={handleBlur}
                                        value={values.StartDateTime}
                                      />
                                      {values.StartDateTime && (
                                        <span className="input-group-text">
                                          {formatDateForDisplay(values.StartDateTime)} at {formatDateTimeForDisplay(values.StartDateTime)}
                                        </span>
                                      )}
                                    </div>
                                    {errors.StartDateTime && (
                                      <div className="text-danger">{errors.StartDateTime}</div>
                                    )}
                                  </Col>
                                  <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => handleStart(selectedJobCardCombo.Id, 1, resetForm, values)}
                                    disabled={!values.StartDateTime}
                                  >
                                    Start
                                  </button>
                                </>
                              )}
                            </Col>
                          </Row>
                        )}
                        {/* If status is 1, show quantity input */}
                        {selectedJobCardCombo.Status == 1 && (
                          <Row className="mt-3">
                            <Col lg="4">
                              <label className="text-label">Quantity *</label>
                              <input
                                type="number"
                                className="form-control"
                                name="Quantity"
                                onChange={e => setFieldValue("Quantity", e.target.value)}
                                onBlur={handleBlur}
                                value={values.Quantity}
                                min={1}
                              />
                              {errors.Quantity && (
                                <div className="text-danger">{errors.Quantity}</div>
                              )}
                            </Col>

                            <Col lg="2" className="d-flex flex-column justify-content-end">
                              <label className="text-label">Needed Qty</label>
                              <div className="form-control-plaintext fw-bold">
                                {selectedJobCardCombo.Quantity ?? 0}
                              </div>
                            </Col>
                            <Col lg="2" className="d-flex flex-column justify-content-end">
                              <label className="text-label">Prepared Qty</label>
                              <div className="form-control-plaintext fw-bold">
                                {selectedJobCardCombo.PreparedQty ?? 0}
                              </div>
                            </Col>
                            <Col lg="4">
                              <label className="text-label">End Date and Time *</label>
                              <div className="input-group">
                                <input
                                  type="datetime-local"
                                  className="form-control"
                                  name="EndDateTime"
                                  onChange={e => {
                                    const formattedValue = formatDateTimeForInput(e.target.value);
                                    setFieldValue("EndDateTime", formattedValue);
                                  }}
                                  onBlur={handleBlur}
                                  value={values.EndDateTime}
                                />
                                {values.EndDateTime && (
                                  <span className="input-group-text">
                                    {formatDateForDisplay(values.EndDateTime)} at {formatDateTimeForDisplay(values.EndDateTime)}
                                  </span>
                                )}
                              </div>
                              {errors.EndDateTime && (
                                <div className="text-danger">{errors.EndDateTime}</div>
                              )}
                            </Col>
                          </Row>
                        )}

                        <button
                          type="submit"
                          className="btn me-2 btn-primary"
                          disabled={
                            isSubmitting ||
                            !values.MachineId ||
                            !values.JobCardComboId ||
                            (selectedJobCardCombo.Status === 1 && !values.Quantity) ||
                            (selectedJobCardCombo.Status === 1 && !values.EndDateTime) ||
                            selectedJobCardCombo.Status === 0
                          }
                        >
                          Submit
                        </button>
                        <button type="button" className="btn btn-danger light">
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

export default SupervisorEntry;
