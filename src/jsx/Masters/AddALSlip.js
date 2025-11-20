import React, { useEffect, useState } from "react";
import { Row, Col, Button, Pagination } from "react-bootstrap";
import { Fn_FillListData, Fn_GetReport, Fn_AddEditData } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import MetalJobCard from "./MetalJobCard";
import MDFJobCard from "./MDFJobCard";
import WoodJobCard from "./WoodJobCard";

const JobCardForm = () => {
  const [State, setState] = useState({
    id: 0,
    FillArray: [],
    FillArray1: [],
    formData: {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobCardArray, setJobCardArray] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const itemsPerPage = 10;

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/JobCardContainers`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/JobCardItems`;
  const API_URL_SAVE = "GetJobCardMasterForAL/0/token";
  const API_URL_SAVE1 = "CreateALSlip/0/token";
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [F_ContainerMaster, setContainerMaster] = useState("");
  const [F_ItemMaster, setItemMaster] = useState("");

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = jobCardArray.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(jobCardArray.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const tableStyles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      margin: '20px 0'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white',
      fontSize: '14px'
    },
    tableHeader: {
      backgroundColor: '#2c3e50',
      color: 'white',
      padding: '12px',
      fontWeight: 'bold',
      textAlign: 'left',
      borderBottom: '2px solid #ddd'
    },
    tableCell: {
      padding: '12px',
      borderBottom: '1px solid #ddd',
      color: '#333'
    },
    alternateRow: {
      backgroundColor: '#f5f6f8'
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: '20px'
    },
    paginationItem: {
      margin: '0 5px'
    },
    selectedCountButton: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#2c3e50',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '5px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      zIndex: 1000
    },
    selectedCountBadge: {
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '14px'
    }
  };

  useEffect(() => {
    fetchData();
  }, [dispatch]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
    } catch (error) {
      console.error("Error fetching data:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContainerChange = async (e) => {
    const value = e.target.value;
    const obj = State.FillArray.find(x=>x.Id == value);
    setContainerMaster(value);
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
    setItemMaster(value);
    const obj = State.FillArray1.find(x=>x.Id == value);
    console.log(obj);
    let vformData = new FormData();
    vformData.append("F_ContainerMasterL", obj.F_ContainerMasterL);
    vformData.append("F_ItemMaster", value);
    vformData.append("F_CategoryMaster", 0);

    // Fetch job cards and machines for selected container
    await Fn_GetReport(
      dispatch,
      setJobCardArray,
      "tenderData",
      API_URL_SAVE,
      { arguList: { id: 0, formData: vformData } },
      true
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all items across all pages
      setSelectedIds(jobCardArray.map(item => item.ID));
    } else {
      setSelectedIds([]);
    }
  };

  const handleCheckboxChange = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleCreateALSlip = async () => {
    try {
      if (selectedIds.length === 0) {
        alert('Please select at least one job card');
        return;
      }
      const obj1 = State.FillArray1.find(x=>x.Id == F_ItemMaster);
      // Create the form data with selected job cards
      console.log(obj1);
      const formData = new FormData();
      // Convert array to comma-separated string
      const idListString = selectedIds.join(',');
      formData.append('IdList', idListString);
      formData.append("F_ContainerMasterL", obj1.F_ContainerMasterL);
      formData.append("F_ContainerMaster", F_ContainerMaster);
      // Get user ID from localStorage
      const obj = JSON.parse(localStorage.getItem('authUser'));
      formData.append('UserId', 1);

      // Call the API to create AL Slip
      const response = await Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: 0, formData } },
        API_URL_SAVE1,
        true,
        "memberid",
        navigate,
        "/ALSlip"
      );

      if (response) {
        // Clear selections after successful creation
        setSelectedIds([]);
        // Show success message
        alert('AL Slip created successfully');
        // Refresh the job card list
  
        let vformData = new FormData();
        vformData.append("F_ContainerMasterL", obj1.F_ContainerMasterL);
        vformData.append("F_ContainerMaster", F_ContainerMaster);
        vformData.append("F_ItemMaster", F_ItemMaster);
        vformData.append("F_CategoryMaster", 0);
    
    
        // Fetch job cards and machines for selected container
        await Fn_GetReport(
          dispatch,
          setJobCardArray,
          "tenderData",
          API_URL_SAVE,
          { arguList: { id: 0, formData: vformData } },
          true
        );
      }
    } catch (error) {
      console.error('Error creating AL Slip:', error);
      alert('Error creating AL Slip. Please try again.');
    }
  };

  return (
    <div className="print-safe-page">
      <h4 className="card-title mb-3 no-print" style={{fontFamily:'Poppins'}}>Create AL Slip</h4>
      <Row className="mb-3 no-print">
        <Col md={6}>
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
        <Col md={6}>
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
      </Row>

      {jobCardArray.length > 0 && (
        <div style={tableStyles.container}>
          <div className="table-responsive">
            <table style={tableStyles.table}>
              <thead>
                <tr>
                  <th style={tableStyles.tableHeader}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === jobCardArray.length && jobCardArray.length > 0}
                    />
                  </th>
                  <th style={tableStyles.tableHeader}>Job Card No</th>
                  <th style={tableStyles.tableHeader}>Inspection Date</th>
                  <th style={tableStyles.tableHeader}>Container Number</th>
                  <th style={tableStyles.tableHeader}>Latest Container Number</th>
                  <th style={tableStyles.tableHeader}>Item Name</th>
                  <th style={tableStyles.tableHeader}>Product Code</th>
                  <th style={tableStyles.tableHeader}>Batch Code</th>
                  <th style={tableStyles.tableHeader}>Component Name</th>
                  <th style={tableStyles.tableHeader}>Order Qty</th>
                  <th style={tableStyles.tableHeader}>Latest Quantity</th>
                  <th style={tableStyles.tableHeader}>Component Qty</th>
                  <th style={tableStyles.tableHeader}>Dimensions (W)</th>
                  <th style={tableStyles.tableHeader}>Dimensions (F)</th>
                  <th style={tableStyles.tableHeader}>CFT</th>
                  <th style={tableStyles.tableHeader}>Qty2</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={index} style={index % 2 === 0 ? {} : tableStyles.alternateRow}>
                    <td style={tableStyles.tableCell}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.ID)}
                        onChange={() => handleCheckboxChange(item.ID)}
                      />
                    </td>
                    <td style={tableStyles.tableCell}>{item.JobCardNo}</td>
                    <td style={tableStyles.tableCell}>{item.InspectionDate}</td>
                    <td style={tableStyles.tableCell}>{item.ContainerNumber}</td>
                    <td style={tableStyles.tableCell}>{item.LatestContainerNumber}</td>
                    <td style={tableStyles.tableCell}>{item.ItemName}</td>
                    <td style={tableStyles.tableCell}>{item.ProductCode}</td>
                    <td style={tableStyles.tableCell}>{item.BatchCode}</td>
                    <td style={tableStyles.tableCell}>{item.ComponentsName}</td>
                    <td style={tableStyles.tableCell}>{item.OrderQty?.toFixed(2)}</td>
                    <td style={tableStyles.tableCell}>{item.ContainerLQuantity}</td>
                    <td style={tableStyles.tableCell}>{item.ComponentQty}</td>
                    <td style={tableStyles.tableCell}>
                      {`${item.W1?.toFixed(2)} × ${item.W2?.toFixed(2)} × ${item.W3?.toFixed(2)}`}
                    </td>
                    <td style={tableStyles.tableCell}>
                      {`${item.F1?.toFixed(2)} × ${item.F2?.toFixed(2)} × ${item.F3?.toFixed(2)}`}
                    </td>
                    <td style={tableStyles.tableCell}>{item.CFT?.toFixed(2)}</td>
                    <td style={tableStyles.tableCell}>{item.Qty2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={tableStyles.pagination}>
            <Pagination>
              <Pagination.First
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              />
              <Pagination.Prev
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              />
              
              {[...Array(totalPages)].map((_, index) => (
                <Pagination.Item
                  key={index + 1}
                  active={index + 1 === currentPage}
                  onClick={() => handlePageChange(index + 1)}
                  style={tableStyles.paginationItem}
                >
                  {index + 1}
                </Pagination.Item>
              ))}

              <Pagination.Next
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
              <Pagination.Last
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <button 
          style={tableStyles.selectedCountButton}
          onClick={handleCreateALSlip}
        >
          Create AL Slip
          <span style={tableStyles.selectedCountBadge}>
            {selectedIds.length} {selectedIds.length === 1 ? 'Job Card' : 'Job Cards'} Selected
          </span>
        </button>
      )}
    </div>
  );
};

export default JobCardForm;
