import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Row, Col, Button, Spinner, Modal, Table, Badge, Card } from "react-bootstrap";
import { useDispatch } from "react-redux";
import axios from "axios";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { ResponsiveGridLayout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./DynamicDashboard.css";

import { API_WEB_URLS } from "../../../constants/constAPI";
import { Fn_FillListData, Fn_AddEditData } from "../../../store/Functions";
import { WIDGET_REGISTRY } from "./WidgetRegistry";
import WidgetWrapper from "./WidgetWrapper";
import CustomizeDashboardDrawer from "./modals/CustomizeDashboardDrawer";
import ShortcutSelectorModal from "./modals/ShortcutSelectorModal";
import ResetConfirmModal from "./modals/ResetConfirmModal";

import {
  FaSlidersH,
  FaBookmark,
  FaUndo,
  FaSave,
  FaLock,
  FaLockOpen,
  FaSync,
  FaExclamationTriangle,
  FaCircle,
  FaCheckCircle,
  FaEye,
  FaStop,
  FaPlay,
  FaRoute,
  FaSearch,
  FaClock
} from "react-icons/fa";

// Default fallback layout if database has no record and connection is offline
const DEFAULT_FALLBACK_WIDGETS = [
  { i: "shortcut_bar_1", type: "SHORTCUT_BAR", x: 0, y: 0, w: 12, h: 2, isVisible: true, static: true },
  { i: "kpi_machines_1", type: "KPI_MACHINES", x: 0, y: 2, w: 4, h: 3, isVisible: true, minW: 3, minH: 2 },
  { i: "kpi_delays_1", type: "KPI_DELAYS", x: 4, y: 2, w: 4, h: 3, isVisible: true, minW: 3, minH: 2 },
  { i: "kpi_jobcards_1", type: "KPI_JOBCARDS", x: 8, y: 2, w: 4, h: 3, isVisible: true, minW: 3, minH: 2 },
  { i: "chart_delay_1", type: "CHART_DELAY_DOUGHNUT", x: 0, y: 5, w: 6, h: 6, isVisible: true, minW: 4, minH: 4 },
  { i: "table_pauses_1", type: "TABLE_PAUSED_MACHINES", x: 6, y: 5, w: 6, h: 6, isVisible: true, minW: 6, minH: 4 }
];

const DEFAULT_FALLBACK_SHORTCUTS = [
  { id: "JobCardForm", title: "JOB CARD", route: "JobCardForm", icon: "FaFileAlt", color: "#4e73df" },
  { id: "QRScanner", title: "QR SCANNER", route: "QRScanner", icon: "FaQrcode", color: "#1cc88a" },
  { id: "WoodIssueScanner", title: "WOOD SCANNER", route: "WoodIssueScanner", icon: "FaQrcode", color: "#e74a3b" },
  { id: "AddWoodIssue", title: "WOOD ISSUE", route: "AddWoodIssue", icon: "FaBoxes", color: "#f6c23e" },
  { id: "MachineMaster", title: "MACHINE MASTER", route: "MachineMaster", icon: "FaCogs", color: "#36b9cc" }
];

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return "";
  try {
    const formattedStr = String(dateTimeStr).includes("T") ? dateTimeStr : String(dateTimeStr).replace(" ", "T");
    const d = new Date(formattedStr);
    if (isNaN(d.getTime())) return dateTimeStr;

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  } catch {
    return dateTimeStr;
  }
};

const getInitialWidth = () => {
  if (typeof window !== "undefined") {
    const sidebarWidth = window.innerWidth > 768 ? 120 : 20;
    return Math.max(window.innerWidth - sidebarWidth, 1200);
  }
  return 1200;
};

const DynamicDashboard = () => {
  const dispatch = useDispatch();
  const [measuredWidth, setMeasuredWidth] = useState(getInitialWidth);
  const containerNodeRef = React.useRef(null);
  const resizeObserverRef = React.useRef(null);

  const containerCallbackRef = useCallback((node) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    containerNodeRef.current = node;

    if (node) {
      const update = () => {
        const w = node.getBoundingClientRect().width || node.offsetWidth;
        if (w > 0) {
          setMeasuredWidth(Math.floor(w));
        }
      };

      update();
      requestAnimationFrame(update);
      setTimeout(update, 50);
      setTimeout(update, 200);

      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          update();
        });
        ro.observe(node);
        resizeObserverRef.current = ro;
      }
    }
  }, []);

  useEffect(() => {
    const onWindowResize = () => {
      if (containerNodeRef.current) {
        const w = containerNodeRef.current.getBoundingClientRect().width || containerNodeRef.current.offsetWidth;
        if (w > 0) {
          setMeasuredWidth(Math.floor(w));
          return;
        }
      }
      setMeasuredWidth(getInitialWidth());
    };

    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // User session
  const userData = useMemo(() => JSON.parse(localStorage.getItem("authUser")) || {}, []);
  const userId = userData.id || userData.UserId || 1;
  const roleId = userData.roleId || userData.F_UserRole || 1;
  const userToken = "token";

  // Cache helpers
  const getCachedShortcuts = () => {
    try {
      const c = localStorage.getItem("dashboard_shortcuts_cache");
      if (c) {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_FALLBACK_SHORTCUTS;
  };

  const getCachedWidgets = () => {
    try {
      const c = localStorage.getItem("dashboard_layout_cache");
      if (c) {
        const parsed = JSON.parse(c);
        if (parsed.widgets && Array.isArray(parsed.widgets) && parsed.widgets.length > 0) {
          return parsed.widgets;
        }
      }
    } catch {}
    return DEFAULT_FALLBACK_WIDGETS;
  };

  const getCachedData = () => {
    try {
      const c = localStorage.getItem("dashboard_floor_data_cache");
      if (c) {
        const parsed = JSON.parse(c);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
    return { runningMachines: [], delayedTransitions: [], pausedMachines: [], chartStats: [], machineCounts: {} };
  };

  // Dashboard configuration state
  const [widgets, setWidgets] = useState(getCachedWidgets);
  const [shortcuts, setShortcuts] = useState(getCachedShortcuts);
  const [isCustomized, setIsCustomized] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Modals state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Operational Data state
  const [data, setData] = useState(getCachedData);
  const [hasData, setHasData] = useState(() => {
    try {
      return !!localStorage.getItem("dashboard_floor_data_cache");
    } catch {
      return false;
    }
  });
  const [allMachines, setAllMachines] = useState([]);
  const [loading, setLoading] = useState(() => !localStorage.getItem("dashboard_floor_data_cache"));
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [error, setError] = useState(null);

  // KPI detail modal state
  const [detailModalType, setDetailModalType] = useState(null);
  const [modalSearchText, setModalSearchText] = useState("");

  // Admin role validation (Only Admin can trigger floor Machine Start/Stop actions)
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

  // Start / Stop machine operation state
  const [stoppingMachineId, setStoppingMachineId] = useState(null);
  const [startingMachineId, setStartingMachineId] = useState(null);

  // Job Card Flow modal state
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [selectedJobCardId, setSelectedJobCardId] = useState(null);
  const [selectedJobCardNo, setSelectedJobCardNo] = useState("");
  const [jobCardFlow, setJobCardFlow] = useState([]);
  const [loadingFlow, setLoadingFlow] = useState(false);

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

  // Fetch Job Card Process Flow details
  const fetchJobCardFlowData = useCallback(async (jobCardId) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_WEB_URLS.BASE}MachineDelayDashboard/JobCardFlow/${userId}/token/${jobCardId}`,
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
        setJobCardFlow(list);
      }
    } catch (err) {
      console.error("Flow refresh error:", err);
    }
  }, [userId, getAuthHeaders]);

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
          `${API_WEB_URLS.BASE}MachineDelayDashboard/JobCardFlow/${userId}/token/${jobCardId}`,
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
        console.warn("Direct axios flow fetch failed in DynamicDashboard, attempting Fn_FillListData:", axiosErr);
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
          console.error("Redux flow fetch also failed:", reduxErr);
        }
      }
    } catch (err) {
      console.error("Error fetching job card flow:", err);
      setJobCardFlow([]);
    } finally {
      setLoadingFlow(false);
    }
  };

  // Stop machine directly from dashboard (Admin Only)
  const handleStopMachine = async (m) => {
    if (!m || stoppingMachineId) return;

    const currentLineId = m.JobCardLineId || m.jobCardLineId;
    const currentMasterId = m.JobCardMasterId || m.jobCardMasterId;
    const currentMachineId = m.MachineMasterId || m.machineMasterId;
    const currentMachineName = m.MachineName || m.machineName;
    const currentJobCardNo = m.JobCardNo || m.jobCardNo;

    const confirmStop = window.confirm(
      `Are you sure you want to STOP machine "${currentMachineName}" (Job Card: ${currentJobCardNo})?`
    );
    if (!confirmStop) return;

    setStoppingMachineId(currentLineId);

    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const vFormData = new FormData();
      vFormData.append("F_JobCardMaster", currentMasterId || "");
      vFormData.append("F_MachineMaster", currentMachineId || "");
      vFormData.append("NewDate", nowStr);
      vFormData.append("Type", "2");

      const postData = {
        arguList: {
          id: 0,
          formData: vFormData
        }
      };

      await Fn_AddEditData(
        dispatch,
        () => {},
        postData,
        "UpdateTransferDateByJobCard/0/token",
        true
      );

      alert(`Machine "${currentMachineName}" stopped successfully!`);
      fetchDashboardData(true);
      if (currentMasterId) {
        fetchJobCardFlowData(currentMasterId);
      }
    } catch (err) {
      console.error("Error stopping machine from dashboard:", err);
      alert(err?.message || "Failed to stop machine. Please try again.");
    } finally {
      setStoppingMachineId(null);
    }
  };

  // Start machine directly from dashboard (Admin Only)
  const handleStartMachine = async ({ jobCardMasterId, machineMasterId, machineName, jobCardNo, jobCardLineId }) => {
    if (!machineMasterId) {
      alert(`Error: Machine ID is missing for "${machineName}".`);
      return;
    }
    const confirmStart = window.confirm(
      `Are you sure you want to START machine "${machineName}" on Job Card: ${jobCardNo}?`
    );
    if (!confirmStart) return;

    setStartingMachineId(jobCardLineId);
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const vFormData = new FormData();
      vFormData.append("F_JobCardMaster", jobCardMasterId || "");
      vFormData.append("F_MachineMaster", machineMasterId || "");
      vFormData.append("NewDate", nowStr);
      vFormData.append("Type", "1");

      const postData = {
        arguList: {
          id: 0,
          formData: vFormData
        }
      };

      await Fn_AddEditData(
        dispatch,
        () => {},
        postData,
        "UpdateTransferDateByJobCard/0/token",
        true
      );

      alert(`Machine "${machineName}" started successfully!`);
      fetchDashboardData(true);
      if (jobCardMasterId) {
        fetchJobCardFlowData(jobCardMasterId);
      }
    } catch (err) {
      console.error("Error starting machine from dashboard:", err);
      alert(err?.message || "Failed to start machine. Please try again.");
    } finally {
      setStartingMachineId(null);
    }
  };

  // Base API url for direct axios calls
  const baseUrl = API_WEB_URLS.BASE.endsWith("/") ? API_WEB_URLS.BASE : `${API_WEB_URLS.BASE}/`;

  // 1. Fetch Dashboard Configuration from Database
  const fetchDashboardConfig = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const url = `${baseUrl}${API_WEB_URLS.USER_DASHBOARD_GET}?userId=${userId}&roleId=${roleId}`;
      const res = await axios.get(url, { headers });

      if (res.data && res.data.statusCode === 200) {
        setIsCustomized(res.data.isCustomized === 1);

        if (res.data.layoutJson) {
          try {
            const parsed = JSON.parse(res.data.layoutJson);
            if (parsed.widgets && Array.isArray(parsed.widgets) && parsed.widgets.length > 0) {
              setWidgets(parsed.widgets);
              try {
                localStorage.setItem("dashboard_layout_cache", JSON.stringify(parsed));
              } catch (e) {}
            }
          } catch (e) {
            console.error("Error parsing layoutJson:", e);
          }
        }

        if (res.data.shortcutsJson) {
          try {
            const parsedShortcuts = JSON.parse(res.data.shortcutsJson);
            if (Array.isArray(parsedShortcuts) && parsedShortcuts.length > 0) {
              setShortcuts(parsedShortcuts);
              try {
                localStorage.setItem("dashboard_shortcuts_cache", JSON.stringify(parsedShortcuts));
              } catch {}
            }
          } catch (e) {
            console.error("Error parsing shortcutsJson:", e);
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch user dashboard config from server, using cached/defaults:", err);
    }
  }, [baseUrl, userId, roleId, getAuthHeaders]);

  // 2. Fetch Operational Floor Data (Machines, Delays, Pauses)
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setError(null);
    } else {
      setIsLiveSyncing(true);
    }

    try {
      const dataList = await Fn_FillListData(
        dispatch,
        (fetchedData) => {
          setData(fetchedData);
          setHasData(true);
          try {
            localStorage.setItem("dashboard_floor_data_cache", JSON.stringify(fetchedData));
          } catch {}
        },
        "gridData",
        `MachineDelayDashboard/${userId}/${userToken}`
      );
      if (dataList?.data) {
        setHasData(true);
        try {
          localStorage.setItem("dashboard_floor_data_cache", JSON.stringify(dataList.data));
        } catch {}
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (!isSilent) setError(err.message || "An error occurred.");
    } finally {
      if (!isSilent) setLoading(false);
      setIsLiveSyncing(false);
    }
  }, [dispatch, userId, userToken]);

  const fetchAllMachines = useCallback(async () => {
    try {
      await Fn_FillListData(
        dispatch,
        (res) => {
          const list = Array.isArray(res) ? res : (res?.dataList || res?.DataList || []);
          setAllMachines(list);
        },
        "gridData",
        `${API_WEB_URLS.MASTER}/0/token/MachineMaster/Id/0`
      );
    } catch (err) {
      console.error("Error fetching machine list:", err);
    }
  }, [dispatch]);

  // Load configuration and data on initial render
  useEffect(() => {
    fetchDashboardConfig();
    fetchDashboardData(false);
    fetchAllMachines();
  }, [fetchDashboardConfig, fetchDashboardData, fetchAllMachines]);

  // Real-time updates via SignalR
  useEffect(() => {
    const hubUrl = API_WEB_URLS.BASE.replace("/api/V1/", "/qrScannerHub").replace("/api/V1", "/qrScannerHub");
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    const startConnection = async () => {
      try {
        await connection.start();
        connection.on("ReceiveDelayAlert", () => fetchDashboardData(true));
        connection.on("ReceiveMachinePaused", () => fetchDashboardData(true));
        connection.on("ReceiveMachineResumed", () => fetchDashboardData(true));
        connection.on("ReceiveJobCardUpdate", () => fetchDashboardData(true));
      } catch (err) {
        console.warn("SignalR connection warning:", err);
      }
    };

    startConnection();
    return () => {
      if (connection) connection.stop();
    };
  }, [fetchDashboardData]);

  // 3. Save Layout & Config to Database
  const handleSaveConfig = async () => {
    setSaveLoading(true);
    try {
      const payload = {
        UserId: Number(userId),
        LayoutJson: JSON.stringify({ version: 1, widgets }),
        ShortcutsJson: JSON.stringify(shortcuts),
        WidgetSettingsJson: "{}"
      };

      // Save locally first for instant persistence
      try {
        localStorage.setItem("dashboard_layout_cache", JSON.stringify({ version: 1, widgets }));
        localStorage.setItem("dashboard_shortcuts_cache", JSON.stringify(shortcuts));
      } catch (e) {}

      const headers = getAuthHeaders();
      const url = `${baseUrl}${API_WEB_URLS.USER_DASHBOARD_SAVE}`;
      await axios.post(url, payload, { headers });

      setHasUnsavedChanges(false);
      setIsCustomized(true);
      setIsEditMode(false);
      alert("Dashboard layout and preferences saved successfully!");
    } catch (err) {
      console.error("Error saving dashboard layout:", err);
      alert(err?.response?.data?.message || err?.message || "Failed to save dashboard layout.");
    } finally {
      setSaveLoading(false);
    }
  };

  // 4. Reset Layout to Role Default Template
  const handleConfirmReset = async () => {
    setResetLoading(true);
    try {
      const payload = {
        UserId: Number(userId),
        RoleId: Number(roleId)
      };

      const headers = getAuthHeaders();
      const url = `${baseUrl}${API_WEB_URLS.USER_DASHBOARD_RESET}`;
      const res = await axios.post(url, payload, { headers });

      if (res.data && res.data.statusCode === 200) {
        if (res.data.layoutJson) {
          const parsed = JSON.parse(res.data.layoutJson);
          if (parsed.widgets) {
            setWidgets(parsed.widgets);
            try {
              localStorage.setItem("dashboard_layout_cache", JSON.stringify(parsed));
            } catch (e) {}
          }
        }
        if (res.data.shortcutsJson) {
          const parsedShortcuts = JSON.parse(res.data.shortcutsJson);
          if (Array.isArray(parsedShortcuts)) {
            setShortcuts(parsedShortcuts);
            try {
              localStorage.setItem("dashboard_shortcuts_cache", JSON.stringify(parsedShortcuts));
            } catch (e) {}
          }
        }

        setIsCustomized(false);
        setHasUnsavedChanges(false);
        setIsEditMode(false);
        setShowResetModal(false);
        alert("Dashboard has been restored to default template!");
      }
    } catch (err) {
      console.error("Error resetting dashboard:", err);
      alert(err?.message || "Failed to reset dashboard.");
    } finally {
      setResetLoading(false);
    }
  };

  // Layout drag/resize change handler
  const handleLayoutChange = useCallback((currentLayout) => {
    if (!isEditMode) return;

    setWidgets((prevWidgets) => {
      let changed = false;
      const updated = prevWidgets.map((w) => {
        const match = currentLayout.find((item) => item.i === w.i);
        if (match && (w.x !== match.x || w.y !== match.y || w.w !== match.w || w.h !== match.h)) {
          changed = true;
          return { ...w, x: match.x, y: match.y, w: match.w, h: match.h };
        }
        return w;
      });

      if (changed) setHasUnsavedChanges(true);
      return changed ? updated : prevWidgets;
    });
  }, [isEditMode]);

  // Toggle widget visibility (Show / Hide)
  const handleToggleVisibility = (widgetInstanceId) => {
    setWidgets((prev) =>
      prev.map((w) => (w.i === widgetInstanceId ? { ...w, isVisible: !w.isVisible } : w))
    );
    setHasUnsavedChanges(true);
  };

  // Add a widget that is not yet installed
  const handleAddWidget = (widgetType) => {
    const registryItem = WIDGET_REGISTRY[widgetType];
    if (!registryItem) return;

    const newInstanceId = `${widgetType.toLowerCase()}_${Date.now()}`;
    const defSize = registryItem.defaultSize || { w: 6, h: 4, minW: 3, minH: 2 };

    const newWidget = {
      i: newInstanceId,
      type: widgetType,
      x: 0,
      y: Infinity, // place at the bottom
      w: defSize.w,
      h: defSize.h,
      minW: defSize.minW,
      minH: defSize.minH,
      isVisible: true
    };

    setWidgets((prev) => [...prev, newWidget]);
    setHasUnsavedChanges(true);
  };

  // Remove widget from dashboard
  const handleRemoveWidget = (widgetInstanceId) => {
    setWidgets((prev) => prev.filter((w) => w.i !== widgetInstanceId));
    setHasUnsavedChanges(true);
  };

  // Shortcuts manipulation (Auto-persisted to both localStorage and database)
  const handleSaveShortcuts = async (updatedShortcuts) => {
    setShortcuts(updatedShortcuts);

    // 1. Immediately persist to localStorage so page refresh never loses them
    try {
      localStorage.setItem("dashboard_shortcuts_cache", JSON.stringify(updatedShortcuts));
    } catch (e) {}

    // 2. Persist to server database
    try {
      const headers = getAuthHeaders();
      const payload = {
        UserId: Number(userId),
        LayoutJson: JSON.stringify({ version: 1, widgets }),
        ShortcutsJson: JSON.stringify(updatedShortcuts),
        WidgetSettingsJson: "{}"
      };
      const url = `${baseUrl}${API_WEB_URLS.USER_DASHBOARD_SAVE}`;
      await axios.post(url, payload, { headers });
      setIsCustomized(true);
    } catch (err) {
      console.warn("Background auto-save of shortcuts to server failed, kept in local storage:", err);
    }
  };

  const handleRemoveShortcut = async (shortcutId) => {
    const updated = shortcuts.filter((s) => (s.id || s.route) !== shortcutId);
    setShortcuts(updated);

    // 1. Immediately persist to localStorage
    try {
      localStorage.setItem("dashboard_shortcuts_cache", JSON.stringify(updated));
    } catch (e) {}

    // 2. Persist to server database
    try {
      const headers = getAuthHeaders();
      const payload = {
        UserId: Number(userId),
        LayoutJson: JSON.stringify({ version: 1, widgets }),
        ShortcutsJson: JSON.stringify(updated),
        WidgetSettingsJson: "{}"
      };
      const url = `${baseUrl}${API_WEB_URLS.USER_DASHBOARD_SAVE}`;
      await axios.post(url, payload, { headers });
    } catch (err) {
      console.warn("Background auto-save of removed shortcut to server failed:", err);
    }
  };

  // Operational metrics aggregation
  const runningMachines = data?.runningMachines || data?.RunningMachines || [];
  const delayedTransitions = data?.delayedTransitions || data?.DelayedTransitions || [];
  const pausedMachines = data?.pausedMachines || data?.PausedMachines || [];
  const machineLogs = data?.machineLogs || data?.MachineLogs || [];

  const counts = useMemo(() => {
    const countsObj = data?.machineCounts || data?.MachineCounts || {};
    const total = countsObj.total || countsObj.Total || (allMachines.length > 0 ? allMachines.length : machineLogs.length) || (runningMachines.length + pausedMachines.length);
    const running = countsObj.running ?? countsObj.Running ?? runningMachines.length;
    const paused = countsObj.paused ?? countsObj.Paused ?? pausedMachines.length;
    const idle = Math.max(0, total - (running + paused));
    const runningJobCards = countsObj.runningJobCards ?? countsObj.RunningJobCards ?? runningMachines.length;
    return { total, running, paused, idle, runningJobCards };
  }, [data, allMachines, machineLogs, runningMachines, pausedMachines]);

  // Unified fleet list for Detail Modals (Total Fleet, Idle Machines, Running, Paused)
  const fleetMachines = useMemo(() => {
    if (machineLogs && machineLogs.length > 0) {
      return machineLogs.map((m, idx) => {
        const id = m.MachineId || m.machineId || m.ID || m.Id || idx;
        const name = m.MachineName || m.machineName || m.Name || "Unnamed Machine";
        const code = m.MachineCode || m.machineCode || m.Code || "";
        const isActive = m.IsActive !== 0 && m.IsActive !== false && m.isActive !== 0 && m.isActive !== false;

        const isRun = !!(m.RunningJobCardMasterId || m.runningJobCardMasterId || m.RunningJobCardLineId || m.runningJobCardLineId);
        const isPause = !!(m.RunningIsPaused || m.runningIsPaused);

        let status = "IDLE";
        if (isRun && isPause) status = "PAUSED";
        else if (isRun) status = "RUNNING";

        return {
          id,
          name,
          code,
          isActive,
          status,
          runningJobCardMasterId: m.RunningJobCardMasterId || m.runningJobCardMasterId,
          runningJobCardLineId: m.RunningJobCardLineId || m.runningJobCardLineId,
          runningJobCardNo: m.RunningJobCardNo || m.runningJobCardNo,
          runningShipmentNo: m.RunningShipmentNo || m.runningShipmentNo,
          runningStartTime: m.RunningStartTime || m.runningStartTime,
          runningOperator: m.RunningOperatorName || m.runningOperatorName,
          runningHours: m.RunningHours || m.runningHours || 0,
          pauseReason: m.RunningPauseReason || m.runningPauseReason || "Paused",
          lastJobCardMasterId: m.LastJobCardMasterId || m.lastJobCardMasterId,
          lastJobCardNo: m.LastJobCardNo || m.lastJobCardNo,
          lastShipmentNo: m.LastShipmentNo || m.lastShipmentNo,
          lastEndTime: m.LastEndTime || m.lastEndTime,
          lastOperator: m.LastOperatorName || m.lastOperatorName,
          idleHours: m.IdleHours || m.idleHours || 0,
          rawMachine: m
        };
      });
    }

    // Fallback: build from allMachines combined with runningMachines and pausedMachines
    return allMachines.map((am, idx) => {
      const id = am.Id || am.ID || am.MachineMasterId || idx;
      const name = am.Name || am.MachineName || "Machine";
      const code = am.Code || am.MachineCode || "";
      const isActive = am.IsActive !== 0 && am.IsActive !== false;

      const runMatch = runningMachines.find(r =>
        (r.MachineMasterId && String(r.MachineMasterId) === String(id)) ||
        (r.machineMasterId && String(r.machineMasterId) === String(id)) ||
        (r.MachineName && name && r.MachineName.toLowerCase() === name.toLowerCase())
      );

      const pauseMatch = pausedMachines.find(p =>
        (p.MachineMasterId && String(p.MachineMasterId) === String(id)) ||
        (p.F_MachineMaster && String(p.F_MachineMaster) === String(id)) ||
        (p.MachineName && name && p.MachineName.toLowerCase() === name.toLowerCase())
      );

      let status = "IDLE";
      if (pauseMatch) status = "PAUSED";
      else if (runMatch) status = "RUNNING";

      return {
        id,
        name,
        code,
        isActive,
        status,
        runningJobCardMasterId: runMatch?.JobCardMasterId || runMatch?.jobCardMasterId,
        runningJobCardLineId: runMatch?.JobCardLineId || runMatch?.jobCardLineId,
        runningJobCardNo: runMatch?.JobCardNo || runMatch?.jobCardNo,
        runningShipmentNo: runMatch?.ShipmentNo || runMatch?.shipmentNo,
        runningStartTime: runMatch?.StartTime || runMatch?.startTime,
        runningOperator: runMatch?.OperatorName || runMatch?.operatorName,
        runningHours: 0,
        pauseReason: pauseMatch?.Reason || pauseMatch?.CurrentPauseReason || "Paused",
        lastJobCardMasterId: null,
        lastJobCardNo: null,
        lastShipmentNo: null,
        lastEndTime: null,
        lastOperator: null,
        idleHours: 0,
        rawMachine: am
      };
    });
  }, [machineLogs, allMachines, runningMachines, pausedMachines]);

  // Filter only visible widgets for rendering in grid
  const visibleWidgets = useMemo(() => {
    return widgets.filter((w) => w.isVisible !== false);
  }, [widgets]);

  // Prepare layout items for react-grid-layout
  const layoutItems = useMemo(() => {
    return visibleWidgets.map((w) => ({
      i: w.i,
      x: w.x ?? 0,
      y: w.y ?? 0,
      w: w.w ?? 6,
      h: w.h ?? 4,
      minW: w.minW ?? 3,
      minH: w.minH ?? 2,
      static: !isEditMode || !!w.static
    }));
  }, [visibleWidgets, isEditMode]);

  return (
    <div className="dynamic-dashboard-wrapper pb-5">
      {/* 1. Header & Controls Toolbar */}
      <div 
        className="dynamic-card card shadow-sm mb-4 px-4 py-3"
      >
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h4 className="mb-0 fw-bold dynamic-title" style={{ letterSpacing: "-0.5px" }}>
                Operational Production Dashboard
              </h4>
              <Badge 
                bg={isLiveSyncing ? "warning" : "success"} 
                className="d-flex align-items-center gap-1 py-1 px-2 text-uppercase"
                style={{ fontSize: "0.68rem" }}
              >
                <FaCircle size={6} className={isLiveSyncing ? "text-dark" : "text-white"} />
                {isLiveSyncing ? "Syncing..." : "Live Active"}
              </Badge>
              {isCustomized ? (
                <Badge bg="primary-subtle" className="text-primary py-1 px-2" style={{ fontSize: "0.68rem" }}>
                  Customized by You
                </Badge>
              ) : (
                <Badge bg="secondary" className="py-1 px-2 border" style={{ fontSize: "0.68rem" }}>
                  Role Default Template
                </Badge>
              )}
            </div>
            <p className="small mb-0 mt-1 dynamic-muted">
              Real-time machine throughput, job card execution, and custom fleet monitoring.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <Button
              size="sm"
              variant={isEditMode ? "warning" : "outline-primary"}
              className="d-flex align-items-center gap-1 py-2 px-3 fw-semibold shadow-sm"
              style={{ borderRadius: "8px", fontSize: "0.82rem" }}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? <FaLockOpen size={12} /> : <FaLock size={12} />}
              {isEditMode ? "Finish Reordering" : "Customize Layout"}
            </Button>

            <Button
              size="sm"
              variant="outline-secondary"
              className="d-flex align-items-center gap-1 py-2 px-3 fw-semibold"
              style={{ borderRadius: "8px", fontSize: "0.82rem" }}
              onClick={() => setShowCustomizeModal(true)}
            >
              <FaSlidersH size={12} /> Add / Toggle Widgets
            </Button>

            <Button
              size="sm"
              variant="outline-info"
              className="d-flex align-items-center gap-1 py-2 px-3 fw-semibold"
              style={{ borderRadius: "8px", fontSize: "0.82rem" }}
              onClick={() => setShowShortcutModal(true)}
            >
              <FaBookmark size={12} /> Pin Shortcuts
            </Button>

            <Button
              size="sm"
              variant="outline-danger"
              className="d-flex align-items-center gap-1 py-2 px-3 fw-semibold"
              style={{ borderRadius: "8px", fontSize: "0.82rem" }}
              onClick={() => setShowResetModal(true)}
              title="Reset to recommended role template"
            >
              <FaUndo size={12} /> Reset
            </Button>

            {hasUnsavedChanges && (
              <Button
                size="sm"
                variant="success"
                className="d-flex align-items-center gap-1 py-2 px-3 fw-bold shadow"
                style={{ borderRadius: "8px", fontSize: "0.82rem" }}
                onClick={handleSaveConfig}
                disabled={saveLoading}
              >
                {saveLoading ? <Spinner size="sm" animation="border" /> : <FaSave size={12} />}
                Save Layout
              </Button>
            )}

            <Button
              size="sm"
              variant="light"
              className="border p-2"
              style={{ borderRadius: "8px" }}
              onClick={() => fetchDashboardData(false)}
              title="Refresh Dashboard Data"
            >
              <FaSync size={13} className={loading ? "fa-spin text-primary" : "text-muted"} />
            </Button>
          </div>
        </div>

        {isEditMode && (
          <div 
            className="alert alert-warning mb-0 mt-3 py-2 px-3 d-flex align-items-center justify-content-between"
            style={{ borderRadius: "8px", fontSize: "0.82rem" }}
          >
            <div>
              <strong>Editing Mode is Active:</strong> You can drag widgets from their top header to rearrange them, or drag the bottom-right handle to resize.
            </div>
            {hasUnsavedChanges && (
              <Button size="sm" variant="success" onClick={handleSaveConfig} disabled={saveLoading} className="py-1 px-3">
                {saveLoading ? "Saving..." : "Save Now"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 2. Main Responsive Widget Grid */}
      <div ref={containerCallbackRef} className="w-100" style={{ minHeight: "350px" }}>
        {error && !hasData ? (
          <Card className="border-danger shadow-sm">
            <Card.Body className="text-center py-5">
              <FaExclamationTriangle className="text-danger fs-1 mb-3" />
              <h5 className="text-danger fw-bold">Unable to Load Dashboard Data</h5>
              <p className="text-muted">{error}</p>
              <Button variant="outline-danger" size="sm" onClick={() => fetchDashboardData(false)}>
                Retry Connection
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <ResponsiveGridLayout
            width={measuredWidth > 0 ? measuredWidth : getInitialWidth()}
            className="layout"
            layouts={{
              lg: layoutItems,
              md: layoutItems,
              sm: layoutItems,
              xs: layoutItems
            }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 2 }}
            rowHeight={85}
            margin={[12, 12]}
            containerPadding={[0, 0]}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            draggableHandle=".widget-drag-handle"
            onDragStop={handleLayoutChange}
            onResizeStop={handleLayoutChange}
          >
          {visibleWidgets.map((widgetItem) => {
            const regItem = WIDGET_REGISTRY[widgetItem.type];
            if (!regItem) return null;

            const ComponentToRender = regItem.component;

            return (
              <div key={widgetItem.i} data-grid={widgetItem}>
                <WidgetWrapper
                  widgetKey={widgetItem.i}
                  title={regItem.title}
                  isEditMode={isEditMode}
                  onHideWidget={() => handleToggleVisibility(widgetItem.i)}
                  onRemoveWidget={() => handleRemoveWidget(widgetItem.i)}
                >
                  {widgetItem.type === "SHORTCUT_BAR" && (
                    <ComponentToRender
                      shortcuts={shortcuts}
                      onOpenShortcutModal={() => setShowShortcutModal(true)}
                      onRemoveShortcut={handleRemoveShortcut}
                      isEditMode={isEditMode}
                    />
                  )}

                  {widgetItem.type === "KPI_MACHINES" && (
                    <ComponentToRender
                      counts={counts}
                      isLoading={loading && !hasData}
                      onKpiClick={(filterType) => setDetailModalType(filterType)}
                    />
                  )}

                  {widgetItem.type === "KPI_DELAYS" && (
                    <ComponentToRender
                      delayedTransitions={delayedTransitions}
                      thresholdHours={data?.thresholdHours || 4}
                      isLoading={loading && !hasData}
                      onKpiClick={(filterType) => setDetailModalType(filterType)}
                    />
                  )}

                  {widgetItem.type === "KPI_JOBCARDS" && (
                    <ComponentToRender
                      counts={counts}
                      runningMachines={runningMachines}
                      isLoading={loading && !hasData}
                      onKpiClick={(filterType) => setDetailModalType(filterType || "RUNNING")}
                    />
                  )}

                  {widgetItem.type === "CHART_DELAY_DOUGHNUT" && (
                    <ComponentToRender
                      counts={counts}
                      isLoading={loading && !hasData}
                      onSliceClick={(sliceType) => setDetailModalType(sliceType)}
                    />
                  )}

                  {widgetItem.type === "TABLE_PAUSED_MACHINES" && (
                    <ComponentToRender
                      pausedMachines={pausedMachines}
                      isLoading={loading && !hasData}
                      onRefresh={() => fetchDashboardData(true)}
                      formatDateTime={formatDateTime}
                    />
                  )}
                </WidgetWrapper>
              </div>
            );
          })}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* 3. Detail Popup Modal for KPI or Slice clicks */}
      {detailModalType && (
        <Modal show={true} onHide={() => setDetailModalType(null)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title className="h6 fw-bold">
              {detailModalType === "RUNNING" && "Currently Running Machines"}
              {detailModalType === "PAUSED" && "Paused / On-Hold Machines"}
              {detailModalType === "IDLE" && "Idle Machines"}
              {detailModalType === "TOTAL" && "All Machines Fleet Overview"}
              {detailModalType === "DELAYED_COUNT" && "Delayed Machine Transitions"}
              {detailModalType === "TOTAL_DELAY_HOURS" && "Delay & Lost Time Details"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: "65vh", overflowY: "auto" }}>
            <div className="mb-3 d-flex align-items-center gap-2">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch size={12} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by machine, code, job card, or operator..."
                  value={modalSearchText}
                  onChange={(e) => setModalSearchText(e.target.value)}
                />
              </div>
              {modalSearchText && (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="py-1 px-2"
                  onClick={() => setModalSearchText("")}
                >
                  Clear
                </Button>
              )}
            </div>

            {/* A. Running Machines */}
            {detailModalType === "RUNNING" && (() => {
              const q = modalSearchText.toLowerCase().trim();
              const filtered = runningMachines.filter((m) => {
                if (!q) return true;
                const mName = (m.MachineName || m.machineName || "").toLowerCase();
                const mCode = (m.MachineCode || m.machineCode || "").toLowerCase();
                const jc = (String(m.JobCardNo || m.jobCardNo || "")).toLowerCase();
                const op = (m.OperatorName || m.operatorName || "").toLowerCase();
                return mName.includes(q) || mCode.includes(q) || jc.includes(q) || op.includes(q);
              });

              return (
                <Table hover responsive className="align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Machine</th>
                      <th>Code</th>
                      <th>Job Card</th>
                      <th>Start Time</th>
                      <th>Operator</th>
                      {isAdmin && <th className="text-center" style={{ width: "160px" }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={isAdmin ? "6" : "5"} className="text-center text-muted py-4">No running machines match your search</td></tr>
                    ) : (
                      filtered.map((m, i) => {
                        const lineId = m.JobCardLineId || m.jobCardLineId;
                        const masterId = m.JobCardMasterId || m.jobCardMasterId;
                        const jcNo = m.JobCardNo || m.jobCardNo;
                        const mName = m.MachineName || m.machineName;

                        return (
                          <tr key={lineId || i}>
                            <td className="fw-bold">{mName}</td>
                            <td>{m.MachineCode || m.machineCode}</td>
                            <td>
                              <Badge 
                                bg="success" 
                                style={{ cursor: "pointer" }} 
                                onClick={() => handleViewJobCardFlow(masterId, jcNo)}
                                title="Click to view full Job Card process flow"
                              >
                                {jcNo || masterId}
                              </Badge>
                            </td>
                            <td>{formatDateTime(m.StartTime || m.startTime)}</td>
                            <td>{m.OperatorName || m.operatorName || <span className="text-muted">N/A</span>}</td>
                            {isAdmin && (
                              <td className="text-center">
                                <div className="d-flex gap-1 justify-content-center align-items-center">
                                  <Button
                                    variant="outline-info"
                                    size="sm"
                                    className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => handleViewJobCardFlow(masterId, jcNo)}
                                    title="View Process Flow"
                                  >
                                    <FaEye size={10} /> Flow
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => handleStopMachine(m)}
                                    disabled={stoppingMachineId === lineId}
                                    title={`Stop machine: ${mName}`}
                                  >
                                    {stoppingMachineId === lineId ? (
                                      <><Spinner animation="border" size="sm" style={{ width: "0.7rem", height: "0.7rem" }} /> Stopping...</>
                                    ) : (
                                      <><FaStop size={9} /> Stop</>
                                    )}
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              );
            })()}

            {/* B. Paused Machines */}
            {detailModalType === "PAUSED" && (() => {
              const q = modalSearchText.toLowerCase().trim();
              const filtered = pausedMachines.filter((m) => {
                if (!q) return true;
                const mName = (m.MachineName || "").toLowerCase();
                const jc = (String(m.JobCardNo || m.JobCardMasterId || "")).toLowerCase();
                const reason = (m.Reason || m.CurrentPauseReason || "").toLowerCase();
                return mName.includes(q) || jc.includes(q) || reason.includes(q);
              });

              return (
                <Table hover responsive className="align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Machine</th>
                      <th>Job Card</th>
                      <th>Pause Reason</th>
                      <th>Paused At</th>
                      {isAdmin && <th className="text-end" style={{ width: "110px" }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={isAdmin ? "5" : "4"} className="text-center text-muted py-4">No paused machines match your search</td></tr>
                    ) : (
                      filtered.map((m, i) => {
                        const masterId = m.JobCardMasterId || m.F_JobCardMaster || 0;
                        const jcNo = m.JobCardNo || `#${masterId}`;
                        const mName = m.MachineName || "Unknown Machine";

                        return (
                          <tr key={i}>
                            <td className="fw-bold">{mName}</td>
                            <td>
                              <Badge 
                                bg="secondary" 
                                style={{ cursor: "pointer" }} 
                                onClick={() => handleViewJobCardFlow(masterId, jcNo)}
                                title="Click to view process flow"
                              >
                                {jcNo}
                              </Badge>
                            </td>
                            <td className="text-danger fw-semibold">{m.Reason || m.CurrentPauseReason || "Break"}</td>
                            <td>{formatDateTime(m.PauseStartTime || m.CurrentPauseStartTime)}</td>
                            {isAdmin && (
                              <td className="text-end">
                                <Button
                                  size="sm"
                                  variant="success"
                                  className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: "0.75rem", borderRadius: "16px" }}
                                  onClick={async () => {
                                    const confirmResume = window.confirm(`Resume machine "${mName}" on Job Card ${jcNo}?`);
                                    if (!confirmResume) return;
                                    try {
                                      const vFormData = new FormData();
                                      vFormData.append("JobCardMasterId", masterId);
                                      vFormData.append("F_JobCardMaster", masterId);
                                      vFormData.append("MachineMasterId", m.MachineMasterId || m.F_MachineMaster || 0);
                                      vFormData.append("F_MachineMaster", m.MachineMasterId || m.F_MachineMaster || 0);
                                      vFormData.append("UserName", userData.name || userData.UserName || "Admin");

                                      const token = userData?.jwtToken || userData?.token || userData?.UserToken || userData?.UserTokenNew || localStorage.getItem("token") || localStorage.getItem("jwtToken");
                                      const headers = token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {};

                                      const url = `${baseUrl}${API_WEB_URLS.RESUME_MACHINE}/${userId}/${userToken}`;
                                      const res = await axios.post(url, vFormData, { headers });

                                      if (res?.data?.Success || res?.data?.success || res?.status === 200) {
                                        alert(`Machine "${mName}" resumed successfully!`);
                                        fetchDashboardData(true);
                                      } else {
                                        alert(res?.data?.Message || res?.data?.message || "Failed to resume machine.");
                                      }
                                    } catch (err) {
                                      console.error("Resume machine error:", err);
                                      alert(err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Failed to resume machine.");
                                    }
                                  }}
                                >
                                  <FaPlay size={8} /> Resume
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              );
            })()}

            {/* C. Idle Machines */}
            {detailModalType === "IDLE" && (() => {
              const q = modalSearchText.toLowerCase().trim();
              const idleList = fleetMachines.filter(m => m.status === "IDLE");
              const filtered = idleList.filter(m => {
                if (!q) return true;
                const mName = (m.name || "").toLowerCase();
                const mCode = (m.code || "").toLowerCase();
                const lastJc = (String(m.lastJobCardNo || "")).toLowerCase();
                const op = (m.lastOperator || "").toLowerCase();
                return mName.includes(q) || mCode.includes(q) || lastJc.includes(q) || op.includes(q);
              });

              return (
                <Table hover responsive className="align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Machine</th>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Last Job Card</th>
                      <th>Last Completed At</th>
                      <th>Idle Duration</th>
                      <th>Last Operator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan="7" className="text-center text-muted py-4">No idle machines match your search</td></tr>
                    ) : (
                      filtered.map((m, i) => (
                        <tr key={m.id || i}>
                          <td className="fw-bold">{m.name}</td>
                          <td>{m.code || "—"}</td>
                          <td>
                            <Badge bg="secondary" className="px-2 py-1">IDLE</Badge>
                          </td>
                          <td>
                            {m.lastJobCardNo ? (
                              <Badge 
                                bg="light" 
                                text="primary" 
                                className="border"
                                style={{ cursor: "pointer" }}
                                onClick={() => handleViewJobCardFlow(m.lastJobCardMasterId, m.lastJobCardNo)}
                                title="Click to view flow"
                              >
                                {m.lastJobCardNo}
                              </Badge>
                            ) : (
                              <span className="text-muted">None</span>
                            )}
                          </td>
                          <td>{m.lastEndTime ? formatDateTime(m.lastEndTime) : <span className="text-muted">N/A</span>}</td>
                          <td>
                            {m.idleHours > 0 ? (
                              <span className="fw-semibold text-warning">{parseFloat(m.idleHours).toFixed(1)} hrs</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>{m.lastOperator || <span className="text-muted">N/A</span>}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              );
            })()}

            {/* D. Total Fleet Overview */}
            {detailModalType === "TOTAL" && (() => {
              const q = modalSearchText.toLowerCase().trim();
              const filtered = fleetMachines.filter(m => {
                if (!q) return true;
                const mName = (m.name || "").toLowerCase();
                const mCode = (m.code || "").toLowerCase();
                const rJc = (String(m.runningJobCardNo || "")).toLowerCase();
                const lJc = (String(m.lastJobCardNo || "")).toLowerCase();
                const op = (m.runningOperator || m.lastOperator || "").toLowerCase();
                return mName.includes(q) || mCode.includes(q) || rJc.includes(q) || lJc.includes(q) || op.includes(q);
              });

              return (
                <Table hover responsive className="align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Machine</th>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Active / Last Job Card</th>
                      <th>Operator</th>
                      <th>Activity Notes</th>
                      <th className="text-center" style={{ width: "130px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan="7" className="text-center text-muted py-4">No machines match your search</td></tr>
                    ) : (
                      filtered.map((m, i) => {
                        const statusBadgeBg = m.status === "RUNNING" ? "success" : m.status === "PAUSED" ? "danger" : "secondary";
                        const activeJcNo = m.runningJobCardNo || m.lastJobCardNo;
                        const activeJcId = m.runningJobCardMasterId || m.lastJobCardMasterId;

                        return (
                          <tr key={m.id || i}>
                            <td className="fw-bold">{m.name}</td>
                            <td>{m.code || "—"}</td>
                            <td>
                              <Badge bg={statusBadgeBg} className="px-2 py-1">{m.status}</Badge>
                            </td>
                            <td>
                              {activeJcNo ? (
                                <Badge 
                                  bg={m.status === "RUNNING" ? "success" : "light"}
                                  text={m.status === "RUNNING" ? "white" : "dark"}
                                  className={m.status === "RUNNING" ? "" : "border"}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => handleViewJobCardFlow(activeJcId, activeJcNo)}
                                  title="Click to view flow"
                                >
                                  {activeJcNo}
                                </Badge>
                              ) : (
                                <span className="text-muted">None</span>
                              )}
                            </td>
                            <td>{m.runningOperator || m.lastOperator || <span className="text-muted">N/A</span>}</td>
                            <td>
                              {m.status === "RUNNING" && (
                                <span className="text-success small">Started {formatDateTime(m.runningStartTime)}</span>
                              )}
                              {m.status === "PAUSED" && (
                                <span className="text-danger small fw-semibold">{m.pauseReason}</span>
                              )}
                              {m.status === "IDLE" && (
                                <span className="text-muted small">
                                  {m.idleHours > 0 ? `Idle ${parseFloat(m.idleHours).toFixed(1)}h` : "Ready"}
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              {activeJcId ? (
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: "0.75rem" }}
                                  onClick={() => handleViewJobCardFlow(activeJcId, activeJcNo)}
                                  title="View Flow"
                                >
                                  <FaEye size={10} /> Flow
                                </Button>
                              ) : (
                                <span className="text-muted fs-12">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              );
            })()}

            {/* E. Delayed Transitions & Total Lost Time Details */}
            {(detailModalType === "DELAYED_COUNT" || detailModalType === "TOTAL_DELAY_HOURS") && (() => {
              const q = modalSearchText.toLowerCase().trim();
              const filtered = delayedTransitions.filter((t) => {
                if (!q) return true;
                const fromM = (t.CurrentMachineName || "").toLowerCase();
                const toM = (t.NextMachineName || "").toLowerCase();
                const jc = (String(t.JobCardNo || t.JobCardMasterId || "")).toLowerCase();
                const ship = (String(t.ShipmentNo || "")).toLowerCase();
                return fromM.includes(q) || toM.includes(q) || jc.includes(q) || ship.includes(q);
              });

              return (
                <Table hover responsive className="align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Shipment No</th>
                      <th>Job Card</th>
                      <th>From Machine</th>
                      <th>Finished At</th>
                      <th>To Machine</th>
                      <th>Lost Time / Delay</th>
                      <th className="text-center" style={{ width: "110px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan="7" className="text-center text-muted py-4">No delayed transitions match your filters</td></tr>
                    ) : (
                      filtered.map((t, i) => (
                        <tr key={i}>
                          <td>{t.ShipmentNo || <span className="text-muted">N/A</span>}</td>
                          <td>
                            <Badge 
                              bg="warning" 
                              text="dark"
                              style={{ cursor: "pointer" }}
                              onClick={() => handleViewJobCardFlow(t.JobCardMasterId, t.JobCardNo)}
                              title="Click to view flow"
                            >
                              {t.JobCardNo || t.JobCardMasterId}
                            </Badge>
                          </td>
                          <td className="fw-bold">
                            {t.CurrentMachineName}
                            <div className="text-xs text-muted">{t.CurrentMachineCode}</div>
                          </td>
                          <td>{formatDateTime(t.CurrentEndTime)}</td>
                          <td className="fw-bold">
                            {t.NextMachineName || <span className="text-muted">None (Last Step)</span>}
                            {t.NextMachineCode && <div className="text-xs text-muted">{t.NextMachineCode}</div>}
                          </td>
                          <td>
                            <Badge bg="danger" className="p-2 fs-11">
                              {parseFloat(t.DelayHours || t.delayHours || 0).toFixed(1)} hrs
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Button 
                              variant="outline-info" 
                              size="sm" 
                              className="py-1 px-2 d-inline-flex align-items-center gap-1"
                              style={{ fontSize: "0.75rem" }}
                              onClick={() => handleViewJobCardFlow(t.JobCardMasterId, t.JobCardNo)}
                            >
                              <FaEye size={10} /> Flow
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              );
            })()}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" size="sm" onClick={() => setDetailModalType(null)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* 4. Drill-down Job Card Process Flow Modal (With Admin Start & Stop Controls) */}
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
                        {isAdmin && <th className="text-center" style={{ width: "110px" }}>Admin Action</th>}
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

                        // Check if ready to start: first step or previous step is finished
                        const isReadyToStart = !hasStarted && !isBypassed && (idx === 0 || !!flowList[idx - 1]?.EndTime);

                    const resolvedMachineId = step.MachineId || step.machineId || (() => {
                      const matched = allMachines.find(am => 
                        (am.Name && step.MachineName && am.Name.toLowerCase().trim() === step.MachineName.toLowerCase().trim()) ||
                        (am.Code && step.MachineCode && am.Code.toLowerCase().trim() === step.MachineCode.toLowerCase().trim())
                      );
                      return matched ? (matched.Id || matched.id || matched.ID || "") : "";
                    })();

                    return (
                      <tr key={step.JobCardLineId || idx} className={statusText === "IN PROGRESS" ? "table-warning-light" : ""}>
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
                        {isAdmin && (
                          <td className="text-center">
                            {statusText === "IN PROGRESS" ? (
                              <Button
                                variant="danger"
                                size="sm"
                                className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: "0.75rem" }}
                                disabled={stoppingMachineId === step.JobCardLineId}
                                onClick={() => handleStopMachine({
                                  JobCardMasterId: selectedJobCardId,
                                  JobCardLineId: step.JobCardLineId,
                                  MachineMasterId: resolvedMachineId,
                                  MachineName: step.MachineName,
                                  JobCardNo: selectedJobCardNo
                                })}
                                title={`Stop ${step.MachineName}`}
                              >
                                {stoppingMachineId === step.JobCardLineId ? (
                                  <Spinner animation="border" size="sm" style={{ width: "0.7rem", height: "0.7rem" }} />
                                ) : (
                                  <FaStop size={9} />
                                )}
                                Stop
                              </Button>
                            ) : isReadyToStart ? (
                              <Button
                                variant="success"
                                size="sm"
                                className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: "0.75rem" }}
                                disabled={startingMachineId === step.JobCardLineId}
                                onClick={() => handleStartMachine({
                                  jobCardMasterId: selectedJobCardId,
                                  machineMasterId: resolvedMachineId,
                                  machineName: step.MachineName,
                                  jobCardNo: selectedJobCardNo,
                                  jobCardLineId: step.JobCardLineId
                                })}
                                title={`Start ${step.MachineName}`}
                              >
                                {startingMachineId === step.JobCardLineId ? (
                                  <Spinner animation="border" size="sm" style={{ width: "0.7rem", height: "0.7rem" }} />
                                ) : (
                                  <FaPlay size={8} />
                                )}
                                Start
                              </Button>
                            ) : (
                              <span className="text-muted fs-12">—</span>
                            )}
                          </td>
                        )}
                      </tr>
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

      {/* 5. Configuration Modals */}
      <CustomizeDashboardDrawer
        show={showCustomizeModal}
        onHide={() => setShowCustomizeModal(false)}
        widgets={widgets}
        onToggleVisibility={handleToggleVisibility}
        onAddWidget={handleAddWidget}
      />

      <ShortcutSelectorModal
        show={showShortcutModal}
        onHide={() => setShowShortcutModal(false)}
        shortcuts={shortcuts}
        onSaveShortcuts={handleSaveShortcuts}
      />

      <ResetConfirmModal
        show={showResetModal}
        onHide={() => setShowResetModal(false)}
        onConfirmReset={handleConfirmReset}
        loading={resetLoading}
      />
    </div>
  );
};

export default DynamicDashboard;
