import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Row, Col, Button, Card, Badge, Spinner, Modal, Form, Table } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaSave,
  FaFileExport,
  FaTrash,
  FaSearch,
  FaTable,
  FaFilter,
  FaCalculator,
  FaChartBar,
  FaLink,
  FaCheck,
  FaTimes,
  FaCog,
  FaHistory,
  FaCopy,
  FaMagic,
  FaCalendarAlt,
  FaFileExcel,
  FaFilePdf,
  FaStar,
  FaBoxes,
  FaIndustry,
  FaTruck,
  FaTree,
  FaExchangeAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaChevronRight,
  FaChevronLeft,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaProjectDiagram,
  FaLayerGroup,
  FaSitemap,
  FaArrowRight,
  FaPlus,
  FaFolderOpen,
  FaLock,
  FaUser
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { reportBuilderService } from "../../services/reportBuilderService";
import FormulaBuilderModal from "./FormulaBuilderModal";
import "./ReportBuilderStudio.css";

// ---------------------------------------------------------------------------
// 1. Ready-Made One-Click ERP Templates (Instant Load & Run)
// ---------------------------------------------------------------------------
const PRESET_TEMPLATES = [
  {
    id: "tpl_container_jobcard",
    title: "Container ➔ Contract Lines ➔ Job Cards Multi-Row Tracking",
    icon: FaTruck,
    color: "#2563eb",
    bgColor: "#eff6ff",
    badge: "Container & JobCards",
    description: "Shipment containers joined through contract items to floor job cards with Master-Detail grouping",
    entityId: 1,
    multiEntityIds: [1, 10],
    defaultColumns: [
      { physicalTable: "ContainerMaster", physicalColumn: "ContainerNumber", displayLabel: "Container Number" },
      { physicalTable: "ContainerMasterL", physicalColumn: "ContractNo", displayLabel: "Contract No" },
      { physicalTable: "ContainerMasterL", physicalColumn: "ItemName", displayLabel: "Item / Article Name" },
      { physicalTable: "JobCardMaster", physicalColumn: "JobCardNo", displayLabel: "Job Card Number" },
      { physicalTable: "JobCardMaster", physicalColumn: "ProductCode", displayLabel: "Product Code" },
      { physicalTable: "JobCardMaster", physicalColumn: "Category", displayLabel: "Category" },
      { physicalTable: "JobCardMaster", physicalColumn: "OrderQty", displayLabel: "Order Qty" },
      { physicalTable: "JobCardMaster", physicalColumn: "DateOfCreation", displayLabel: "Job Card Date" }
    ]
  },
  {
    id: "tpl_wood",
    title: "Daily Wood Recovery & Wastage Yield Audit",
    icon: FaTree,
    color: "#d97706",
    bgColor: "#fffbeb",
    badge: "Wood Store",
    description: "Issued CFT volume, consumed volume, AL codes, and excess log wastage",
    entityId: 18,
    defaultColumns: ["DateOfCreation", "BatchNo", "ALCode", "Quantity", "TotalIssueCFT", "TotalFinalCFT", "TotalExcessCFT"]
  },
  {
    id: "tpl_machine",
    title: "Machine Breakdown & Downtime RCA Report",
    icon: FaIndustry,
    color: "#dc2626",
    bgColor: "#fef2f2",
    badge: "Maintenance",
    description: "Stoppage reasons, downtime minutes, timestamps & operator logs",
    entityId: 14,
    defaultColumns: ["DateOfCreation", "PauseStartTime", "ResumeTime", "PauseDurationMinutes", "PauseReason", "PausedByUserName", "ResumedByUserName"]
  },
  {
    id: "tpl_jobcard",
    title: "Production Job Card WIP & Order Status Report",
    icon: FaBoxes,
    color: "#4f46e5",
    bgColor: "#eef2ff",
    badge: "Production",
    description: "Active floor job cards, batch codes, order quantities, CFT & inspection dates",
    entityId: 10,
    defaultColumns: ["JobCardNo", "DateOfCreation", "OrderDate", "ProductCode", "Category", "BatchCode", "OrderQty", "ComponentQty", "CFT", "InspectionDate"]
  },
  {
    id: "tpl_shipment",
    title: "Container Shipment Dispatch & Fulfillment Audit",
    icon: FaTruck,
    color: "#2563eb",
    bgColor: "#eff6ff",
    badge: "Logistics",
    description: "Export contracts, batch codes, planned vs shipped quantities",
    entityId: 2,
    defaultColumns: ["DateOfCreation", "ContractNo", "BatchCode", "ItemCode", "ItemName", "Quantity", "ShipmentQty"]
  },
  {
    id: "tpl_transfer",
    title: "Inter-Department Production Transfer Audit",
    icon: FaExchangeAlt,
    color: "#059669",
    bgColor: "#ecfdf5",
    badge: "Floor Transfer",
    description: "Scheduled vs actual batch movements across production stages",
    entityId: 24,
    defaultColumns: ["DateOfCreation", "Total", "Actual"]
  },
  {
    id: "tpl_catalog",
    title: "Item Specifications & Dimension Master Catalog",
    icon: FaCalculator,
    color: "#0891b2",
    bgColor: "#ecfeff",
    badge: "Engineering",
    description: "Finished article dimensions (L x W x H x D) and component complexity",
    entityId: 3,
    defaultColumns: ["ItemCode", "Name", "BatchCode", "Dimensions", "ItemWidth", "ItemDepth", "ItemHeight", "NoOfComponents"]
  }
];

// ---------------------------------------------------------------------------
// 2. Business Area Modules for Guided Wizard (Step 1)
// ---------------------------------------------------------------------------
const BUSINESS_MODULES = [
  {
    id: 1,
    name: "Container / Shipment",
    icon: "🚢",
    color: "#1d4ed8",
    badge: "Shipping",
    subtitle: "Container numbers, shipping dates & destinations",
    recommendedCols: ["ContainerNumber", "DateOfCreation"]
  },
  {
    id: 2,
    name: "Container Line Items",
    icon: "📦",
    color: "#2563eb",
    badge: "Contract Items",
    subtitle: "Contract numbers, articles, batch codes & quantities",
    recommendedCols: ["ContractNo", "BatchCode", "ItemCode", "ItemName", "Quantity", "ShipmentQty", "DateOfCreation"]
  },
  {
    id: 10,
    name: "Job Cards (Production)",
    icon: "📋",
    color: "#4f46e5",
    badge: "Factory Floor",
    subtitle: "Job card numbers, order qtys, categories & dates",
    recommendedCols: ["JobCardNo", "DateOfCreation", "ProductCode", "Category", "OrderQty", "CFT"]
  },
  {
    id: 11,
    name: "Job Card Operations",
    icon: "⚙️",
    color: "#6366f1",
    badge: "Operations",
    subtitle: "Machine start/end times & operator logs",
    recommendedCols: ["StartScanTime", "EndScanTime", "TotalTime", "OperatorUserId"]
  },
  {
    id: 12,
    name: "Factory Machines",
    icon: "🏭",
    color: "#0891b2",
    badge: "Machines",
    subtitle: "Machine names, types, serial numbers & status",
    recommendedCols: ["MachineName", "DateOfCreation"]
  },
  {
    id: 14,
    name: "Machine Downtime & Delays",
    icon: "⏸️",
    color: "#dc2626",
    badge: "Maintenance",
    subtitle: "Breakdown reasons, downtime mins & operators",
    recommendedCols: ["PauseReason", "PauseStartTime", "ResumeTime", "PauseDurationMinutes", "PausedByUserName"]
  },
  {
    id: 18,
    name: "Wood & Raw Materials",
    icon: "🪵",
    color: "#d97706",
    badge: "Wood Store",
    subtitle: "Wood issues, issued CFT, consumed CFT & wastage",
    recommendedCols: ["DateOfCreation", "BatchNo", "ALCode", "TotalIssueCFT", "TotalFinalCFT", "TotalExcessCFT", "Quantity"]
  },
  {
    id: 24,
    name: "Department Transfers",
    icon: "🔄",
    color: "#059669",
    badge: "Movement",
    subtitle: "Department handovers, stage completions & transfer logs",
    recommendedCols: ["DateOfCreation", "Total", "Actual"]
  },
  {
    id: 30,
    name: "Quality & QC Checks",
    icon: "🔍",
    color: "#9333ea",
    badge: "Inspection",
    subtitle: "QC inspection logs, batch approvals & defect rates",
    recommendedCols: ["DateOfCreation", "ContractNo", "ReportQty", "Quantity", "StartDate", "EndDate"]
  },
  {
    id: 3,
    name: "Items & Articles",
    icon: "🪑",
    color: "#0284c7",
    badge: "Item Catalog",
    subtitle: "Finished articles, dimensions & codes",
    recommendedCols: ["ItemCode", "Name", "Length", "Width", "Height"]
  },
  {
    id: 5,
    name: "Wooden Components",
    icon: "🧩",
    color: "#ca8a04",
    badge: "Components",
    subtitle: "Component parts, dimensions & wood types",
    recommendedCols: ["Name", "Length", "Width", "Thickness"]
  },
  {
    id: 34,
    name: "Departments",
    icon: "🏢",
    color: "#7c3aed",
    badge: "Departments",
    subtitle: "Factory departments & workflow stages",
    recommendedCols: ["Name"]
  }
];

const AI_SAMPLE_PROMPTS = [
  { label: "📦 Item-wise Job Card Status", prompt: "Item wise jobcard status report with item code, item name, job card numbers, order quantity, and category" },
  { label: "🚢 Container-wise MDF Summary", prompt: "Container-wise MDF summary report with container number, contract items, job card number, and MDF category" },
  { label: "⏸️ Paused Machines Downtime", prompt: "Show all paused machines from last month with downtime duration, breakdown reason, and operator name" },
  { label: "🚢 Container Shipment Tracking", prompt: "Shipment containers joined with contract line items showing container number, item name, and shipment quantities" },
  { label: "🪵 Wood Yield & Wastage Audit", prompt: "Wood issue audit report with batch numbers, issued volume, consumed volume, and excess log wastage" },
  { label: "📋 Factory Job Cards Status", prompt: "Active production job cards with job card number, product code, category, batch code, and order quantity" },
  { label: "🏢 Department Transfers", prompt: "Department transfer summary report showing handover stages, total count, and actual transferred quantity" }
];

const ReportBuilderStudio = () => {
  const { editReportId } = useParams();
  const navigate = useNavigate();

  // Mode: "simple" (Guided 3-Step Wizard) vs "advanced" (4-Zone Workbench)
  const [uiMode, setUiMode] = useState("simple");

  // Advanced Mode Accordion States
  const [openDomains, setOpenDomains] = useState(new Set(["Shipping", "Production", "Item & Product", "Machine Floor"]));
  const [openSections, setOpenSections] = useState({
    columns: true,
    mapping: true,
    filters: true,
    grid: true
  });
  const [showFieldsDrawer, setShowFieldsDrawer] = useState(true);

  // 1. Metadata State
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [fields, setFields] = useState([]);
  const [relatedEntitiesMap, setRelatedEntitiesMap] = useState({
    direct: new Set(),
    extended: new Set()
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // 2. Report Configuration State
  const [reportTitle, setReportTitle] = useState("New Custom ERP Report");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [customFormulas, setCustomFormulas] = useState([]);
  const [filters, setFilters] = useState([]);
  const [orderBy, setOrderBy] = useState([]);
  const [joinPath, setJoinPath] = useState([]);
  const [datePreset, setDatePreset] = useState("ALL");

  // 3. Execution & Preview State
  const [previewData, setPreviewData] = useState([]);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'chart'

  // Multi-Table & Bridge State
  const [selectedEntityIds, setSelectedEntityIds] = useState([1]); // default to ContainerMaster (1)
  const [bridgeEntities, setBridgeEntities] = useState([]); // auto-detected intermediate bridge tables
  const [activeTableTab, setActiveTableTab] = useState("ALL"); // 'ALL' or entityId
  const [entityFieldsCache, setEntityFieldsCache] = useState({}); // { [entityId]: [fields] }

  // Hierarchical Master-Detail & Presentation State
  const [viewStyle, setViewStyle] = useState("tree"); // 'tree' (Master-Detail Accordion) | 'smart' (Row-Merge) | 'flat' (Grid)
  const [groupByColumn, setGroupByColumn] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // 4. Modals
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showInMenu, setShowInMenu] = useState(true);
  const [pinToDashboard, setPinToDashboard] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [savedReportId, setSavedReportId] = useState(editReportId ? parseInt(editReportId) : null);
  const [savedReportsList, setSavedReportsList] = useState([]);
  const [showReportsListModal, setShowReportsListModal] = useState(false);
  const [loadingSavedReports, setLoadingSavedReports] = useState(false);
  const [reportsListSearch, setReportsListSearch] = useState("");

  // 5. Gemini AI Prompt-to-Report Assistant State
  const [aiPrompt, setAiPrompt] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiRejectionMsg, setAiRejectionMsg] = useState("");

  const currentAuthUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("authUser")) || {};
    } catch {
      return {};
    }
  }, []);
  const currentUserId = currentAuthUser.id || currentAuthUser.UserId || 1;

  const fetchUserSavedReports = useCallback(async () => {
    try {
      setLoadingSavedReports(true);
      const res = await reportBuilderService.getSavedReports();
      if (res && res.success && res.data) {
        setSavedReportsList(res.data);
      }
    } catch (err) {
      console.error("Error fetching user saved reports:", err);
    } finally {
      setLoadingSavedReports(false);
    }
  }, []);

  useEffect(() => {
    fetchUserSavedReports();
  }, [fetchUserSavedReports]);

  const handleLoadSavedReport = async (reportHeader) => {
    try {
      setLoadingMetadata(true);
      const res = await reportBuilderService.getReportConfig(reportHeader.reportId);
      if (res.success && res.data) {
        const report = res.data;
        setReportTitle(report.reportTitle);
        setDescription(report.description || "");
        setCategory(report.category || "General");
        setSavedReportId(report.reportId);

        const cfg = report.parsedConfig || JSON.parse(report.configJson);
        if (cfg) {
          if (cfg.selectedColumns) setSelectedColumns(cfg.selectedColumns);
          if (cfg.customFormulas) setCustomFormulas(cfg.customFormulas);
          if (cfg.filters) setFilters(cfg.filters);
          if (cfg.orderBy) setOrderBy(cfg.orderBy);
          if (cfg.joinPath) setJoinPath(cfg.joinPath);
          if (cfg.viewStyle) setViewStyle(cfg.viewStyle);
          if (cfg.groupByColumn) setGroupByColumn(cfg.groupByColumn);
          if (cfg.selectedEntityIds) setSelectedEntityIds(cfg.selectedEntityIds);
        }
        setShowReportsListModal(false);
      } else {
        alert(res.message || "Failed to load report");
      }
    } catch (err) {
      alert("Error loading report: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleDeleteSavedReport = async (reportId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this custom report?")) return;
    try {
      const res = await reportBuilderService.deleteReport(reportId);
      if (res.success) {
        if (savedReportId === reportId) {
          setSavedReportId(null);
          setReportTitle("New Custom ERP Report");
        }
        fetchUserSavedReports();
      } else {
        alert(res.message || "Failed to delete report");
      }
    } catch (err) {
      alert("Failed to delete report: " + (err.response?.data?.message || err.message));
    }
  };

  // -------------------------------------------------------------------------
  // Initial Load: Fetch Entities
  // -------------------------------------------------------------------------
  useEffect(() => {
    const loadEntities = async () => {
      try {
        setLoadingMetadata(true);
        const res = await reportBuilderService.getEntities();
        if (res.success && res.data) {
          setEntities(res.data);
          const defaultEnt = res.data.find((e) => e.entityId === 2) || res.data[0];
          if (defaultEnt && !selectedEntity) {
            handleSelectEntity(defaultEnt);
          }
        }
      } catch (err) {
        console.error("Failed to load report entities:", err);
      } finally {
        setLoadingMetadata(false);
      }
    };
    loadEntities();
  }, []);

  // -------------------------------------------------------------------------
  // If in edit mode, load existing report
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (editReportId) {
      const loadReport = async () => {
        try {
          const res = await reportBuilderService.getReportConfig(editReportId);
          if (res.success && res.data) {
            const report = res.data;
            setReportTitle(report.reportTitle);
            setDescription(report.description || "");
            setCategory(report.category || "General");
            setSavedReportId(report.reportId);

            const cfg = report.parsedConfig || JSON.parse(report.configJson);
            if (cfg) {
              if (cfg.selectedColumns) setSelectedColumns(cfg.selectedColumns);
              if (cfg.customFormulas) setCustomFormulas(cfg.customFormulas);
              if (cfg.filters) setFilters(cfg.filters);
              if (cfg.orderBy) setOrderBy(cfg.orderBy);
              if (cfg.joinPath) setJoinPath(cfg.joinPath);
              if (cfg.viewStyle) setViewStyle(cfg.viewStyle);
              if (cfg.groupByColumn) setGroupByColumn(cfg.groupByColumn);
              if (cfg.selectedEntityIds) setSelectedEntityIds(cfg.selectedEntityIds);
            }
          }
        } catch (err) {
          console.error("Error loading report config for edit:", err);
        }
      };
      loadReport();
    }
  }, [editReportId]);

  // -------------------------------------------------------------------------
  // Entity Selection Handler
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Entity & Multi-Table Selection Handlers
  // -------------------------------------------------------------------------
  const handleSelectEntity = async (entity, autoSelectRecommended = false) => {
    if (!entity) return;
    setSelectedEntity(entity);
    setActiveTableTab(String(entity.entityId));

    // Ensure entity is included in selectedEntityIds
    setSelectedEntityIds((prev) => {
      if (!prev.includes(entity.entityId)) {
        return [...prev, entity.entityId];
      }
      return prev;
    });

    try {
      let loadedFields = entityFieldsCache[entity.entityId];
      if (!loadedFields) {
        const fieldsRes = await reportBuilderService.getFields(entity.entityId);
        if (fieldsRes.success && fieldsRes.data) {
          loadedFields = fieldsRes.data;
          setEntityFieldsCache((prev) => ({ ...prev, [entity.entityId]: loadedFields }));
        }
      }

      if (loadedFields) {
        setFields(loadedFields);

        // Auto-select recommended if explicitly requested AND user hasn't selected any columns yet
        if (autoSelectRecommended && selectedColumns.length === 0) {
          const moduleInfo = BUSINESS_MODULES.find((m) => m.id === entity.entityId);
          const recCols = moduleInfo ? moduleInfo.recommendedCols : [];
          
          let colsToSelect = [];
          if (recCols.length > 0) {
            colsToSelect = loadedFields.filter((f) =>
              recCols.some((rc) => rc.toLowerCase() === f.physicalColumnName.toLowerCase())
            );
          }
          if (colsToSelect.length === 0) {
            colsToSelect = loadedFields.slice(0, 6);
          }

          const newSelected = colsToSelect.map((f, idx) => ({
            fieldId: f.fieldId,
            physicalTable: f.physicalTableName,
            physicalColumn: f.physicalColumnName,
            displayLabel: f.displayName || f.physicalColumnName,
            dataType: f.dataType || "String",
            aggregation: null,
            sortOrder: idx + 1,
            isVisible: true
          }));
          setSelectedColumns(newSelected);
        }
      }

      const relRes = await reportBuilderService.getRelatedEntities(entity.entityId);
      if (relRes.success && relRes.data) {
        const directSet = new Set((relRes.data.directRelated || []).map((e) => e.entityId));
        const extendedSet = new Set((relRes.data.extendedLinks || []).map((e) => e.entityId));
        setRelatedEntitiesMap({ direct: directSet, extended: extendedSet });
      }
    } catch (err) {
      console.error("Failed to load fields/relationships:", err);
    }
  };

  const handleToggleTableSelection = (entity) => {
    if (!entity) return;
    const entId = entity.entityId;

    setSelectedEntityIds((prev) => {
      const exists = prev.includes(entId);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one
        // Remove columns belonging to this entity
        setSelectedColumns((cols) =>
          cols.filter(
            (c) => c.physicalTable?.toLowerCase() !== entity.physicalTableName?.toLowerCase()
          )
        );
        return prev.filter((id) => id !== entId);
      } else {
        // Fetch fields into cache if not loaded
        if (!entityFieldsCache[entId]) {
          reportBuilderService.getFields(entId).then((res) => {
            if (res.success && res.data) {
              setEntityFieldsCache((c) => ({ ...c, [entId]: res.data }));
            }
          });
        }
        return [...prev, entId];
      }
    });

    setSelectedEntity(entity);
    setActiveTableTab(String(entId));
  };

  const handleAddTableToReport = (entity) => {
    if (!entity) return;
    const entId = entity.entityId;
    setSelectedEntityIds((prev) => (prev.includes(entId) ? prev : [...prev, entId]));
    setSelectedEntity(entity);
    setActiveTableTab(String(entId));

    if (!entityFieldsCache[entId]) {
      reportBuilderService.getFields(entId).then((res) => {
        if (res.success && res.data) {
          setEntityFieldsCache((c) => ({ ...c, [entId]: res.data }));
        }
      });
    }
  };

  const handleRemoveTableFromReport = (entityId) => {
    const ent = entities.find((e) => e.entityId === entityId);
    if (!ent) return;
    setSelectedEntityIds((prev) => {
      if (prev.length <= 1) return prev;
      setSelectedColumns((cols) =>
        cols.filter(
          (c) => c.physicalTable?.toLowerCase() !== ent.physicalTableName?.toLowerCase()
        )
      );
      return prev.filter((id) => id !== entityId);
    });
  };

  // -------------------------------------------------------------------------
  // 1-Click Template Launch Handler
  // -------------------------------------------------------------------------
  const handleLaunchTemplate = async (tpl) => {
    let targetEnt = entities.find((e) => e.entityId === tpl.entityId);
    if (!targetEnt && entities.length > 0) {
      targetEnt = entities[0];
    }
    if (!targetEnt) return;

    setReportTitle(tpl.title);
    setCategory(tpl.badge);
    setSelectedEntity(targetEnt);

    const initialEntityIds = tpl.multiEntityIds || [tpl.entityId];
    setSelectedEntityIds(initialEntityIds);

    if (tpl.id === "tpl_container_jobcard") {
      setViewStyle("tree");
      setGroupByColumn("Container Number");
    }

    try {
      setLoadingMetadata(true);

      // Fetch fields for all entities in initialEntityIds
      const fieldsPromises = initialEntityIds.map((id) => reportBuilderService.getFields(id));
      const results = await Promise.all(fieldsPromises);
      const cacheUpdates = {};
      results.forEach((res, i) => {
        if (res.success && res.data) {
          cacheUpdates[initialEntityIds[i]] = res.data;
        }
      });
      setEntityFieldsCache((prev) => ({ ...prev, ...cacheUpdates }));

      // Also get join path
      let tplJoinPath = [];
      if (initialEntityIds.length > 1) {
        const pathRes = await reportBuilderService.getJoinPath(initialEntityIds);
        if (pathRes.success && pathRes.data) {
          tplJoinPath = pathRes.data;
          setJoinPath(tplJoinPath);

          // Find bridge entities
          const tablesInPath = new Set();
          tplJoinPath.forEach((s) => {
            if (s.fromTable) tablesInPath.add(s.fromTable.toLowerCase());
            if (s.toTable) tablesInPath.add(s.toTable.toLowerCase());
          });
          const pathEntities = entities.filter((e) =>
            tablesInPath.has(e.physicalTableName?.toLowerCase())
          );
          const bridges = pathEntities.filter((e) => !initialEntityIds.includes(e.entityId));
          setBridgeEntities(bridges);

          // Fetch bridge fields into cache
          bridges.forEach(async (b) => {
            if (!cacheUpdates[b.entityId]) {
              const bRes = await reportBuilderService.getFields(b.entityId);
              if (bRes.success && bRes.data) {
                setEntityFieldsCache((prev) => ({ ...prev, [b.entityId]: bRes.data }));
              }
            }
          });
        }
      }

      // Build cols
      let cols = [];
      if (tpl.id === "tpl_container_jobcard") {
        cols = tpl.defaultColumns.map((c, idx) => ({
          fieldId: 0,
          physicalTable: c.physicalTable,
          physicalColumn: c.physicalColumn,
          displayLabel: c.displayLabel,
          dataType: "String",
          aggregation: null,
          sortOrder: idx + 1,
          isVisible: true
        }));
      } else {
        const allFields = cacheUpdates[targetEnt.entityId] || [];
        setFields(allFields);
        let matched = allFields.filter((f) =>
          tpl.defaultColumns.some((dc) => dc.toLowerCase() === f.physicalColumnName.toLowerCase())
        );
        if (matched.length === 0) matched = allFields.slice(0, 6);
        cols = matched.map((f, idx) => ({
          fieldId: f.fieldId,
          physicalTable: f.physicalTableName,
          physicalColumn: f.physicalColumnName,
          displayLabel: f.displayName || f.physicalColumnName,
          dataType: f.dataType || "String",
          aggregation: null,
          sortOrder: idx + 1,
          isVisible: true
        }));
      }

      setSelectedColumns(cols);
      setFilters([]);

      const config = {
        reportTitle: tpl.title,
        primaryEntity: targetEnt.physicalTableName,
        selectedColumns: cols,
        customFormulas: [],
        filters: [],
        orderBy: [],
        joinPath: tplJoinPath,
        pagination: { defaultPageSize: pageSize, maxRows: 1000 }
      };

      setLoadingQuery(true);
      const execRes = await reportBuilderService.executeQuery(config, 1, pageSize);
      if (execRes.success) {
        setPreviewData(execRes.data || []);
        setColumnHeaders(execRes.columnHeaders || []);
        setTotalRows(execRes.totalRows || 0);
        setExecutionTimeMs(execRes.executionTimeMs || 0);
      }
    } catch (err) {
      console.error("Error launching template:", err);
    } finally {
      setLoadingMetadata(false);
      setLoadingQuery(false);
    }
  };

  // -------------------------------------------------------------------------
  // Gemini AI Prompt-to-Report Handlers
  // -------------------------------------------------------------------------
  const handleApplyAiGeneratedConfig = async (aiData) => {
    if (!aiData) return;

    try {
      setLoadingQuery(true);
      setAiRejectionMsg("");
      setAiExplanation(aiData.explanation || "Report configuration generated and loaded successfully.");

      // 1. Title & Description
      if (aiData.suggestedTitle) setReportTitle(aiData.suggestedTitle);
      if (aiData.description) setDescription(aiData.description);

      // 2. Resolve entities
      const targetEntityId = aiData.primaryEntityId || (aiData.selectedEntityIds && aiData.selectedEntityIds[0]);
      const allSelectedEntityIds = aiData.selectedEntityIds && aiData.selectedEntityIds.length > 0
        ? aiData.selectedEntityIds
        : (targetEntityId ? [targetEntityId] : [1]);

      setSelectedEntityIds(allSelectedEntityIds);

      let primaryEnt = entities.find((e) => e.entityId === targetEntityId);
      if (!primaryEnt && entities.length > 0) {
        primaryEnt = entities.find((e) => e.entityId === allSelectedEntityIds[0]) || entities[0];
      }
      if (primaryEnt) {
        setSelectedEntity(primaryEnt);
        setActiveTableTab(String(primaryEnt.entityId));
      }

      // 3. Ensure fields for all selected entities are in cache
      const fieldPromises = allSelectedEntityIds.map(async (eid) => {
        if (!entityFieldsCache[eid]) {
          try {
            const res = await reportBuilderService.getFields(eid);
            return { eid, fields: res && res.success && res.data ? res.data : [] };
          } catch {
            return { eid, fields: [] };
          }
        }
        return { eid, fields: entityFieldsCache[eid] };
      });

      const resolvedFieldResults = await Promise.all(fieldPromises);
      const newCache = { ...entityFieldsCache };
      const allResolvedFields = [];
      resolvedFieldResults.forEach((r) => {
        newCache[r.eid] = r.fields;
        allResolvedFields.push(...r.fields);
      });
      setEntityFieldsCache(newCache);

      if (primaryEnt && newCache[primaryEnt.entityId]) {
        setFields(newCache[primaryEnt.entityId]);
      }

      // 4. Calculate Join Path if multi-entity
      let computedJoinPath = [];
      if (allSelectedEntityIds.length > 1) {
        try {
          const pathRes = await reportBuilderService.getJoinPath(allSelectedEntityIds);
          if (pathRes.success && pathRes.data) {
            computedJoinPath = pathRes.data;
            setJoinPath(computedJoinPath);

            const tablesInPath = new Set();
            computedJoinPath.forEach((s) => {
              if (s.fromTable) tablesInPath.add(s.fromTable.toLowerCase());
              if (s.toTable) tablesInPath.add(s.toTable.toLowerCase());
            });
            const pathEntities = entities.filter((e) =>
              tablesInPath.has(e.physicalTableName?.toLowerCase())
            );
            const bridges = pathEntities.filter((e) => !allSelectedEntityIds.includes(e.entityId));
            setBridgeEntities(bridges);
          }
        } catch (pathErr) {
          console.warn("Failed to get join path for AI config:", pathErr);
        }
      } else {
        setJoinPath([]);
        setBridgeEntities([]);
      }

      // 5. Select Columns matching Field IDs in exact requested order
      let matchedCols = [];
      if (aiData.selectedFieldIds && aiData.selectedFieldIds.length > 0) {
        aiData.selectedFieldIds.forEach((fid) => {
          const found = allResolvedFields.find((f) => f.fieldId === fid);
          if (found && !matchedCols.some((mc) => mc.fieldId === fid)) {
            matchedCols.push(found);
          }
        });
      }
      if (matchedCols.length === 0) {
        matchedCols = allResolvedFields.slice(0, 8);
      }

      const cols = matchedCols.map((f, idx) => ({
        fieldId: f.fieldId,
        physicalTable: f.physicalTableName,
        physicalColumn: f.physicalColumnName,
        displayLabel: f.displayName || f.physicalColumnName,
        dataType: f.dataType || "String",
        aggregation: null,
        sortOrder: idx + 1,
        isVisible: true
      }));
      setSelectedColumns(cols);

      // 6. Map Filters
      let mappedFilters = [];
      if (aiData.filters && Array.isArray(aiData.filters)) {
        mappedFilters = aiData.filters.map((flt) => {
          const fieldObj = allResolvedFields.find((f) => f.fieldId === flt.fieldId);
          return {
            fieldId: flt.fieldId,
            physicalTable: flt.physicalTable || fieldObj?.physicalTableName || "",
            physicalColumn: flt.physicalColumn || fieldObj?.physicalColumnName || "",
            operator: flt.operator || "EQ",
            value1: flt.value1,
            value2: flt.value2,
            dataType: flt.dataType || fieldObj?.dataType || "String",
            isUserEditable: true,
            uiLabel: flt.uiLabel || (fieldObj ? `${fieldObj.displayName} ${flt.operator}` : "")
          };
        });
      }
      setFilters(mappedFilters);

      // 7. Date Preset
      if (aiData.datePreset) {
        setDatePreset(aiData.datePreset);
      }

      // 8. Execute Preview Query immediately!
      const config = {
        reportTitle: aiData.suggestedTitle || "AI Custom Report",
        primaryEntity: primaryEnt ? primaryEnt.physicalTableName : (cols[0]?.physicalTable || "ContainerMaster"),
        selectedColumns: cols,
        customFormulas: [],
        filters: mappedFilters,
        orderBy: [],
        joinPath: computedJoinPath,
        pagination: { defaultPageSize: pageSize, maxRows: 1000 }
      };

      const execRes = await reportBuilderService.executeQuery(config, 1, pageSize);
      if (execRes && execRes.success) {
        setPreviewData(execRes.data || []);
        setColumnHeaders(execRes.columnHeaders || []);
        setTotalRows(execRes.totalRows || 0);
        setExecutionTimeMs(execRes.executionTimeMs || 0);
      }
    } catch (err) {
      console.error("Error applying AI generated config:", err);
      setAiRejectionMsg("Error applying report configuration: " + (err.message || "Unknown error"));
    } finally {
      setLoadingQuery(false);
    }
  };

  const handleGenerateAiReport = async (overridePrompt = null) => {
    const promptToSend = (overridePrompt || aiPrompt || "").trim();
    if (!promptToSend) return;

    setLoadingAi(true);
    setAiRejectionMsg("");
    setAiExplanation("");

    try {
      const res = await reportBuilderService.generateFromPrompt(promptToSend);
      if (!res || !res.success) {
        if (res && res.isReportingIntent === false) {
          setAiRejectionMsg(res.rejectionReason || res.message || "This assistant only generates Factory and ERP operational reports.");
        } else {
          setAiRejectionMsg(res?.message || "Failed to generate report. Please try again.");
        }
        return;
      }

      const aiData = res.data;
      if (!aiData || !aiData.isReportingIntent) {
        setAiRejectionMsg(aiData?.rejectionReason || "Please enter a valid factory or ERP reporting prompt.");
        return;
      }

      await handleApplyAiGeneratedConfig(aiData);
    } catch (err) {
      console.error("AI Generation error:", err);
      setAiRejectionMsg("Unable to connect to AI service. Please verify your connection or API key.");
    } finally {
      setLoadingAi(false);
    }
  };

  // -------------------------------------------------------------------------
  // Link Related Table Handler (Zone 2 Mapping System)
  // -------------------------------------------------------------------------
  const handleAddRelatedTable = async (entityIdVal) => {
    const entId = parseInt(entityIdVal);
    if (!entId) return;
    const target = entities.find((e) => e.entityId === entId);
    if (!target) return;

    try {
      setLoadingMetadata(true);
      const fieldsRes = await reportBuilderService.getFields(target.entityId);
      if (fieldsRes.success && fieldsRes.data) {
        const available = fieldsRes.data.slice(0, 3);
        const newCols = available.map((f, i) => ({
          fieldId: f.fieldId,
          physicalTable: f.physicalTableName,
          physicalColumn: f.physicalColumnName,
          displayLabel: `${target.displayName} - ${f.displayName}`,
          dataType: f.dataType || "String",
          aggregation: null,
          sortOrder: selectedColumns.length + i + 1,
          isVisible: true
        }));
        setSelectedColumns((prev) => [...prev, ...newCols]);
      }
    } catch (err) {
      console.error("Error linking related entity:", err);
    } finally {
      setLoadingMetadata(false);
    }
  };

  // -------------------------------------------------------------------------
  // Accordion Toggles
  // -------------------------------------------------------------------------
  const toggleDomain = (domain) => {
    setOpenDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const toggleAllDomains = (expand) => {
    if (expand) {
      setOpenDomains(new Set(Object.keys(groupedEntities)));
    } else {
      setOpenDomains(new Set());
    }
  };

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // -------------------------------------------------------------------------
  // Column Selection Toggles
  // -------------------------------------------------------------------------
  const handleToggleColumn = (field) => {
    const existsIndex = selectedColumns.findIndex(
      (c) => c.physicalTable === field.physicalTableName && c.physicalColumn === field.physicalColumnName
    );

    if (existsIndex >= 0) {
      setSelectedColumns((prev) => prev.filter((_, idx) => idx !== existsIndex));
    } else {
      const newCol = {
        fieldId: field.fieldId,
        physicalTable: field.physicalTableName,
        physicalColumn: field.physicalColumnName,
        displayLabel: field.displayName || field.physicalColumnName,
        dataType: field.dataType || "String",
        aggregation: null,
        sortOrder: selectedColumns.length + 1,
        isVisible: true
      };
      setSelectedColumns((prev) => [...prev, newCol]);
    }
  };

  const handleSelectAllFields = () => {
    const toAdd = fields.filter(
      (f) => !selectedColumns.some((c) => c.physicalTable === f.physicalTableName && c.physicalColumn === f.physicalColumnName)
    ).map((f, idx) => ({
      fieldId: f.fieldId,
      physicalTable: f.physicalTableName,
      physicalColumn: f.physicalColumnName,
      displayLabel: f.displayName || f.physicalColumnName,
      dataType: f.dataType || "String",
      aggregation: null,
      sortOrder: selectedColumns.length + idx + 1,
      isVisible: true
    }));
    setSelectedColumns((prev) => [...prev, ...toAdd]);
  };

  const handleSelectRecommendedFields = () => {
    if (!selectedEntity) return;
    const moduleInfo = BUSINESS_MODULES.find((m) => m.id === selectedEntity.entityId);
    const recCols = moduleInfo ? moduleInfo.recommendedCols : [];
    
    let matched = fields.filter((f) =>
      recCols.some((rc) => rc.toLowerCase() === f.physicalColumnName.toLowerCase())
    );
    if (matched.length === 0) {
      matched = fields.slice(0, 6);
    }

    const toAdd = matched.filter(
      (f) => !selectedColumns.some((c) => c.physicalTable === f.physicalTableName && c.physicalColumn === f.physicalColumnName)
    ).map((f, idx) => ({
      fieldId: f.fieldId,
      physicalTable: f.physicalTableName,
      physicalColumn: f.physicalColumnName,
      displayLabel: f.displayName || f.physicalColumnName,
      dataType: f.dataType || "String",
      aggregation: null,
      sortOrder: selectedColumns.length + idx + 1,
      isVisible: true
    }));
    setSelectedColumns((prev) => [...prev, ...toAdd]);
  };

  const handleRemoveColumn = (index) => {
    setSelectedColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateColumnAgg = (index, agg) => {
    setSelectedColumns((prev) => {
      const copy = [...prev];
      copy[index].aggregation = agg === "NONE" ? null : agg;
      return copy;
    });
  };

  // -------------------------------------------------------------------------
  // Dynamic Dijkstra Path & Intermediate Bridge Table Computation
  // -------------------------------------------------------------------------
  useEffect(() => {
    const updateJoinPathAndBridges = async () => {
      const tablesFromCols = selectedColumns.map((c) => c.physicalTable?.toLowerCase());
      const tablesFromIds = selectedEntityIds.map((id) => {
        const ent = entities.find((e) => e.entityId === id);
        return ent ? ent.physicalTableName?.toLowerCase() : null;
      }).filter(Boolean);

      const allTableNames = Array.from(new Set([...tablesFromCols, ...tablesFromIds].filter(Boolean)));

      const entityIds = allTableNames
        .map((tbl) => entities.find((e) => e.physicalTableName?.toLowerCase() === tbl)?.entityId)
        .filter(Boolean);

      if (entityIds.length > 1) {
        try {
          const pathRes = await reportBuilderService.getJoinPath(entityIds);
          if (pathRes.success && pathRes.data) {
            setJoinPath(pathRes.data);

            const tablesInPath = new Set();
            pathRes.data.forEach((s) => {
              if (s.fromTable) tablesInPath.add(s.fromTable.toLowerCase());
              if (s.toTable) tablesInPath.add(s.toTable.toLowerCase());
            });

            const bridges = entities.filter(
              (e) =>
                tablesInPath.has(e.physicalTableName?.toLowerCase()) &&
                !selectedEntityIds.includes(e.entityId)
            );
            setBridgeEntities(bridges);

            // Pre-fetch fields for any newly identified bridge entities
            bridges.forEach(async (b) => {
              if (!entityFieldsCache[b.entityId]) {
                const bRes = await reportBuilderService.getFields(b.entityId);
                if (bRes.success && bRes.data) {
                  setEntityFieldsCache((prev) => ({ ...prev, [b.entityId]: bRes.data }));
                }
              }
            });
          }
        } catch (err) {
          console.error("Join path resolution error:", err);
        }
      } else {
        setJoinPath([]);
        setBridgeEntities([]);
      }
    };

    if (entities.length > 0) {
      updateJoinPathAndBridges();
    }
  }, [selectedEntityIds, selectedColumns, entities]);

  // -------------------------------------------------------------------------
  // Query Execution Handler
  // -------------------------------------------------------------------------
  const runLiveQuery = useCallback(async () => {
    if (selectedColumns.length === 0) {
      setPreviewData([]);
      setColumnHeaders([]);
      setTotalRows(0);
      return;
    }

    const primaryTable = selectedColumns[0]?.physicalTable || (selectedEntity ? selectedEntity.physicalTableName : "ContainerMaster");

    const config = {
      reportTitle,
      primaryEntity: primaryTable,
      selectedColumns,
      customFormulas,
      filters,
      orderBy,
      joinPath,
      pagination: { defaultPageSize: pageSize, maxRows: 1000 }
    };

    try {
      setLoadingQuery(true);
      const res = await reportBuilderService.executeQuery(config, pageNumber, pageSize);
      if (res.success) {
        setPreviewData(res.data || []);
        setColumnHeaders(res.columnHeaders || []);
        setTotalRows(res.totalRows || 0);
        setExecutionTimeMs(res.executionTimeMs || 0);
      } else {
        console.warn("Query execution returned unsuccessful:", res.message);
      }
    } catch (err) {
      console.error("Error executing query:", err);
    } finally {
      setLoadingQuery(false);
    }
  }, [selectedColumns, customFormulas, filters, orderBy, joinPath, pageNumber, pageSize, selectedEntity, reportTitle]);

  // Auto-run query on column change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedColumns.length > 0) {
        runLiveQuery();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [selectedColumns, customFormulas, filters, orderBy, pageNumber, pageSize, joinPath]);

  // -------------------------------------------------------------------------
  // Filters Management
  // -------------------------------------------------------------------------
  const handleAddFilter = () => {
    const col = selectedColumns[0] || fields[0];
    if (!col) return;
    setFilters((prev) => [
      ...prev,
      {
        fieldId: col.fieldId,
        physicalTable: col.physicalTable || col.physicalTableName,
        physicalColumn: col.physicalColumn || col.physicalColumnName,
        operator: "EQ",
        value1: "",
        value2: "",
        dataType: col.dataType || "String"
      }
    ]);
  };

  const handleFilterColumnChange = (idx, combinedVal) => {
    const [tbl, col] = combinedVal.split(".");
    const match = availableFilterColumns.find((c) => c.physicalTable === tbl && c.physicalColumn === col);
    if (!match) return;

    setFilters((prev) => {
      const copy = [...prev];
      copy[idx].physicalTable = tbl;
      copy[idx].physicalColumn = col;
      copy[idx].fieldId = match.fieldId;
      copy[idx].dataType = match.dataType;
      return copy;
    });
  };

  const handleUpdateFilter = (idx, field, val) => {
    setFilters((prev) => {
      const copy = [...prev];
      copy[idx][field] = val;
      return copy;
    });
  };

  const handleRemoveFilter = (idx) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx));
  };

  // Simple Date Preset Handler
  const handleApplyDatePreset = (presetKey) => {
    setDatePreset(presetKey);
    const dateCol = selectedColumns.find((c) => c.dataType === "DateTime") || fields.find((f) => f.dataType === "DateTime");
    if (!dateCol) return;

    if (presetKey === "ALL") {
      setFilters((prev) => prev.filter((f) => f.physicalColumn !== dateCol.physicalColumnName && f.physicalColumn !== dateCol.physicalColumn));
      return;
    }

    const now = new Date();
    let startDate = "";
    if (presetKey === "TODAY") {
      startDate = now.toISOString().split("T")[0];
    } else if (presetKey === "THIS_WEEK") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString().split("T")[0];
    } else if (presetKey === "THIS_MONTH") {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (presetKey === "LAST_30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString().split("T")[0];
    }

    const colName = dateCol.physicalColumnName || dateCol.physicalColumn;
    const tblName = dateCol.physicalTableName || dateCol.physicalTable;

    setFilters((prev) => {
      const filtered = prev.filter((f) => f.physicalColumn !== colName);
      return [
        ...filtered,
        {
          fieldId: dateCol.fieldId,
          physicalTable: tblName,
          physicalColumn: colName,
          operator: "GT",
          value1: startDate,
          value2: "",
          dataType: "DateTime"
        }
      ];
    });
  };

  // -------------------------------------------------------------------------
  // Dynamic Computations, Grouping, & Presentation Memos
  // -------------------------------------------------------------------------

  // 1. Client-side quick filter on preview rows
  const displayedPreviewData = useMemo(() => {
    if (!tableSearch.trim()) return previewData;
    const q = tableSearch.toLowerCase();
    return previewData.filter((row) =>
      Object.values(row).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
    );
  }, [previewData, tableSearch]);

  // 2. Dynamic Group-By Column Resolution
  const effectiveGroupByColumn = useMemo(() => {
    if (groupByColumn && columnHeaders.includes(groupByColumn)) return groupByColumn;
    const match = columnHeaders.find((c) =>
      /container.*no|container.*number|contract.*no|batch.*no|jobcard.*no|job.*card/i.test(c)
    );
    return match || columnHeaders[0] || "";
  }, [groupByColumn, columnHeaders]);

  // 3. Hierarchical Data Grouping (1-to-Many Master-Detail)
  const groupedData = useMemo(() => {
    if (!effectiveGroupByColumn || displayedPreviewData.length === 0) return [];
    const groupsMap = new Map();
    displayedPreviewData.forEach((row) => {
      const rawVal = row[effectiveGroupByColumn];
      const keyVal =
        rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== ""
          ? String(rawVal)
          : "Unassigned";

      if (!groupsMap.has(keyVal)) {
        groupsMap.set(keyVal, {
          groupKey: keyVal,
          parentRow: row,
          items: [],
          itemCount: 0
        });
      }
      const g = groupsMap.get(keyVal);
      g.items.push(row);
      g.itemCount++;
    });
    return Array.from(groupsMap.values());
  }, [displayedPreviewData, effectiveGroupByColumn]);

  // 4. Group Accordion Expand / Collapse Handlers
  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const toggleAllGroups = (expand) => {
    if (expand) {
      setExpandedGroups(new Set(groupedData.map((g) => g.groupKey)));
    } else {
      setExpandedGroups(new Set());
    }
  };

  // Initially auto-expand first 5 master groups
  useEffect(() => {
    if (groupedData.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groupedData.slice(0, 5).map((g) => g.groupKey)));
    }
  }, [groupedData]);

  // 5. Active Entities (Selected + Intermediate Bridges)
  const activeEntities = useMemo(() => {
    const list = [];
    selectedEntityIds.forEach((id) => {
      const e = entities.find((ent) => ent.entityId === id);
      if (e && !list.some((item) => item.entityId === e.entityId)) list.push(e);
    });
    bridgeEntities.forEach((b) => {
      if (!list.some((item) => item.entityId === b.entityId)) list.push(b);
    });
    return list;
  }, [selectedEntityIds, bridgeEntities, entities]);

  // 6. Combined Fields for Active Tab in Step 2
  const displayedActiveFields = useMemo(() => {
    let pool = [];
    if (activeTableTab === "ALL") {
      activeEntities.forEach((ent) => {
        const entFields = entityFieldsCache[ent.entityId] || (selectedEntity?.entityId === ent.entityId ? fields : []);
        entFields.forEach((f) => {
          pool.push({
            ...f,
            entityDisplayName: ent.displayName,
            isBridgeField: bridgeEntities.some((b) => b.entityId === ent.entityId)
          });
        });
      });
    } else {
      const entId = parseInt(activeTableTab);
      const ent = entities.find((e) => e.entityId === entId);
      const entFields = entityFieldsCache[entId] || (selectedEntity?.entityId === entId ? fields : []);
      pool = entFields.map((f) => ({
        ...f,
        entityDisplayName: ent?.displayName || f.physicalTableName,
        isBridgeField: bridgeEntities.some((b) => b.entityId === entId)
      }));
    }

    if (!fieldSearch.trim()) return pool;
    const q = fieldSearch.toLowerCase();
    return pool.filter(
      (f) =>
        f.displayName?.toLowerCase().includes(q) ||
        f.physicalColumnName?.toLowerCase().includes(q) ||
        f.entityDisplayName?.toLowerCase().includes(q)
    );
  }, [activeTableTab, activeEntities, entityFieldsCache, selectedEntity, fields, bridgeEntities, fieldSearch]);

  // 7. Combined list of filterable columns (across selected columns, active tables, and bridge tables)
  const availableFilterColumns = useMemo(() => {
    const list = [...selectedColumns];
    activeEntities.forEach((ent) => {
      const entFields = entityFieldsCache[ent.entityId] || (selectedEntity?.entityId === ent.entityId ? fields : []);
      entFields.forEach((f) => {
        if (
          !list.some(
            (c) =>
              c.physicalTable?.toLowerCase() === f.physicalTableName?.toLowerCase() &&
              c.physicalColumn?.toLowerCase() === f.physicalColumnName?.toLowerCase()
          )
        ) {
          list.push({
            fieldId: f.fieldId,
            physicalTable: f.physicalTableName,
            physicalColumn: f.physicalColumnName,
            displayLabel: `${f.displayName} (${f.physicalTableName})`,
            dataType: f.dataType || "String"
          });
        }
      });
    });
    return list;
  }, [selectedColumns, activeEntities, entityFieldsCache, selectedEntity, fields]);

  // 8. Advanced Mode entity grouping
  const groupedEntities = useMemo(() => {
    const filtered = entities.filter((e) => {
      const q = searchQuery.toLowerCase();
      return e.displayName?.toLowerCase().includes(q) || e.physicalTableName?.toLowerCase().includes(q);
    });

    const groups = {};
    filtered.forEach((e) => {
      const domain = e.domainName || "General Modules";
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(e);
    });
    return groups;
  }, [entities, searchQuery]);

  // 9. Unique tables currently in use
  const tablesInUse = useMemo(() => {
    return Array.from(new Set(selectedColumns.map((c) => c.physicalTable)));
  }, [selectedColumns]);

  // 10. Filter saved reports by title/category
  const filteredSavedReports = useMemo(() => {
    if (!reportsListSearch.trim()) return savedReportsList;
    const q = reportsListSearch.toLowerCase();
    return savedReportsList.filter(
      (r) =>
        r.reportTitle?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.createdByName?.toLowerCase().includes(q)
    );
  }, [savedReportsList, reportsListSearch]);

  // 11. High-Level Dynamic Results Renderer (Tree / Merged / Flat)
  const renderPreviewContent = () => {
    if (displayedPreviewData.length === 0) {
      return (
        <div className="text-center py-5 text-muted">
          <FaTable size={36} color="#cbd5e1" className="mb-2" />
          <div style={{ fontWeight: 600 }}>No records found for current selection.</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Select columns above or click a Ready-Made Template to load data.
          </div>
        </div>
      );
    }

    // 1. MASTER-DETAIL ACCORDION TREE VIEW
    if (viewStyle === "tree") {
      const childCols = columnHeaders.filter((c) => c !== effectiveGroupByColumn);

      return (
        <div className="rb-tree-container">
          {groupedData.map((group, gIdx) => {
            const isExpanded = expandedGroups.has(group.groupKey);
            const metaCols = columnHeaders
              .filter((c) => c !== effectiveGroupByColumn)
              .slice(0, 3);

            return (
              <div key={gIdx} className="rb-master-group-card">
                <div
                  className="rb-master-group-header"
                  onClick={() => toggleGroup(group.groupKey)}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span className="rb-master-toggle-icon">
                      {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                    </span>
                    <span className="rb-master-key-badge">
                      {effectiveGroupByColumn}: <strong>{group.groupKey}</strong>
                    </span>
                    <span className="rb-master-count-badge">
                      {group.itemCount} {group.itemCount === 1 ? "Row" : "Linked Rows"}
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    {metaCols.map((mc, mIdx) => {
                      const val = group.parentRow[mc];
                      if (val === null || val === undefined || val === "") return null;
                      return (
                        <span key={mIdx} className="rb-master-meta-tag">
                          {mc}: <strong>{String(val)}</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {isExpanded && (
                  <div className="rb-child-grid">
                    <table className="rb-table mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: "40px" }}>#</th>
                          {childCols.map((col, cIdx) => (
                            <th key={cIdx}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item, itemIdx) => (
                          <tr key={itemIdx}>
                            <td className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {itemIdx + 1}
                            </td>
                            {childCols.map((col, cIdx) => (
                              <td key={cIdx}>
                                {item[col] !== null && item[col] !== undefined ? String(item[col]) : "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // 2. SMART ROW-MERGED VIEW WITH GROUP SUB-TOTALS
    if (viewStyle === "smart") {
      const numericCols = columnHeaders.filter((col) => {
        return displayedPreviewData.some((r) => {
          const v = r[col];
          return v !== null && v !== undefined && !isNaN(Number(v)) && typeof v !== "boolean";
        });
      });

      return (
        <table className="rb-table">
          <thead>
            <tr>
              {columnHeaders.map((col, idx) => (
                <th key={idx}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedData.map((group, gIdx) => {
              const groupTotals = {};
              numericCols.forEach((col) => {
                const sum = group.items.reduce((acc, row) => {
                  const val = parseFloat(row[col]);
                  return isNaN(val) ? acc : acc + val;
                }, 0);
                groupTotals[col] = sum;
              });

              return (
                <React.Fragment key={gIdx}>
                  {group.items.map((row, rIdx) => (
                    <tr key={`${gIdx}_${rIdx}`}>
                      {columnHeaders.map((col, cIdx) => {
                        if (col === effectiveGroupByColumn) {
                          if (rIdx === 0) {
                            return (
                              <td
                                key={cIdx}
                                rowSpan={group.items.length}
                                className="rb-merged-cell"
                              >
                                <span className="rb-merged-pill">
                                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                                </span>
                                <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px" }}>
                                  ({group.itemCount} records)
                                </div>
                              </td>
                            );
                          }
                          return null;
                        }
                        return (
                          <td key={cIdx}>
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {group.items.length > 1 && numericCols.length > 0 && (
                    <tr className="rb-subtotal-row">
                      {columnHeaders.map((col, cIdx) => {
                        if (cIdx === 0 || col === effectiveGroupByColumn) {
                          return (
                            <td key={cIdx} style={{ fontWeight: 700, color: "#1e293b" }}>
                              Total for {group.groupKey}:
                            </td>
                          );
                        }
                        if (numericCols.includes(col)) {
                          return (
                            <td key={cIdx} style={{ fontWeight: 700, color: "#2563eb" }}>
                              {Number(groupTotals[col]).toLocaleString()}
                            </td>
                          );
                        }
                        return <td key={cIdx}>-</td>;
                      })}
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      );
    }

    // 3. FLAT GRID VIEW (DEFAULT)
    return (
      <table className="rb-table">
        <thead>
          <tr>
            {columnHeaders.map((col, idx) => (
              <th key={idx}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayedPreviewData.map((row, rIdx) => (
            <tr key={rIdx}>
              {columnHeaders.map((col, cIdx) => (
                <td key={cIdx}>
                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // -------------------------------------------------------------------------
  // Save / Update Report
  // -------------------------------------------------------------------------
  const handleSaveReport = async () => {
    if (!reportTitle.trim()) {
      alert("Please enter a Report Title.");
      return;
    }

    const primaryTable = selectedEntity ? selectedEntity.physicalTableName : selectedColumns[0]?.physicalTable || "ContainerMaster";

    const configDto = {
      reportTitle: reportTitle.trim(),
      primaryEntity: primaryTable,
      description: description.trim(),
      category: category || "General",
      selectedColumns,
      customFormulas,
      filters,
      orderBy,
      joinPath,
      viewStyle,
      groupByColumn: effectiveGroupByColumn,
      selectedEntityIds,
      pagination: { defaultPageSize: pageSize, maxRows: 1000 },
      sharing: {
        showInReportsMenu: showInMenu,
        isPinnedToDashboard: pinToDashboard
      }
    };

    try {
      if (savedReportId) {
        const res = await reportBuilderService.updateReport(savedReportId, configDto);
        if (res.success) {
          setSaveSuccessMsg("Report updated successfully and version snapshot created!");
          fetchUserSavedReports();
          setTimeout(() => setShowSaveModal(false), 1200);
        }
      } else {
        const res = await reportBuilderService.saveReport(configDto);
        if (res.success) {
          setSavedReportId(res.reportId);
          setSaveSuccessMsg("Report saved successfully! View generated.");
          fetchUserSavedReports();
          setTimeout(() => setShowSaveModal(false), 1200);
        }
      }
    } catch (err) {
      alert("Failed to save report: " + (err.response?.data?.message || err.message));
    }
  };

  // -------------------------------------------------------------------------
  // High-Fidelity Client-Side Export to Excel (.xlsx)
  // -------------------------------------------------------------------------
  const handleExportExcel = () => {
    if (!previewData || previewData.length === 0) {
      alert("No report data available to export. Please generate the report first.");
      return;
    }

    try {
      const dataToExport = tableSearch && displayedPreviewData.length > 0 ? displayedPreviewData : previewData;

      let excelRows = [];
      if (viewStyle === "tree" && groupedData.length > 0) {
        groupedData.forEach((group) => {
          excelRows.push({
            "S.No": `>> ${effectiveGroupByColumn}: ${group.groupKey} (${group.itemCount} records)`
          });
          group.items.forEach((item, idx) => {
            const rowObj = { "S.No": `   ${idx + 1}` };
            columnHeaders.forEach((col) => {
              rowObj[col] = item[col] !== null && item[col] !== undefined ? item[col] : "";
            });
            excelRows.push(rowObj);
          });
          excelRows.push({});
        });
      } else {
        excelRows = dataToExport.map((row, idx) => {
          const rowObj = { "S.No": idx + 1 };
          columnHeaders.forEach((col) => {
            rowObj[col] = row[col] !== null && row[col] !== undefined ? row[col] : "";
          });
          return rowObj;
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(excelRows);

      // Auto-fit column widths
      const colWidths = [{ wch: 6 }];
      columnHeaders.forEach((col) => {
        const maxLen = Math.max(
          col.length,
          ...dataToExport.slice(0, 100).map((r) => String(r[col] || "").length)
        );
        colWidths.push({ wch: Math.min(Math.max(maxLen + 3, 12), 40) });
      });
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      const safeSheetName = (reportTitle || "ERP Report").replace(/[\/\\?*[\]]/g, "").slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

      const cleanFileName = `${(reportTitle || "Report").replace(/[\s\/:*?"<>|]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, cleanFileName);
    } catch (err) {
      console.error("Excel Export Error:", err);
      alert("Failed to export Excel file: " + err.message);
    }
  };

  // -------------------------------------------------------------------------
  // High-Fidelity Client-Side Export to PDF (.pdf)
  // -------------------------------------------------------------------------
  const handleExportPDF = () => {
    if (!previewData || previewData.length === 0) {
      alert("No report data available to export. Please generate the report first.");
      return;
    }

    try {
      const dataToExport = tableSearch && displayedPreviewData.length > 0 ? displayedPreviewData : previewData;

      // Landscape orientation if > 5 columns for maximum readability
      const isLandscape = columnHeaders.length > 5;
      const pdf = new jsPDF(isLandscape ? "landscape" : "portrait", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Premium Header Banner
      pdf.setFillColor(15, 23, 42); // Navy Slate #0f172a
      pdf.rect(0, 0, pageWidth, 22, "F");

      // Title & ERP Metadata
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text(reportTitle || "Custom ERP Report", 12, 10);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(203, 213, 225); // Slate 300
      const nowStr = new Date().toLocaleString();
      pdf.text(`Generated: ${nowStr}  |  Category: ${category || "General"}  |  Total Records: ${dataToExport.length}`, 12, 17);

      // AutoTable
      const head = [["#", ...columnHeaders]];
      const body = dataToExport.map((row, idx) => [
        idx + 1,
        ...columnHeaders.map((col) => (row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"))
      ]);

      autoTable(pdf, {
        head: head,
        body: body,
        startY: 26,
        theme: "striped",
        headStyles: {
          fillColor: [37, 99, 235], // Blue #2563eb
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
          halign: "left"
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
          cellPadding: 2.5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Light slate
        },
        margin: { left: 10, right: 10, top: 26, bottom: 14 },
        didDrawPage: (data) => {
          pdf.setFontSize(8);
          pdf.setTextColor(148, 163, 184);
          const pageStr = `Page ${data.pageNumber} of ${pdf.internal.getNumberOfPages()}`;
          pdf.text(pageStr, pageWidth - 32, pageHeight - 7);
          pdf.text("AARA Software ERP - Confidential Report", 10, pageHeight - 7);
        }
      });

      const cleanFileName = `${(reportTitle || "Report").replace(/[\s\/:*?"<>|]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(cleanFileName);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Failed to export PDF file: " + err.message);
    }
  };

  // -------------------------------------------------------------------------
  // Pagination Calculations & Helper
  // -------------------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const startRecord = totalRows === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRecord = Math.min(pageNumber * pageSize, totalRows);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPageNumber(1);
  };

  const renderPaginationBar = () => {
    if (totalRows <= 0) return null;

    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, pageNumber - 2);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }

    return (
      <div className="rb-pagination-bar">
        <div className="rb-pagination-summary">
          Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{" "}
          <strong>{totalRows}</strong> records
          <span className="text-muted ms-2">
            (Page {pageNumber} of {totalPages})
          </span>
        </div>

        <div className="rb-pagination-controls">
          <button
            className="rb-page-btn"
            onClick={() => setPageNumber(1)}
            disabled={pageNumber <= 1 || loadingQuery}
            title="First Page"
          >
            <FaAngleDoubleLeft size={11} />
          </button>
          <button
            className="rb-page-btn"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1 || loadingQuery}
            title="Previous Page"
          >
            <FaChevronLeft size={10} /> Prev
          </button>

          {startPage > 1 && (
            <>
              <button className="rb-page-btn" onClick={() => setPageNumber(1)}>
                1
              </button>
              {startPage > 2 && <span className="rb-page-dots">...</span>}
            </>
          )}

          {pages.map((p) => (
            <button
              key={p}
              className={`rb-page-btn ${p === pageNumber ? "active" : ""}`}
              onClick={() => setPageNumber(p)}
              disabled={loadingQuery}
            >
              {p}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="rb-page-dots">...</span>}
              <button className="rb-page-btn" onClick={() => setPageNumber(totalPages)}>
                {totalPages}
              </button>
            </>
          )}

          <button
            className="rb-page-btn"
            onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
            disabled={pageNumber >= totalPages || loadingQuery}
            title="Next Page"
          >
            Next <FaChevronRight size={10} />
          </button>
          <button
            className="rb-page-btn"
            onClick={() => setPageNumber(totalPages)}
            disabled={pageNumber >= totalPages || loadingQuery}
            title="Last Page"
          >
            <FaAngleDoubleRight size={11} />
          </button>
        </div>
      </div>
    );
  };


  return (
    <div className="report-builder-container">
      {/* --------------------------------------------------------------------
          TOPBAR: Mode Switcher, Title, & Actions
          -------------------------------------------------------------------- */}
      <div className="rb-topbar">
        <div className="rb-title-section">
          {/* Mode Switcher Segmented Control */}
          <div className="rb-mode-switcher">
            <button
              className={`rb-mode-btn ${uiMode === "simple" ? "active" : ""}`}
              onClick={() => setUiMode("simple")}
              title="Easy 3-step guided report creator"
            >
              <FaMagic color={uiMode === "simple" ? "#2563eb" : "#64748b"} /> Easy Guide Mode
            </button>
            <button
              className={`rb-mode-btn ${uiMode === "advanced" ? "active" : ""}`}
              onClick={() => setUiMode("advanced")}
              title="Full studio workbench for power users"
            >
              <FaCog color={uiMode === "advanced" ? "#2563eb" : "#64748b"} /> Advanced Studio
            </button>
          </div>

          <input
            type="text"
            className="rb-report-title-input"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="Report Title..."
          />
          <Badge bg="primary" style={{ fontSize: "0.75rem", padding: "6px 10px", borderRadius: "12px" }}>
            {category}
          </Badge>
          {joinPath.length > 0 && (
            <Badge bg="info" style={{ fontSize: "0.72rem", padding: "6px 10px", borderRadius: "12px" }}>
              <FaLink /> {joinPath.length} Auto-Joins
            </Badge>
          )}
        </div>

        <div className="rb-topbar-actions">
          <button className="rb-btn rb-btn-outline" onClick={runLiveQuery} disabled={loadingQuery}>
            <FaPlay color="#2563eb" /> {loadingQuery ? "Running..." : "Run Report"}
          </button>
          <button
            className="rb-btn rb-btn-outline"
            onClick={() => {
              fetchUserSavedReports();
              setShowReportsListModal(true);
            }}
            title="Browse your saved reports"
          >
            <FaFolderOpen color="#2563eb" /> My Reports ({savedReportsList.filter((r) => r.createdByUserId === currentUserId).length})
          </button>
          <button className="rb-btn rb-btn-primary" onClick={() => setShowSaveModal(true)}>
            <FaSave /> {savedReportId ? "Update Report" : "Save Report"}
          </button>
          <button
            className="rb-btn rb-btn-success-export"
            onClick={handleExportExcel}
            disabled={previewData.length === 0}
            title="Download formatted Excel spreadsheet (.xlsx)"
          >
            <FaFileExcel /> Export Excel
          </button>
          <button
            className="rb-btn rb-btn-danger-export"
            onClick={handleExportPDF}
            disabled={previewData.length === 0}
            title="Download printable PDF report (.pdf)"
          >
            <FaFilePdf /> Export PDF
          </button>
          <button
            className="rb-btn rb-btn-danger-outline"
            onClick={() => {
              if (window.confirm("Reset all columns and filters?")) {
                setSelectedColumns([]);
                setFilters([]);
                setCustomFormulas([]);
                setPreviewData([]);
              }
            }}
          >
            <FaTrash /> Reset
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          GEMINI AI PROMPT-TO-REPORT ASSISTANT BAR
          -------------------------------------------------------------------- */}
      <div className="rb-ai-assistant-wrapper">
        <div className="rb-ai-assistant-card">
          <div className="rb-ai-header">
            <div className="rb-ai-title-wrap">
              <span className="rb-ai-badge">
                <FaMagic className="rb-ai-sparkle-icon" /> AI Reporting Assistant
              </span>
              <span className="rb-ai-subtitle">
                Instantly create custom ERP reports using natural language commands
              </span>
            </div>
            <div className="rb-ai-guardrail-tag">
              <FaLock size={10} style={{ marginRight: 4 }} /> Factory & ERP Guardrails Active
            </div>
          </div>

          <div className="rb-ai-input-row">
            <div className="rb-ai-input-wrap">
              <FaSearch className="rb-ai-search-icon" />
              <input
                type="text"
                className="rb-ai-input"
                placeholder='Enter a reporting command... E.g., "Show paused machines from last month with downtime > 15 mins" or "Container shipment tracking summary"'
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loadingAi) {
                    handleGenerateAiReport();
                  }
                }}
                disabled={loadingAi}
              />
              {aiPrompt && (
                <button
                  type="button"
                  className="rb-ai-clear-btn"
                  onClick={() => setAiPrompt("")}
                  title="Clear text"
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="rb-ai-generate-btn"
              onClick={() => handleGenerateAiReport()}
              disabled={loadingAi || !aiPrompt.trim()}
            >
              {loadingAi ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Building Report...
                </>
              ) : (
                <>
                  <FaMagic className="me-2" /> Generate Report ✨
                </>
              )}
            </button>
          </div>

          {/* Quick Prompt Suggestion Pills */}
          <div className="rb-ai-chips-row">
            <span className="rb-ai-chips-label">Quick Prompts:</span>
            {AI_SAMPLE_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="rb-ai-chip-btn"
                onClick={() => {
                  setAiPrompt(item.prompt);
                  handleGenerateAiReport(item.prompt);
                }}
                disabled={loadingAi}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Rejection / Scope Alert Banner (When Guardrail triggers) */}
          {aiRejectionMsg && (
            <div className="rb-ai-alert rb-ai-alert-warning">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <span className="rb-ai-alert-icon">⚠️</span>
                  <div>
                    <strong>ERP Reporting Scope Restriction:</strong>
                    <div style={{ fontSize: "0.83rem", marginTop: 2 }}>{aiRejectionMsg}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm text-muted p-0"
                  onClick={() => setAiRejectionMsg("")}
                  title="Dismiss"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          )}

          {/* Success Explanation Banner */}
          {aiExplanation && (
            <div className="rb-ai-alert rb-ai-alert-success">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center">
                  <span className="rb-ai-alert-icon">✨</span>
                  <div>
                    <strong>AI Report Configured & Loaded:</strong>
                    <div style={{ fontSize: "0.83rem", marginTop: 2 }}>{aiExplanation}</div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {previewData.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      style={{ fontSize: "0.78rem", fontWeight: "600", padding: "5px 12px", borderRadius: "6px" }}
                      onClick={handleExportExcel}
                      title="Download formatted Excel spreadsheet now"
                    >
                      <FaFileExcel className="me-1" /> Download Excel ({totalRows || previewData.length} rows)
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm text-muted p-0"
                    onClick={() => setAiExplanation("")}
                    title="Dismiss"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          MODE 1: SIMPLE GUIDED WIZARD (DEFAULT USER-FRIENDLY VIEW)
          ==================================================================== */}
      {uiMode === "simple" && (
        <div className="rb-simple-container">
          {/* 1. Quick-Start Ready-Made Templates Bar */}
          <div className="rb-templates-panel">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="rb-section-eyebrow">
                <FaStar color="#f59e0b" /> READY-TO-USE POPULAR REPORTS (1-CLICK LOAD)
              </span>
              <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                Click any template below to immediately view live data
              </span>
            </div>

            <div className="rb-template-cards-grid">
              {PRESET_TEMPLATES.map((tpl) => {
                const IconComponent = tpl.icon;
                return (
                  <div
                    key={tpl.id}
                    className="rb-template-card"
                    onClick={() => handleLaunchTemplate(tpl)}
                    style={{ borderColor: tpl.color + "30" }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <div className="rb-tpl-icon-box" style={{ background: tpl.bgColor, color: tpl.color }}>
                        <IconComponent />
                      </div>
                      <Badge style={{ background: tpl.color, fontSize: "0.68rem" }}>{tpl.badge}</Badge>
                    </div>
                    <div className="rb-tpl-title">{tpl.title}</div>
                    <div className="rb-tpl-desc">{tpl.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. 3-Step Guided Customization Wizard */}
          <div className="rb-wizard-steps-container">
            {/* STEP 1: Choose Business Topic / Module */}
            <div className="rb-wizard-card">
              <div className="rb-step-header">
                <div className="rb-step-num">1</div>
                <div>
                  <h6 className="rb-step-title">Choose Business Area / Module</h6>
                  <p className="rb-step-subtitle">What part of the factory would you like to report on? Select multiple modules to link tables across departments.</p>
                </div>
              </div>

              {/* Active Multi-Table Data Sources & Auto Bridge Flow */}
              <div className="rb-multi-table-panel mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="rb-multi-table-title">
                      <FaProjectDiagram color="#2563eb" /> Active Tables ({selectedEntityIds.length} Selected)
                    </span>
                    {bridgeEntities.length > 0 && (
                      <span className="rb-bridge-table-pill" title="Intermediate join bridge table automatically discovered">
                        ⚡ {bridgeEntities.map((b) => b.displayName).join(", ")} (Auto-Bridge)
                      </span>
                    )}
                  </div>
                  <span className="text-muted" style={{ fontSize: "0.76rem" }}>
                    Tip: Click multiple module cards below to combine tables
                  </span>
                </div>

                {/* Pills of currently selected tables */}
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  {selectedEntityIds.map((id) => {
                    const ent = entities.find((e) => e.entityId === id);
                    if (!ent) return null;
                    return (
                      <span key={id} className="rb-active-table-pill">
                        <span>{ent.displayName}</span>
                        {selectedEntityIds.length > 1 && (
                          <button
                            type="button"
                            className="rb-remove-table-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTableFromReport(id);
                            }}
                            title="Remove table from report"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    );
                  })}

                  {bridgeEntities.map((b) => (
                    <span key={`bridge_${b.entityId}`} className="rb-bridge-table-pill">
                      ⚡ {b.displayName} (Auto-Bridge)
                    </span>
                  ))}
                </div>

                {/* Dynamic Join Route Flow Trail */}
                {joinPath && joinPath.length > 0 && (
                  <div className="rb-route-flow-box">
                    <span className="rb-route-step">
                      {joinPath[0]?.fromTable}
                    </span>
                    {joinPath.map((step, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <span className="rb-route-arrow">➔</span>
                        <span className={`rb-route-step ${bridgeEntities.some((b) => b.physicalTableName?.toLowerCase() === step.toTable?.toLowerCase()) ? "bridge" : ""}`}>
                          {step.toTable}
                        </span>
                      </React.Fragment>
                    ))}
                    <span className="text-muted ms-auto" style={{ fontSize: "0.72rem" }}>
                      Canonical Route ({joinPath.length} hops)
                    </span>
                  </div>
                )}
              </div>

              <div className="rb-module-grid">
                {BUSINESS_MODULES.map((mod) => {
                  const isSelected = selectedEntityIds.includes(mod.id);
                  const entObj = entities.find((e) => e.entityId === mod.id);
                  const selectedCountFromMod = selectedColumns.filter(
                    (c) => c.physicalTable?.toLowerCase() === entObj?.physicalTableName?.toLowerCase()
                  ).length;

                  return (
                    <div
                      key={mod.id}
                      className={`rb-module-card ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        if (entObj) {
                          handleToggleTableSelection(entObj);
                          setCategory(mod.badge);
                        }
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span style={{ fontSize: "1.4rem" }}>{mod.icon}</span>
                        <div className="d-flex align-items-center gap-1">
                          {selectedCountFromMod > 0 && (
                            <span className="rb-mod-active-pill">{selectedCountFromMod} selected</span>
                          )}
                          {isSelected && <FaCheckCircle color="#2563eb" size={16} />}
                        </div>
                      </div>
                      <div className="rb-mod-name">{mod.name}</div>
                      <div className="rb-mod-subtitle">{mod.subtitle}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: Choose Columns to Display (Interactive Pills) */}
            <div className="rb-wizard-card">
              <div className="rb-step-header d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <div className="rb-step-num">2</div>
                  <div>
                    <h6 className="rb-step-title">Select Columns to Show</h6>
                    <p className="rb-step-subtitle">
                      Click pills below to add or remove columns ({selectedColumns.length} Selected)
                    </p>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button className="rb-btn-xs" onClick={handleSelectRecommendedFields}>
                    <FaStar color="#f59e0b" /> Recommended
                  </button>
                  <button className="rb-btn-xs" onClick={handleSelectAllFields}>
                    Select All
                  </button>
                  <button className="rb-btn-xs text-danger" onClick={() => setSelectedColumns([])}>
                    Clear
                  </button>
                </div>
              </div>

              {/* Table Tabs Bar for Cross-Table Field Selection */}
              <div className="rb-table-tabs-bar mb-3">
                <button
                  type="button"
                  className={`rb-table-tab-btn ${activeTableTab === "ALL" ? "active" : ""}`}
                  onClick={() => setActiveTableTab("ALL")}
                >
                  <FaLayerGroup /> All Selected Tables
                  <span className="rb-table-tab-badge">{selectedColumns.length}</span>
                </button>

                {activeEntities.map((ent) => {
                  const isBridge = bridgeEntities.some((b) => b.entityId === ent.entityId);
                  const isTabActive = activeTableTab === String(ent.entityId);
                  const colsInThisTable = selectedColumns.filter(
                    (c) => c.physicalTable?.toLowerCase() === ent.physicalTableName?.toLowerCase()
                  ).length;

                  return (
                    <button
                      key={ent.entityId}
                      type="button"
                      className={`rb-table-tab-btn ${isTabActive ? "active" : ""}`}
                      onClick={() => {
                        setActiveTableTab(String(ent.entityId));
                        setSelectedEntity(ent);
                      }}
                    >
                      {isBridge ? "⚡ " : ""}{ent.displayName}
                      {isBridge && <span style={{ fontSize: "0.68rem", opacity: 0.8 }}>(Bridge)</span>}
                      {colsInThisTable > 0 && (
                        <span className="rb-table-tab-badge">{colsInThisTable}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Columns Summary Shelf */}
              {selectedColumns.length > 0 && (
                <div className="rb-selected-summary-shelf">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="rb-selected-summary-title">
                      Selected Columns ({selectedColumns.length}) across{" "}
                      {Array.from(new Set(selectedColumns.map((c) => c.physicalTable))).length} Module(s):
                    </span>
                    <button
                      className="btn btn-link btn-sm p-0 text-danger text-decoration-none"
                      style={{ fontSize: "0.78rem" }}
                      onClick={() => setSelectedColumns([])}
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="rb-selected-chips-wrap">
                    {selectedColumns.map((col, idx) => {
                      const mod = BUSINESS_MODULES.find(
                        (m) =>
                          entities.find((e) => e.entityId === m.id)?.physicalTableName?.toLowerCase() ===
                          col.physicalTable?.toLowerCase()
                      );
                      return (
                        <span key={`${col.physicalTable}_${col.physicalColumn}_${idx}`} className="rb-selected-chip">
                          <span className="rb-chip-mod">{mod?.icon || "📄"} {col.physicalTable}</span>
                          <span className="rb-chip-name">{col.displayLabel}</span>
                          <button
                            type="button"
                            className="rb-chip-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveColumn(idx);
                            }}
                            title="Remove"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  {/* Auto-Join Status Indicator */}
                  {Array.from(new Set(selectedColumns.map((c) => c.physicalTable))).length > 1 && (
                    <div className="rb-auto-join-indicator">
                      <span className="rb-join-badge">
                        <FaCheckCircle /> Multi-Module Auto-Linked
                      </span>
                      <span>
                        {joinPath && joinPath.length > 0
                          ? `Connected via ${joinPath.length} relation(s): ${joinPath.map((j) => `${j.fromTable} ➔ ${j.toTable}`).join(", ")}`
                          : "Establishing shortest relation bridge between selected tables..."}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick field search */}
              <div className="rb-field-search-bar mb-3">
                <FaSearch className="rb-field-search-icon" />
                <input
                  type="text"
                  placeholder={`Search fields in ${activeTableTab === "ALL" ? "all selected tables" : selectedEntity?.displayName || "current table"} (e.g. date, qty, item, code)...`}
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                />
              </div>

              {/* Column Pills Grid */}
              <div className="rb-pills-shelf">
                {displayedActiveFields.map((f) => {
                  const isChecked = selectedColumns.some(
                    (c) =>
                      c.physicalTable?.toLowerCase() === f.physicalTableName?.toLowerCase() &&
                      c.physicalColumn?.toLowerCase() === f.physicalColumnName?.toLowerCase()
                  );
                  return (
                    <div
                      key={`${f.physicalTableName}_${f.physicalColumnName}`}
                      className={`rb-field-pill ${isChecked ? "active" : ""}`}
                      onClick={() => handleToggleColumn(f)}
                    >
                      {isChecked ? <FaCheck size={11} /> : <span className="rb-pill-plus">+</span>}
                      <span>{f.displayName}</span>
                      {activeTableTab === "ALL" && (
                        <span className="badge bg-light text-secondary ms-1" style={{ fontSize: "0.65rem" }}>
                          {f.entityDisplayName || f.physicalTableName}
                        </span>
                      )}
                      <span className="rb-pill-type">{f.dataType}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 3: Date & Quick Filters */}
            <div className="rb-wizard-card">
              <div className="rb-step-header d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <div className="rb-step-num">3</div>
                  <div>
                    <h6 className="rb-step-title">Date Period & Filters</h6>
                    <p className="rb-step-subtitle">Filter records by date or search keywords</p>
                  </div>
                </div>

                <button className="rb-btn rb-btn-primary" onClick={runLiveQuery} style={{ padding: "8px 18px" }}>
                  <FaPlay /> Generate Report
                </button>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    <FaCalendarAlt /> Time Period:
                  </span>
                  <div className="rb-date-presets">
                    <button
                      className={`rb-preset-chip ${datePreset === "ALL" ? "active" : ""}`}
                      onClick={() => handleApplyDatePreset("ALL")}
                    >
                      All Time
                    </button>
                    <button
                      className={`rb-preset-chip ${datePreset === "TODAY" ? "active" : ""}`}
                      onClick={() => handleApplyDatePreset("TODAY")}
                    >
                      Today
                    </button>
                    <button
                      className={`rb-preset-chip ${datePreset === "THIS_WEEK" ? "active" : ""}`}
                      onClick={() => handleApplyDatePreset("THIS_WEEK")}
                    >
                      This Week
                    </button>
                    <button
                      className={`rb-preset-chip ${datePreset === "THIS_MONTH" ? "active" : ""}`}
                      onClick={() => handleApplyDatePreset("THIS_MONTH")}
                    >
                      This Month
                    </button>
                    <button
                      className={`rb-preset-chip ${datePreset === "LAST_30" ? "active" : ""}`}
                      onClick={() => handleApplyDatePreset("LAST_30")}
                    >
                      Last 30 Days
                    </button>
                  </div>
                </div>

                {filters.length > 0 && (
                  <div className="d-flex align-items-center gap-2 ms-auto">
                    <Badge bg="secondary" style={{ fontSize: "0.75rem" }}>
                      {filters.length} Active Filters
                    </Badge>
                    <button className="rb-btn-xs text-danger" onClick={() => setFilters([])}>
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Live Preview & Results Section */}
          <div className="rb-results-card">
            <div className="rb-results-header">
              <div className="d-flex align-items-center gap-3">
                <span className="rb-results-count">
                  ✅ <strong>{totalRows} Records Found</strong>
                </span>
                <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                  (Generated in {executionTimeMs} ms)
                </span>
                {loadingQuery && <Spinner animation="border" size="sm" variant="primary" />}
              </div>

              {/* View Style Switcher & Group By */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="rb-view-style-switcher">
                  <button
                    className={`rb-view-btn ${viewStyle === "tree" ? "active" : ""}`}
                    onClick={() => setViewStyle("tree")}
                    title="Master-Detail Hierarchical Tree (e.g. 1 Container -> Multiple Job Cards)"
                  >
                    <FaSitemap /> Tree View
                  </button>
                  <button
                    className={`rb-view-btn ${viewStyle === "smart" ? "active" : ""}`}
                    onClick={() => setViewStyle("smart")}
                    title="Smart Row-Merged Table with Subtotals"
                  >
                    <FaLayerGroup /> Merged Rows
                  </button>
                  <button
                    className={`rb-view-btn ${viewStyle === "flat" ? "active" : ""}`}
                    onClick={() => setViewStyle("flat")}
                    title="Standard Flat Data Grid"
                  >
                    <FaTable /> Flat Grid
                  </button>
                </div>

                {columnHeaders.length > 1 && (
                  <div className="d-flex align-items-center gap-1" style={{ fontSize: "0.78rem" }}>
                    <span className="text-muted fw-semibold">Group By:</span>
                    <Form.Select
                      size="sm"
                      style={{ width: "160px", fontSize: "0.75rem", padding: "2px 6px" }}
                      value={effectiveGroupByColumn}
                      onChange={(e) => setGroupByColumn(e.target.value)}
                    >
                      {columnHeaders.map((col, idx) => (
                        <option key={idx} value={col}>
                          {col}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                )}

                {viewStyle === "tree" && groupedData.length > 0 && (
                  <div className="d-flex align-items-center gap-1">
                    <button
                      className="rb-btn-xs"
                      onClick={() => toggleAllGroups(true)}
                      title="Expand All Master Groups"
                    >
                      Expand All
                    </button>
                    <button
                      className="rb-btn-xs"
                      onClick={() => toggleAllGroups(false)}
                      title="Collapse All Master Groups"
                    >
                      Collapse All
                    </button>
                  </div>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  className="rb-btn-export-pill excel"
                  onClick={handleExportExcel}
                  disabled={previewData.length === 0}
                  title="Export live table to Excel (.xlsx)"
                >
                  <FaFileExcel /> Export Excel
                </button>
                <button
                  className="rb-btn-export-pill pdf"
                  onClick={handleExportPDF}
                  disabled={previewData.length === 0}
                  title="Export live table to PDF (.pdf)"
                >
                  <FaFilePdf /> Export PDF
                </button>

                <div className="rb-table-search-box">
                  <FaSearch className="rb-table-search-icon" />
                  <input
                    type="text"
                    placeholder="Search inside table..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                  />
                  {tableSearch && (
                    <FaTimes
                      style={{ cursor: "pointer", color: "#94a3b8", fontSize: "0.75rem" }}
                      onClick={() => setTableSearch("")}
                    />
                  )}
                </div>

                <Form.Select
                  size="sm"
                  style={{ width: "95px", fontSize: "0.75rem" }}
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                >
                  <option value={25}>25 Rows</option>
                  <option value={50}>50 Rows</option>
                  <option value={100}>100 Rows</option>
                  <option value={500}>500 Rows</option>
                </Form.Select>
              </div>
            </div>

            <div className="rb-grid-container">
              {renderPreviewContent()}
            </div>

            {/* Pagination Controls */}
            {renderPaginationBar()}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODE 2: ADVANCED STUDIO WORKBENCH (COLLAPSIBLE ACCORDION & MAPPING)
          ==================================================================== */}
      {uiMode === "advanced" && (
        <div className="rb-studio-body">
          {/* ----------------------------------------------------------------
              ZONE 1: Collapsible Data Entity Explorer (Left Panel)
              ---------------------------------------------------------------- */}
          <div className="rb-explorer-panel">
            <div className="rb-explorer-header">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                  <FaLayerGroup color="#2563eb" /> ENTITY MODULES
                </span>
                <div className="d-flex gap-1">
                  <button className="rb-btn-micro" onClick={() => toggleAllDomains(true)} title="Expand all categories">
                    Expand
                  </button>
                  <button className="rb-btn-micro" onClick={() => toggleAllDomains(false)} title="Collapse all categories">
                    Collapse
                  </button>
                </div>
              </div>

              <div className="rb-search-wrapper">
                <FaSearch className="rb-search-icon" />
                <input
                  type="text"
                  className="rb-search-input"
                  placeholder="Filter tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Accordion Domain Categories */}
            <div className="rb-entity-list">
              {loadingMetadata ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" variant="primary" />
                </div>
              ) : (
                Object.keys(groupedEntities).map((domain) => {
                  const isOpen = openDomains.has(domain);
                  const domainEntities = groupedEntities[domain];

                  return (
                    <div key={domain} className="rb-domain-accordion-block">
                      <div className="rb-domain-accordion-header" onClick={() => toggleDomain(domain)}>
                        <div className="d-flex align-items-center gap-2">
                          {isOpen ? <FaChevronDown size={10} color="#64748b" /> : <FaChevronRight size={10} color="#64748b" />}
                          <span className="rb-domain-title-text">{domain}</span>
                        </div>
                        <Badge bg="light" text="dark" style={{ fontSize: "0.68rem", border: "1px solid #cbd5e1" }}>
                          {domainEntities.length}
                        </Badge>
                      </div>

                      {isOpen && (
                        <div className="rb-domain-accordion-content">
                          {domainEntities.map((ent) => {
                            const isSelected = selectedEntity?.entityId === ent.entityId;
                            const isDirect = relatedEntitiesMap.direct.has(ent.entityId);
                            const isExtended = relatedEntitiesMap.extended.has(ent.entityId);

                            return (
                              <div
                                key={ent.entityId}
                                className={`rb-entity-item ${isSelected ? "active" : ""}`}
                                onClick={() => handleSelectEntity(ent)}
                              >
                                <span style={{ fontSize: "0.8rem" }}>{ent.displayName}</span>
                                {isDirect ? (
                                  <span className="rb-entity-tag rb-tag-direct">🟢 Direct</span>
                                ) : isExtended ? (
                                  <span className="rb-entity-tag rb-tag-extended">🔗 Link</span>
                                ) : (
                                  <span className="rb-entity-tag rb-tag-unconnected">{ent.fieldCount} cols</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Collapsible Active Entity Fields Drawer */}
            {selectedEntity && (
              <div className="rb-field-list-section">
                <div
                  className="d-flex justify-content-between align-items-center mb-2"
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowFieldsDrawer((p) => !p)}
                >
                  <div className="d-flex align-items-center gap-2">
                    {showFieldsDrawer ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    <strong style={{ fontSize: "0.8rem", color: "#1e293b" }}>{selectedEntity.displayName} Fields</strong>
                  </div>
                  <Badge bg="primary" style={{ fontSize: "0.68rem" }}>
                    {fields.length} Active
                  </Badge>
                </div>

                {showFieldsDrawer && (
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {fields.map((f) => {
                      const isChecked = selectedColumns.some(
                        (c) => c.physicalTable === f.physicalTableName && c.physicalColumn === f.physicalColumnName
                      );
                      return (
                        <div key={f.fieldId} className="rb-field-item" onClick={() => handleToggleColumn(f)}>
                          <div className="d-flex align-items-center gap-2">
                            <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ cursor: "pointer" }} />
                            <span>{f.displayName}</span>
                          </div>
                          <span className="rb-type-badge">{f.dataType}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------
              WORKBENCH (Right Side: Collapsible Cards with Visual Mapping)
              ---------------------------------------------------------------- */}
          <div className="rb-workbench">
            <div className="rb-workbench-scrollable">
              {/* ACCORDION 1: Selected Columns Shelf */}
              <div className="rb-adv-card">
                <div className="rb-adv-card-header" onClick={() => toggleSection("columns")}>
                  <div className="d-flex align-items-center gap-2">
                    {openSections.columns ? <FaChevronUp size={12} color="#64748b" /> : <FaChevronDown size={12} color="#64748b" />}
                    <span className="rb-adv-card-title">
                      <FaTable color="#2563eb" /> Selected Columns & Metrics
                    </span>
                    <Badge bg="primary" style={{ fontSize: "0.72rem" }}>
                      {selectedColumns.length} Active
                    </Badge>
                  </div>

                  <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button className="rb-btn-xs" onClick={() => setShowFormulaModal(true)}>
                      <FaCalculator color="#2563eb" /> + Add Formula
                    </button>
                    {selectedColumns.length > 0 && (
                      <button className="rb-btn-xs text-danger" onClick={() => setSelectedColumns([])}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {openSections.columns && (
                  <div className="rb-adv-card-body">
                    {selectedColumns.length === 0 ? (
                      <div className="text-muted p-3 text-center" style={{ fontSize: "0.82rem" }}>
                        👈 Click any fields from the left Entity Explorer to add columns to your report.
                      </div>
                    ) : (
                      <div className="rb-columns-row">
                        {selectedColumns.map((col, idx) => (
                          <div key={idx} className="rb-column-card">
                            <div className="rb-col-card-top">
                              <span className="rb-card-label" title={`${col.physicalTable}.${col.physicalColumn}`}>
                                {col.displayLabel}
                              </span>
                              <FaTimes className="rb-card-close" onClick={() => handleRemoveColumn(idx)} />
                            </div>
                            <div className="d-flex align-items-center justify-content-between mt-1 gap-2">
                              <small className="text-muted" style={{ fontSize: "0.68rem" }}>
                                {col.dataType}
                              </small>
                              <select
                                className="rb-agg-select"
                                value={col.aggregation || "NONE"}
                                onChange={(e) => handleUpdateColumnAgg(idx, e.target.value)}
                              >
                                <option value="NONE">- None -</option>
                                <option value="SUM">Sum (∑)</option>
                                <option value="AVG">Average (Avg)</option>
                                <option value="COUNT">Count (Rows)</option>
                                <option value="MIN">Min</option>
                                <option value="MAX">Max</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACCORDION 2: Visual Entity Join & Relationship Mapping */}
              <div className="rb-adv-card">
                <div className="rb-adv-card-header" onClick={() => toggleSection("mapping")}>
                  <div className="d-flex align-items-center gap-2">
                    {openSections.mapping ? <FaChevronUp size={12} color="#64748b" /> : <FaChevronDown size={12} color="#64748b" />}
                    <span className="rb-adv-card-title">
                      <FaProjectDiagram color="#8b5cf6" /> Entity Relationship & Auto-Join Mapping
                    </span>
                    <Badge bg="secondary" style={{ fontSize: "0.72rem" }}>
                      {tablesInUse.length} Tables Connected
                    </Badge>
                    {joinPath.length > 0 && (
                      <Badge bg="info" style={{ fontSize: "0.72rem" }}>
                        {joinPath.length} BFS Links
                      </Badge>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Form.Select
                      size="sm"
                      style={{ fontSize: "0.75rem", width: "200px" }}
                      onChange={(e) => {
                        handleAddRelatedTable(e.target.value);
                        e.target.value = "";
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        + Link Related Table...
                      </option>
                      <optgroup label="Direct Connected Tables (1-Hop)">
                        {Array.from(relatedEntitiesMap.direct).map((id) => {
                          const ent = entities.find((e) => e.entityId === id);
                          return ent ? (
                            <option key={ent.entityId} value={ent.entityId}>
                              🟢 {ent.displayName}
                            </option>
                          ) : null;
                        })}
                      </optgroup>
                      <optgroup label="Extended Graph Links">
                        {Array.from(relatedEntitiesMap.extended).map((id) => {
                          const ent = entities.find((e) => e.entityId === id);
                          return ent ? (
                            <option key={ent.entityId} value={ent.entityId}>
                              🔗 {ent.displayName}
                            </option>
                          ) : null;
                        })}
                      </optgroup>
                    </Form.Select>
                  </div>
                </div>

                {openSections.mapping && (
                  <div className="rb-adv-card-body">
                    {tablesInUse.length <= 1 ? (
                      <div className="rb-mapping-single-alert">
                        <FaLink color="#3b82f6" />
                        <div>
                          <strong>Single Entity Mode:</strong> Currently querying data directly from{" "}
                          <u>{selectedEntity?.displayName || "Primary Table"}</u>.
                          <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>
                            To join other factory departments or records, pick a table from the{" "}
                            <strong>"+ Link Related Table"</strong> dropdown above or select fields from related tables on the left.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rb-mapping-trail-container">
                        <div className="rb-mapping-trail">
                          <div className="rb-mapping-node primary">
                            <span className="rb-node-badge">Primary</span>
                            <span className="rb-node-title">{tablesInUse[0]}</span>
                          </div>

                          {joinPath.map((step, sIdx) => (
                            <React.Fragment key={sIdx}>
                              <div className="rb-mapping-connector">
                                <div className="rb-connector-line" />
                                <div className="rb-connector-badge" title={step.condition}>
                                  {step.joinType || "INNER JOIN"}
                                </div>
                                <FaArrowRight className="rb-connector-arrow" />
                              </div>

                              <div className="rb-mapping-node linked">
                                <span className="rb-node-badge">Auto-Linked</span>
                                <span className="rb-node-title">{step.toTable}</span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>

                        <div className="rb-mapping-footer-note">
                          ✅ BFS Pathfinding resolved shortest database join path automatically with Zero-Lock (WITH NOLOCK).
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACCORDION 3: Smart Filter Rules & Conditions */}
              <div className="rb-adv-card">
                <div className="rb-adv-card-header" onClick={() => toggleSection("filters")}>
                  <div className="d-flex align-items-center gap-2">
                    {openSections.filters ? <FaChevronUp size={12} color="#64748b" /> : <FaChevronDown size={12} color="#64748b" />}
                    <span className="rb-adv-card-title">
                      <FaFilter color="#f59e0b" /> Filter Rules & Criteria
                    </span>
                    <Badge bg="secondary" style={{ fontSize: "0.72rem" }}>
                      {filters.length} Rules Active
                    </Badge>
                  </div>

                  <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button className="rb-btn-xs" onClick={handleAddFilter}>
                      <FaPlus /> Add Filter Rule
                    </button>
                    {filters.length > 0 && (
                      <button className="rb-btn-xs text-danger" onClick={() => setFilters([])}>
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {openSections.filters && (
                  <div className="rb-adv-card-body">
                    {filters.length === 0 ? (
                      <div className="text-muted p-2 text-center" style={{ fontSize: "0.82rem" }}>
                        No filters applied. Click <strong>"+ Add Filter Rule"</strong> above to filter by specific values or dates.
                      </div>
                    ) : (
                      <div className="rb-filters-grid">
                        {filters.map((flt, idx) => {
                          const currentKey = `${flt.physicalTable}.${flt.physicalColumn}`;
                          return (
                            <div key={idx} className="rb-filter-card">
                              {/* 1. Field Dropdown */}
                              <Form.Select
                                size="sm"
                                className="rb-filter-select"
                                value={currentKey}
                                onChange={(e) => handleFilterColumnChange(idx, e.target.value)}
                              >
                                {availableFilterColumns.map((c, i) => (
                                  <option key={i} value={`${c.physicalTable}.${c.physicalColumn}`}>
                                    {c.displayLabel}
                                  </option>
                                ))}
                              </Form.Select>

                              {/* 2. Operator Dropdown */}
                              <Form.Select
                                size="sm"
                                className="rb-filter-select"
                                style={{ width: "160px" }}
                                value={flt.operator}
                                onChange={(e) => handleUpdateFilter(idx, "operator", e.target.value)}
                              >
                                <option value="EQ">Is Equal To (=)</option>
                                <option value="NEQ">Does Not Equal (≠)</option>
                                <option value="LIKE">Contains Text</option>
                                <option value="GT">Greater Than (&gt;)</option>
                                <option value="LT">Less Than (&lt;)</option>
                                <option value="IS_NULL">Is Empty (Null)</option>
                                <option value="IS_NOT_NULL">Is Not Empty</option>
                              </Form.Select>

                              {/* 3. Value Input */}
                              {flt.operator !== "IS_NULL" && flt.operator !== "IS_NOT_NULL" && (
                                <Form.Control
                                  size="sm"
                                  className="rb-filter-input"
                                  type={flt.dataType === "DateTime" ? "date" : "text"}
                                  placeholder="Enter value..."
                                  value={flt.value1 || ""}
                                  onChange={(e) => handleUpdateFilter(idx, "value1", e.target.value)}
                                />
                              )}

                              <FaTimes className="rb-card-close ms-2" onClick={() => handleRemoveFilter(idx)} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACCORDION 4: Live Data Preview & Virtual Grid */}
              <div className="rb-adv-card">
                <div className="rb-adv-card-header" onClick={() => toggleSection("grid")}>
                  <div className="d-flex align-items-center gap-3">
                    {openSections.grid ? <FaChevronUp size={12} color="#64748b" /> : <FaChevronDown size={12} color="#64748b" />}
                    <span className="rb-adv-card-title">
                      <FaChartBar color="#10b981" /> Live Results & Virtual Grid
                    </span>
                    <span className="rb-preview-meta-pill">
                      <strong>{totalRows}</strong> Records ({executionTimeMs} ms)
                    </span>
                    {loadingQuery && <Spinner animation="border" size="sm" variant="primary" />}
                  </div>

                  <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="rb-btn-export-pill excel"
                      onClick={handleExportExcel}
                      disabled={previewData.length === 0}
                      title="Export live table to Excel (.xlsx)"
                    >
                      <FaFileExcel /> Excel
                    </button>
                    <button
                      className="rb-btn-export-pill pdf"
                      onClick={handleExportPDF}
                      disabled={previewData.length === 0}
                      title="Export live table to PDF (.pdf)"
                    >
                      <FaFilePdf /> PDF
                    </button>

                    <div className="rb-table-search-box">
                      <FaSearch className="rb-table-search-icon" />
                      <input
                        type="text"
                        placeholder="Search grid..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                      />
                    </div>

                    {viewMode === "table" && (
                      <div className="rb-view-style-switcher me-1">
                        <button
                          className={`rb-view-btn ${viewStyle === "tree" ? "active" : ""}`}
                          onClick={() => setViewStyle("tree")}
                          title="Master-Detail Tree"
                        >
                          <FaSitemap /> Tree
                        </button>
                        <button
                          className={`rb-view-btn ${viewStyle === "smart" ? "active" : ""}`}
                          onClick={() => setViewStyle("smart")}
                          title="Merged Rows"
                        >
                          <FaLayerGroup /> Merged
                        </button>
                        <button
                          className={`rb-view-btn ${viewStyle === "flat" ? "active" : ""}`}
                          onClick={() => setViewStyle("flat")}
                          title="Flat Grid"
                        >
                          <FaTable /> Flat
                        </button>
                      </div>
                    )}

                    <Button
                      variant={viewMode === "table" ? "primary" : "outline-secondary"}
                      size="sm"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                      onClick={() => setViewMode("table")}
                    >
                      <FaTable /> Table
                    </Button>
                    <Button
                      variant={viewMode === "chart" ? "primary" : "outline-secondary"}
                      size="sm"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                      onClick={() => setViewMode("chart")}
                    >
                      <FaChartBar /> Chart
                    </Button>

                    <Form.Select
                      size="sm"
                      style={{ width: "95px", fontSize: "0.75rem" }}
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                    >
                      <option value={25}>25 Rows</option>
                      <option value={50}>50 Rows</option>
                      <option value={100}>100 Rows</option>
                      <option value={500}>500 Rows</option>
                    </Form.Select>
                  </div>
                </div>

                {openSections.grid && (
                  <div className="rb-adv-card-body p-0">
                    <div className="rb-grid-container" style={{ maxHeight: "420px" }}>
                      {viewMode === "table" ? (
                        renderPreviewContent()
                      ) : (
                        <div className="p-4 text-center">
                          <h6 className="text-muted">Data Distribution Chart</h6>
                          <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                            Visual analytics rendered dynamically for numeric metric columns across {totalRows} records.
                          </p>
                          <div className="d-flex justify-content-center gap-3 mt-4">
                            {previewData.slice(0, 8).map((r, i) => (
                              <div key={i} className="d-flex flex-column align-items-center">
                                <div
                                  style={{
                                    width: "36px",
                                    height: `${Math.min(Math.max((i + 1) * 20, 30), 160)}px`,
                                    background: "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
                                    borderRadius: "4px 4px 0 0"
                                  }}
                                />
                                <small style={{ fontSize: "0.68rem", marginTop: "4px" }}>
                                  {Object.values(r)[0] || `Item ${i + 1}`}
                                </small>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pagination Controls */}
                    {renderPaginationBar()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          FORMULA BUILDER MODAL
          -------------------------------------------------------------------- */}
      <FormulaBuilderModal
        show={showFormulaModal}
        onHide={() => setShowFormulaModal(false)}
        availableColumns={selectedColumns}
        onSaveFormula={(newFormula) => {
          setCustomFormulas((prev) => [...prev, newFormula]);
          setSelectedColumns((prev) => [
            ...prev,
            {
              fieldId: -1,
              physicalTable: selectedColumns[0]?.physicalTable || "Calculated",
              physicalColumn: newFormula.label,
              displayLabel: newFormula.label,
              dataType: "Number",
              aggregation: null,
              sortOrder: prev.length + 1,
              isVisible: true
            }
          ]);
        }}
      />

      {/* --------------------------------------------------------------------
          SAVE REPORT MODAL
          -------------------------------------------------------------------- */}
      <Modal show={showSaveModal} onHide={() => setShowSaveModal(false)} centered>
        <Modal.Header closeButton style={{ background: "#0f172a", color: "#ffffff" }}>
          <Modal.Title style={{ fontSize: "1.05rem", fontWeight: 700 }}>
            <FaSave color="#10b981" /> {savedReportId ? "Update Saved Report" : "Save Custom Report"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "20px" }}>
          {saveSuccessMsg ? (
            <div className="alert alert-success d-flex align-items-center gap-2">
              <FaCheck /> {saveSuccessMsg}
            </div>
          ) : (
            <Form>
              <div className="alert alert-info py-2 px-3 d-flex align-items-center gap-2 mb-3" style={{ fontSize: "0.82rem" }}>
                <FaLock color="#0284c7" />
                <span>
                  <strong>User Privacy:</strong> Yeh report aapke account (User #{currentUserId}) ke under save hogi aur sirf aapko hi dikhegi.
                </span>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold" style={{ fontSize: "0.85rem" }}>
                  Report Title *
                </Form.Label>
                <Form.Control
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Daily Packaging Pending Summary"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold" style={{ fontSize: "0.85rem" }}>
                  Category *
                </Form.Label>
                <Form.Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="General">General</option>
                  <option value="Shipping & Logistics">Shipping & Logistics</option>
                  <option value="Raw Materials & Wood">Raw Materials & Wood</option>
                  <option value="Production & Job Cards">Production & Job Cards</option>
                  <option value="Machine Floor">Machine Floor</option>
                  <option value="Stage Transfers">Stage Transfers</option>
                  <option value="Quality & QC">Quality & QC</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold" style={{ fontSize: "0.85rem" }}>
                  Description / Notes
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes regarding report logic..."
                />
              </Form.Group>

              <div className="d-flex flex-column gap-2 mt-3 pt-2 border-top">
                <Form.Check
                  type="checkbox"
                  id="menu-check"
                  label="Show directly in ERP Sidebar Navigation (Reports Menu)"
                  checked={showInMenu}
                  onChange={(e) => setShowInMenu(e.target.checked)}
                  style={{ fontSize: "0.85rem", fontWeight: 600 }}
                />
                <Form.Check
                  type="checkbox"
                  id="dashboard-check"
                  label="Pin to User Dynamic Dashboard as a Live Widget"
                  checked={pinToDashboard}
                  onChange={(e) => setPinToDashboard(e.target.checked)}
                  style={{ fontSize: "0.85rem", fontWeight: 600 }}
                />
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowSaveModal(false)}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveReport} style={{ background: "#2563eb" }}>
            {savedReportId ? "Save Changes" : "Save as New Report"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --------------------------------------------------------------------
          MY SAVED REPORTS MODAL
          -------------------------------------------------------------------- */}
      <Modal show={showReportsListModal} onHide={() => setShowReportsListModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{ background: "#0f172a", color: "#ffffff" }}>
          <div className="d-flex align-items-center gap-2">
            <FaFolderOpen color="#38bdf8" size={18} />
            <div>
              <Modal.Title style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                My Saved Reports
              </Modal.Title>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Reports created by you or standard system templates (Logged in: User #{currentUserId})
              </div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: "20px" }}>
          {/* Search bar & filter pills */}
          <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
            <div className="rb-field-search-bar mb-0 flex-grow-1">
              <FaSearch className="rb-field-search-icon" />
              <input
                type="text"
                placeholder="Search saved reports by name or category..."
                value={reportsListSearch}
                onChange={(e) => setReportsListSearch(e.target.value)}
              />
            </div>
            <button
              className="rb-btn rb-btn-outline"
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={fetchUserSavedReports}
              disabled={loadingSavedReports}
            >
              {loadingSavedReports ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {loadingSavedReports ? (
            <div className="text-center py-4 text-muted">
              <Spinner animation="border" size="sm" /> Loading reports...
            </div>
          ) : filteredSavedReports.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaFolderOpen size={36} color="#cbd5e1" className="mb-2" />
              <p className="mb-1 fw-bold">No saved reports found.</p>
              <small>Click "Save Report" in the top bar to save your customized report!</small>
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
              <Table hover className="align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Report Title</th>
                    <th>Category</th>
                    <th>Access / Author</th>
                    <th>Last Updated</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSavedReports.map((r) => {
                    const isOwnReport = r.createdByUserId === currentUserId;
                    const isSystem = r.createdByUserId === 0;

                    return (
                      <tr key={r.reportId} style={savedReportId === r.reportId ? { background: "#eff6ff" } : {}}>
                        <td>
                          <div className="fw-bold text-dark">{r.reportTitle}</div>
                          {r.description && (
                            <small className="text-muted text-truncate d-block" style={{ maxWidth: "260px" }}>
                              {r.description}
                            </small>
                          )}
                        </td>
                        <td>
                          <Badge bg="secondary" style={{ fontSize: "0.7rem" }}>
                            {r.category || "General"}
                          </Badge>
                        </td>
                        <td>
                          {isOwnReport ? (
                            <Badge bg="success" style={{ fontSize: "0.7rem" }}>
                              <FaUser /> My Report
                            </Badge>
                          ) : isSystem ? (
                            <Badge bg="info" style={{ fontSize: "0.7rem" }}>
                              🏢 System Template
                            </Badge>
                          ) : (
                            <Badge bg="secondary" style={{ fontSize: "0.7rem" }}>
                              {r.createdByName || `User #${r.createdByUserId}`}
                            </Badge>
                          )}
                        </td>
                        <td className="text-muted" style={{ fontSize: "0.78rem" }}>
                          {r.lastUpdatedOn ? new Date(r.lastUpdatedOn).toLocaleDateString() : "-"}
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end align-items-center gap-1">
                            <button
                              className="rb-btn-xs"
                              style={{ background: "#2563eb", color: "#fff" }}
                              onClick={() => handleLoadSavedReport(r)}
                              title="Load and edit in Report Builder"
                            >
                              Load
                            </button>
                            <button
                              className="rb-btn-xs"
                              onClick={() => window.open(`/CustomReport/${r.reportId}`, "_blank")}
                              title="Open live report view"
                            >
                              View
                            </button>
                            {isOwnReport && (
                              <button
                                className="rb-btn-xs text-danger"
                                onClick={(e) => handleDeleteSavedReport(r.reportId, e)}
                                title="Delete this report"
                              >
                                <FaTrash size={10} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowReportsListModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ReportBuilderStudio;
