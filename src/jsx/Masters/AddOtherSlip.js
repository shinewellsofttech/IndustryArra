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
import WoodIssue from "./WoodIssue";
import OtherSlips from "./OtherSlips";

const AddOtherSlip = () => {
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
  const [otherSlipData, setOtherSlipData] = useState([]);
  const [components, setComponents] = useState([]);
  const [otherSummary, setOtherSummary] = useState([]);
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/ItemsByOtherSlip`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL4 = `${API_WEB_URLS.MASTER}/0/token/CheckOtherSlip`;
  const API_URL5 = `${API_WEB_URLS.MASTER}/0/token/GetOtherSlip`;
  const API_URL6 = `${API_WEB_URLS.MASTER}/0/token/WoodIssueComponent`;
  const API_URL7 = `${API_WEB_URLS.MASTER}/0/token/WoodIssueL`;
  const API_URL_SAVE = "CreateOtherSlip/0/token";
  const API_URL_SAVE1 = "GetJobCardL/0/token";
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [F_ContainerMaster, setContainerMaster] = useState("");
  const [F_ContainerMaster2, setContainerMaster2] = useState("");
  const [F_CategoryMaster, setCategoryMaster] = useState("");
  const [F_ItemMaster, setItemMaster] = useState("");
  const [showViewButton, setShowViewButton] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

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
    setCategoryMaster("");
    setItemMaster("");
    setOtherSlipData([]);
    setShowViewButton(false);
    setState(prevState => ({ ...prevState, FillArray1: [] }));
    
    if (value) {
      setLoading(true);
      try {
        await Fn_FillListData(dispatch, setState, "FillArray1", `${API_URL3}/Id/${value}`);
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleCategoryChange = (value) => {
    setCategoryMaster(value);
  };
  
  const handleItemChange = async (value) => {
    const obj = State.FillArray1.find(x => x.Id == value);
    setItemMaster(value);
    setContainerMaster2(obj?.F_ContainerMaster || "");
    setOtherSlipData([]);
    
    if (value && obj) {
      // Use IsOtherSlip property to determine button state
      // If IsOtherSlip is 1, show view button; if 0, show create button
      if (obj.IsOtherSlip == 1 || obj.IsOtherSlip === "1") {
        setShowViewButton(true);
      } else {
        setShowViewButton(false);
      }
    } else {
      setShowViewButton(false);
    }
  };

  const viewWoodIssue = async () => {
    setButtonLoading(true);
    try {
      const res = await Fn_FillListData(dispatch, setOtherSlipData, "gridData", `${API_URL5}/${F_ContainerMaster2}/${F_ItemMaster}`);
      setOtherSlipData(res);
    } catch (error) {
      console.error("Error viewing other slip:", error);
      setOtherSlipData([]);
    } finally {
      setButtonLoading(false);
    }
  };

  const createWoodIssue = async () => {
    setButtonLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem("authUser"));
      console.log(userData);
      const vformData = new FormData();
      const obj = State.FillArray1.find(x => x.Id == F_ItemMaster);
      vformData.append("F_ContainerMaster", F_ContainerMaster);
      vformData.append("F_ItemMaster", F_ItemMaster);
      vformData.append("F_ContainerMasterL", obj?.F_ContainerMasterL);

      await Fn_AddEditData(
          dispatch,
          setState,
          { arguList: { id: 0, formData: vformData } },
          API_URL_SAVE,
          true,
          "memberid",
          navigate,
          "/"
        );
      await handleItemChange(F_ItemMaster); 
      window.location.reload();
    } catch(error) {
        console.error("Error creating wood issue:", error);
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <div>
      <h4 className="card-title mb-3" style={{fontFamily:'Poppins'}}>Add Other Slips</h4>
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
            disabled={loading || !F_ContainerMaster || buttonLoading}
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
      </Row>

      <div style={{ marginTop: '20px' }}>
        {showViewButton ? (
          <Button 
            variant="primary" 
            onClick={viewWoodIssue} 
            style={{ width: '200px', fontWeight: 'bold' }}
            disabled={buttonLoading || !F_ItemMaster}
          >
            {buttonLoading ? 'Loading...' : 'View Other Slip'}
          </Button>
        ) : (
          <Button 
            variant="success" 
            onClick={createWoodIssue} 
            style={{ width: '200px', fontWeight: 'bold' }}
            disabled={buttonLoading || !F_ItemMaster}
          >
            {buttonLoading ? 'Creating...' : 'Create Slips'}
          </Button>
        )}
      </div>
      <div>
        {otherSlipData && otherSlipData.length > 0 && !buttonLoading  ? (
          <OtherSlips otherSlipData={otherSlipData} />
        ) : null}
        {buttonLoading && showViewButton && <p>Loading slip data...</p>} 
      </div>
    </div>
  );
};

export default AddOtherSlip;
