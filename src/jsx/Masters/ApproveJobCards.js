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

const ApproveJobCards = () => {
  const [State, setState] = useState({
    id: 0,
    FillArray: [],
    FillArray1: [],
    FillArray2: [],
    formData: {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobCardArray, setJobCardArray] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [F_CategoryMaster, setCategoryMaster] = useState("");
  const itemsPerPage = 10;

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/ItemsByContainer`;
  const API_URL_SAVE = "GetApprovalJobCards/0/token";
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
    },
    bulkActions: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      justifyContent: 'flex-end'
    }
  };

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
    let vformData = new FormData();
    vformData.append("F_ContainerMaster", F_ContainerMaster);
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
  const handleCategoryChange = async (value) => {
    setCategoryMaster(value);
    const obj = State.FillArray1.find(x=>x.Id == F_ItemMaster);
    let vformData = new FormData();
    vformData.append("F_ContainerMaster", F_ContainerMaster);
    vformData.append("F_ContainerMasterL", obj.F_ContainerMasterL);
    vformData.append("F_ItemMaster", F_ItemMaster);
    vformData.append("F_CategoryMaster", value);

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
      // Select only pending items (IsApproved === 0)
      const pendingIds = jobCardArray
        .filter(item => item.IsApproved === 0)
        .map(item => item.Id);
      setSelectedIds(pendingIds);
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

      // Create the form data with selected job cards
      const formData = new FormData();
      // Convert array to comma-separated string
      const idListString = selectedIds.join(',');
      formData.append('IdList', idListString);
      
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

  // Add new function to handle approve/reject
  const handleStatusChange = async (jobCardId, newStatus) => {
    try {
      const formData = new FormData();
      // Convert jobCardId to string and append
      formData.append('IdList', jobCardId.toString());
      formData.append('IsApproved', newStatus);
  
      // Call API to update status
      const response = await Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: 0, formData } },
        "ApproveJobCard/0/token",
        true,
        "memberid",
        navigate
      );
  
      if (response) {
        // Refresh the job card list
        let vformData = new FormData();
        vformData.append("F_ContainerMaster", F_ContainerMaster);
        vformData.append("F_ItemMaster", F_ItemMaster);
        vformData.append("F_CategoryMaster", F_CategoryMaster);
  
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
      console.error('Error updating job card status:', error);
      alert('Error updating job card status. Please try again.');
    }
  };
  

  // Add new function to handle bulk approve/reject
  const handleBulkStatusChange = async (newStatus) => {
    try {
      if (selectedIds.length === 0) {
        alert('Please select at least one job card');
        return;
      }

      const formData = new FormData();
      // Convert array to comma-separated string
      const idListString = selectedIds.join(',');
      formData.append('IdList', idListString);
      formData.append('IsApproved', newStatus);

      // Call API to update status
      const response = await Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: 0, formData } },
        "ApproveJobCard/0/token",
        true,
        "memberid",
        navigate
      );

      if (response) {
        // Clear selections after successful update
        setSelectedIds([]);
        // Show success message
        alert('Job cards updated successfully');
        // Refresh the job card list
        let vformData = new FormData();
        vformData.append("F_ContainerMaster", F_ContainerMaster);
        vformData.append("F_ItemMaster", F_ItemMaster);
        vformData.append("F_CategoryMaster", F_CategoryMaster || 0);
    
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
      console.error('Error updating job card status:', error);
      alert('Error updating job card status. Please try again.');
    }
  };

  // Add styles for buttons
  const buttonStyles = {
    approve: {
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      padding: '5px 10px',
      borderRadius: '4px',
      marginRight: '5px',
      cursor: 'pointer'
    },
    reject: {
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      padding: '5px 10px',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    bulkActions: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      justifyContent: 'flex-end'
    }
  };

  return (
    <div>
      <Row className="mb-3 align-items-center">
        <Col md={2}>
          <h4 className="page-title mb-0" style={{fontFamily:'Poppins'}}>Approve Job Cards</h4>
        </Col>
        <Col md={3}>
          <div>
            <label className="form-label mb-1 small">Container</label>
            <select
              className="form-control form-control-sm"
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
          </div>
        </Col>
        <Col md={3}>
          <div>
            <label className="form-label mb-1 small">Item</label>
            <select
              className="form-control form-control-sm"
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
          </div>
        </Col>
        <Col md={3}>
          <div>
            <label className="form-label mb-1 small">Category</label>
            <select
              className="form-control form-control-sm"
              name="F_CategoryMaster"
              onChange={(e) => handleCategoryChange(e.target.value)}
              value={F_CategoryMaster}
            >
              <option value="">Select Category</option>
              {State.FillArray2.length > 0 &&
                State.FillArray2.map((option) => (
                  <option key={option.Id} value={option.Id}>
                    {option.Name}
                  </option>
                ))}
            </select>
          </div>
        </Col>
      </Row>

      {jobCardArray.length > 0 && (
        <div style={tableStyles.container}>
          {/* <div style={tableStyles.bulkActions}>
            <button
              style={{
                ...buttonStyles.approve,
                ...(selectedIds.length === 0 && buttonStyles.disabled)
              }}
              onClick={() => handleBulkStatusChange(1)}
              disabled={selectedIds.length === 0}
            >
              Approve Selected
            </button>
            <button
              style={{
                ...buttonStyles.reject,
                ...(selectedIds.length === 0 && buttonStyles.disabled)
              }}
              onClick={() => handleBulkStatusChange(2)}
              disabled={selectedIds.length === 0}
            >
              Reject Selected
            </button>
          </div> */}
          <div className="table-responsive">
            <table style={tableStyles.table}>
              <thead>
                <tr>
                  {/* <th style={tableStyles.tableHeader}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === jobCardArray.filter(item => item.IsApproved == 0).length && jobCardArray.filter(item => item.IsApproved == 0).length > 0}
                    />
                  </th> */}
                  <th style={tableStyles.tableHeader}>Job Card No</th>
                  <th style={tableStyles.tableHeader}>Rejected at Machine</th>
                  <th style={tableStyles.tableHeader}>Inspection Date</th>
                  <th style={tableStyles.tableHeader}>Container Number</th>
                  <th style={tableStyles.tableHeader}>Item Name</th>
                  <th style={tableStyles.tableHeader}>Product Code</th>
                  <th style={tableStyles.tableHeader}>Batch Code</th>
                  <th style={tableStyles.tableHeader}>Component Name</th>
                  <th style={tableStyles.tableHeader}>Order Qty</th>
                  <th style={tableStyles.tableHeader}>Quantity</th>
                  <th style={tableStyles.tableHeader}>Rejected Qty</th>
                  <th style={tableStyles.tableHeader}>Status</th>
                  <th style={tableStyles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={index} style={index % 2 === 0 ? {} : tableStyles.alternateRow}>
                    <td style={tableStyles.tableCell}>
                      {item.IsApproved === 0 && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.Id)}
                          onChange={() => handleCheckboxChange(item.Id)}
                        />
                      )}
                    </td>
                    <td style={tableStyles.tableCell}>{item.JobCardNo}</td>
                    <td style={tableStyles.tableCell}>{item.MachineName}</td>
                    <td style={tableStyles.tableCell}>{item.InspectionDate}</td>
                    <td style={tableStyles.tableCell}>{item.ContainerNumber}</td>
                    <td style={tableStyles.tableCell}>{item.ItemName}</td>
                    <td style={tableStyles.tableCell}>{item.ProductCode}</td>
                    <td style={tableStyles.tableCell}>{item.BatchCode || '-'}</td>
                    <td style={tableStyles.tableCell}>{item.ComponentsName}</td>
                    <td style={tableStyles.tableCell}>{item.OrderQty?.toFixed(2)}</td>
                    <td style={tableStyles.tableCell}>{item.Quantity}</td>
                    <td style={tableStyles.tableCell}>{item.RejectedQty}</td>
                    <td style={tableStyles.tableCell}>
                      {item.IsApproved === 0 ? 'Pending' : item.IsApproved === 1 ? 'Approved' : 'Rejected'}
                    </td>
                    {/* <td style={tableStyles.tableCell}>
                      <button
                        style={{
                          ...buttonStyles.approve,
                          ...(item.IsApproved !== 0 && buttonStyles.disabled)
                        }}
                        onClick={() => handleStatusChange(item.Id, 1)}
                        disabled={item.IsApproved !== 0}
                      >
                        Approve
                      </button>
                      <button
                        style={{
                          ...buttonStyles.reject,
                          ...(item.IsApproved !== 0 && buttonStyles.disabled)
                        }}
                        onClick={() => handleStatusChange(item.Id, 2)}
                        disabled={item.IsApproved !== 0}
                      >
                        Reject
                      </button>
                    </td> */}
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

export default ApproveJobCards;
