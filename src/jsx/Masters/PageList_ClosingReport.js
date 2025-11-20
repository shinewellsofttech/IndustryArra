import React, { useEffect, useState } from "react";
import { Row, Col, Button, Pagination } from "react-bootstrap";
import { Fn_FillListData, Fn_GetReport, Fn_AddEditData } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import MetalJobCard from "./MetalJobCard";
import MDFJobCard from "./MDFJobCard";
import WoodJobCard from "./WoodJobCard";

const PageList_ClosingReport = ({F_ContainerMasterL: propF_ContainerMasterL, F_ItemMaster: propF_ItemMaster}) => {
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
  const [F_ContainerMasterL, setContainerMasterL] = useState(propF_ContainerMasterL || "");
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobCardArray, setJobCardArray] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [F_CategoryMaster, setCategoryMaster] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/JobCardContainers`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/JobCardItems`;
  const API_URL_SAVE = "GetClosingReport/0/token";
  const API_URL_SAVE1 = "CreateALSlip/0/token";
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [F_ContainerMaster, setContainerMaster] = useState("");
  const [F_ItemMaster, setItemMaster] = useState(propF_ItemMaster || "");

  // Filter job cards based on search term
  const filteredJobCards = jobCardArray.filter(item =>
    item.ComponentName && 
    item.ComponentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredJobCards.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobCards.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
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
    
    // If props are provided, directly fetch job cards
    if (propF_ContainerMasterL && propF_ItemMaster) {
      handleDirectFetch();
    }
  }, [dispatch, propF_ContainerMasterL, propF_ItemMaster]);
  
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

  const handleDirectFetch = async () => {
    console.log("propF_ContainerMasterL",propF_ContainerMasterL);
    console.log("propF_ItemMaster",propF_ItemMaster);
    let vformData = new FormData();
    vformData.append("F_ContainerMasterL", propF_ContainerMasterL);
    vformData.append("F_ItemMaster", propF_ItemMaster);
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
    const obj = State.FillArray1.find((x) => x.Id == value);
    setContainerMasterL(obj.F_ContainerMasterL);
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

  const handleCategoryChange = async (value) => {
    setCategoryMaster(value);

    let vformData = new FormData();
    vformData.append("F_ContainerMasterL", F_ContainerMasterL);
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
      const allIds = filteredJobCards.map(item => item.RootJobCardID);
      setSelectedIds(allIds);
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
        vformData.append("F_ContainerMasterL", F_ContainerMasterL);
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

  // Export to PDF - All data excluding Status column
  const exportToPDF = () => {
    if (!filteredJobCards || filteredJobCards.length === 0) {
      alert('No data available to export');
      return;
    }

    const pdf = new jsPDF('landscape', 'mm', 'a4');
    
    // Add title
    pdf.setFontSize(16);
    pdf.text('Closing Report', 14, 15);
    
    // Prepare data excluding Status column
    const tableData = filteredJobCards.map((item, index) => [
      index + 1,
      item.JobCardNo || '',
      item.ContainerNumber || '',
      item.ItemMaster || '',
      item.ComponentName || '',
      item.ComponentQty || ''
    ]);

    // Add table using autoTable
    pdf.autoTable({
      head: [['S.No', 'Job Card No', 'Container Number', 'Item Name', 'Component Name', 'Component Qty']],
      body: tableData,
      startY: 25,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [44, 62, 80],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 246, 248]
      },
      margin: { top: 25 }
    });

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `Closing_Report_${currentDate}.pdf`;
    
    pdf.save(filename);
  };

  // Export to Excel - All data excluding Status column
  const exportToExcel = async () => {
    if (!filteredJobCards || filteredJobCards.length === 0) {
      alert('No data available to export');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Closing Report');

      // Define columns (excluding Status)
      worksheet.columns = [
        { header: 'S.No', key: 'sno', width: 10 },
        { header: 'Job Card No', key: 'jobCardNo', width: 20 },
        { header: 'Container Number', key: 'containerNumber', width: 20 },
        { header: 'Item Name', key: 'itemName', width: 30 },
        { header: 'Component Name', key: 'componentName', width: 30 },
        { header: 'Component Qty', key: 'componentQty', width: 15 }
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2C3E50' }
      };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data rows
      filteredJobCards.forEach((item, index) => {
        const row = worksheet.addRow({
          sno: index + 1,
          jobCardNo: item.JobCardNo || '',
          containerNumber: item.ContainerNumber || '',
          itemName: item.ItemMaster || '',
          componentName: item.ComponentName || '',
          componentQty: item.ComponentQty || ''
        });

        // Alternate row colors
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F6F8' }
          };
        }
      });

      // Set row heights
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        row.height = 20;
      });

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `Closing_Report_${currentDate}.xlsx`;

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  return (
    <div>
      <h4 className="card-title mb-3" style={{fontFamily:'Poppins'}}>Closing Report</h4>
            {!propF_ContainerMasterL && !propF_ItemMaster && (
        <Row className="mb-3">
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
      )}
      
      <Row className="mb-3">

        <Col md={6}>
          <label className="form-label">Select Category</label>
          <select
            className="form-control"
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
        </Col>

        <Col md={6}>
          <label className="form-label">Search Component Name</label>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search by component name..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchTerm && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={clearSearch}
                title="Clear search"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </Col>
      </Row>

      {searchTerm && (
        <div className="alert alert-info mb-3">
          <i className="fas fa-search me-2"></i>
          Found {filteredJobCards.length} of {jobCardArray.length} components matching "{searchTerm}"
        </div>
      )}
      
      {filteredJobCards.length > 0 && (
        <div className="mb-3">
          <Button
            variant="danger"
            onClick={exportToPDF}
            className="me-2"
            style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
          >
            <i className="fas fa-file-pdf me-2"></i>Export to PDF
          </Button>
          <Button
            variant="success"
            onClick={exportToExcel}
            style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
          >
            <i className="fas fa-file-excel me-2"></i>Export to Excel
          </Button>
        </div>
      )}
      
      {filteredJobCards.length > 0 && (
        <div style={tableStyles.container}>
          <div className="table-responsive">
            <table style={tableStyles.table}>
              <thead>
                <tr>
                  <th style={tableStyles.tableHeader}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === filteredJobCards.length && filteredJobCards.length > 0}
                    />
                  </th>
                  <th style={tableStyles.tableHeader}>Job Card No</th>
                  <th style={tableStyles.tableHeader}>Container Number</th>
                  <th style={tableStyles.tableHeader}>Item Name</th>
                  <th style={tableStyles.tableHeader}>Component Name</th>
                  {/* <th style={tableStyles.tableHeader}>Length</th>
                  <th style={tableStyles.tableHeader}>Width</th>
                  <th style={tableStyles.tableHeader}>Thickness</th> */}
                  <th style={tableStyles.tableHeader}>Component Qty</th>
                  <th style={tableStyles.tableHeader}>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={index} style={index % 2 === 0 ? {} : tableStyles.alternateRow}>
                    <td style={tableStyles.tableCell}>
                      <input
                        type = "checkbox"
                        checked={selectedIds.includes(item.RootJobCardID)}
                        onChange={() => handleCheckboxChange(item.RootJobCardID)}
                      />
                    </td>
                    <td style={tableStyles.tableCell}>{item.JobCardNo}</td>
                    <td style={tableStyles.tableCell}>{item.ContainerNumber}</td>
                    <td style={tableStyles.tableCell}>{item.ItemMaster}</td>
                    <td style={tableStyles.tableCell}>{item.ComponentName}</td>
                    {/* <td style={tableStyles.tableCell}>{item.Length}</td>
                    <td style={tableStyles.tableCell}>{item.Width}</td>
                    <td style={tableStyles.tableCell}>{item.Thickness}</td> */}
                    <td style={tableStyles.tableCell}>{item.ComponentQty}</td>
                    <td style={tableStyles.tableCell}>{item.Status}</td>
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

  
    </div>
  );
};

export default PageList_ClosingReport;
