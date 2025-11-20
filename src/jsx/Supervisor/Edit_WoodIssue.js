import React, { useEffect, useState } from "react";
import { Row, Col, Button, Card, Table, Form, Alert } from "react-bootstrap";
import { Fn_AddEditData, Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';



const Edit_WoodIssue = () => {
  const [State, setState] = useState({
    id: 0,
    FillArray: [],
    FillArray1: [],
    FillArray2: [],
    FillArray3: [],
    formData: {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [woodIssueData, setWoodIssueData] = useState([]);
  const [components, setComponents] = useState([]);
  const [woodSummary, setWoodSummary] = useState([]);
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/ItemsByContainer`;
  const API_URL4 = `${API_WEB_URLS.MASTER}/0/token/CheckWoodIssue`;
  const API_URL5 = `${API_WEB_URLS.MASTER}/0/token/WoodIssueMasterH`;
  const API_URL6 = `${API_WEB_URLS.MASTER}/0/token/WoodIssueComponent`;
  const API_URL7 = `${API_WEB_URLS.MASTER}/0/token/WoodIssueL`;
  const API_URL_SAVE = "WoodIssue/0/token";
  const API_URL_SAVE1 = "GetJobCardL/0/token";
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [F_ContainerMaster, setContainerMaster] = useState("");
  const [F_ContainerMaster2, setContainerMaster2] = useState("");
  const [F_CategoryMaster, setCategoryMaster] = useState("");
  const [F_ItemMaster, setItemMaster] = useState("");
  const [showViewButton, setShowViewButton] = useState(false);
  const [editedOldWoodCft, setEditedOldWoodCft] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, [dispatch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
      await Fn_FillListData(dispatch, setState, "FillArray2", `${API_URL2}/Id/0`);
    } catch (error) {
      console.error("Error fetching data:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContainerChange = async (e) => {
    const value = e.target.value;
    const name = e.target.name;
    const obj = State.FillArray.find(x=>x.Id == value);
    setContainerMaster(value);
    setCategoryMaster(""); // Reset category selection
    setItemMaster(""); // Reset item selection
    setState(prevState => ({ ...prevState, FillArray1: [] })); // Clear item list
    
    if (value) {
      try {
        await Fn_FillListData(dispatch, setState, "FillArray1", `${API_URL3}/Id/${value}`);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    }
  };
  

  const handleItemChange = async (value) => {
    const obj = State.FillArray1.find(x => x.Id == value);
    setItemMaster(value);
    setContainerMaster2(obj?.F_ContainerMaster || "");
    const res = await Fn_FillListData(dispatch, setState, "FillArray3", `${API_URL4}/${obj.F_ContainerMaster}/${value}`);
    console.log(res);
    
    if (res && res.length > 0 && res[0].Id) {
      setShowViewButton(true);
    } else {
      setShowViewButton(false);
    
    }
  };

  const viewWoodIssue = async () => {
    // Implement the viewWoodIssue function
    const res = await Fn_FillListData(dispatch, setWoodIssueData, "gridData", `${API_URL5}/${F_ContainerMaster2}/${F_ItemMaster}`);
    setWoodIssueData(res[0]);

    const res3 = await Fn_FillListData(dispatch, setWoodSummary, "gridData", `${API_URL7}/Id/${res[0].Id}`);
    setWoodSummary(res3);
  };

  const handleOldWoodChange = (id, value, cft) => {
    // Convert to number and handle NaN
    let numValue = parseFloat(value) || 0;
    const numCft = parseFloat(cft) || 0;
    
    // Get the item to check availableQuantity
    const item = woodSummary.find(item => item.Id === id);
    const availableQty = item ? (parseFloat(item.AvailableQuantity) || 0) : 0;
    
    // Cap the value at the available quantity
    if (numValue > availableQty) {
      numValue = availableQty;
    }
    
    // Update the edited values
    setEditedOldWoodCft(prev => ({
      ...prev,
      [id]: numValue
    }));
    
    // Clear any validation errors since we're capping the value
    setValidationErrors(prev => ({
      ...prev,
      [id]: null
    }));
  };
  
  // Calculate FreshCft based on current OldWoodCft value
  const calculateFreshCft = (item) => {
    const oldWoodCft = editedOldWoodCft[item.Id] !== undefined ? 
      editedOldWoodCft[item.Id] : (parseFloat(item.OldWoodCft) || 0);
    const cft = parseFloat(item.Cft) || 0;
    const freshCft = Math.max(0, cft - oldWoodCft);
    return freshCft.toFixed(2);
  };

  return (
    <div>
      <h4 className="card-title mb-3">Wood Issue</h4>
      <Row className="mb-3">
        <Col md={4}>
          <label className="form-label">Select Container</label>
          <select
            className="form-control"
            name="F_ContainerMaster"
            onChange={(e) => handleContainerChange(e)}
            value={F_ContainerMaster}
            disabled={loading}
          >
            <option value="">Select Container</option>
            {State.FillArray.length > 0 &&
              State.FillArray.map((option) => (
                <option key={option.Id} value={option.Id}>
                  {option.Name}
                </option>
              ))}
          </select>
        </Col>
        <Col md={4}>
          <label className="form-label">Select Item</label>
          <select
            className="form-control"
            name="F_ItemMaster"
            onChange={(e) => handleItemChange(e.target.value)}
            value={F_ItemMaster}
          >
            <option value="">Select Item</option>
            {State.FillArray1.length > 0 &&
              State.FillArray1.map((option) => (
                <option key={option.Id} value={option.Id}>
                  {option.Name}
                </option>
              ))}
          </select>
        </Col>
        <Col md={4} className="d-flex align-items-end">
          {showViewButton ? (
            <Button 
              variant="primary" 
              onClick={viewWoodIssue} 
              style={{ width: '100%', fontWeight: 'bold' }}
            >
              View Wood Issue
            </Button>
          ) : null}
        </Col>
      </Row>

      {woodIssueData && Object.keys(woodIssueData).length > 0 && (
        <Card className="mt-2">
          <Card.Header className="bg-primary text-white py-1">
            <h6 className="mb-0">Wood Issue: {woodIssueData.ProductName}</h6>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="d-flex flex-wrap bg-light p-1 fs-6">
              {/* <div className="me-3 mb-1"><span className="fw-bold">ID:</span> {woodIssueData.Id}</div> */}
              <div className="me-3 mb-1"><span className="fw-bold">Item Code:</span> {woodIssueData.ItemCode}</div>
              <div className="me-3 mb-1"><span className="fw-bold">Container:</span> {woodIssueData.ContainerNumber}</div>
              <div className="me-3 mb-1"><span className="fw-bold">Date:</span> {woodIssueData.InspectionDate}</div>
              <div className="me-3 mb-1"><span className="fw-bold">Batch:</span> {woodIssueData.BatchNo || '-'}</div>
              <div className="me-3 mb-1"><span className="fw-bold">Qty:</span> {woodIssueData.Quantity?.toFixed(2)}</div>
              <div className="me-3 mb-1"><span className="fw-bold">Dim:</span> {`${woodIssueData.W?.toFixed(2)}×${woodIssueData.D?.toFixed(2)}×${woodIssueData.H?.toFixed(2)}`}</div>
              <div className="me-3 mb-1"><span className="fw-bold">Final CFT:</span> {woodIssueData.TotalFinalCFT?.toFixed(2)}</div>
              <div className="me-3 mb-1"><span className="fw-bold">Issue CFT:</span> {woodIssueData.TotalIssueCFT?.toFixed(2)}</div>
            </div>
          </Card.Body>
        </Card>
      )}
      
      {woodSummary && woodSummary.length > 0 && (
        <Card className="mt-2">
          <Card.Header className="bg-primary text-white py-1">
            <h6 className="mb-0">Wood Summary Details</h6>
          </Card.Header>
          <Card.Body className="p-0">
            <Table striped bordered hover responsive size="sm" className="mb-0 text-dark">
              <thead className="bg-light text-dark">
                <tr>
                  <th className="text-dark">Length</th>
                  <th className="text-dark">Thickness</th>
                  <th className="text-dark">Available Qty</th>
                  <th className="text-dark">Old Wood CFT</th>
                  <th className="text-dark">Fresh CFT</th>
                  <th className="text-dark">CFT</th>
                </tr>
              </thead>
              <tbody className="text-dark">
                {woodSummary.map((item) => (
                  <tr key={item.Id} className="text-dark">
                    <td className="text-dark">{item.Length?.toFixed(2)}</td>
                    <td className="text-dark">{item.Thk?.toFixed(2)}</td>
                    <td className="text-dark">{item.AvailableQuantity}</td>
                    <td className="text-dark">
                      <Form.Control
                        type="number"
                        min="0"
                        max={item.AvailableQuantity || 0}
                        step="0.01"
                        value={editedOldWoodCft[item.Id] !== undefined ? editedOldWoodCft[item.Id] : item.OldWoodCft}
                        onChange={(e) => handleOldWoodChange(item.Id, e.target.value, item.Cft)}
                        onFocus={(e) => e.target.select()}
                        style={{ width: '100px', padding: '2px 5px', height: 'auto' }}
                        className="text-dark"
                      />
                    </td>
                    <td className="text-dark">{calculateFreshCft(item)}</td>
                    <td className="text-dark">{item.Cft?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
      
    </div>
  );
};

export default Edit_WoodIssue;
