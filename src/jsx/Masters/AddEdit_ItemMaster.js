import React, { Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTitle from "../layouts/PageTitle";
import { Formik } from "formik";
import * as Yup from "yup";
import { Fn_AddEditData, Fn_DisplayData } from "../../store/Functions";
import { useDispatch } from "react-redux";
import { API_WEB_URLS } from "../../constants/constAPI";
import { Col, Row } from "react-bootstrap";

const NameSchema = Yup.object().shape({
  Name: Yup.string().required("Name is required"),
  ItemCode: Yup.string().nullable(),
  ItemPhoto: Yup.mixed().nullable(),
  NoOfComponents: Yup.number().nullable(),
  // ItemWidth: Yup.number().nullable(),
  // ItemDepth: Yup.number().nullable(),
  // ItemHeight: Yup.number().nullable(),
});

const AddEdit_ItemMaster = () => {
  const [state, setState] = useState({
    id: 0,
    formData: {
      Name: "",
      ItemCode: "",
      ItemPhoto: null,
      NoOfComponents: "",
      // ItemWidth: "",
      // ItemDepth: "",
      // ItemHeight: "",
    },
    isProgress: true,
  });

  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ItemMaster`;
  const API_URL_EDIT = `${API_WEB_URLS.MASTER}/0/token/Items/Id`;
  const API_URL_SAVE = "ItemMaster/0/token";

  // PageTitle props
  const activeMenu = "Masters";
  const motherMenu = "Masters";
  const pageContent = "Masters";
  const cardTitle = "Item Master";

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
      formData.append("ItemCode", values.ItemCode);
      if (values.ItemPhoto) {
        formData.append("ItemPhoto", values.ItemPhoto);
      }
      formData.append("NoOfComponents", values.NoOfComponents || 0);
      // formData.append("ItemWidth", values.ItemWidth || 0);
      // formData.append("ItemDepth", values.ItemDepth || 0);
      // formData.append("ItemHeight", values.ItemHeight || 0);

      Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: state.id, formData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        "/ItemMaster"
      );
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while submitting the form. Please try again.");
    }
  };

  return (
    <Fragment>
      <PageTitle activeMenu={activeMenu} motherMenu={motherMenu} pageContent={pageContent} />

      <div className="row" style={{ fontFamily: 'Times New Roman' }}>
        <div className="col-lg-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title" style={{ fontFamily: 'Times New Roman', fontWeight: '600', fontSize: '20px' }}>{cardTitle}</h4>
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
                  {({ values, errors, handleChange, handleBlur, handleSubmit, setFieldValue, isSubmitting }) => (
                    <form onSubmit={handleSubmit}>
                      <Row>
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Times New Roman' }}>Name *</label>
                        </Col>
                        <Col lg="4">
                          <input
                            type="text"
                            className="form-control"
                            name="Name"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.Name}
                            style={{ fontFamily: 'Times New Roman' }}
                          />
                          {errors.Name && <div className="text-danger" style={{ fontFamily: 'Times New Roman' }}>{errors.Name}</div>}
                        </Col>
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Times New Roman' }}>Item Code</label>
                        </Col>
                        <Col lg="4">
                          <input
                            type="text"
                            className="form-control"
                            name="ItemCode"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.ItemCode}
                            placeholder="Enter item code (optional)"
                            style={{ fontFamily: 'Times New Roman' }}
                          />
                          {errors.ItemCode && <div className="text-danger" style={{ fontFamily: 'Times New Roman' }}>{errors.ItemCode}</div>}
                        </Col>
                      </Row>

                      <Row className="mt-3">
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Times New Roman' }}>Item Photo</label>
                        </Col>
                        <Col lg="4">
                          <input
                            type="file"
                            className="form-control"
                            name="ItemPhoto"
                            onChange={(event) => setFieldValue("ItemPhoto", event.currentTarget.files[0])}
                            style={{ fontFamily: 'Times New Roman' }}
                          />
                          {errors.ItemPhoto && <div className="text-danger" style={{ fontFamily: 'Times New Roman' }}>{errors.ItemPhoto}</div>}
                        </Col>
                        <Col lg="2">
                          <label className="text-label" style={{ fontFamily: 'Times New Roman' }}>No Of Components</label>
                        </Col>
                        <Col lg="4">
                          <input
                            type="number"
                            className="form-control"
                            name="NoOfComponents"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.NoOfComponents}
                            placeholder="Enter number of components"
                            style={{ fontFamily: 'Times New Roman' }}
                          />
                          {errors.NoOfComponents && <div className="text-danger" style={{ fontFamily: 'Times New Roman' }}>{errors.NoOfComponents}</div>}
                        </Col>
                      </Row>

                      {values.ItemPhoto && (
                        <Row className="mt-3">
                          <Col lg="2">
                            <label className="text-label" style={{ fontFamily: 'Times New Roman' }}>Uploaded Photo</label>
                          </Col>
                          <Col lg="4">
                            <img
                              src={`${API_WEB_URLS.IMAGEURL}/${values.ItemPhoto}`}
                              alt="Item Photo"
                              style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '5px' }}
                            />
                          </Col>
                        </Row>
                      )}

                      <button type="submit" className="btn me-2 btn-primary" disabled={isSubmitting} style={{ fontFamily: 'Times New Roman' }}>
                        Submit
                      </button>
                      <button type="button" className="btn btn-danger light" style={{ fontFamily: 'Times New Roman' }} onClick={() => navigate('/ItemMaster')}>
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

export default AddEdit_ItemMaster;
