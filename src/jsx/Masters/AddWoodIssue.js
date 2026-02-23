import React, { useEffect, useState } from "react";
import { Row, Col, Button } from "react-bootstrap";
import Select from "react-select";
import { Fn_AddEditData, Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import MetalJobCard from "./MetalJobCard";
import MDFJobCard from "./MDFJobCard";
import WoodJobCard from "./WoodJobCard";
import WoodIssue from "./WoodIssue";

const AddWoodIssue = () => {
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
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/JobCardContainers`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/JobCardWoodIssue`;
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
  const [selectedCML, setSelectedCML] = useState(""); // tracks F_ContainerMasterL for dropdown uniqueness
  const [showViewButton, setShowViewButton] = useState(false);

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
    const obj = State.FillArray.find(x => x.Id == value);
    setContainerMaster(value);
    setCategoryMaster(""); // Reset category selection
    setItemMaster(""); // Reset item selection
    setSelectedCML(""); // Reset F_ContainerMasterL tracking
    setState(prevState => ({ ...prevState, FillArray1: [] })); // Clear item list

    if (value) {
      try {
        await Fn_FillListData(dispatch, setState, "FillArray1", `${API_URL3}/Id/${value}`);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    }
  };

  const handleCategoryChange = (value) => {
    setCategoryMaster(value);
  };

  const handleItemChange = async (value) => {
    // value is F_ContainerMasterL (unique per row)
    if (!value) {
      setSelectedCML("");
      setItemMaster("");
      setContainerMaster2("");
      setShowViewButton(false);
      return;
    }

    const obj = State.FillArray1.find(x => x.F_ContainerMasterL == value);
    if (!obj) {
      setSelectedCML("");
      setItemMaster("");
      setContainerMaster2("");
      setShowViewButton(false);
      return;
    }

    setSelectedCML(value); // store F_ContainerMasterL for dropdown display
    setItemMaster(obj.Id); // store actual Id for downstream use
    setContainerMaster2(obj?.F_ContainerMaster || "");

    const res = await Fn_FillListData(dispatch, setState, "FillArray3", `${API_URL4}/Id/${value}`);
    console.log(res);

    if (res && res.length > 0 && res[0].Id) {
      setShowViewButton(true);
    } else {
      setShowViewButton(false);
    }
  };

  const viewWoodIssue = async () => {
    // Use selectedCML (F_ContainerMasterL) to uniquely identify the selected item
    const obj = State.FillArray1.find(x => x.F_ContainerMasterL == selectedCML);
    const res = await Fn_FillListData(dispatch, setWoodIssueData, "gridData", `${API_URL5}/Id/${obj.F_ContainerMasterL}`);
    setWoodIssueData(res[0]);
    const res2 = await Fn_FillListData(dispatch, setComponents, "gridData", `${API_URL6}/Id/${res[0].Id}`);
    setComponents(res2);
    const res3 = await Fn_FillListData(dispatch, setWoodSummary, "gridData", `${API_URL7}/Id/${res[0].Id}`);
    setWoodSummary(res3);


  };

  const createWoodIssue = async () => {
    // Implement the createWoodIssue function
    const userData = JSON.parse(localStorage.getItem("authUser"));
    console.log(userData);
    const vformData = new FormData();
    // Use selectedCML (F_ContainerMasterL) to uniquely identify the selected item
    const obj = State.FillArray1.find(x => x.F_ContainerMasterL == selectedCML);
    vformData.append("F_ContainerMasterL", obj?.F_ContainerMasterL);
    vformData.append("F_ItemMaster", F_ItemMaster);

    const resData = await Fn_AddEditData(
      dispatch,
      setState,
      { arguList: { id: 0, formData: vformData } },
      API_URL_SAVE,
      true,
      "memberid",
      navigate,
      "#"
    );
    console.log(resData);
    // Reset all relevant states here

    setContainerMaster2("");
    setItemMaster("");
    setSelectedCML(""); // Reset F_ContainerMasterL tracking
    setShowViewButton(false);
    // Reset any other states as needed, for example:
    // setSomeOtherState(initialValue);
  };

  // Use F_ContainerMasterL as value so items with the same Id (but different quantities/lines) are treated as distinct
  const itemOptions = State.FillArray1.map((option) => ({
    value: option.F_ContainerMasterL,
    label: `${option.Name} - ${option.ItemCode}`,
  }));

  return (
    <div className="print-safe-page">
      <h4 className="card-title mb-3">Wood Issue</h4>
      <Row className="mb-3 no-print">
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
          <Select
            classNamePrefix="react-select"
            name="F_ItemMaster"
            isClearable
            isSearchable
            placeholder="Select Item"
            options={itemOptions}
            value={itemOptions.find((option) => option.value == selectedCML) || null}
            onChange={(selected) => handleItemChange(selected ? selected.value : "")}
          />
        </Col>
      </Row>

      <div style={{ marginTop: '20px' }}>
        {showViewButton ? (
          <Button
            variant="primary"
            onClick={viewWoodIssue}
            style={{ width: '200px', fontWeight: 'bold' }}
          >
            View Wood Issue
          </Button>
        ) : (
          <Button
            variant="success"
            onClick={createWoodIssue}
            style={{ width: '200px', fontWeight: 'bold' }}
          >
            Create Wood Issue
          </Button>
        )}
      </div>
      <div>

        {woodIssueData && components && woodSummary ? (
          <WoodIssue woodIssueData={woodIssueData} components={components} woodSummary={woodSummary} />
        ) : null}

      </div>
    </div>
  );
};

export default AddWoodIssue;
