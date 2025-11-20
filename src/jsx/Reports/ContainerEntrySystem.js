import React, { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Fn_AddEditData, Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  Card,
  CardHeader,
  CardBody,
  Row,
  Col,
} from "reactstrap";
import PageList_ClosingReport from "../Masters/PageList_ClosingReport";

function ContainerEntrySystem() {
  const [state, setState] = useState({
    id: 0,
    FillArray: [],
    MachineSequenceData : [],
    DepartmentOneData : [],
    FillArrayItem: [],
    isProgress: true,
  });

  const API_URL =
    API_WEB_URLS.MASTER + "/0/token/GetContainerMachiningStatusPercent";
  const API_URL1 = API_WEB_URLS.MASTER + "/0/token/GetContainerMachiningStatus";
  const API_URL2 = API_WEB_URLS.MASTER + "/0/token/ActualQuantity";
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Department status modal states
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [departmentModalLoading, setDepartmentModalLoading] = useState(false);
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");

  // Add state for Components modal
  const [componentsModalOpen, setComponentsModalOpen] = useState(false);
  const [componentsModalLoading, setComponentsModalLoading] = useState(false);
  const [componentsSearchTerm, setComponentsSearchTerm] = useState("");

  // Machine sequence modal states
  const [machineSequenceModalOpen, setMachineSequenceModalOpen] = useState(false);
  const [machineSequenceLoading, setMachineSequenceLoading] = useState(false);
  const [machineSequenceEdits, setMachineSequenceEdits] = useState({});
  const [machineHeaderInfo, setMachineHeaderInfo] = useState({ componentName: "", itemName: "", containerNumber: "" });

  // Add state for Department Status modal
  const [departmentStatusModalOpen, setDepartmentStatusModalOpen] = useState(false);
  const [departmentStatusData, setDepartmentStatusData] = useState(null);
  const [departmentStatusLoading, setDepartmentStatusLoading] = useState(false);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("");
  const [doneQty, setDoneQty] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actualQuantity, setActualQuantity] = useState("");

  // Add state for editing component dates
  const [componentEditData, setComponentEditData] = useState({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []); // Remove dispatch dependency to prevent re-calls

  const fetchData = useCallback(async () => {
    if (loading) return; // Prevent multiple simultaneous calls
    setLoading(true);
    try {
      const result = await Fn_FillListData(
        dispatch,
        setState,
        "FillArray",
        `${API_URL}/Id/0`
      );
      console.log("API Response:", result);
    } catch (error) {
      console.error("Error fetching data:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Get status distribution from API data
  const getStatusDistribution = () => {
    if (
      !state.FillArray ||
      !Array.isArray(state.FillArray) ||
      state.FillArray.length === 0
    )
      return [];

    return state.FillArray.map((item) => {
      if (!item || typeof item !== "object") return null;

      const statusMap = { 0: "Not Started", 1: "Running", 2: "Done" };
      const colorMap = { 0: "#dc3545", 1: "#ffc107", 2: "#28a745" };

      const statusCode = item.ContainerStatusCode ?? 0;
      const percentage = item.Percentage ?? 0;
      const count = item.Count ?? 0;

      return {
        name: statusMap[statusCode] || "Unknown",
        data: [Math.round(percentage)],
        color: colorMap[statusCode] || "#6c757d",
        count: count,
      };
    }).filter(Boolean);
  };

  // Handle status box click with loading protection
  const handleStatusBoxClick = useCallback(async (statusCode) => {
    if (statusCode === null || statusCode === undefined) {
      console.error("Invalid status code:", statusCode);
      return;
    }

    if (modalLoading) return; // Prevent multiple calls

    const statusMap = { 0: "Not Started", 1: "Running", 2: "Done" };
    const statusName = statusMap[statusCode] || "Unknown";

    setModalLoading(true);
    setSelectedStatus(statusName);
    setModalOpen(true);
    setCurrentPage(1);
    setSearchTerm("");

    try {
      await Fn_FillListData(
        dispatch,
        setState,
        "FillArray1",
        `${API_URL1}/Id/${statusCode}`
      );
    } catch (error) {
      console.error("Error fetching container data:", error);
      setState((prev) => ({ ...prev, FillArray1: [] }));
    } finally {
      setModalLoading(false);
    }
  }, [modalLoading, dispatch]);

  const toggleModal = () => {
    setModalOpen(!modalOpen);
  };

  const getStatusBadgeColor = (statusCode) => {
    if (statusCode === null || statusCode === undefined) return "secondary";

    switch (statusCode) {
      case 0:
        return "danger";
      case 1:
        return "warning";
      case 2:
        return "success";
      default:
        return "secondary";
    }
  };

  const getStatusText = (statusCode) => {
    if (statusCode === null || statusCode === undefined) return "Unknown";

    switch (statusCode) {
      case 0:
        return "Not Started";
      case 1:
        return "Running";
      case 2:
        return "Done";
      default:
        return "Unknown";
    }
  };

  // Pagination functions
  const handlePageChange = (pageNumber) => {
    if (pageNumber && pageNumber > 0 && pageNumber <= getTotalPages()) {
      setCurrentPage(pageNumber);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = getTotalPages();
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Search functions
  const getFilteredItems = () => {
    if (!state.FillArray1 || !Array.isArray(state.FillArray1)) return [];

    if (!searchTerm || !searchTerm.trim()) {
      return state.FillArray1;
    }

    return state.FillArray1.filter((container) => {
      if (!container || typeof container !== "object") return false;

      const containerName = container.Name;
      if (!containerName) return false;

      return containerName
        .toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    });
  };

  const getCurrentItems = () => {
    const filteredItems = getFilteredItems();
    if (!filteredItems || filteredItems.length === 0) return [];

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filteredItems = getFilteredItems();
    if (!filteredItems || filteredItems.length === 0) return 0;
    return Math.ceil(filteredItems.length / itemsPerPage);
  };

  const handleSearchChange = (e) => {
    const value = e?.target?.value ?? "";
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Department status helper functions
  const parseDepartmentStatus = (statusString) => {
    if (!statusString || typeof statusString !== "string")
      return { departmentId: 0, status: 0, actual: 0, total: 0 };

    const parts = statusString.split("-");
    if (parts.length < 2)
      return { departmentId: 0, status: 0, actual: 0, total: 0 };

    const departmentId = parseInt(parts[0]) || 0;
    const status = parseInt(parts[1]) || 0;

    let actual = 0,
      total = 0;
    if (parts.length >= 3) {
      const progressParts = parts[2].split("/");
      if (progressParts.length === 2) {
        actual = parseInt(progressParts[0]) || 0;
        total = parseInt(progressParts[1]) || 0;
      }
    }

    return { departmentId, status, actual, total };
  };

  const getDepartmentStatusColor = (status) => {
    switch (status) {
      case 0:
        return "#dc3545";
      case 1:
        return "#ffc107";
      case 2:
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  const getDepartmentStatusText = (status) => {
    switch (status) {
      case 0:
        return "Not Started";
      case 1:
        return "Running";
      case 2:
        return "Finished";
      default:
        return "Unknown";
    }
  };

  const toggleDepartmentModal = () => {
    setDepartmentModalOpen(!departmentModalOpen);
    if (departmentModalOpen) {
      setDepartmentSearchTerm("");
    }
  };

  // Clear component edit data when components modal is closed
  const toggleComponentsModal = () => {
    setComponentsModalOpen(!componentsModalOpen);
    if (componentsModalOpen) {
      // Clear all states when modal is closed
      setComponentsSearchTerm("");
      setComponentEditData({});
    }
  };

  // Department search functions
  const getFilteredDepartmentItems = () => {
    if (!gridData || !Array.isArray(gridData)) return [];

    if (!departmentSearchTerm || !departmentSearchTerm.trim()) {
      return gridData;
    }

    return gridData.filter((item) => {
      if (!item || typeof item !== "object") return false;

      const itemName = item.ItemName || '';
      const contractNo = item.ContractNo || '';
      const searchTerm = departmentSearchTerm.toLowerCase();
      
      return itemName.toString().toLowerCase().includes(searchTerm) ||
             contractNo.toString().toLowerCase().includes(searchTerm);
    });
  };

  const handleDepartmentSearchChange = (e) => {
    const value = e?.target?.value ?? "";
    setDepartmentSearchTerm(value);
  };

  const clearDepartmentSearch = () => {
    setDepartmentSearchTerm("");
  };

  // Handle row click with loading protection
  const handleRowClick = useCallback(async (container) => {
    if (departmentModalLoading) return; // Prevent multiple calls
    
    setSelectedContainer(container);
    setDepartmentModalLoading(true);
    setDepartmentModalOpen(true);

    let vformData = new FormData();
    vformData.append("F_ContainerMaster", container?.Id);

    try {
      await Fn_GetReport(
        dispatch,
        setGridData,
        "tenderData",
        "GetContainerDepartmentStatus/0/token",
        { arguList: { id: 0, formData: vformData } },
        true
      );
    } catch (error) {
      console.error("Error fetching department data:", error);
      setGridData([]);
    } finally {
      setDepartmentModalLoading(false);
    }
  }, [departmentModalLoading, dispatch]);

  const handleDepartmentStatusClick = useCallback(async (departmentName, obj) => {
    setDepartmentStatusData(obj);
    
    if (departmentName === 'Components') {
      if (componentsModalLoading) return; // Prevent multiple calls
      
      setComponentsModalLoading(true);
      setComponentsModalOpen(true);
      
      const user  = JSON.parse(localStorage.getItem('authUser'))
      let vformData = new FormData();
      vformData.append("F_ContainerMasterL", obj?.ContainerLId);
      vformData.append("UserId", user?.id);
      
      try {
        await Fn_GetReport(
          dispatch,
          setState,
          "DepartmentOneData",
          "TransferComponents/0/token",
          { arguList: { id: 0, formData: vformData } },
          true
        );
      } catch (error) {
        console.error("Error fetching components data:", error);
      } finally {
        setComponentsModalLoading(false);
      }
    }
    else {
      console.log('departmentName:', departmentName);
      let departmentId = departmentName == 'Components' ? 1 : 
                        departmentName == 'Assembly' ? 2 : 
                        departmentName == 'Sanding' ? 3 : 
                        departmentName == 'Polish' ? 4 : 
                        departmentName == 'Fitting' ? 5 : 
                        departmentName == 'QC' ? 6 : 
                        departmentName == 'Packaging' ? 7 : null;
      
      console.log('departmentId:', departmentId);
      
      try {
        const result = await Fn_FillListData(
          dispatch,
          setState,
          "FillArray",
          `${API_URL2}/${departmentId}/${obj?.ContainerLId}`
        );

        const doneQtyValue = result && result.length > 0 ? result[0].DoneQty : 0;
        console.log('result:', doneQtyValue);
        setDoneQty(doneQtyValue);
        setSelectedDepartmentName(departmentName);
        setStartDate("");
        setEndDate("");
        setActualQuantity("");
        setDepartmentStatusModalOpen(true);
      } catch (error) {
        console.error("Error fetching department quantity:", error);
      }
    }
  }, [componentsModalLoading, dispatch]);

  // Check if all required fields are filled
  const isFormValid = () => {
    return startDate && endDate && actualQuantity;
  };

  // Simple save function with loading protection
  const saveDepartmentStatus = useCallback(async () => {
    if (!isFormValid()) {
      alert('Please fill all required fields: Start Date, End Date, and Actual Quantity');
      return;
    }
    
    if (departmentStatusLoading) return; // Prevent multiple calls
    
    setDepartmentStatusLoading(true);
    
    try {
      const user  = JSON.parse(localStorage.getItem('authUser'))
      const departmentId = selectedDepartmentName == 'Components' ? 1 : 
                          selectedDepartmentName == 'Assembly' ? 2 : 
                          selectedDepartmentName == 'Sanding' ? 3 : 
                          selectedDepartmentName == 'Polish' ? 4 : 
                          selectedDepartmentName == 'Fitting' ? 5 : 
                          selectedDepartmentName == 'QC' ? 6 : 
                          selectedDepartmentName == 'Packaging' ? 7 : null;
      
      console.log('departmentStatusData:', departmentStatusData);
      console.log('DepartmentName:', selectedDepartmentName);
      console.log('departmentId:', departmentId);
      console.log('StartDate:', startDate);
      console.log('EndDate:', endDate);
      console.log('Actual:', actualQuantity);

      const vformData = new FormData();
      vformData.append("F_ContainerMasterL", departmentStatusData.ContainerLId );
      vformData.append("F_DepartmentMaster", departmentId);
      vformData.append("UserId", user?.id);
      vformData.append("Actual", actualQuantity);
      vformData.append("StartDate", startDate);
      vformData.append("EndDate", endDate);

      await Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: 0, formData: vformData } },
        'Transfer/0/token',
        true,
        "Id",
        navigate,
        "#"
      );
      
      setDepartmentStatusModalOpen(false);
      
      // Refresh the parent department modal data
      let vformData2 = new FormData();
      vformData2.append("F_ContainerMaster", selectedContainer?.Id);

      await Fn_GetReport(
        dispatch,
        setGridData,
        "tenderData",
        "GetContainerDepartmentStatus/0/token",
        { arguList: { id: 0, formData: vformData2 } },
        true
      );
    } catch (error) {
      console.error("Error saving department status:", error);
    } finally {
      setDepartmentStatusLoading(false);
    }
  }, [isFormValid, departmentStatusLoading, selectedDepartmentName, departmentStatusData, startDate, endDate, actualQuantity, selectedContainer, dispatch, navigate]);

  function renderDepartmentStatusRectangle(value, departmentName,item) {
    let color = '';
    if (value === 0) color = '#dc3545'; // red
    else if (value === 1) color = '#ffc107'; // yellow
    else if (value === 3) color = '#28a745'; // green
    else color = '#adb5bd'; // gray for other/unknown
    return (
      <span 
        style={{
          display: 'inline-block',
          width: 28,
          height: 18,
          borderRadius: 4,
          background: color,
          border: '2px solid #495057',
          verticalAlign: 'middle',
          boxSizing: 'border-box',
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
        }} 
        title={`${departmentName}: ${value}`}
        onClick={() => handleDepartmentStatusClick(departmentName, item)}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      ></span>
    );
  }

  // Helper to render status rectangle with color
  function renderComponentStatusRectangle(value) {
    let color = '';
    if (value === 0) color = '#dc3545'; // red
    else if (value === 1) color = '#ffc107'; // yellow
    else if (value === 2) color = '#28a745'; // green
    else color = '#adb5bd'; // gray for other/unknown
    return (
      <span 
        style={{
          display: 'inline-block',
          width: 28,
          height: 18,
          borderRadius: 4,
          background: color,
          border: '2px solid #495057',
          verticalAlign: 'middle',
          boxSizing: 'border-box',
        }}
      ></span>
    );
  }

  // Helper to get overall status for a department
  const getOverallStatus = (statusField) => {
    if (!state.DepartmentOneData || state.DepartmentOneData.length === 0) return 0;
    
    const values = state.DepartmentOneData.map(row => row[statusField]).filter(val => val !== null && val !== undefined);
    if (values.length === 0) return 0;
    
    if (values.some(val => val === 1)) return 1; // If any is in progress, overall is in progress
    if (values.every(val => val === 2)) return 2; // If all are completed, overall is completed
    if (values.every(val => val === 0)) return 0; // If all are not started, overall is not started
    
    return 1; // Default to in progress if mixed states
  };

  // Handler for input changes in the modal
  const handleComponentDateChange = useCallback(async (idx, field, value, row) => {
    console.log('handleComponentDateChange:', idx, field, value, row);
    const user  = JSON.parse(localStorage.getItem('authUser'))
    setComponentEditData((prev) => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value,
      },
    }));
    
    // Convert date to SQL Server format
    const convertToSQLDateTime = (dateValue, fieldName) => {
      if (!dateValue || dateValue === '' || dateValue === 'null' || dateValue === null || dateValue === undefined) {
        return null;
      }
      
      // Check if date is already in SQL format (contains space and time) or ISO format (contains 'T')
      if (typeof dateValue === 'string' && (dateValue.includes(' ') || dateValue.includes('T'))) {
        return dateValue; // Already converted, return as is
      }
      
      // For datetime-local fields (Machine), use the value as is and add seconds
      if (fieldName.includes('Machine')) {
        return dateValue + ':00'; // Add seconds if not present
      }
      
      // For date fields, add time
      if (fieldName.includes('StartDate')) {
        return dateValue + ' 00:00:00'; // Start of day
      } else if (fieldName.includes('EndDate')) {
        return dateValue + ' 23:59:59'; // End of day
      }
      
      return dateValue + ' 00:00:00'; // Default
    };
    
    const vFormData = new FormData();
    console.log('row:', row);
    vFormData.append("Id", row?.Id);
    vFormData.append("Type", field == 'WoodIssueStartDate' || field == 'WoodIssueEndDate' ? 1 : field == 'MachineStartDate' || field == 'MachineEndDate' ? 2 : field == 'ComponentStorageStartDate' || field == 'ComponentStorageEndDate' ? 3 : field == 'ComponentSandingStartDate' || field == 'ComponentSandingEndDate' ? 4 : 0);
    vFormData.append("UserId", user?.id);
    
    // Convert dates to SQL format before sending
    const sqlFormattedDate = convertToSQLDateTime(value, field);
    
    // Only append non-null values to FormData
    if (field == 'WoodIssueStartDate' || field == 'MachineStartDate' || field == 'ComponentStorageStartDate' || field == 'ComponentSandingStartDate') {
      console.log('sqlFormattedDate:', sqlFormattedDate);
      if (sqlFormattedDate !== null) {
        vFormData.append("StartDate", sqlFormattedDate);
      } else {
        vFormData.append("StartDate", "");
      }
      vFormData.append("EndDate", "");
    } else if (field == 'WoodIssueEndDate' || field == 'MachineEndDate' || field == 'ComponentStorageEndDate' || field == 'ComponentSandingEndDate') {
      // Get the corresponding StartDate value based on the field type
      let correspondingStartDate = "";
      if (field === 'WoodIssueEndDate' && row.WoodIssueStartDate) {
        correspondingStartDate = convertToSQLDateTime(row.WoodIssueStartDate, 'WoodIssueStartDate');
      } else if (field === 'MachineEndDate' && row.MachineStartDate) {
        correspondingStartDate = convertToSQLDateTime(row.MachineStartDate, 'MachineStartDate');
      } else if (field === 'ComponentStorageEndDate' && row.ComponentStorageStartDate) {
        correspondingStartDate = convertToSQLDateTime(row.ComponentStorageStartDate, 'ComponentStorageStartDate');
      } else if (field === 'ComponentSandingEndDate' && row.ComponentSandingStartDate) {
        correspondingStartDate = convertToSQLDateTime(row.ComponentSandingStartDate, 'ComponentSandingStartDate');
      }
      
      vFormData.append("StartDate", correspondingStartDate || "");
      if (sqlFormattedDate !== null) {
        vFormData.append("EndDate", sqlFormattedDate);
      } else {
        vFormData.append("EndDate", "");
      }
    }

    await Fn_AddEditData(
      dispatch,
      setState,
      { arguList: { id: state.id, formData: vFormData } },
      'UpdateTransferComponentStatus/0/token',
      true,
      "Id",
      navigate,
      "#"
    );
    console.log(departmentStatusData)
    let vformData = new FormData();
    vformData.append("F_ContainerMasterL", departmentStatusData?.ContainerLId);
    vformData.append("UserId", user?.id);
    
    try {
      await Fn_GetReport(
        dispatch,
        setState,
        "DepartmentOneData",
        "TransferComponents/0/token",
        { arguList: { id: 0, formData: vformData } },
        true
      );
    } catch (error) {
      console.error("Error fetching departmentStatusData data:", error);
    }
    // Add your save API call here
  }, [dispatch, state.id, navigate, departmentStatusData]);

  // Log current Machine values for a row
  const handleMachineLogClick = useCallback(async (idx, row) => {
    console.log('row:', row);
    if (!row || !row.Id) return;

    // Prepare header info
    const containerNumber = (selectedContainer?.ContainerNumber || selectedContainer?.ContainerNo || selectedContainer?.Name || "");
    const itemName = (departmentStatusData?.ItemName || "");
    const componentName = row.ComponentName || "";
    setMachineHeaderInfo({ componentName, itemName, containerNumber });
    setMachineSequenceEdits({});
    setMachineSequenceLoading(true);

    const vformData = new FormData();
    vformData.append("Id", row.Id);

    await Fn_GetReport(
      dispatch,
      setState,
      "MachineSequenceData",
      "TransferComponentsL/0/token",
      { arguList: { id: 0, formData: vformData } },
      true
    );

    setMachineSequenceLoading(false);
    setMachineSequenceModalOpen(true);
  }, [dispatch, selectedContainer, departmentStatusData]);

  // Reload Components modal data
  const reloadComponentsDepartmentModal = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem('authUser'));
      if (!departmentStatusData?.ContainerLId) return;

      const vformData = new FormData();
      vformData.append('F_ContainerMasterL', departmentStatusData.ContainerLId);
      vformData.append('UserId', user?.id);

      await Fn_GetReport(
        dispatch,
        setState,
        'DepartmentOneData',
        'TransferComponents/0/token',
        { arguList: { id: 0, formData: vformData } },
        true
      );
    } catch (error) {
      console.error('Error refreshing Components Department modal data:', error);
    }
  }, [dispatch, departmentStatusData]);

  const toggleMachineSequenceModal = () => {
    const wasOpen = machineSequenceModalOpen;
    setMachineSequenceModalOpen(!machineSequenceModalOpen);
    // When closing Machine Sequence modal, refresh Components Department modal data
    if (wasOpen && componentsModalOpen) {
      reloadComponentsDepartmentModal();
    }
  };

  const handleMachineSequenceInputChange = (seqId, field, value) => {
    setMachineSequenceEdits((prev) => ({
      ...prev,
      [seqId]: {
        ...(prev[seqId] || {}),
        [field]: value,
      },
    }));
  };

  const toDatetimeLocal = (value) => {
    if (!value) return "";
    const str = String(value);
    if (str.includes('T')) return str.substring(0, 16);
    return str.replace(' ', 'T').substring(0, 16);
  };

  const toSqlDateTime = (datetimeLocal) => {
    if (!datetimeLocal) return "";
    // datetime-local like YYYY-MM-DDTHH:mm -> add seconds
    if (datetimeLocal.includes('T')) {
      const base = datetimeLocal.length === 16 ? `${datetimeLocal}:00` : datetimeLocal;
      return base.replace('T', ' ');
    }
    return datetimeLocal;
  };

  const handleMachineSequenceDateChange = useCallback(async (seqRow, field, value) => {
    // Update local edit state for UI reflect
    handleMachineSequenceInputChange(seqRow.Id, field, value);

    const user = JSON.parse(localStorage.getItem('authUser'));

    // Determine current values from edits or original row
    const currentStartRaw = (machineSequenceEdits[seqRow.Id]?.StartDate) ?? seqRow.StartDate;
    const currentEndRaw = (machineSequenceEdits[seqRow.Id]?.EndDate) ?? seqRow.EndDate;

    let startToSend = '';
    let endToSend = '';

    if (field === 'StartDate') {
      startToSend = toSqlDateTime(value) || '';
      endToSend = toSqlDateTime(currentEndRaw) || '';
    } else if (field === 'EndDate') {
      // When sending EndDate, also send existing StartDate if present
      startToSend = toSqlDateTime(currentStartRaw) || '';
      endToSend = toSqlDateTime(value) || '';
    }

    // Validate: StartDate should be before EndDate
    if (startToSend && endToSend) {
      const startTime = Date.parse(startToSend.replace(' ', 'T'));
      const endTime = Date.parse(endToSend.replace(' ', 'T'));
      if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && startTime >= endTime) {
        alert('Start Date must be before End Date');
        // Revert the local edit to previous value for UI consistency
        const previousValue = field === 'StartDate' ? currentStartRaw : currentEndRaw;
        handleMachineSequenceInputChange(seqRow.Id, field, toDatetimeLocal(previousValue));
        return;
      }
    }

    const vFormData = new FormData();
    vFormData.append('Id', seqRow.Id);
    vFormData.append('UserId', user?.id);
    vFormData.append('StartDate', startToSend);
    vFormData.append('EndDate', endToSend);

    await Fn_AddEditData(
      dispatch,
      setState,
      { arguList: { id: state.id, formData: vFormData } },
      'TransferL/0/token',
      true,
      'Id',
      navigate,
      '#'
    );
  }, [dispatch, navigate, state.id, machineSequenceEdits]);

  // Filter components based on search term
  const getFilteredComponents = () => {
    if (!state.DepartmentOneData || !Array.isArray(state.DepartmentOneData)) return [];
    
    if (!componentsSearchTerm || !componentsSearchTerm.trim()) {
      return state.DepartmentOneData;
    }
    
    return state.DepartmentOneData.filter((component) => {
      if (!component || typeof component != "object") return false;
      
      const componentName = component.ComponentName;
      if (!componentName) return false;
      
      return componentName.toString().toLowerCase().includes(componentsSearchTerm.toLowerCase());
    });
  };

  // Prevent typing in date inputs, only allow calendar selection
  const handleDateKeyDown = (e) => {
    // Allow tab, enter, and other navigation keys but prevent typing
    if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== 'Escape') {
      e.preventDefault();
    }
  };

  // Handle actual quantity change with validation
  const handleActualQuantityChange = (e) => {
    const value = e.target.value;
    const maxAllowed = (departmentStatusData?.Quantity || 0) + doneQty;
    
    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= maxAllowed)) {
      setActualQuantity(value);
    }
  };


  return (
    <div className="container-fluid">
      <style>
        {`
                    .clickable-row:hover {
                        background-color: #f8f9fa !important;
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    
                    .clickable-row:active {
                        background-color: #e9ecef !important;
                        transform: translateY(0);
                    }
                    
                    .clickable-row td {
                        border-color: #dee2e6;
                    }
                    
                    .status-boxes-container {
                        display: flex;
                        justify-content: center;
                        gap: 30px;
                        margin: 30px 0;
                        flex-wrap: wrap;
                    }
                    
                    .status-box {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 25px 35px;
                        border-radius: 15px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        min-width: 180px;
                        text-align: center;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        border: 3px solid transparent;
                    }
                    
                    .status-box:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                    }
                    
                    .status-box.not-started {
                        background: linear-gradient(135deg, #dc3545, #c82333);
                        color: white;
                    }
                    
                    .status-box.running {
                        background: linear-gradient(135deg, #ffc107, #e0a800);
                        color: #212529;
                    }
                    
                    .status-box.done {
                        background: linear-gradient(135deg, #28a745, #1e7e34);
                        color: white;
                    }
                    
                    .status-box-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                        opacity: 0.9;
                    }
                    
                    .status-box-title {
                        font-size: 18px;
                        font-weight: 700;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    
                    .status-box-count {
                        font-size: 32px;
                        font-weight: 800;
                        margin-bottom: 5px;
                    }
                    
                    .status-box-percentage {
                        font-size: 14px;
                        font-weight: 600;
                        opacity: 0.9;
                    }
                    
                    .progress-tracker {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 0;
                        margin: 20px 0;
                        position: relative;
                        padding: 0 20px;
                    }
                    
                    .progress-step {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        flex: 1;
                        position: relative;
                        z-index: 2;
                    }
                    
                    .progress-step:not(:last-child)::after {
                        content: '';
                        position: absolute;
                        top: 20px;
                        left: 50%;
                        width: 100%;
                        height: 3px;
                        background: linear-gradient(90deg, #e9ecef 50%, transparent 50%);
                        background-size: 8px 3px;
                        z-index: 1;
                    }
                    
                    .progress-step.completed:not(:last-child)::after {
                        background: linear-gradient(90deg, #28a745 50%, transparent 50%);
                        background-size: 8px 3px;
                    }
                    
                    .progress-step.running:not(:last-child)::after {
                        background: linear-gradient(90deg, #ffc107 50%, transparent 50%);
                        background-size: 8px 3px;
                    }
                    
                    .progress-circle {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                        font-weight: bold;
                        color: white;
                        position: relative;
                        z-index: 3;
                        border: 3px solid #fff;
                        box-shadow: 0 3px 8px rgba(0,0,0,0.15);
                        transition: all 0.3s ease;
                    }
                    
                    .progress-step.not-started .progress-circle {
                        background: linear-gradient(135deg, #dc3545, #c82333);
                    }
                    
                    .progress-step.running .progress-circle {
                        background: linear-gradient(135deg, #ffc107, #e0a800);
                        animation: pulse 2s infinite;
                    }
                    
                    .progress-step.completed .progress-circle {
                        background: linear-gradient(135deg, #28a745, #1e7e34);
                    }
                    
                    .progress-step.completed .progress-circle::before {
                        content: '✓';
                        font-size: 18px;
                        font-weight: bold;
                    }
                    
                    .progress-step.running .progress-circle::before {
                        content: '⟳';
                        font-size: 18px;
                        font-weight: bold;
                    }
                    
                    .progress-step.not-started .progress-circle::before {
                        content: '○';
                        font-size: 18px;
                        font-weight: bold;
                    }
                    
                    .step-label {
                        font-size: 11px;
                        font-weight: 600;
                        text-align: center;
                        margin-top: 8px;
                        color: #495057;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        max-width: 100px;
                        line-height: 1.3;
                    }
                    
                    .step-status {
                        font-size: 10px;
                        font-weight: 700;
                        text-transform: uppercase;
                        margin-top: 4px;
                        letter-spacing: 0.8px;
                        padding: 2px 6px;
                        border-radius: 10px;
                        background-color: rgba(0,0,0,0.05);
                    }
                    
                    .progress-step.not-started .step-status {
                        color: #dc3545;
                        background-color: rgba(220, 53, 69, 0.1);
                    }
                    
                    .progress-step.running .step-status {
                        color: #856404;
                        background-color: rgba(255, 193, 7, 0.15);
                    }
                    
                    .progress-step.completed .step-status {
                        color: #155724;
                        background-color: rgba(40, 167, 69, 0.1);
                    }
                    
                    .step-progress {
                        font-size: 11px;
                        font-weight: 600;
                        margin-top: 3px;
                        color: #495057;
                        background-color: rgba(0,0,0,0.03);
                        padding: 2px 6px;
                        border-radius: 8px;
                        border: 1px solid rgba(0,0,0,0.05);
                    }
                    
                    .progress-step.not-started .step-progress {
                        color: #6c757d;
                        background-color: rgba(108, 117, 125, 0.1);
                    }
                    
                    .progress-step.running .step-progress {
                        color: #856404;
                        background-color: rgba(255, 193, 7, 0.1);
                        border-color: rgba(255, 193, 7, 0.2);
                    }
                    
                    .progress-step.completed .step-progress {
                        color: #155724;
                        background-color: rgba(40, 167, 69, 0.1);
                        border-color: rgba(40, 167, 69, 0.2);
                    }
                    
                    .progress-percentage {
                        font-weight: 700;
                        color: #007bff;
                    }
                    
                    .progress-step.not-started .progress-percentage {
                        color: #6c757d;
                    }
                    
                    .progress-step.running .progress-percentage {
                        color: #856404;
                    }
                    
                    .progress-step.completed .progress-percentage {
                        color: #155724;
                    }
                    
                    @keyframes pulse {
                        0% { transform: scale(1); box-shadow: 0 3px 8px rgba(0,0,0,0.15); }
                        50% { transform: scale(1.05); box-shadow: 0 5px 15px rgba(255, 193, 7, 0.3); }
                        100% { transform: scale(1); box-shadow: 0 3px 8px rgba(0,0,0,0.15); }
                    }
                    
                    .status-legend {
                        display: flex;
                        justify-content: center;
                        gap: 30px;
                        margin-bottom: 25px;
                        flex-wrap: wrap;
                        padding: 20px;
                        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                        border-radius: 12px;
                        border: 1px solid #dee2e6;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    }
                    
                    .legend-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-size: 13px;
                        font-weight: 600;
                        color: #495057;
                        padding: 8px 12px;
                        border-radius: 8px;
                        background-color: rgba(255,255,255,0.7);
                        border: 1px solid rgba(0,0,0,0.05);
                    }
                    
                    .legend-color {
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 2px solid #fff;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }
                    
                    .item-row {
                        background-color: #fff;
                        border: 1px solid #e9ecef;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        overflow: hidden;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    }
                    
                    .item-row:hover {
                        box-shadow: 0 6px 20px rgba(0,0,0,0.1);
                        transform: translateY(-2px);
                        border-color: #007bff;
                    }
                    
                    .item-header {
                        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                        padding: 16px 20px;
                        border-bottom: 1px solid #dee2e6;
                        position: relative;
                    }
                    
                    .item-header::before {
                        content: '';
                        position: absolute;
                        left: 0;
                        top: 0;
                        bottom: 0;
                        width: 4px;
                        background: linear-gradient(180deg, #007bff, #0056b3);
                    }
                    
                    .item-header h6 {
                        margin: 0;
                        color: #2c3e50;
                        font-weight: 700;
                        font-size: 16px;
                        display: flex;
                        align-items: center;
                    }
                    
                    .item-header h6 i {
                        margin-right: 10px;
                        color: #007bff;
                        font-size: 18px;
                    }
                    
                    .item-header p {
                        margin: 6px 0 0 0;
                        font-size: 13px;
                        color: #6c757d;
                        font-weight: 500;
                    }
                    
                    .item-progress {
                        padding: 20px;
                        background-color: #fafbfc;
                    }
                    
                    .progress-title {
                        font-size: 14px;
                        font-weight: 600;
                        color: #495057;
                        margin-bottom: 15px;
                        text-align: center;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    
                    .department-search-container {
                        margin-bottom: 25px;
                        padding: 20px;
                        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                        border-radius: 12px;
                        border: 1px solid #dee2e6;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    }
                    
                    .department-search-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: #2c3e50;
                        margin-bottom: 15px;
                        display: flex;
                        align-items: center;
                    }
                    
                    .department-search-title i {
                        margin-right: 10px;
                        color: #007bff;
                    }
                    
                    .department-search-input-group {
                        position: relative;
                        max-width: 400px;
                        margin: 0 auto;
                    }
                    
                    .department-search-input {
                        width: 100%;
                        padding: 12px 45px 12px 15px;
                        border: 2px solid #dee2e6;
                        border-radius: 25px;
                        font-size: 14px;
                        font-weight: 500;
                        color: #495057;
                        background-color: #fff;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    }
                    
                    .department-search-input:focus {
                        outline: none;
                        border-color: #007bff;
                        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
                    }
                    
                    .department-search-clear {
                        position: absolute;
                        right: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        color: #6c757d;
                        cursor: pointer;
                        padding: 5px;
                        border-radius: 50%;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .department-search-clear:hover {
                        background-color: #e9ecef;
                        color: #495057;
                    }
                    
                    .department-search-clear i {
                        font-size: 14px;
                    }
                    
                    .search-results-info {
                        text-align: center;
                        margin-top: 10px;
                        font-size: 13px;
                        color: #6c757d;
                        font-weight: 500;
                    }
                    
                    .no-search-results {
                        text-align: center;
                        padding: 40px 20px;
                        color: #6c757d;
                    }
                    
                    .no-search-results i {
                        font-size: 48px;
                        margin-bottom: 15px;
                        color: #dee2e6;
                    }
                    
                    .no-search-results h5 {
                        margin-bottom: 10px;
                        color: #495057;
                        font-weight: 600;
                    }
                    
                    .no-search-results p {
                        margin: 0;
                        font-size: 14px;
                    }
                `}
      </style>
      <Row>
        <Col lg="12">
          <Card>
            <CardHeader>
              <h4 className="card-title">Container Machining Status Report</h4>
              <p className="card-text">
                Click on any status box to view detailed container list
              </p>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="status-boxes-container">
                  {getStatusDistribution().map((status, index) => (
                    <div
                      key={index}
                      className={`status-box ${status.name.toLowerCase().replace(' ', '-')}`}
                      onClick={() => handleStatusBoxClick(index)}
                      title={`Click to view ${status.name} containers`}
                    >
                      <div className="status-box-icon">
                        {status.name === 'Not Started' && <i className="fas fa-times-circle"></i>}
                        {status.name === 'Running' && <i className="fas fa-clock"></i>}
                        {status.name === 'Done' && <i className="fas fa-check-circle"></i>}
                      </div>
                      <div className="status-box-title">{status.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Modal for showing container list */}
      <Modal isOpen={modalOpen} toggle={toggleModal} size="lg" centered>
        <ModalHeader toggle={toggleModal}>
          {selectedStatus || "Unknown"} Containers (
          {state.FillArray1 ? state.FillArray1.length : 0})
        </ModalHeader>
        <ModalBody>
          {modalLoading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading containers...</span>
              </div>
              <p className="mt-2">Loading containers...</p>
            </div>
          ) : state.FillArray1 && state.FillArray1.length > 0 ? (
            <>
              {/* Search Bar */}
              <div className="mb-3">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by container name..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={clearSearch}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>

              <Table responsive striped>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Container Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentItems()
                    .map((container, index) => {
                      if (!container || typeof container !== "object")
                        return null;

                      const globalIndex =
                        (currentPage - 1) * itemsPerPage + index;
                      const containerId = container.Id ?? `temp-${index}`;
                      const containerName = container.Name ?? "N/A";
                      const statusCode = container.StatusCode ?? 0;

                      return (
                        <tr
                          key={containerId}
                          onClick={() => handleRowClick(container)}
                          className="clickable-row"
                          style={{ cursor: "pointer" }}
                        >
                          <td>{globalIndex + 1}</td>
                          <td>{containerName}</td>
                          <td>
                            <span
                              className={`badge bg-${getStatusBadgeColor(
                                statusCode
                              )}`}
                            >
                              {getStatusText(statusCode)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                    .filter(Boolean)}
                </tbody>
              </Table>

              {/* No search results message */}
              {searchTerm && getFilteredItems().length === 0 && (
                <div className="text-center mt-3">
                  <p className="text-muted">
                    <i className="fas fa-search me-2"></i>
                    No containers found matching "{searchTerm || ""}"
                  </p>
                </div>
              )}

              {/* Pagination */}
              {getTotalPages() > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted">
                    {(() => {
                      const filteredItems = getFilteredItems();
                      const totalItems = filteredItems?.length ?? 0;
                      const startItem =
                        totalItems > 0
                          ? (currentPage - 1) * itemsPerPage + 1
                          : 0;
                      const endItem = Math.min(
                        currentPage * itemsPerPage,
                        totalItems
                      );

                      if (totalItems === 0) {
                        return "No containers found";
                      }

                      return `Showing ${startItem} to ${endItem} of ${totalItems} containers`;
                    })()}
                    {searchTerm && state.FillArray1 && (
                      <span className="ms-2 text-info">
                        (filtered from {state.FillArray1.length} total)
                      </span>
                    )}
                  </div>
                  <nav aria-label="Container pagination">
                    <ul className="pagination pagination-sm mb-0">
                      {/* Previous button */}
                      <li
                        className={`page-item ${
                          currentPage === 1 ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                      </li>

                      {/* Page numbers */}
                      {Array.from(
                        { length: getTotalPages() },
                        (_, i) => i + 1
                      ).map((pageNumber) => {
                        if (
                          pageNumber === 1 ||
                          pageNumber === getTotalPages() ||
                          (pageNumber >= currentPage - 1 &&
                            pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <li
                              key={pageNumber}
                              className={`page-item ${
                                pageNumber === currentPage ? "active" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pageNumber)}
                              >
                                {pageNumber}
                              </button>
                            </li>
                          );
                        } else if (
                          pageNumber === currentPage - 2 ||
                          pageNumber === currentPage + 2
                        ) {
                          return (
                            <li key={pageNumber} className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          );
                        }
                        return null;
                      })}

                      {/* Next button */}
                      <li
                        className={`page-item ${
                          currentPage === getTotalPages() ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={handleNextPage}
                          disabled={currentPage === getTotalPages()}
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <p>No containers found for this status.</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Department Status Modal */}
      <Modal
        isOpen={departmentModalOpen}
        toggle={toggleDepartmentModal}
        size="xl"
        centered
      >
        <ModalHeader toggle={toggleDepartmentModal}>
          <div>
            <h5 className="mb-0">
            Container: - {selectedContainer?.Name || "Container"}
            </h5>
           
          </div>
        </ModalHeader>
        <ModalBody>
          {departmentModalLoading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading department status...</span>
              </div>
              <p className="mt-2">Loading department status...</p>
            </div>
          ) : getFilteredDepartmentItems().length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-hover table-bordered align-middle">
                <thead className="table-dark">
                  <tr>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>#</th>
                    <th style={{ verticalAlign: 'middle' }}>Item Name</th>
                    <th style={{ verticalAlign: 'middle' }}>Contract No</th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Quantity</th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Components</th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Assembly</th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Sanding</th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Polish</th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Fitting</th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>QC</th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Packaging</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredDepartmentItems().map((item, index) => (
                    <tr key={index}>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ verticalAlign: 'middle' }}>{item.ItemName}</td>
                      <td style={{ verticalAlign: 'middle' }}>{item.ContractNo}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{item.Quantity}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{renderDepartmentStatusRectangle(item.COMPONENTS, 'Components',item)}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{renderDepartmentStatusRectangle(item.ASSEMBLY, 'Assembly',item)}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{renderDepartmentStatusRectangle(item.SANDING, 'Sanding',item)}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{renderDepartmentStatusRectangle(item.POLISH, 'Polish',item)}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{renderDepartmentStatusRectangle(item.FITTING, 'Fitting',item)}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{renderDepartmentStatusRectangle(item.QC, 'QC',item)}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{renderDepartmentStatusRectangle(item.PACKAGING, 'Packaging',item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-search-results">
              <i className="fas fa-search"></i>
              <h5>No Items Found</h5>
              <p>
                No items match your search criteria. Try a different search term.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDepartmentModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Department Status Modal */}
      <Modal
        isOpen={departmentStatusModalOpen}
        toggle={() => setDepartmentStatusModalOpen(false)}
        size="sm"
        centered
      >
        <ModalHeader toggle={() => setDepartmentStatusModalOpen(false)}>
          {selectedDepartmentName || 'Department Status'} ({doneQty})
        </ModalHeader>
        <ModalBody style={{ padding: '20px' }}>
          {departmentStatusData && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>START DATE</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '5px', 
                    border: '1px solid #ccc', 
                    fontSize: '12px'
                  }}
                  onKeyDown={handleDateKeyDown}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>END DATE</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '5px', 
                    border: '1px solid #ccc', 
                    fontSize: '12px'
                  }}
                  onKeyDown={handleDateKeyDown}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>QUANTITY</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', padding: '5px' }}>
                  <input
                    type="number"
                    placeholder="ACTUAL"
                    value={actualQuantity}
                    onChange={handleActualQuantityChange}
                    min="0"
                    max={(departmentStatusData?.Quantity || 0) + doneQty}
                    style={{ 
                      flex: 1, 
                      border: 'none', 
                      outline: 'none', 
                      fontSize: '12px',
                      textAlign: 'center'
                    }}
                  />
                  <span style={{ margin: '0 5px', fontSize: '12px', fontWeight: '600' }}>/</span>
                  <span style={{ 
                    flex: 1, 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    textAlign: 'center' 
                  }}>
                    {departmentStatusData.Quantity || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter style={{ padding: '10px' }}>
          <Button 
            color="primary" 
            size="sm" 
            onClick={saveDepartmentStatus}
            disabled={!isFormValid()}
          >
            Save
          </Button>
          <Button color="secondary" size="sm" onClick={() => setDepartmentStatusModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Components Department Modal */}
      <Modal
        isOpen={componentsModalOpen}
        toggle={toggleComponentsModal}
        size="xl"
        centered
        style={{ maxWidth: '98vw', width: '98vw' }}
      >
        <ModalHeader toggle={toggleComponentsModal}>
          <h4 className="mb-0">
            <i className="fas fa-cogs me-2"></i>
            Components Department Details
          </h4>
        </ModalHeader>
        <ModalBody style={{ background: '#f8f9fb' }}>
          {componentsModalLoading ? (
            <div className="text-center" style={{ padding: '60px 20px' }}>
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-3" style={{ fontSize: '16px', color: '#495057', fontWeight: '500' }}>
                Loading components data...
              </p>
            </div>
          ) : (
            <>
              {/* Search Section */}
              <div style={{ marginBottom: 20, padding: '15px', background: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontWeight: 600, fontSize: 14, color: '#495057', minWidth: 120 }}>Search Component:</label>
                  <input
                    type="text"
                    value={componentsSearchTerm}
                    onChange={(e) => setComponentsSearchTerm(e.target.value)}
                    placeholder="Enter component name..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: 6,
                      fontSize: 14
                    }}
                  />
                  {componentsSearchTerm && (
                    <button
                      onClick={() => setComponentsSearchTerm("")}
                      style={{
                        padding: '8px 12px',
                        background: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              
              {/* Status Legend */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 18, justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 18, height: 18, background: '#dc3545', borderRadius: 4, border: '2px solid #495057', display: 'inline-block', marginRight: 4 }} title="Not Started"></span>
                  <span style={{ fontSize: 13, color: '#dc3545', fontWeight: 600 }}>Not Started</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 18, height: 18, background: '#ffc107', borderRadius: 4, border: '2px solid #495057', display: 'inline-block', marginRight: 4 }} title="In Progress"></span>
                  <span style={{ fontSize: 13, color: '#ffc107', fontWeight: 600 }}>In Progress</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 18, height: 18, background: '#28a745', borderRadius: 4, border: '2px solid #495057', display: 'inline-block', marginRight: 4 }} title="Completed"></span>
                  <span style={{ fontSize: 13, color: '#28a745', fontWeight: 600 }}>Completed</span>
                </span>
              </div>
              {/* Table Section */}
              <div className="table-responsive" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 18 }}>
                <table className="table align-middle text-center" style={{ marginBottom: 0, borderCollapse: 'collapse', width: '100%' }}>
                  <thead style={{ background: '#343a40', color: '#fff' }}>
                    <tr>
                      <th style={{ verticalAlign: 'middle', fontSize: 14, fontWeight: 700, border: '2px solid #adb5bd' }}>Component Name</th>
                      <th style={{ verticalAlign: 'middle', fontSize: 14, fontWeight: 700, border: '2px solid #adb5bd' }}>Size</th>
                      <th style={{ verticalAlign: 'middle', fontSize: 14, fontWeight: 700, border: '2px solid #adb5bd' }}>Image</th>
                      <th style={{ verticalAlign: 'middle', fontSize: 14, fontWeight: 700, border: '2px solid #adb5bd' }}>Wood Issue</th>
                      <th style={{ verticalAlign: 'middle', fontSize: 14, fontWeight: 700, border: '2px solid #adb5bd' }}>Machine</th>
                      <th style={{ verticalAlign: 'middle', fontSize: 14, fontWeight: 700, border: '2px solid #adb5bd' }}>Storage</th>
                      <th style={{ verticalAlign: 'middle', fontSize: 14, fontWeight: 700, border: '2px solid #adb5bd' }}>Sanding</th>
                    </tr>
                    {/* Overall Status Row */}
                    <tr style={{ background: '#e9ecef' }}>
                      <td style={{ verticalAlign: 'middle', fontWeight: 700, border: '2px solid #adb5bd', fontSize: 13, color: '#495057' }}>Overall Status</td>
                      <td style={{ verticalAlign: 'middle', border: '2px solid #adb5bd' }}>-</td>
                      <td style={{ verticalAlign: 'middle', border: '2px solid #adb5bd' }}>-</td>
                      <td style={{ verticalAlign: 'middle', border: '2px solid #adb5bd', textAlign: 'center' }}>
                        {renderComponentStatusRectangle(getOverallStatus('IsWoodIssue'))}
                      </td>
                      <td style={{ verticalAlign: 'middle', border: '2px solid #adb5bd', textAlign: 'center' }}>
                        {renderComponentStatusRectangle(getOverallStatus('IsMachine'))}
                      </td>
                      <td style={{ verticalAlign: 'middle', border: '2px solid #adb5bd', textAlign: 'center' }}>
                        {renderComponentStatusRectangle(getOverallStatus('IsComponentStorage'))}
                      </td>
                      <td style={{ verticalAlign: 'middle', border: '2px solid #adb5bd', textAlign: 'center' }}>
                        {renderComponentStatusRectangle(getOverallStatus('IsComponentSanding'))}
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredComponents() && getFilteredComponents().length > 0 ? (
                      getFilteredComponents().map((row, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#f8f9fa' : '#fff', borderBottom: '2px solid #e9ecef' }}>
                          <td style={{ verticalAlign: 'middle', fontWeight: 600, color: '#2c3e50', border: '2px solid #adb5bd' }}>{row.ComponentName}</td>
                          <td style={{ verticalAlign: 'middle', fontWeight: 500, border: '2px solid #adb5bd' }}>{row.ComponentSize}</td>
                          <td style={{ verticalAlign: 'middle', border: '2px solid #adb5bd' }}>
                            {row.ImageData ? (
                              <div style={{ width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f4', border: '2px solid #dee2e6', borderRadius: 8, margin: '0 auto' }}>
                                <img
                                  src={`data:image/bmp;base64,${row.ImageData}`}
                                  alt={row.ComponentName}
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6 }}
                                />
                              </div>
                            ) : (
                              <span style={{ color: '#adb5bd', fontSize: 12 }}>No Image</span>
                            )}
                          </td>
                          {/* WOOD ISSUE */}
                          <td style={{ minWidth: 180, border: '2px solid #adb5bd' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                                <label style={{ fontWeight: 600, fontSize: 15, minWidth: 90 }}>Start Date</label>
                                <input
                                  type="date"
                                  value={componentEditData[idx]?.WoodIssueStartDate ?? (row.WoodIssueStartDate ? row.WoodIssueStartDate.split('T')[0] : '')}
                                  onChange={e => handleComponentDateChange(idx, 'WoodIssueStartDate', e.target.value, row)}
                                  onKeyDown={handleDateKeyDown}
                                  style={{ width: 130, fontSize: 15, borderRadius: 6, border: '1px solid #ced4da', padding: '2px 8px' }}
                                  placeholder="Start Date"
                                  title="Wood Issue Start Date"
                                />
                                <button
                                  onClick={() => handleComponentDateChange(idx, 'WoodIssueStartDate', '', row)}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#dc3545',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}
                                  title="Clear Start Date"
                                >
                                  Clear
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontWeight: 600, fontSize: 15, minWidth: 90 }}>End Date</label>
                                <input
                                  type="date"
                                  value={componentEditData[idx]?.WoodIssueEndDate ?? (row.WoodIssueEndDate ? row.WoodIssueEndDate.split('T')[0] : '')}
                                  onChange={e => handleComponentDateChange(idx, 'WoodIssueEndDate', e.target.value, row)}
                                  onKeyDown={handleDateKeyDown}
                                  style={{ width: 130, fontSize: 15, borderRadius: 6, border: '1px solid #ced4da', padding: '2px 8px' }}
                                  placeholder="End Date"
                                  title="Wood Issue End Date"
                                />
                                <button
                                  onClick={() => handleComponentDateChange(idx, 'WoodIssueEndDate', '', row)}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#dc3545',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}
                                  title="Clear End Date"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </td>
                          {/* MACHINE */}
                          <td style={{ minWidth: 200, border: '2px solid #adb5bd' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                                <label style={{ fontWeight: 600, fontSize: 15, minWidth: 90 }}>Start Date</label>
                                <span style={{ fontSize: 15, fontWeight: 600, color: '#343a40' }}>
                                  {row.MachineStartDate ? toDatetimeLocal(row.MachineStartDate).replace('T', ' ') : '-'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontWeight: 600, fontSize: 15, minWidth: 90 }}>End Date</label>
                                <span style={{ fontSize: 15, fontWeight: 600, color: '#343a40' }}>
                                  {row.MachineEndDate ? toDatetimeLocal(row.MachineEndDate).replace('T', ' ') : '-'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
                                <button
                                  onClick={() => handleMachineLogClick(idx, row)}
                                  style={{
                                    padding: '10px 16px',
                                    background: '#0d6efd',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    minWidth: 120
                                  }}
                                  title="Sequence"
                                >
                                  Sequence
                                </button>
                              </div>
                            </div>
                          </td>
                          {/* COMPONENT STORAGE */}
                          <td style={{ minWidth: 180, border: '2px solid #adb5bd' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                                <label style={{ fontWeight: 600, fontSize: 15, minWidth: 90 }}>Start Date</label>
                                <input
                                  type="date"
                                  value={componentEditData[idx]?.ComponentStorageStartDate ?? (row.ComponentStorageStartDate ? row.ComponentStorageStartDate.split('T')[0] : '')}
                                  onChange={e => handleComponentDateChange(idx, 'ComponentStorageStartDate', e.target.value, row)}
                                  onKeyDown={handleDateKeyDown}
                                  style={{ width: 130, fontSize: 15, borderRadius: 6, border: '1px solid #ced4da', padding: '2px 8px' }}
                                  placeholder="Start Date"
                                  title="Storage Start Date"
                                />
                                <button
                                  onClick={() => handleComponentDateChange(idx, 'ComponentStorageStartDate', '', row)}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#dc3545',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}
                                  title="Clear Start Date"
                                >
                                  Clear
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontWeight: 600, fontSize: 15, minWidth: 90 }}>End Date</label>
                                <input
                                  type="date"
                                  value={componentEditData[idx]?.ComponentStorageEndDate ?? (row.ComponentStorageEndDate ? row.ComponentStorageEndDate.split('T')[0] : '')}
                                  onChange={e => handleComponentDateChange(idx, 'ComponentStorageEndDate', e.target.value, row)}
                                  onKeyDown={handleDateKeyDown}
                                  style={{ width: 130, fontSize: 15, borderRadius: 6, border: '1px solid #ced4da', padding: '2px 8px' }}
                                  placeholder="End Date"
                                  title="Storage End Date"
                                />
                                <button
                                  onClick={() => handleComponentDateChange(idx, 'ComponentStorageEndDate', '', row)}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#dc3545',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}
                                  title="Clear End Date"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </td>
                          {/* COMPONENT SANDING */}
                          <td style={{ minWidth: 180, border: '2px solid #adb5bd' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                                <label style={{ fontWeight: 600, fontSize: 15, minWidth: 90 }}>Start Date</label>
                                <input
                                  type="date"
                                  value={componentEditData[idx]?.ComponentSandingStartDate ?? (row.ComponentSandingStartDate ? row.ComponentSandingStartDate.split('T')[0] : '')}
                                  onChange={e => handleComponentDateChange(idx, 'ComponentSandingStartDate', e.target.value, row)}
                                  onKeyDown={handleDateKeyDown}
                                  style={{ width: 130, fontSize: 15, borderRadius: 6, border: '1px solid #ced4da', padding: '2px 8px' }}
                                  placeholder="Start Date"
                                  title="Sanding Start Date"
                                />
                                <button
                                  onClick={() => handleComponentDateChange(idx, 'ComponentSandingStartDate', '', row)}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#dc3545',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}
                                  title="Clear Start Date"
                                >
                                  Clear
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontWeight: 600, fontSize: 15, minWidth: 90 }}>End Date</label>
                                <input
                                  type="date"
                                  value={componentEditData[idx]?.ComponentSandingEndDate ?? (row.ComponentSandingEndDate ? row.ComponentSandingEndDate.split('T')[0] : '')}
                                  onChange={e => handleComponentDateChange(idx, 'ComponentSandingEndDate', e.target.value, row)}
                                  onKeyDown={handleDateKeyDown}
                                  style={{ width: 130, fontSize: 15, borderRadius: 6, border: '1px solid #ced4da', padding: '2px 8px' }}
                                  placeholder="End Date"
                                  title="Sanding End Date"
                                />
                                <button
                                  onClick={() => handleComponentDateChange(idx, 'ComponentSandingEndDate', '', row)}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#dc3545',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}
                                  title="Clear End Date"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center" style={{ color: '#adb5bd', fontSize: 15 }}>No data found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter style={{ background: '#f8f9fb', borderTop: '1px solid #e9ecef' }}>
          <Button color="secondary" onClick={toggleComponentsModal} style={{ minWidth: 100, fontWeight: 600, fontSize: 15 }}>
            <i className="fas fa-times me-2"></i>Cancel
          </Button>
        </ModalFooter>
      </Modal>
      {/* Machine Sequence Modal */}
      <Modal
        isOpen={machineSequenceModalOpen}
        toggle={toggleMachineSequenceModal}
        size="lg"
        centered
      >
        <ModalHeader toggle={toggleMachineSequenceModal}>
          {machineHeaderInfo.componentName || 'Component'} | {machineHeaderInfo.itemName || 'Item'} | {machineHeaderInfo.containerNumber || 'Container'}
        </ModalHeader>
        <ModalBody>
          {machineSequenceLoading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover table-bordered align-middle">
                <thead className="table-dark">
                  <tr>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>#</th>
                    <th style={{ verticalAlign: 'middle' }}>Machine Name</th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center' }}>Series</th>
                    <th style={{ verticalAlign: 'middle' }}>Start Date & Time</th>
                    <th style={{ verticalAlign: 'middle' }}>End Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(state.MachineSequenceData || []).map((seq, i) => (
                    <tr key={seq.Id || i}>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ verticalAlign: 'middle' }}>{seq.MachineName}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{seq.Series}</td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="datetime-local"
                            value={toDatetimeLocal((machineSequenceEdits[seq.Id]?.StartDate) ?? seq.StartDate)}
                            onChange={(e) => handleMachineSequenceDateChange(seq, 'StartDate', e.target.value)}
                            style={{ width: 220 }}
                          />
                          <button
                            onClick={() => handleMachineSequenceDateChange(seq, 'StartDate', '')}
                            style={{ padding: '4px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                            title="Clear Start Date"
                          >
                            Clear
                          </button>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="datetime-local"
                            value={toDatetimeLocal((machineSequenceEdits[seq.Id]?.EndDate) ?? seq.EndDate)}
                            onChange={(e) => handleMachineSequenceDateChange(seq, 'EndDate', e.target.value)}
                            style={{ width: 220 }}
                          />
                          <button
                            onClick={() => handleMachineSequenceDateChange(seq, 'EndDate', '')}
                            style={{ padding: '4px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                            title="Clear End Date"
                          >
                            Clear
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!state.MachineSequenceData || state.MachineSequenceData.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center">No machine sequence data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleMachineSequenceModal}>Close</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default ContainerEntrySystem;
