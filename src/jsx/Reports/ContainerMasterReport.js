import React, { useEffect, useState, useMemo, useContext } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Fn_FillListData } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { ThemeContext } from "../../context/ThemeContext";
import {
  Card,
  CardHeader,
  CardBody,
  Row,
  Col,
  Table,
  Spinner,
  Button,
  Input,
} from "reactstrap";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function ContainerMasterReport() {
  const { background } = useContext(ThemeContext);
  
  // Theme-based colors
  const isDarkMode = background?.value === 'dark';
  const textColor = isDarkMode ? '#ffffff' : '#212529';
  const bgColor = isDarkMode ? '#000000' : '#ffffff';
  const headerBgColor = isDarkMode ? '#1a1a1a' : '#f8f9fa';
  const filterRowBg = isDarkMode ? '#2a2a2a' : '#e9ecef';
  const borderColor = isDarkMode ? '#444444' : '#dee2e6';
  const tableRowBg = isDarkMode ? '#1a1a1a' : '#ffffff';
  const tableRowEvenBg = isDarkMode ? '#2a2a2a' : '#f8f9fa';
  const tableRowHoverBg = isDarkMode ? '#333333' : '#e9ecef';
  const inputBg = isDarkMode ? '#2a2a2a' : '#ffffff';
  const inputBorder = isDarkMode ? '#555555' : '#ced4da';
  const cardHeaderBg = isDarkMode ? '#1a1a1a' : '#ffffff';
  const cardHeaderBorder = isDarkMode ? '#444444' : '#dee2e6';
  
  const [state, setState] = useState({
    id: 0,
    FillArray: [],
    isProgress: true,
  });

  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    containerNumber: "",
    contractNo: "",
    itemCode: "",
    itemName: "",
    quantity: "",
    jobCardInitial: "",
    alCode: "",
    batchCode: "",
  });

  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const API_URL = API_WEB_URLS.MASTER + "/0/token/Container";

  useEffect(() => {
    fetchData();
  }, [dispatch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await Fn_FillListData(
        dispatch,
        setGridData,
        "gridData",
        `${API_URL}/Id/0`
      );
      console.log("Container Master Report Data:", result);
    } catch (error) {
      console.error("Error fetching Container Master data:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for each column
  const getUniqueValues = (field) => {
    if (!gridData || gridData.length === 0) return [];
    const uniqueValues = [...new Set(gridData.map(item => item[field]).filter(val => val))];
    return uniqueValues.sort();
  };

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    if (!gridData || gridData.length === 0) return [];
    
    return gridData.filter(item => {
      // Date filter
      if (filters.startDate && filters.endDate && item.InspectionDate) {
        const itemDate = new Date(item.InspectionDate);
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        if (itemDate < startDate || itemDate > endDate) {
          return false;
        }
      }

      // Other filters
      if (filters.containerNumber && item.ContainerNumber !== filters.containerNumber) return false;
      if (filters.contractNo && item.ContractNo !== filters.contractNo) return false;
      if (filters.itemCode && item.ItemCode !== filters.itemCode) return false;
      if (filters.itemName && item.ItemName !== filters.itemName) return false;
      if (filters.quantity && item.Quantity?.toString() !== filters.quantity) return false;
      if (filters.jobCardInitial && item.JobCardInitial !== filters.jobCardInitial) return false;
      if (filters.alCode && item.ALCode !== filters.alCode) return false;
      if (filters.batchCode && item.BatchCode !== filters.batchCode) return false;

      return true;
    });
  }, [gridData, filters]);

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      containerNumber: "",
      contractNo: "",
      itemCode: "",
      itemName: "",
      quantity: "",
      jobCardInitial: "",
      alCode: "",
      batchCode: "",
    });
  };

  const exportToExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      alert("No data available to export");
      return;
    }

    // Prepare data for Excel export
    const excelData = filteredData.map((item, index) => ({
      "S.No": index + 1,
      "Inspection Date": item.InspectionDate ? new Date(item.InspectionDate).toLocaleDateString('en-GB') : 'N/A',
      "Container Number": item.ContainerNumber || 'N/A',
      "Contract No": item.ContractNo || 'N/A',
      "Item Code": item.ItemCode || 'N/A',
      "Item Name": item.ItemName || 'N/A',
      "Quantity": item.Quantity || 'N/A',
      "Job Card Initial": item.JobCardInitial || 'N/A',
      "ALCode": item.ALCode || 'N/A',
      "BatchCode": item.BatchCode || 'N/A'
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 8 },   // S.No
      { wch: 15 },  // Inspection Date
      { wch: 18 },  // Container Number
      { wch: 15 },  // Contract No
      { wch: 12 },  // Item Code
      { wch: 25 },  // Item Name
      { wch: 10 },  // Quantity
      { wch: 15 },  // Job Card Initial
      { wch: 12 },  // ALCode
      { wch: 12 }   // BatchCode
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Container Master Report");

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `Container_Master_Report_${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="container-fluid" style={{ backgroundColor: bgColor, color: textColor }}>
      <style>
        {`
          .container-report-table {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: ${bgColor};
            color: ${textColor};
          }
          .container-report-table thead th {
            background-color: ${headerBgColor} !important;
            color: ${textColor} !important;
            font-weight: 600;
            font-size: 14px;
            text-align: center;
            vertical-align: middle;
            border: 1px solid ${borderColor};
            padding: 12px 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .filter-row th {
            background-color: ${filterRowBg} !important;
            color: ${textColor} !important;
            padding: 8px 4px !important;
            vertical-align: middle;
            border: 1px solid ${borderColor};
          }
          .filter-select, .filter-input {
            width: 100%;
            padding: 5px 8px;
            border: 1px solid ${inputBorder};
            border-radius: 4px;
            font-size: 12px;
            background-color: ${inputBg};
            color: ${textColor};
          }
          .filter-select:focus, .filter-input:focus {
            outline: none;
            border-color: ${isDarkMode ? '#80bdff' : '#80bdff'};
            box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
          }
          .date-range-container {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .date-range-container .react-datepicker-wrapper {
            width: 100%;
          }
          .date-range-container .react-datepicker__input-container input {
            width: 100%;
            padding: 5px 8px;
            border: 1px solid ${inputBorder};
            border-radius: 4px;
            font-size: 11px;
            background-color: ${inputBg};
            color: ${textColor};
          }
          .clear-filters-btn {
            background-color: #dc3545;
            border: none;
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            width: 100%;
          }
          .clear-filters-btn:hover {
            background-color: #c82333;
          }
          .container-report-table tbody td {
            color: ${textColor} !important;
            font-weight: 500;
            font-size: 13px;
            text-align: center;
            vertical-align: middle;
            border: 1px solid ${borderColor};
            padding: 10px 8px;
            background-color: ${tableRowBg};
          }
          .container-report-table tbody tr:nth-child(even) td {
            background-color: ${tableRowEvenBg};
            color: ${textColor} !important;
          }
          .container-report-table tbody tr:hover td {
            background-color: ${tableRowHoverBg} !important;
            color: ${textColor} !important;
          }
          .export-btn {
            background-color: #28a745;
            border: 1px solid #28a745;
            color: white;
            font-weight: 600;
            padding: 10px 20px;
            border-radius: 4px;
            transition: all 0.3s ease;
          }
          .export-btn:hover {
            background-color: #218838;
            border-color: #1e7e34;
            color: white;
          }
          .export-btn:disabled {
            background-color: #6c757d;
            border-color: #6c757d;
            color: white;
            opacity: 0.65;
          }
          .card-header-custom {
            background-color: ${cardHeaderBg};
            border-bottom: 2px solid ${cardHeaderBorder};
            padding: 1.25rem 1.5rem;
          }
          .card-title-custom {
            color: ${textColor};
            font-weight: 700;
            font-size: 1.5rem;
            margin: 0;
          }
        `}
      </style>
      <Row>
        <Col lg="12">
          <Card style={{ backgroundColor: bgColor, borderColor: borderColor }}>
            <CardHeader className="card-header-custom">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="card-title-custom">Container Master Report</h4>
                <Button 
                  className="export-btn" 
                  onClick={exportToExcel}
                  disabled={loading || !filteredData || filteredData.length === 0}
                >
                  <i className="fas fa-file-excel me-2"></i>
                  Export to Excel ({filteredData ? filteredData.length : 0})
                </Button>
              </div>
            </CardHeader>
            <CardBody style={{ backgroundColor: bgColor, color: textColor }}>
              {loading ? (
                <div className="text-center" style={{ color: textColor }}>
                  <Spinner animation="border" role="status">
                    <span className="sr-only">Loading...</span>
                  </Spinner>
                  <p className="mt-2" style={{ color: textColor }}>Loading Container Master data...</p>
                </div>
              ) : gridData && gridData.length > 0 ? (
                <div className="table-responsive">
                  <Table className="container-report-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Inspection Date</th>
                        <th>Container Number</th>
                        <th>Contract No</th>
                        <th>Item Code</th>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Job Card Initial</th>
                        <th>ALCode</th>
                        <th>BatchCode</th>
                      </tr>
                      <tr className="filter-row">
                        <th>
                          <button 
                            className="clear-filters-btn"
                            onClick={clearFilters}
                            title="Clear All Filters"
                          >
                            Clear
                          </button>
                        </th>
                        <th>
                          <div className="date-range-container">
                            <DatePicker
                              selected={filters.startDate}
                              onChange={(date) => handleFilterChange('startDate', date)}
                              selectsStart
                              startDate={filters.startDate}
                              endDate={filters.endDate}
                              placeholderText="Start Date"
                              dateFormat="dd/MM/yyyy"
                              isClearable
                            />
                            <DatePicker
                              selected={filters.endDate}
                              onChange={(date) => handleFilterChange('endDate', date)}
                              selectsEnd
                              startDate={filters.startDate}
                              endDate={filters.endDate}
                              minDate={filters.startDate}
                              placeholderText="End Date"
                              dateFormat="dd/MM/yyyy"
                              isClearable
                            />
                          </div>
                        </th>
                        <th>
                          <select 
                            className="filter-select"
                            value={filters.containerNumber}
                            onChange={(e) => handleFilterChange('containerNumber', e.target.value)}
                          >
                            <option value="">All</option>
                            {getUniqueValues('ContainerNumber').map((val, idx) => (
                              <option key={idx} value={val}>{val}</option>
                            ))}
                          </select>
                        </th>
                        <th>
                          <select 
                            className="filter-select"
                            value={filters.contractNo}
                            onChange={(e) => handleFilterChange('contractNo', e.target.value)}
                          >
                            <option value="">All</option>
                            {getUniqueValues('ContractNo').map((val, idx) => (
                              <option key={idx} value={val}>{val}</option>
                            ))}
                          </select>
                        </th>
                        <th>
                          <select 
                            className="filter-select"
                            value={filters.itemCode}
                            onChange={(e) => handleFilterChange('itemCode', e.target.value)}
                          >
                            <option value="">All</option>
                            {getUniqueValues('ItemCode').map((val, idx) => (
                              <option key={idx} value={val}>{val}</option>
                            ))}
                          </select>
                        </th>
                        <th>
                          <select 
                            className="filter-select"
                            value={filters.itemName}
                            onChange={(e) => handleFilterChange('itemName', e.target.value)}
                          >
                            <option value="">All</option>
                            {getUniqueValues('ItemName').map((val, idx) => (
                              <option key={idx} value={val}>{val}</option>
                            ))}
                          </select>
                        </th>
                        <th>
                          <select 
                            className="filter-select"
                            value={filters.quantity}
                            onChange={(e) => handleFilterChange('quantity', e.target.value)}
                          >
                            <option value="">All</option>
                            {getUniqueValues('Quantity').map((val, idx) => (
                              <option key={idx} value={val}>{val}</option>
                            ))}
                          </select>
                        </th>
                        <th>
                          <select 
                            className="filter-select"
                            value={filters.jobCardInitial}
                            onChange={(e) => handleFilterChange('jobCardInitial', e.target.value)}
                          >
                            <option value="">All</option>
                            {getUniqueValues('JobCardInitial').map((val, idx) => (
                              <option key={idx} value={val}>{val}</option>
                            ))}
                          </select>
                        </th>
                        <th>
                          <select 
                            className="filter-select"
                            value={filters.alCode}
                            onChange={(e) => handleFilterChange('alCode', e.target.value)}
                          >
                            <option value="">All</option>
                            {getUniqueValues('ALCode').map((val, idx) => (
                              <option key={idx} value={val}>{val}</option>
                            ))}
                          </select>
                        </th>
                        <th>
                          <select 
                            className="filter-select"
                            value={filters.batchCode}
                            onChange={(e) => handleFilterChange('batchCode', e.target.value)}
                          >
                            <option value="">All</option>
                            {getUniqueValues('BatchCode').map((val, idx) => (
                              <option key={idx} value={val}>{val}</option>
                            ))}
                          </select>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => (
                        <tr key={item.Id || index}>
                          <td>{index + 1}</td>
                          <td>
                            {item.InspectionDate ? new Date(item.InspectionDate).toLocaleDateString('en-GB') : 'N/A'}
                          </td>
                          <td>{item.ContainerNumber || 'N/A'}</td>
                          <td>{item.ContractNo || 'N/A'}</td>
                          <td>{item.ItemCode || 'N/A'}</td>
                          <td>{item.ItemName || 'N/A'}</td>
                          <td>{item.Quantity || 'N/A'}</td>
                          <td>{item.JobCardInitial || 'N/A'}</td>
                          <td>{item.ALCode || 'N/A'}</td>
                          <td>{item.BatchCode || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4" style={{ color: textColor }}>
                  <i className="fas fa-info-circle fa-3x mb-3" style={{ color: textColor, opacity: 0.7 }}></i>
                  <h5 style={{ color: textColor }}>No Data Available</h5>
                  <p style={{ color: textColor, opacity: 0.8 }}>No Container Master data found.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ContainerMasterReport;
                                                                                