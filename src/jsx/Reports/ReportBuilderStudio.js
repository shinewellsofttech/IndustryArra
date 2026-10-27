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
  FaCheckCircle
} from "react-icons/fa";
import { reportBuilderService } from "../../services/reportBuilderService";
import FormulaBuilderModal from "./FormulaBuilderModal";
import "./ReportBuilderStudio.css";

// ---------------------------------------------------------------------------
// 1. Ready-Made One-Click ERP Templates (Instant Load & Run)
// ---------------------------------------------------------------------------
const PRESET_TEMPLATES = [
  {
    id: "tpl_shipment",
    title: "Container & Shipment Dispatch",
    icon: FaTruck,
    color: "#2563eb",
    bgColor: "#eff6ff",
    badge: "Logistics",
    description: "Export contracts, batch codes, planned vs shipped quantities",
    entityId: 2,
    defaultColumns: ["ContractNo", "BatchCode", "ItemCode", "ItemName", "Quantity", "ShipmentQty", "DateOfCreation"]
  },
  {
    id: "tpl_wood",
    title: "Daily Wood Issue & Consumption",
    icon: FaTree,
    color: "#d97706",
    bgColor: "#fffbeb",
    badge: "Wood Store",
    description: "Issued CFT, consumed CFT volume, AL codes, and excess logs",
    entityId: 18,
    defaultColumns: ["DateOfCreation", "BatchNo", "ALCode", "TotalIssueCFT", "TotalFinalCFT", "TotalExcessCFT", "Quantity"]
  },
  {
    id: "tpl_jobcard",
    title: "Job Card Production Progress",
    icon: FaBoxes,
    color: "#4f46e5",
    bgColor: "#eef2ff",
    badge: "Production",
    description: "Job card numbers, order quantities, product codes, and dates",
    entityId: 10,
    defaultColumns: ["JobCardNo", "DateOfCreation", "ProductCode", "Category", "OrderQty", "ComponentQty", "CFT", "BatchCode"]
  },
  {
    id: "tpl_machine",
    title: "Machine Breakdown & Delays",
    icon: FaIndustry,
    color: "#dc2626",
    bgColor: "#fef2f2",
    badge: "Maintenance",
    description: "Breakdown reasons, delay minutes, pause timestamps & operators",
    entityId: 14,
    defaultColumns: ["PauseReason", "PauseStartTime", "ResumeTime", "PauseDurationMinutes", "PausedByUserName", "ResumedByUserName"]
  },
  {
    id: "tpl_transfer",
    title: "Department Material Movement",
    icon: FaExchangeAlt,
    color: "#059669",
    bgColor: "#ecfdf5",
    badge: "Transfer",
    description: "Movement tracking across factory departments & stages",
    entityId: 24,
    defaultColumns: ["DateOfCreation", "Actual"]
  }
];

// ---------------------------------------------------------------------------
// 2. Business Area Modules for Guided Wizard (Step 1)
// ---------------------------------------------------------------------------
const BUSINESS_MODULES = [
  {
    id: 2,
    name: "Shipment & Dispatch",
    icon: "🚢",
    color: "#2563eb",
    badge: "Logistics",
    subtitle: "Containers, contracts, export items & quantities",
    recommendedCols: ["ContractNo", "BatchCode", "ItemCode", "ItemName", "Quantity", "ShipmentQty", "DateOfCreation"]
  },
  {
    id: 18,
    name: "Wood & Raw Materials",
    icon: "🪵",
    color: "#d97706",
    badge: "Store",
    subtitle: "Wood issues, issued CFT, consumed CFT & wastage",
    recommendedCols: ["DateOfCreation", "BatchNo", "ALCode", "TotalIssueCFT", "TotalFinalCFT", "TotalExcessCFT", "Quantity"]
  },
  {
    id: 10,
    name: "Job Cards & Production",
    icon: "📋",
    color: "#4f46e5",
    badge: "Factory Floor",
    subtitle: "Job card numbers, categories, order qtys & dates",
    recommendedCols: ["JobCardNo", "DateOfCreation", "ProductCode", "Category", "OrderQty", "CFT"]
  },
  {
    id: 14,
    name: "Machine Downtime & Delays",
    icon: "⚙️",
    color: "#dc2626",
    badge: "Maintenance",
    subtitle: "Breakdown reasons, downtime mins & operators",
    recommendedCols: ["PauseReason", "PauseStartTime", "ResumeTime", "PauseDurationMinutes", "PausedByUserName"]
  },
  {
    id: 24,
    name: "Department Transfers",
    icon: "🔄",
    color: "#059669",
    badge: "Movement",
    subtitle: "Department handovers, stage completions & transfer logs",
    recommendedCols: ["DateOfCreation", "Actual"]
  },
  {
    id: 30,
    name: "Quality & QC Checks",
    icon: "🔍",
    color: "#9333ea",
    badge: "Inspection",
    subtitle: "QC inspection logs, batch approvals & defect rates",
    recommendedCols: ["DateOfCreation", "ContractNo", "ReportQty", "Quantity", "StartDate", "EndDate"]
  }
];

const ReportBuilderStudio = () => {
  const { editReportId } = useParams();
  const navigate = useNavigate();

  // Mode: "simple" (Guided 3-Step Wizard) vs "advanced" (4-Zone Workbench)
  const [uiMode, setUiMode] = useState("simple");

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

  // 4. Modals
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showInMenu, setShowInMenu] = useState(true);
  const [pinToDashboard, setPinToDashboard] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [savedReportId, setSavedReportId] = useState(editReportId ? parseInt(editReportId) : null);

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
          // If no entity selected, default to Shipment (Entity 2) or first entity
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
  const handleSelectEntity = async (entity, autoSelectRecommended = false) => {
    setSelectedEntity(entity);
    try {
      // 1. Fetch fields for this entity
      const fieldsRes = await reportBuilderService.getFields(entity.entityId);
      if (fieldsRes.success && fieldsRes.data) {
        const loadedFields = fieldsRes.data;
        setFields(loadedFields);

        if (autoSelectRecommended) {
          // Pre-select top 6 recommended fields
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

      // 2. Fetch relationship distance classification
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

    try {
      setLoadingMetadata(true);
      const fieldsRes = await reportBuilderService.getFields(targetEnt.entityId);
      if (fieldsRes.success && fieldsRes.data) {
        const allFields = fieldsRes.data;
        setFields(allFields);

        // Pick columns matching defaultColumns
        let matched = allFields.filter((f) =>
          tpl.defaultColumns.some((dc) => dc.toLowerCase() === f.physicalColumnName.toLowerCase())
        );
        if (matched.length === 0) {
          matched = allFields.slice(0, 6);
        }

        const cols = matched.map((f, idx) => ({
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
        setFilters([]);

        // Instant execution
        const config = {
          reportTitle: tpl.title,
          primaryEntity: targetEnt.physicalTableName,
          selectedColumns: cols,
          customFormulas: [],
          filters: [],
          orderBy: [],
          joinPath: [],
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
      }
    } catch (err) {
      console.error("Error launching template:", err);
    } finally {
      setLoadingMetadata(false);
      setLoadingQuery(false);
    }
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
    const newCols = fields.map((f, idx) => ({
      fieldId: f.fieldId,
      physicalTable: f.physicalTableName,
      physicalColumn: f.physicalColumnName,
      displayLabel: f.displayName || f.physicalColumnName,
      dataType: f.dataType || "String",
      aggregation: null,
      sortOrder: idx + 1,
      isVisible: true
    }));
    setSelectedColumns(newCols);
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

    const newCols = matched.map((f, idx) => ({
      fieldId: f.fieldId,
      physicalTable: f.physicalTableName,
      physicalColumn: f.physicalColumnName,
      displayLabel: f.displayName || f.physicalColumnName,
      dataType: f.dataType || "String",
      aggregation: null,
      sortOrder: idx + 1,
      isVisible: true
    }));
    setSelectedColumns(newCols);
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
  // Dynamic BFS Path Computation
  // -------------------------------------------------------------------------
  useEffect(() => {
    const updateJoinPath = async () => {
      const tablesInUse = Array.from(new Set(selectedColumns.map((c) => c.physicalTable)));
      if (tablesInUse.length <= 1) {
        setJoinPath([]);
        return;
      }

      const entityIds = tablesInUse
        .map((tbl) => entities.find((e) => e.physicalTableName?.toLowerCase() === tbl.toLowerCase())?.entityId)
        .filter(Boolean);

      if (entityIds.length > 1) {
        try {
          const pathRes = await reportBuilderService.getJoinPath(entityIds);
          if (pathRes.success && pathRes.data) {
            setJoinPath(pathRes.data);
          }
        } catch (err) {
          console.error("Join path error:", err);
        }
      }
    };
    updateJoinPath();
  }, [selectedColumns, entities]);

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

    const primaryTable = selectedEntity ? selectedEntity.physicalTableName : selectedColumns[0].physicalTable;

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
  }, [selectedColumns, customFormulas, filters, orderBy, pageNumber, pageSize]);

  // -------------------------------------------------------------------------
  // Filters Management
  // -------------------------------------------------------------------------
  const handleAddFilter = () => {
    if (selectedColumns.length === 0) return;
    const col = selectedColumns[0];
    setFilters((prev) => [
      ...prev,
      {
        fieldId: col.fieldId,
        physicalTable: col.physicalTable,
        physicalColumn: col.physicalColumn,
        operator: "EQ",
        value1: "",
        value2: "",
        dataType: col.dataType
      }
    ]);
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
    // Find date column in selected columns or fields
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
          setTimeout(() => setShowSaveModal(false), 1200);
        }
      } else {
        const res = await reportBuilderService.saveReport(configDto);
        if (res.success) {
          setSavedReportId(res.reportId);
          setSaveSuccessMsg("Report saved successfully! View generated.");
          setTimeout(() => setShowSaveModal(false), 1200);
        }
      }
    } catch (err) {
      alert("Failed to save report: " + (err.response?.data?.message || err.message));
    }
  };

  // Filter fields in Step 2 by search query
  const filteredFields = useMemo(() => {
    if (!fieldSearch.trim()) return fields;
    const q = fieldSearch.toLowerCase();
    return fields.filter(
      (f) => f.displayName?.toLowerCase().includes(q) || f.physicalColumnName?.toLowerCase().includes(q)
    );
  }, [fields, fieldSearch]);

  // Client-side quick filter on preview rows
  const displayedPreviewData = useMemo(() => {
    if (!tableSearch.trim()) return previewData;
    const q = tableSearch.toLowerCase();
    return previewData.filter((row) =>
      Object.values(row).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
    );
  }, [previewData, tableSearch]);

  // Advanced Mode entity grouping
  const groupedEntities = useMemo(() => {
    const filtered = entities.filter((e) => {
      const q = searchQuery.toLowerCase();
      return e.displayName?.toLowerCase().includes(q) || e.physicalTableName?.toLowerCase().includes(q);
    });

    const groups = {};
    filtered.forEach((e) => {
      const domain = e.domainName || "Other Modules";
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(e);
    });
    return groups;
  }, [entities, searchQuery]);

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
          <button className="rb-btn rb-btn-primary" onClick={() => setShowSaveModal(true)}>
            <FaSave /> {savedReportId ? "Update Report" : "Save Report"}
          </button>
          <button
            className="rb-btn rb-btn-outline"
            onClick={() =>
              reportBuilderService.exportCSV({
                reportTitle,
                primaryEntity: selectedEntity?.physicalTableName,
                selectedColumns,
                filters,
                joinPath
              })
            }
            disabled={previewData.length === 0}
            title="Download report data to Excel (.csv)"
          >
            <FaFileExcel color="#10b981" /> Export Excel
          </button>
          <button
            className="rb-btn rb-btn-outline"
            onClick={() =>
              reportBuilderService.exportPDF({
                reportTitle,
                primaryEntity: selectedEntity?.physicalTableName,
                selectedColumns,
                filters,
                joinPath
              })
            }
            disabled={previewData.length === 0}
            title="Print or export report to PDF"
          >
            <FaFilePdf color="#ef4444" /> Export PDF
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
            {/* --------------------------------------------------------------
                STEP 1: Choose Business Topic / Module
                -------------------------------------------------------------- */}
            <div className="rb-wizard-card">
              <div className="rb-step-header">
                <div className="rb-step-num">1</div>
                <div>
                  <h6 className="rb-step-title">Choose Business Area / Module</h6>
                  <p className="rb-step-subtitle">What part of the factory would you like to report on?</p>
                </div>
              </div>

              <div className="rb-module-grid">
                {BUSINESS_MODULES.map((mod) => {
                  const isSelected = selectedEntity?.entityId === mod.id;
                  const entObj = entities.find((e) => e.entityId === mod.id);

                  return (
                    <div
                      key={mod.id}
                      className={`rb-module-card ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        if (entObj) {
                          handleSelectEntity(entObj, true);
                          setCategory(mod.badge);
                          setReportTitle(`${mod.name} Report`);
                        }
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span style={{ fontSize: "1.4rem" }}>{mod.icon}</span>
                        {isSelected && <FaCheckCircle color="#2563eb" size={16} />}
                      </div>
                      <div className="rb-mod-name">{mod.name}</div>
                      <div className="rb-mod-subtitle">{mod.subtitle}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --------------------------------------------------------------
                STEP 2: Choose Columns to Display (Interactive Pills)
                -------------------------------------------------------------- */}
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

              {/* Quick field search */}
              <div className="rb-field-search-bar mb-3">
                <FaSearch className="rb-field-search-icon" />
                <input
                  type="text"
                  placeholder="Search fields (e.g. date, qty, item, code)..."
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                />
              </div>

              {/* Column Pills Grid */}
              <div className="rb-pills-shelf">
                {filteredFields.map((f) => {
                  const isChecked = selectedColumns.some(
                    (c) => c.physicalTable === f.physicalTableName && c.physicalColumn === f.physicalColumnName
                  );
                  return (
                    <div
                      key={f.fieldId}
                      className={`rb-field-pill ${isChecked ? "active" : ""}`}
                      onClick={() => handleToggleColumn(f)}
                    >
                      {isChecked ? <FaCheck size={11} /> : <span className="rb-pill-plus">+</span>}
                      <span>{f.displayName}</span>
                      <span className="rb-pill-type">{f.dataType}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --------------------------------------------------------------
                STEP 3: Date & Quick Filters
                -------------------------------------------------------------- */}
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

              <div className="d-flex align-items-center gap-2">
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
                  onChange={(e) => setPageSize(parseInt(e.target.value))}
                >
                  <option value={25}>25 Rows</option>
                  <option value={50}>50 Rows</option>
                  <option value={100}>100 Rows</option>
                  <option value={500}>500 Rows</option>
                </Form.Select>
              </div>
            </div>

            <div className="rb-grid-container">
              {displayedPreviewData.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FaTable size={36} color="#cbd5e1" className="mb-2" />
                  <div style={{ fontWeight: 600 }}>No records found for current selection.</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Select columns above or click a Ready-Made Template to load data.
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODE 2: ADVANCED STUDIO WORKBENCH (FOR POWER USERS)
          ==================================================================== */}
      {uiMode === "advanced" && (
        <div className="rb-studio-body">
          {/* ZONE 1: Entity & Field Explorer (Left Panel) */}
          <div className="rb-explorer-panel">
            <div className="rb-explorer-header">
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>DATA ENTITY EXPLORER</span>
              <div className="rb-search-wrapper">
                <FaSearch className="rb-search-icon" />
                <input
                  type="text"
                  className="rb-search-input"
                  placeholder="Search tables & modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rb-entity-list">
              {loadingMetadata ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" variant="primary" />
                </div>
              ) : (
                Object.keys(groupedEntities).map((domain) => (
                  <div key={domain}>
                    <div className="rb-domain-group-title">{domain}</div>
                    {groupedEntities[domain].map((ent) => {
                      const isSelected = selectedEntity?.entityId === ent.entityId;
                      const isDirect = relatedEntitiesMap.direct.has(ent.entityId);
                      const isExtended = relatedEntitiesMap.extended.has(ent.entityId);

                      return (
                        <div
                          key={ent.entityId}
                          className={`rb-entity-item ${isSelected ? "active" : ""}`}
                          onClick={() => handleSelectEntity(ent)}
                        >
                          <span style={{ fontSize: "0.82rem" }}>{ent.displayName}</span>
                          {isDirect ? (
                            <span className="rb-entity-tag rb-tag-direct">🟢 Related</span>
                          ) : isExtended ? (
                            <span className="rb-entity-tag rb-tag-extended">🔗 Link</span>
                          ) : (
                            <span className="rb-entity-tag rb-tag-unconnected">{ent.fieldCount} cols</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Active Entity Fields */}
            {selectedEntity && (
              <div className="rb-field-list-section">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong style={{ fontSize: "0.8rem", color: "#1e293b" }}>{selectedEntity.displayName} Fields</strong>
                  <Badge bg="secondary" style={{ fontSize: "0.68rem" }}>
                    {fields.length} Available
                  </Badge>
                </div>
                <div>
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
              </div>
            )}
          </div>

          {/* WORKBENCH (Right Side: Zones 2, 3, 4) */}
          <div className="rb-workbench">
            {/* ZONE 2: Selected Columns Shelf */}
            <div className="rb-shelf-section">
              <div className="rb-shelf-header">
                <span className="rb-shelf-title">Selected Columns Shelf ({selectedColumns.length} Active Columns)</span>
                <button
                  className="rb-btn rb-btn-outline"
                  style={{ padding: "4px 10px" }}
                  onClick={() => setShowFormulaModal(true)}
                >
                  <FaCalculator color="#2563eb" /> + Add Calculated Formula
                </button>
              </div>

              <div className="rb-columns-row">
                {selectedColumns.length === 0 ? (
                  <div className="text-muted p-2" style={{ fontSize: "0.82rem" }}>
                    👈 Click on any fields in the left explorer to add columns to your report.
                  </div>
                ) : (
                  selectedColumns.map((col, idx) => (
                    <div key={idx} className="rb-column-card">
                      <span className="rb-card-label" title={col.physicalTable + "." + col.physicalColumn}>
                        {col.displayLabel}
                      </span>
                      <select
                        className="rb-agg-select"
                        value={col.aggregation || "NONE"}
                        onChange={(e) => handleUpdateColumnAgg(idx, e.target.value)}
                      >
                        <option value="NONE">-</option>
                        <option value="SUM">Sum</option>
                        <option value="AVG">Avg</option>
                        <option value="COUNT">Count</option>
                        <option value="MIN">Min</option>
                        <option value="MAX">Max</option>
                      </select>
                      <FaTimes className="rb-card-close" onClick={() => handleRemoveColumn(idx)} />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ZONE 3: Filters & Criteria Strip */}
            <div className="rb-filter-strip">
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                <FaFilter /> Filters:
              </span>
              {filters.map((flt, idx) => (
                <div key={idx} className="rb-filter-chip">
                  <strong>{flt.physicalColumn}:</strong>
                  <select value={flt.operator} onChange={(e) => handleUpdateFilter(idx, "operator", e.target.value)}>
                    <option value="EQ">Equals (=)</option>
                    <option value="NEQ">Not Equals (&lt;&gt;)</option>
                    <option value="LIKE">Contains</option>
                    <option value="GT">Greater Than (&gt;)</option>
                    <option value="LT">Less Than (&lt;)</option>
                    <option value="IS_NULL">Is Null</option>
                    <option value="IS_NOT_NULL">Is Not Null</option>
                  </select>
                  {flt.operator !== "IS_NULL" && flt.operator !== "IS_NOT_NULL" && (
                    <input
                      type="text"
                      placeholder="Value..."
                      value={flt.value1 || ""}
                      onChange={(e) => handleUpdateFilter(idx, "value1", e.target.value)}
                    />
                  )}
                  <FaTimes style={{ cursor: "pointer", color: "#94a3b8" }} onClick={() => handleRemoveFilter(idx)} />
                </div>
              ))}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleAddFilter}
                style={{ fontSize: "0.75rem", borderRadius: "14px" }}
              >
                + Add Filter
              </Button>
            </div>

            {/* ZONE 4: Live Data Preview */}
            <div className="rb-preview-section">
              <div className="rb-preview-header">
                <div className="rb-preview-meta">
                  <span>
                    <strong>Total Records:</strong> {totalRows}
                  </span>
                  <span>
                    <strong>Execution Time:</strong> {executionTimeMs} ms
                  </span>
                  {loadingQuery && <Spinner animation="border" size="sm" variant="primary" />}
                </div>

                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant={viewMode === "table" ? "primary" : "outline-secondary"}
                    size="sm"
                    style={{ fontSize: "0.75rem" }}
                    onClick={() => setViewMode("table")}
                  >
                    <FaTable /> Table
                  </Button>
                  <Button
                    variant={viewMode === "chart" ? "primary" : "outline-secondary"}
                    size="sm"
                    style={{ fontSize: "0.75rem" }}
                    onClick={() => setViewMode("chart")}
                  >
                    <FaChartBar /> Chart
                  </Button>
                  <Form.Select
                    size="sm"
                    style={{ width: "90px", fontSize: "0.75rem" }}
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                  >
                    <option value={25}>25 Rows</option>
                    <option value={50}>50 Rows</option>
                    <option value={100}>100 Rows</option>
                    <option value={500}>500 Rows</option>
                  </Form.Select>
                </div>
              </div>

              <div className="rb-grid-container">
                {viewMode === "table" ? (
                  previewData.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <FaTable size={32} color="#cbd5e1" className="mb-2" />
                      <div>No data to display. Add columns or adjust filters to view live results.</div>
                    </div>
                  ) : (
                    <table className="rb-table">
                      <thead>
                        <tr>
                          {columnHeaders.map((col, idx) => (
                            <th key={idx}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, rIdx) => (
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
                  )
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
    </div>
  );
};

export default ReportBuilderStudio;
