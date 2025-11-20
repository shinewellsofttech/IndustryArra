import React, { useEffect, useState } from "react";
import { Row, Col, Button } from "react-bootstrap";
import { Fn_AddEditData, Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import MetalJobCard from "./MetalJobCard";
import MDFJobCard from "./MDFJobCard";
import WoodJobCard from "./WoodJobCard";

const ManualReportEntry = () => {
  const [State, setState] = useState({
    id: 0,
    FillArray: [],
    FillArray1: [],
    FillArray2: [],
    FillArray3: [
      { "Id": 1, "Name": "IsWoodIssue" },
      { "Id": 2, "Name": "IsPreCutting" },
      { "Id": 3, "Name": "IsMachining" },
      { "Id": 4, "Name": "IsMMT" },
      { "Id": 5, "Name": "IsAssembly" },
      { "Id": 6, "Name": "IsSanding" },
      { "Id": 7, "Name": "IsPolish" },
      { "Id": 8, "Name": "IsFitting" },
      { "Id": 9, "Name": "IsQc" }
    ],
    FillArray4: [
      { "Id": 0, "Name": "Not Started" },
      { "Id": 1, "Name": "Started" },
      { "Id": 2, "Name": "Completed" }
    ]
    ,
    formData: {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/ItemsByContainer`;
  const API_URL_SAVE = "UpdateContainerStatus/0/token";
  const API_URL_SAVE1 = "GetJobCardL/0/token";
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [F_ContainerMaster, setContainerMaster] = useState("");
  const [F_CategoryMaster, setCategoryMaster] = useState("");
  const [F_ItemMaster, setItemMaster] = useState("");

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
  

  const handleItemChange = (value) => {
    setItemMaster(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!F_ContainerMaster || !F_ItemMaster || !State.formData.department || !State.formData.status) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        containerId: F_ContainerMaster,
        itemId: F_ItemMaster,
        department: State.formData.department,
        status: State.formData.status
      };

      const vFormData = new FormData();
      vFormData.append("Id", F_ContainerMaster);
      vFormData.append("F_ItemMaster", F_ItemMaster);
      vFormData.append("TaskName", State.formData.department);
      vFormData.append("Status", State.formData.status);

      Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: 0, formData: vFormData } },
        API_URL_SAVE,
        true,
        "memberid",
        navigate,
        "#"
      )
   
      // You can add your API call here to save the data
      // Example:
      // const response = await Fn_GetReport(dispatch, API_URL_SAVE, submitData);
      
      alert("Report submitted successfully!");
      
      // Reset form
      setContainerMaster("");
      setItemMaster("");
      setState(prevState => ({
        ...prevState,
        formData: {
          department: "",
          status: ""
        }
      }));
    } catch (error) {
      console.error("Error submitting job card:", error);
      alert("Error submitting job card. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
   <div>
    <h4 className="card-title mb-3" style={{fontFamily:'Poppins'}}>Report Entry</h4>
    <form onSubmit={handleSubmit}>
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
        <Col md={4}>
          <label className="form-label">Select Department</label>
          <select
            className="form-control"
            name="F_Department"
            onChange={(e) => setState(prevState => ({ ...prevState, formData: { ...prevState.formData, department: e.target.value } }))}
            value={State.formData.department || ""}
          >
            <option value="">Select Department</option>
            {State.FillArray3.length > 0 &&
              State.FillArray3.map((option) => (
                <option key={option.Id} value={option.Name}>
                  {option.Name}
                </option>
              ))}
          </select>
        </Col>
        <Col md={4}>
          <label className="form-label">Select Status</label>
          <select
            className="form-control"
            name="F_Status"
            onChange={(e) => setState(prevState => ({ ...prevState, formData: { ...prevState.formData, status: e.target.value } }))}
            value={State.formData.status || ""}
          >
            <option value="">Select Status</option>
            {State.FillArray4.length > 0 &&
              State.FillArray4.map((option) => (
                <option key={option.Id} value={option.Id}>
                  {option.Name}
                </option>
              ))}
          </select>
        </Col>
      </Row>
      <Row className="mt-3">
        <Col md={12}>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading}
            className="float-end"
          >
            {loading ? "Submitting..." : "Submit"}
          </Button>
        </Col>
      </Row>
    </form>
    </div>
  );
};

export default ManualReportEntry;
