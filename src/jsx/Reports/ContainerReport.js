import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import ReactApexChart from "react-apexcharts";
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

function ContainerReport() {
  const [state, setState] = useState({
    id: 0,
    FillArray: [],
    FillArrayItem: [],
    isProgress: true,
  });

  const API_URL =
    API_WEB_URLS.MASTER + "/0/token/GetContainerMachiningStatusPercent";
  const API_URL1 = API_WEB_URLS.MASTER + "/0/token/GetContainerMachiningStatus";

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

  // Closing report modal states
  const [closingReportModalOpen, setClosingReportModalOpen] = useState(false);
  const [closingReportData, setClosingReportData] = useState({
    F_ContainerMasterL: "",
    F_ItemMaster: ""
  });

  // Department details modal states
  const [departmentDetailsModalOpen, setDepartmentDetailsModalOpen] = useState(false);
  const [departmentDetailsData, setDepartmentDetailsData] = useState({
    departmentName: "",
    containerNumber: "",
    itemName: "",
    departmentStatus: []
  });

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
  }, [dispatch]);

  const fetchData = async () => {
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
  };

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

  // Handle bar click
  const handleBarClick = async (seriesIndex) => {
    if (seriesIndex === null || seriesIndex === undefined) {
      console.error("Invalid series index:", seriesIndex);
      return;
    }

    const statusMap = { 0: "Not Started", 1: "Running", 2: "Done" };
    const statusCode = seriesIndex;
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
  };

  // Chart options
  const getChartOptions = () => {
    const statusDistribution = getStatusDistribution();

    if (!statusDistribution || statusDistribution.length === 0) {
      return {
        chart: {
          type: "bar",
          height: 350,
          toolbar: { show: false },
        },
        noData: {
          text: "No data available",
          align: "center",
          verticalAlign: "middle",
          style: {
            color: "#666",
            fontSize: "14px",
            fontFamily: "Helvetica",
          },
        },
      };
    }

    return {
      chart: {
        type: "bar",
        height: 350,
        toolbar: { show: false },
        events: {
          dataPointSelection: function (event, chartContext, config) {
            handleBarClick(config.seriesIndex);
          },
          click: function (chart, w, e) {
            let seriesIndex = null;

            if (
              e.target &&
              e.target.classList.contains("apexcharts-bar-area")
            ) {
              seriesIndex = e.target.getAttribute("data:realIndex");
            } else if (e.target && e.target.getAttribute("data:realIndex")) {
              seriesIndex = e.target.getAttribute("data:realIndex");
            } else if (w && w.seriesIndex !== undefined) {
              seriesIndex = w.seriesIndex;
            } else if (e.target && e.target.closest("[data:realIndex]")) {
              seriesIndex = e.target
                .closest("[data:realIndex]")
                .getAttribute("data:realIndex");
            }

            if (seriesIndex !== null) {
              handleBarClick(parseInt(seriesIndex));
            }
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          endingShape: "rounded",
          borderRadius: 5,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: function (val, opts) {
          const series = statusDistribution[opts.seriesIndex];
          if (!series) return `${val}%`;
          return `${val}% (${series.count || 0})`;
        },
        style: {
          fontSize: "12px",
          fontWeight: "bold",
          colors: ["#fff"],
        },
      },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
      },
      xaxis: {
        categories: ["Container Status Distribution"],
        labels: {
          style: {
            fontSize: "14px",
            fontWeight: 500,
            colors: "#787878",
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        title: {
          text: "Percentage (%)",
          style: {
            fontSize: "14px",
            fontWeight: 500,
            colors: "#787878",
          },
        },
        labels: {
          style: {
            fontSize: "14px",
            fontWeight: 500,
            colors: "#787878",
          },
          formatter: function (val) {
            return val + "%";
          },
        },
      },
      grid: { show: false },
      legend: {
        position: "top",
        horizontalAlign: "left",
        fontWeight: 300,
        fontSize: "16px",
        fontFamily: "poppins",
        colors: ["#202020"],
        markers: { radius: 12 },
      },
      fill: { opacity: 1 },
      colors: statusDistribution.map((item) => item.color),
      tooltip: {
        y: {
          formatter: function (val, opts) {
            const series = statusDistribution[opts.seriesIndex];
            if (!series) return `${val}%`;
            return `${series.name}: ${val}% (${series.count || 0} containers)`;
          },
        },
      },
    };
  };

  // Chart series
  const getChartSeries = () => {
    const statusDistribution = getStatusDistribution();
    if (!statusDistribution || statusDistribution.length === 0) return [];

    return statusDistribution
      .map((item) => {
        if (!item) return null;
        return {
          name: item.name || "Unknown",
          data: item.data || [0],
        };
      })
      .filter(Boolean);
  };

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

  // Handle row click
  const handleRowClick = async (container) => {
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
                Click on any bar to view detailed container list
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
                <div id="chart">
                  <ReactApexChart
                    options={getChartOptions()}
                    series={getChartSeries()}
                    type="bar"
                    height={350}
                  />
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
              Department Status - {selectedContainer?.Name || "Container"}
            </h5>
            <small className="text-muted">
              Container: {selectedContainer?.ContainerNumber || "N/A"}
            </small>
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
          ) : gridData && gridData.length > 0 ? (
            <>
              {/* Search Bar */}
              <div className="department-search-container">
                                                <div className="department-search-title">
                                    <i className="fas fa-search"></i>
                                    Search Items by Name or Contract No
                                </div>
                <div className="department-search-input-group">
                                                      <input
                                        type="text"
                                        className="department-search-input"
                                        placeholder="Enter item name or contract no to search..."
                                        value={departmentSearchTerm}
                                        onChange={handleDepartmentSearchChange}
                                    />
                  {departmentSearchTerm && (
                    <button
                      className="department-search-clear"
                      onClick={clearDepartmentSearch}
                      title="Clear search"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
                {departmentSearchTerm && (
                  <div className="search-results-info">
                    Found {getFilteredDepartmentItems().length} of{" "}
                    {gridData.length} items
                  </div>
                )}
              </div>

              {/* Status Legend */}
              <div className="status-legend">
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{
                      background: "linear-gradient(135deg, #dc3545, #c82333)",
                    }}
                  ></div>
                  <span>Not Started</span>
                </div>
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{
                      background: "linear-gradient(135deg, #ffc107, #e0a800)",
                    }}
                  ></div>
                  <span>In Progress</span>
                </div>
                <div className="legend-item">
                  <div
                    className="legend-color"
                    style={{
                      background: "linear-gradient(135deg, #28a745, #1e7e34)",
                    }}
                  ></div>
                  <span>Completed</span>
                </div>
              </div>

              {/* Items with Horizontal Progress */}
              {getFilteredDepartmentItems().length > 0 ? (
                getFilteredDepartmentItems()
                  .map((item, index) => {
                    if (!item || typeof item !== "object") return null;

                    const departments = [
                      { key: "Machining", value: item.Machining },
                      { key: "Assembly", value: item.ASSEMBLY },
                      { key: "Sanding", value: item.SANDING },
                      { key: "Polish", value: item.POLISH },
                      { key: "Fitting", value: item.FITTING },
                      { key: "QC", value: item.QC },
                      { key: "Packaging", value: item.PACKAGING },
                    ];

                    return (
                      <div key={index} className="item-row">
                                                                    <div className="item-header">
                                                <h6>
                                                    <i className="fas fa-box"></i>
                                                    {item.ItemName || "Unknown Item"}
                                                    {item.ContractNo && (
                                                        <span className="text-muted ms-2">
                                                            ({item.ContractNo})
                                                        </span>
                                                    )}
                                                </h6>
                                                <p>
                                                    <strong>Container:</strong>{" "}
                                                    {item.ContainerNumber || "N/A"} |
                                                    <strong> Item ID:</strong>{" "}
                                                    {item.ContainerMasterLID || "N/A"}
                                                </p>
                                            </div>
                        <div className="item-progress">
                          <div className="progress-title">
                            <i className="fas fa-tasks me-2"></i>
                            Manufacturing Process Status
                          </div>
                          <div className="progress-tracker">
                            {departments.map((dept, deptIndex) => {
                              const { departmentId, status, actual, total } =
                                parseDepartmentStatus(dept.value);
                              const statusClass =
                                status === 0
                                  ? "not-started"
                                  : status === 1
                                  ? "running"
                                  : "completed";
                              const statusText =
                                getDepartmentStatusText(status);

                              const percentage =
                                total > 0
                                  ? Math.round((actual / total) * 100)
                                  : 0;

                              const handleDepartmentClick = async () => {
                                console.log("=== Department Click Details ===");
                                console.log("Row Data:", item);
                                console.log("Department ID:", departmentId);
                                console.log("Department Name:", dept.key);
                                console.log("Department Status:", statusText);
                                console.log("Department Value:", dept.value);
                                console.log(
                                  "Progress:",
                                  `${actual}/${total} (${percentage}%)`
                                );
                                console.log("===============================");
                                
                                if(dept.key === "Machining"){
                                  console.log("F_ContainerMasterL",item.ContainerMasterLID);
                                  console.log("F_ItemMaster",item.F_ItemMaster);
                                  
                                  // Open closing report modal with the data
                                  setClosingReportData({
                                    F_ContainerMasterL: item.ContainerMasterLID,
                                    F_ItemMaster: item.F_ItemMaster
                                  });
                                  setClosingReportModalOpen(true);
                                }
                                else {
                                  try {
                                    // Clear old data first
                                    setState(prevState => ({ ...prevState, FillArray5: [] }));
                                    
                                    // Fetch department status data
                                    const result = await Fn_FillListData(dispatch, setState, "FillArray5", `${API_WEB_URLS.MASTER}/0/token/GetDepartmentStatus/${departmentId}/${item.ContainerMasterLID}`);
                                    
                                    // Open department details modal with fresh data from the result
                                    setDepartmentDetailsData({
                                      departmentName: dept.key,
                                      containerNumber: item.ContainerNumber || "N/A",
                                      itemName: item.ItemName || "Unknown Item",
                                      departmentStatus: result || []
                                    });
                                    setDepartmentDetailsModalOpen(true);
                                  } catch (error) {
                                    console.error("Error fetching department status:", error);
                                    alert("Error fetching department status data");
                                  }
                                }
                              };

                              return (
                                <div
                                  key={deptIndex}
                                  className={`progress-step ${statusClass}`}
                                  onClick={handleDepartmentClick}
                                  style={{ cursor: "pointer" }}
                                  title={`Click to view details for ${dept.key}`}
                                >
                                  <div className="progress-circle"></div>
                                  <div className="step-label">{dept.key}</div>
                                  <div className="step-status">
                                    {statusText}
                                  </div>
                                  {dept.key !== "Machining" && (
                                    <div className="step-progress">
                                      <span className="progress-percentage">
                                        {percentage}%
                                      </span>
                                      <span>
                                        {" "}
                                        ({actual}/{total})
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                  .filter(Boolean)
              ) : (
                <div className="no-search-results">
                  <i className="fas fa-search"></i>
                  <h5>No Items Found</h5>
                  <p>
                    No items match your search criteria. Try a different search
                    term.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <i className="fas fa-info-circle fa-3x text-muted mb-3"></i>
              <p>No department status data available for this container.</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDepartmentModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Closing Report Modal */}
      <Modal
        isOpen={closingReportModalOpen}
        toggle={() => setClosingReportModalOpen(false)}
        size="xl"
        style={{
          maxWidth: '95vw',
          width: '95vw',
          height: '95vh',
          margin: '2.5vh auto'
        }}
      >
        <ModalHeader toggle={() => setClosingReportModalOpen(false)}>
          <h4 className="mb-0">
            <i className="fas fa-file-alt me-2"></i>
            Closing Report
          </h4>
        </ModalHeader>
        <ModalBody style={{ height: 'calc(95vh - 120px)', overflow: 'auto' }}>
          <PageList_ClosingReport
            F_ContainerMasterL={closingReportData.F_ContainerMasterL}
            F_ItemMaster={closingReportData.F_ItemMaster}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setClosingReportModalOpen(false)}>
            <i className="fas fa-times me-2"></i>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Department Details Modal */}
      <Modal
        isOpen={departmentDetailsModalOpen}
        toggle={() => setDepartmentDetailsModalOpen(false)}
        size="lg"
      >
        <ModalHeader toggle={() => setDepartmentDetailsModalOpen(false)}>
          <h4 className="mb-0">
            <i className="fas fa-chart-line me-2"></i>
            {departmentDetailsData.departmentName} Department Status
          </h4>
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <div className="row">
              <div className="col-md-6">
                <strong>Container:</strong> {departmentDetailsData.containerNumber}
              </div>
              <div className="col-md-6">
                <strong>Item:</strong> {departmentDetailsData.itemName}
              </div>
            </div>
          </div>
          
          {departmentDetailsData.departmentStatus && departmentDetailsData.departmentStatus.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Actual Qty</th>
                    <th>Total Qty</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentDetailsData.departmentStatus.map((status, index) => (
                    <tr key={index}>
                      <td>
                        <span className="badge bg-primary">{status.Actual}</span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{status.Total}</span>
                      </td>
                      <td>
                        <i className="fas fa-calendar-start me-1"></i>
                        {status.StartDate}
                      </td>
                      <td>
                        <i className="fas fa-calendar-check me-1"></i>
                        {status.EndDate}
                      </td>
                      <td>
                        <span className="badge bg-info">{status.Qty}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="fas fa-info-circle fa-3x text-muted mb-3"></i>
              <h5>No Status Data Available</h5>
              <p className="text-muted">No status information found for this department.</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setDepartmentDetailsModalOpen(false)}>
            <i className="fas fa-times me-2"></i>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default ContainerReport;
