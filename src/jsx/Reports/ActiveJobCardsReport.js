import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Row, Col, Card, Table, Button, Badge, Spinner, Modal, Form, Nav } from "react-bootstrap";
import { useDispatch } from "react-redux";
import axios from "axios";
import * as XLSX from "xlsx";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { 
  FaCogs, FaPlay, FaPauseCircle, FaStop, FaSync, FaSearch, 
  FaFileExcel, FaPrint, FaEye, FaRoute, FaClock, FaExclamationTriangle,
  FaCheckCircle, FaIndustry, FaShippingFast, FaArrowLeft
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { API_WEB_URLS } from "../../constants/constAPI";
import { Fn_FillListData, Fn_AddEditData } from "../../store/Functions";

// Format date time helper
const formatDateTime = (ts) => {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts).replace("T", " ");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${day}-${month}-${year} ${time}`;
  } catch {
    return ts;
  }
};

// Format minutes into clean duration e.g. "1h 45m"
const formatDuration = (totalMinutes) => {
  if (!totalMinutes || isNaN(totalMinutes) || totalMinutes <= 0) return "0m";
  const mins = Math.round(parseFloat(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const ActiveJobCardsReport = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // User auth session
  const userData = useMemo(() => JSON.parse(localStorage.getItem("authUser")) || {}, []);
  const userId = userData.id || userData.UserId || 1;
  const userToken = "token";

  const isAdmin = useMemo(() => {
    return Boolean(
      userData?.role === 1 ||
      userData?.roleId === 1 ||
      userData?.Role === 1 ||
      userData?.userType === 1 ||
      userData?.UserType === 1 ||
      userData?.userName?.toLowerCase() === "admin" ||
      userData?.username?.toLowerCase() === "admin" ||
      userData?.Name?.toLowerCase() === "admin"
    );
  }, [userData]);

  // Operational data states
  const [data, setData] = useState({
    runningMachines: [],
    pausedMachines: [],
    delayedTransitions: [],
    machineCounts: {}
  });
  const [loading, setLoading] = useState(true);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Filter & Search states
  const [activeTab, setActiveTab] = useState("ALL_ACTIVE"); // ALL_ACTIVE, RUNNING, PAUSED, DELAYED
  const [searchText, setSearchText] = useState("");
  const [selectedMachineFilter, setSelectedMachineFilter] = useState("ALL");

  // Flow drill-down modal state
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [selectedJobCardId, setSelectedJobCardId] = useState(null);
  const [selectedJobCardNo, setSelectedJobCardNo] = useState("");
  const [jobCardFlow, setJobCardFlow] = useState([]);
  const [loadingFlow, setLoadingFlow] = useState(false);

  // Admin action loading states
  const [stoppingJobCardLineId, setStoppingJobCardLineId] = useState(null);
  const [resumingJobCardId, setResumingJobCardId] = useState(null);

  // Base API URL
  const baseUrl = API_WEB_URLS.BASE.endsWith("/") ? API_WEB_URLS.BASE : `${API_WEB_URLS.BASE}/`;

  // Fetch live dashboard data
  const fetchReportData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsLiveSyncing(true);

    try {
      await Fn_FillListData(
        dispatch,
        (res) => {
          if (res) {
            setData(res);
            setLastSyncTime(new Date());
          }
        },
        "gridData",
        `MachineDelayDashboard/${userId}/${userToken}`
      );
    } catch (err) {
      console.error("ActiveJobCardsReport fetch error:", err);
    } finally {
      if (!isSilent) setLoading(false);
      setIsLiveSyncing(false);
    }
  }, [dispatch, userId, userToken]);

  useEffect(() => {
    fetchReportData(false);
  }, [fetchReportData]);

  // Real-time SignalR connection
  useEffect(() => {
    let connection = null;
    let debounceTimer = null;

    const triggerRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchReportData(true);
      }, 600);
    };

    const startSignalR = async () => {
      try {
        const hubUrl = baseUrl.replace("/api/V1/", "/qrScannerHub").replace("/api/v1/", "/qrScannerHub");
        connection = new HubConnectionBuilder()
          .withUrl(hubUrl)
          .withAutomaticReconnect()
          .build();

        connection.on("ReceiveUpdate", triggerRefresh);
        connection.on("MachinePaused", triggerRefresh);
        connection.on("MachineResumed", triggerRefresh);
        connection.on("ReceiveDelayAlert", triggerRefresh);

        await connection.start();
      } catch (err) {
        console.warn("SignalR connection warning in ActiveJobCardsReport:", err);
      }
    };

    startSignalR();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (connection) connection.stop().catch(() => {});
    };
  }, [baseUrl, fetchReportData]);

  // Safe data unwrap with casing fallbacks
  const runningMachines = useMemo(() => data?.runningMachines || data?.RunningMachines || [], [data]);
  const pausedMachines = useMemo(() => data?.pausedMachines || data?.PausedMachines || [], [data]);
  const delayedTransitions = useMemo(() => data?.delayedTransitions || data?.DelayedTransitions || [], [data]);
  const thresholdHours = data?.thresholdHours || data?.ThresholdHours || 4;

  // Auth header helper to prevent 401 Unauthorized on direct API calls
  const getAuthHeaders = useCallback(() => {
    try {
      const auth = JSON.parse(localStorage.getItem("authUser")) || {};
      const token = auth.jwtToken || auth.token || auth.UserToken || auth.UserTokenNew || localStorage.getItem("token") || localStorage.getItem("jwtToken");
      if (token) {
        return { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` };
      }
    } catch (e) {
      console.warn("Could not retrieve auth token:", e);
    }
    return {};
  }, []);

  // View Process Flow modal handler
  const handleViewJobCardFlow = async (jobCardId, jobCardNo) => {
    if (!jobCardId) return;
    setSelectedJobCardId(jobCardId);
    setSelectedJobCardNo(jobCardNo || `#${jobCardId}`);
    setShowFlowModal(true);
    setLoadingFlow(true);
    setJobCardFlow([]);

    try {
      let flowFound = false;

      // 1. Primary: Authenticated Axios request with JWT Bearer Token
      try {
        const headers = getAuthHeaders();
        const response = await axios.get(
          `${baseUrl}MachineDelayDashboard/JobCardFlow/${userId}/token/${jobCardId}`,
          { headers }
        );
        if (response.data && (response.data.success || response.data.Success)) {
          const raw = response.data.data || response.data.Data || response.data;
          const list = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.dataList)
            ? raw.dataList
            : Array.isArray(raw?.DataList)
            ? raw.DataList
            : [];
          if (list && list.length > 0) {
            setJobCardFlow(list);
            flowFound = true;
          }
        }
      } catch (axiosErr) {
        console.warn("Direct axios flow fetch failed, attempting Fn_FillListData:", axiosErr);
      }

      // 2. Secondary fallback: Fn_FillListData via Redux (only if primary didn't load items)
      if (!flowFound) {
        try {
          const dataList = await Fn_FillListData(
            dispatch,
            (res) => {
              const list = Array.isArray(res)
                ? res
                : Array.isArray(res?.dataList)
                ? res.dataList
                : Array.isArray(res?.DataList)
                ? res.DataList
                : Array.isArray(res?.data)
                ? res.data
                : [];
              if (list && list.length > 0) {
                setJobCardFlow(list);
              }
            },
            "gridData",
            `MachineDelayDashboard/JobCardFlow/${userId}/token/${jobCardId}`
          );
          if (dataList) {
            const list = Array.isArray(dataList)
              ? dataList
              : Array.isArray(dataList?.dataList)
              ? dataList.dataList
              : Array.isArray(dataList?.DataList)
              ? dataList.DataList
              : [];
            if (list && list.length > 0) {
              setJobCardFlow(list);
            }
          }
        } catch (reduxErr) {
          console.error("Redux fallback flow fetch failed:", reduxErr);
        }
      }
    } catch (err) {
      console.error("Error fetching job card flow:", err);
      setJobCardFlow([]);
    } finally {
      setLoadingFlow(false);
    }
  };

  // Stop running machine (Admin only)
  const handleStopMachine = async (m) => {
    const lineId = m.JobCardLineId || m.jobCardLineId;
    const masterId = m.JobCardMasterId || m.jobCardMasterId;
    const machId = m.MachineMasterId || m.machineMasterId;
    const machName = m.MachineName || m.machineName || "Machine";
    const jcNo = m.JobCardNo || m.jobCardNo;

    const confirmStop = window.confirm(`Are you sure you want to STOP machine "${machName}" for Job Card ${jcNo}?`);
    if (!confirmStop) return;

    setStoppingJobCardLineId(lineId);
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const vFormData = new FormData();
      vFormData.append("F_JobCardMaster", masterId || "");
      vFormData.append("F_MachineMaster", machId || "");
      vFormData.append("NewDate", nowStr);
      vFormData.append("Type", "2");

      const postData = {
        arguList: { id: 0, formData: vFormData }
      };

      await Fn_AddEditData(
        dispatch,
        () => {},
        postData,
        "UpdateTransferDateByJobCard/0/token",
        true
      );

      alert(`Machine "${machName}" stopped successfully!`);
      fetchReportData(true);
      if (selectedJobCardId === masterId) {
        handleViewJobCardFlow(masterId, jcNo);
      }
    } catch (err) {
      console.error("Error stopping machine:", err);
      alert(err?.message || "Failed to stop machine.");
    } finally {
      setStoppingJobCardLineId(null);
    }
  };

  // Resume paused machine (Admin only)
  const handleResumeMachine = async (m) => {
    const masterId = m.JobCardMasterId || m.F_JobCardMaster || 0;
    const machId = m.MachineMasterId || m.F_MachineMaster || 0;
    const machName = m.MachineName || "Machine";
    const jcNo = m.JobCardNo || `#${masterId}`;

    const confirmResume = window.confirm(`Resume machine "${machName}" on Job Card ${jcNo}?`);
    if (!confirmResume) return;

    setResumingJobCardId(masterId);
    try {
      const vFormData = new FormData();
      vFormData.append("JobCardMasterId", masterId);
      vFormData.append("F_JobCardMaster", masterId);
      vFormData.append("MachineMasterId", machId);
      vFormData.append("F_MachineMaster", machId);
      vFormData.append("UserName", userData.name || userData.UserName || "Admin");

      const token = userData?.jwtToken || userData?.token || localStorage.getItem("token") || localStorage.getItem("jwtToken");
      const headers = token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {};

      const url = `${baseUrl}${API_WEB_URLS.RESUME_MACHINE}/${userId}/${userToken}`;
      const res = await axios.post(url, vFormData, { headers });

      if (res?.data?.Success || res?.data?.success || res?.status === 200) {
        alert(`Machine "${machName}" resumed successfully!`);
        fetchReportData(true);
        if (selectedJobCardId === masterId) {
          handleViewJobCardFlow(masterId, jcNo);
        }
      } else {
        alert(res?.data?.Message || res?.data?.message || "Failed to resume machine.");
      }
    } catch (err) {
      console.error("Error resuming machine:", err);
      alert(err?.message || "Failed to resume machine.");
    } finally {
      setResumingJobCardId(null);
    }
  };

  // Compile unified active job cards list
  const activeJobCardsList = useMemo(() => {
    const list = [];

    // 1. Running items
    runningMachines.forEach((rm, i) => {
      const runningMins = parseFloat(rm.RunningMinutes || rm.runningMinutes || 0);
      const isOverdue = rm.IsDelayedRun === 1 || (runningMins / 60.0) >= parseFloat(thresholdHours);

      list.push({
        id: rm.JobCardLineId || `run_${i}`,
        type: "RUNNING",
        statusText: isOverdue ? "OVERDUE RUN" : "RUNNING",
        statusBadgeBg: isOverdue ? "danger" : "success",
        jobCardMasterId: rm.JobCardMasterId || rm.jobCardMasterId,
        jobCardLineId: rm.JobCardLineId || rm.jobCardLineId,
        jobCardNo: rm.JobCardNo || rm.jobCardNo || `#${rm.JobCardMasterId}`,
        shipmentNo: rm.ShipmentNo || rm.shipmentNo || "—",
        machineMasterId: rm.MachineMasterId || rm.machineMasterId,
        machineName: rm.MachineName || rm.machineName || "Unknown Machine",
        machineCode: rm.MachineCode || rm.machineCode || "",
        series: rm.Series || rm.series || 1,
        startTime: rm.StartTime || rm.startTime,
        durationMinutes: runningMins,
        durationText: formatDuration(runningMins),
        operatorName: rm.OperatorName || rm.operatorName || "N/A",
        raw: rm
      });
    });

    // 2. Paused items
    pausedMachines.forEach((pm, i) => {
      const masterId = pm.JobCardMasterId || pm.F_JobCardMaster || 0;
      const jcNo = pm.JobCardNo || `#${masterId}`;

      list.push({
        id: `pause_${i}`,
        type: "PAUSED",
        statusText: "PAUSED (ON-HOLD)",
        statusBadgeBg: "warning",
        jobCardMasterId: masterId,
        jobCardLineId: pm.JobCardLineId || 0,
        jobCardNo: jcNo,
        shipmentNo: pm.ShipmentNo || pm.ContainerNumber || "—",
        machineMasterId: pm.MachineMasterId || pm.F_MachineMaster || 0,
        machineName: pm.MachineName || "Unknown Machine",
        machineCode: pm.MachineCode || "",
        series: pm.Series || "—",
        startTime: pm.PauseStartTime || pm.CurrentPauseStartTime,
        durationMinutes: 0,
        durationText: pm.Reason || pm.CurrentPauseReason || "On Break",
        operatorName: pm.UserName || "N/A",
        raw: pm
      });
    });

    return list;
  }, [runningMachines, pausedMachines, thresholdHours]);

  // Delayed transitions list
  const delayedList = useMemo(() => {
    return delayedTransitions.map((dt, i) => ({
      id: `delayed_${i}`,
      type: "DELAYED",
      statusText: "WAITING TRANSITION",
      statusBadgeBg: "danger",
      jobCardMasterId: dt.JobCardMasterId,
      jobCardLineId: 0,
      jobCardNo: dt.JobCardNo || `#${dt.JobCardMasterId}`,
      shipmentNo: dt.ShipmentNo || "—",
      currentMachineName: dt.CurrentMachineName || "—",
      currentMachineCode: dt.CurrentMachineCode || "",
      nextMachineName: dt.NextMachineName || "Next Step",
      nextMachineCode: dt.NextMachineCode || "",
      finishedAt: dt.CurrentEndTime,
      delayHours: parseFloat(dt.DelayHours || dt.delayHours || 0),
      raw: dt
    }));
  }, [delayedTransitions]);

  // Unique machines for dropdown filter
  const uniqueMachines = useMemo(() => {
    const set = new Set();
    activeJobCardsList.forEach(item => {
      if (item.machineName && item.machineName !== "Unknown Machine") {
        set.add(item.machineName);
      }
    });
    return Array.from(set).sort();
  }, [activeJobCardsList]);

  // Filtered list based on active tab and search
  const filteredActiveList = useMemo(() => {
    const q = searchText.toLowerCase().trim();

    return activeJobCardsList.filter((item) => {
      // Tab filter
      if (activeTab === "RUNNING" && item.type !== "RUNNING") return false;
      if (activeTab === "PAUSED" && item.type !== "PAUSED") return false;

      // Machine filter
      if (selectedMachineFilter !== "ALL" && item.machineName !== selectedMachineFilter) return false;

      // Search query
      if (q) {
        const jc = String(item.jobCardNo || "").toLowerCase();
        const ship = String(item.shipmentNo || "").toLowerCase();
        const mach = (item.machineName || "").toLowerCase();
        const code = (item.machineCode || "").toLowerCase();
        const op = (item.operatorName || "").toLowerCase();
        const reason = (item.durationText || "").toLowerCase();
        return jc.includes(q) || ship.includes(q) || mach.includes(q) || code.includes(q) || op.includes(q) || reason.includes(q);
      }

      return true;
    });
  }, [activeJobCardsList, activeTab, selectedMachineFilter, searchText]);

  // Filtered delayed list
  const filteredDelayedList = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return delayedList.filter((dt) => {
      if (!q) return true;
      const jc = String(dt.jobCardNo || "").toLowerCase();
      const ship = String(dt.shipmentNo || "").toLowerCase();
      const currM = (dt.currentMachineName || "").toLowerCase();
      const nextM = (dt.nextMachineName || "").toLowerCase();
      return jc.includes(q) || ship.includes(q) || currM.includes(q) || nextM.includes(q);
    });
  }, [delayedList, searchText]);

  // Excel export
  const exportToExcel = () => {
    const exportRows = filteredActiveList.map((item, idx) => ({
      "Seq #": idx + 1,
      "Job Card No": item.jobCardNo,
      "Shipment / Container No": item.shipmentNo,
      "Status": item.statusText,
      "Current Machine": item.machineName,
      "Machine Code": item.machineCode,
      "Series / Step": item.series,
      "Start / Event Time": formatDateTime(item.startTime),
      "Running Duration / Reason": item.durationText,
      "Operator": item.operatorName
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ActiveJobCards");
    XLSX.writeFile(wb, `Active_Running_JobCards_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container-fluid py-3 px-3">
      {/* 1. Page Header Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div className="d-flex align-items-center gap-3">
          <Button 
            variant="outline-secondary" 
            size="sm" 
            className="d-flex align-items-center gap-1"
            onClick={() => navigate(-1)}
            title="Go back"
          >
            <FaArrowLeft size={12} /> Back
          </Button>
          <div>
            <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <FaIndustry className="text-info" />
              <span>ACTIVE JOB CARDS MONITOR</span>
              {isLiveSyncing ? (
                <Badge bg="info" className="fs-11 fw-normal d-flex align-items-center gap-1">
                  <Spinner animation="border" size="sm" style={{ width: "0.7rem", height: "0.7rem" }} /> Live Syncing
                </Badge>
              ) : (
                <Badge bg="success" className="fs-11 fw-normal d-flex align-items-center gap-1">
                  <span className="p-1 bg-white rounded-circle"></span> Live Tracking
                </Badge>
              )}
            </h4>
            <div className="text-muted small" style={{ fontSize: "0.8rem" }}>
              Real-time production floor view of all in-progress, running, paused, and transitioning job cards.
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            className="d-flex align-items-center gap-1"
            onClick={() => fetchReportData(false)}
            disabled={loading}
          >
            <FaSync size={11} className={loading ? "fa-spin" : ""} /> Refresh
          </Button>
          <Button
            variant="outline-success"
            size="sm"
            className="d-flex align-items-center gap-1"
            onClick={exportToExcel}
          >
            <FaFileExcel size={12} /> Excel
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            className="d-flex align-items-center gap-1"
            onClick={handlePrint}
          >
            <FaPrint size={12} /> Print
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <Row className="g-3 mb-3">
        <Col xl={3} md={6}>
          <Card 
            className={`shadow-sm border-0 border-start border-4 border-info h-100 ${activeTab === "ALL_ACTIVE" ? "bg-light" : ""}`}
            style={{ cursor: "pointer", transition: "0.2s" }}
            onClick={() => setActiveTab("ALL_ACTIVE")}
          >
            <Card.Body className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-xs text-uppercase fw-bold text-info d-block mb-1">Total In-Process</span>
                <h3 className="mb-0 fw-bold text-dark">{activeJobCardsList.length}</h3>
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>Running + Paused cards</span>
              </div>
              <div className="p-3 rounded-circle" style={{ background: "rgba(13, 202, 240, 0.15)" }}>
                <FaIndustry className="text-info fs-4" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card 
            className={`shadow-sm border-0 border-start border-4 border-success h-100 ${activeTab === "RUNNING" ? "bg-light" : ""}`}
            style={{ cursor: "pointer", transition: "0.2s" }}
            onClick={() => setActiveTab("RUNNING")}
          >
            <Card.Body className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-xs text-uppercase fw-bold text-success d-block mb-1">Actively Running</span>
                <h3 className="mb-0 fw-bold text-success">{runningMachines.length}</h3>
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>Machines machining now</span>
              </div>
              <div className="p-3 rounded-circle" style={{ background: "rgba(28, 200, 138, 0.15)" }}>
                <FaPlay className="text-success fs-4" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card 
            className={`shadow-sm border-0 border-start border-4 border-warning h-100 ${activeTab === "PAUSED" ? "bg-light" : ""}`}
            style={{ cursor: "pointer", transition: "0.2s" }}
            onClick={() => setActiveTab("PAUSED")}
          >
            <Card.Body className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-xs text-uppercase fw-bold text-warning d-block mb-1">Paused / On-Hold</span>
                <h3 className="mb-0 fw-bold text-warning">{pausedMachines.length}</h3>
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>Shift off, breaks, or hold</span>
              </div>
              <div className="p-3 rounded-circle" style={{ background: "rgba(246, 194, 62, 0.15)" }}>
                <FaPauseCircle className="text-warning fs-4" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} md={6}>
          <Card 
            className={`shadow-sm border-0 border-start border-4 border-danger h-100 ${activeTab === "DELAYED" ? "bg-light" : ""}`}
            style={{ cursor: "pointer", transition: "0.2s" }}
            onClick={() => setActiveTab("DELAYED")}
          >
            <Card.Body className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-xs text-uppercase fw-bold text-danger d-block mb-1">Waiting Transition</span>
                <h3 className="mb-0 fw-bold text-danger">{delayedTransitions.length}</h3>
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>Overdue transfer (&gt;{thresholdHours}h)</span>
              </div>
              <div className="p-3 rounded-circle" style={{ background: "rgba(231, 74, 59, 0.15)" }}>
                <FaClock className="text-danger fs-4" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 3. Filter Navigation & Search Bar */}
      <Card className="shadow-sm border-0 mb-3">
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            {/* Tab switchers */}
            <Col lg={6} md={12}>
              <Nav variant="pills" className="gap-1">
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === "ALL_ACTIVE"} 
                    onClick={() => setActiveTab("ALL_ACTIVE")}
                    className="py-1 px-3 small fw-semibold"
                  >
                    All Active ({activeJobCardsList.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === "RUNNING"} 
                    onClick={() => setActiveTab("RUNNING")}
                    className="py-1 px-3 small fw-semibold"
                  >
                    Running ({runningMachines.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === "PAUSED"} 
                    onClick={() => setActiveTab("PAUSED")}
                    className="py-1 px-3 small fw-semibold"
                  >
                    Paused ({pausedMachines.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === "DELAYED"} 
                    onClick={() => setActiveTab("DELAYED")}
                    className="py-1 px-3 small fw-semibold"
                  >
                    Transitions ({delayedTransitions.length})
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>

            {/* Search Input & Machine Filter */}
            <Col lg={4} md={8} sm={12}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch size={12} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search Job Card, Shipment, Machine, Operator..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {searchText && (
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => setSearchText("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </Col>

            {/* Machine Filter Dropdown */}
            {activeTab !== "DELAYED" && (
              <Col lg={2} md={4} sm={12}>
                <Form.Select 
                  size="sm" 
                  value={selectedMachineFilter}
                  onChange={(e) => setSelectedMachineFilter(e.target.value)}
                >
                  <option value="ALL">All Machines</option>
                  {uniqueMachines.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </Form.Select>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* 4. Active Job Cards Data Table */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
          <div className="fw-bold text-dark d-flex align-items-center gap-2">
            <span>
              {activeTab === "DELAYED" ? "Job Cards Waiting for Transition" : "Currently In-Process Job Cards"}
            </span>
            <Badge bg="secondary" pill>
              {activeTab === "DELAYED" ? filteredDelayedList.length : filteredActiveList.length}
            </Badge>
          </div>
          <div className="text-muted small">
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="info" className="mb-2" />
              <div className="text-muted small">Loading live floor job cards...</div>
            </div>
          ) : activeTab === "DELAYED" ? (
            // Delayed Transitions View
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "60px" }} className="text-center">#</th>
                    <th>Shipment No</th>
                    <th>Job Card No</th>
                    <th>Finished At Machine</th>
                    <th>Finished Time</th>
                    <th>Next Expected Machine</th>
                    <th>Idle Lost Time</th>
                    <th className="text-center" style={{ width: "120px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDelayedList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-5">
                        <FaCheckCircle className="text-success mb-2 fs-3 d-block mx-auto" />
                        No delayed transitions found. Production flow is running smoothly!
                      </td>
                    </tr>
                  ) : (
                    filteredDelayedList.map((dt, idx) => (
                      <tr key={dt.id || idx}>
                        <td className="text-center text-muted">{idx + 1}</td>
                        <td>
                          <span className="fw-bold text-dark">{dt.shipmentNo}</span>
                        </td>
                        <td>
                          <Badge 
                            bg="warning" 
                            text="dark" 
                            style={{ cursor: "pointer" }} 
                            onClick={() => handleViewJobCardFlow(dt.jobCardMasterId, dt.jobCardNo)}
                            title="Click to view process flow"
                          >
                            {dt.jobCardNo}
                          </Badge>
                        </td>
                        <td>
                          <div className="fw-bold">{dt.currentMachineName}</div>
                          {dt.currentMachineCode && <div className="text-muted text-xs">{dt.currentMachineCode}</div>}
                        </td>
                        <td>{formatDateTime(dt.finishedAt)}</td>
                        <td>
                          <div className="fw-bold text-primary">{dt.nextMachineName}</div>
                          {dt.nextMachineCode && <div className="text-muted text-xs">{dt.nextMachineCode}</div>}
                        </td>
                        <td>
                          <Badge bg="danger" className="p-2 fs-11">
                            {dt.delayHours.toFixed(1)} hrs
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="py-1 px-2 d-inline-flex align-items-center gap-1"
                            style={{ fontSize: "0.75rem" }}
                            onClick={() => handleViewJobCardFlow(dt.jobCardMasterId, dt.jobCardNo)}
                          >
                            <FaEye size={10} /> Flow
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          ) : (
            // Active Running & Paused View
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "60px" }} className="text-center">#</th>
                    <th>Job Card No</th>
                    <th>Shipment No</th>
                    <th>Assigned Machine</th>
                    <th>Step #</th>
                    <th>Operator</th>
                    <th>Start / Event Time</th>
                    <th>Duration / Notes</th>
                    <th>Status</th>
                    <th className="text-center" style={{ width: "160px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveList.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center text-muted py-5">
                        <FaIndustry className="text-muted mb-2 fs-3 d-block mx-auto" />
                        No active job cards found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredActiveList.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="text-center text-muted">{idx + 1}</td>
                        <td>
                          <Badge 
                            bg="primary" 
                            style={{ cursor: "pointer", fontSize: "0.82rem" }} 
                            className="px-2 py-1"
                            onClick={() => handleViewJobCardFlow(item.jobCardMasterId, item.jobCardNo)}
                            title="Click to view full Job Card process flow"
                          >
                            <FaRoute size={10} className="me-1" />
                            {item.jobCardNo}
                          </Badge>
                        </td>
                        <td>
                          <span className="fw-semibold text-dark">
                            <FaShippingFast className="me-1 text-muted" size={12} />
                            {item.shipmentNo}
                          </span>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{item.machineName}</div>
                          {item.machineCode && <div className="text-muted text-xs">{item.machineCode}</div>}
                        </td>
                        <td>
                          <Badge bg="light" text="dark" className="border">
                            Step {item.series}
                          </Badge>
                        </td>
                        <td>
                          <span className={item.operatorName === "N/A" ? "text-muted" : "fw-semibold"}>
                            {item.operatorName}
                          </span>
                        </td>
                        <td>{formatDateTime(item.startTime)}</td>
                        <td>
                          {item.type === "RUNNING" ? (
                            <span className={item.statusText === "OVERDUE RUN" ? "text-danger fw-bold" : "text-success fw-bold"}>
                              <FaClock className="me-1" size={10} />
                              {item.durationText}
                            </span>
                          ) : (
                            <span className="text-danger fw-semibold">
                              {item.durationText}
                            </span>
                          )}
                        </td>
                        <td>
                          <Badge bg={item.statusBadgeBg} className="px-2 py-1 text-uppercase">
                            {item.statusText}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center align-items-center gap-1">
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="py-1 px-2 d-inline-flex align-items-center gap-1"
                              style={{ fontSize: "0.75rem" }}
                              onClick={() => handleViewJobCardFlow(item.jobCardMasterId, item.jobCardNo)}
                              title="View Complete Process Flow"
                            >
                              <FaEye size={10} /> Flow
                            </Button>

                            {/* Admin actions: Stop machine if running, Resume if paused */}
                            {isAdmin && item.type === "RUNNING" && (
                              <Button
                                variant="danger"
                                size="sm"
                                className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: "0.75rem" }}
                                disabled={stoppingJobCardLineId === item.jobCardLineId}
                                onClick={() => handleStopMachine(item.raw)}
                                title={`Stop machine: ${item.machineName}`}
                              >
                                {stoppingJobCardLineId === item.jobCardLineId ? (
                                  <Spinner animation="border" size="sm" style={{ width: "0.7rem", height: "0.7rem" }} />
                                ) : (
                                  <FaStop size={9} />
                                )}
                                Stop
                              </Button>
                            )}

                            {isAdmin && item.type === "PAUSED" && (
                              <Button
                                variant="success"
                                size="sm"
                                className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: "0.75rem" }}
                                disabled={resumingJobCardId === item.jobCardMasterId}
                                onClick={() => handleResumeMachine(item.raw)}
                                title={`Resume machine: ${item.machineName}`}
                              >
                                {resumingJobCardId === item.jobCardMasterId ? (
                                  <Spinner animation="border" size="sm" style={{ width: "0.7rem", height: "0.7rem" }} />
                                ) : (
                                  <FaPlay size={8} />
                                )}
                                Resume
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* 5. Process Flow Timeline Drill-down Modal */}
      <Modal show={showFlowModal} onHide={() => setShowFlowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="text-white fw-bold h6 mb-0">
            <FaRoute className="me-2 text-white" />
            Job Card Process Flow: {selectedJobCardNo}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3" style={{ minHeight: "220px", maxHeight: "65vh", overflowY: "auto" }}>
          {loadingFlow ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (Array.isArray(jobCardFlow) ? jobCardFlow : (jobCardFlow?.dataList || jobCardFlow?.DataList || [])).length > 0 ? (
            (() => {
              const flowList = Array.isArray(jobCardFlow) ? jobCardFlow : (jobCardFlow?.dataList || jobCardFlow?.DataList || []);
              return (
                <div className="table-responsive">
                  <Table bordered hover className="align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "60px" }} className="text-center">Seq #</th>
                        <th>Machine Name & Code</th>
                        <th>Status</th>
                        <th>Timestamps</th>
                        <th>Operator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flowList.map((step, idx) => {
                        const hasStarted = !!step.StartTime;
                        const hasEnded = !!step.EndTime;
                        const isBypassed = !!(step.IsBypassed === 1 || step.IsBypassed === true || (step.UserName && String(step.UserName).includes("BYPASS")));
                        const isPaused = !!(step.IsPaused === 1 || step.IsPaused === true || step.IsPaused === "1");

                        let badgeBg = "secondary";
                        let statusText = "NOT STARTED";
                        if (isBypassed) {
                          badgeBg = "info";
                          statusText = "BYPASSED";
                        } else if (isPaused) {
                          badgeBg = "warning";
                          statusText = "PAUSED";
                        } else if (hasStarted && !hasEnded) {
                          badgeBg = "primary";
                          statusText = "IN PROGRESS";
                        } else if (hasStarted && hasEnded) {
                          badgeBg = "success";
                          statusText = "COMPLETED";
                        }

                        // Transit delay from previous step
                        let transitDelayRow = null;
                        if (idx > 0) {
                          const prevStep = flowList[idx - 1];
                          const prevBypassed = !!(prevStep.IsBypassed === 1 || prevStep.IsBypassed === true);
                          if (prevStep.EndTime && !prevBypassed && !isBypassed) {
                            const currentEnd = new Date(prevStep.EndTime.replace(" ", "T"));
                            const nextStart = step.StartTime ? new Date(step.StartTime.replace(" ", "T")) : new Date();
                            const diffHours = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 3600);

                            if (diffHours >= parseFloat(thresholdHours)) {
                              transitDelayRow = (
                                <tr key={`delay-${idx}`} className="table-danger">
                                  <td colSpan="5" className="text-center py-1 text-danger font-w500 text-xs">
                                    <FaExclamationTriangle className="me-1" />
                                    TRANSIT IDLE DELAY: {diffHours.toFixed(1)} hrs between {prevStep.MachineName} and {step.MachineName}
                                  </td>
                                </tr>
                              );
                            }
                          }
                        }

                        return (
                          <React.Fragment key={step.JobCardLineId || idx}>
                            {transitDelayRow}
                            <tr className={statusText === "IN PROGRESS" ? "table-warning-light" : ""}>
                              <td className="text-center fw-bold">{step.Series || idx + 1}</td>
                              <td>
                                <div className="fw-bold">{step.MachineName}</div>
                                <div className="text-xs text-muted">{step.MachineCode}</div>
                              </td>
                              <td>
                                <Badge bg={badgeBg} className="p-2 fs-11 text-uppercase">
                                  {statusText}
                                </Badge>
                              </td>
                              <td>
                                <div className="text-xs">
                                  {hasStarted ? (
                                    <div><strong className="text-success">Start:</strong> {formatDateTime(step.StartTime)}</div>
                                  ) : (
                                    <div className="text-muted">Not Started Yet</div>
                                  )}
                                  {hasEnded && (
                                    <div className="mt-1"><strong className="text-danger">End:</strong> {formatDateTime(step.EndTime)}</div>
                                  )}
                                  {Number(step.TotalPauseTime) > 0 && (
                                    <div className="text-muted mt-1">
                                      <strong>Pause:</strong> {Math.floor(Number(step.TotalPauseTime) / 60)}h {Math.round(Number(step.TotalPauseTime) % 60)}m
                                    </div>
                                  )}
                                  {Number(step.TotalTimeTaken) > 0 && (
                                    <div className="text-success mt-1">
                                      <strong>Net Runtime:</strong> {Math.floor(Number(step.TotalTimeTaken) / 60)}h {Math.round(Number(step.TotalTimeTaken) % 60)}m
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>{step.OperatorName || <span className="text-muted">N/A</span>}</td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              );
            })()
          ) : (
            <p className="text-center text-muted py-4 mb-0">No process steps found for this Job Card.</p>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFlowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ActiveJobCardsReport;

