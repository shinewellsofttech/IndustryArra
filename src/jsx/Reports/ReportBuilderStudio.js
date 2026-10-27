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
  FaCopy
} from "react-icons/fa";
import { reportBuilderService } from "../../services/reportBuilderService";
import FormulaBuilderModal from "./FormulaBuilderModal";
import "./ReportBuilderStudio.css";

const ReportBuilderStudio = () => {
  const { editReportId } = useParams();
  const navigate = useNavigate();

  // 1. Metadata State
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [fields, setFields] = useState([]);
  const [relatedEntitiesMap, setRelatedEntitiesMap] = useState({
    direct: new Set(),
    extended: new Set()
  });
  const [searchQuery, setSearchQuery] = useState("");
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
          // Default select first entity if none selected
          if (res.data.length > 0 && !selectedEntity) {
            handleSelectEntity(res.data[0]);
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
  const handleSelectEntity = async (entity) => {
    setSelectedEntity(entity);
    try {
      // 1. Fetch fields for this entity
      const fieldsRes = await reportBuilderService.getFields(entity.entityId);
      if (fieldsRes.success && fieldsRes.data) {
        setFields(fieldsRes.data);
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
  // Column Selection Toggles
  // -------------------------------------------------------------------------
  const handleToggleColumn = (field) => {
    const existsIndex = selectedColumns.findIndex(
      (c) => c.physicalTable === field.physicalTableName && c.physicalColumn === field.physicalColumnName
    );

    if (existsIndex >= 0) {
      // Remove column
      setSelectedColumns((prev) => prev.filter((_, idx) => idx !== existsIndex));
    } else {
      // Add column
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

  const handleRemoveColumn = (index) => {
    setSelectedColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateColumnLabel = (index, newLabel) => {
    setSelectedColumns((prev) => {
      const copy = [...prev];
      copy[index].displayLabel = newLabel;
      return copy;
    });
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

      // Map tables to entity IDs
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
        // Update existing report
        const res = await reportBuilderService.updateReport(savedReportId, configDto);
        if (res.success) {
          setSaveSuccessMsg("Report updated successfully and version snapshot created!");
          setTimeout(() => setShowSaveModal(false), 1200);
        }
      } else {
        // Save new report
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

  // -------------------------------------------------------------------------
  // Filtering & Grouping Entity Explorer
  // -------------------------------------------------------------------------
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
          TOPBAR: Title, Category & Actions
          -------------------------------------------------------------------- */}
      <div className="rb-topbar">
        <div className="rb-title-section">
          <input
            type="text"
            className="rb-report-title-input"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="Untitled Report..."
          />
          <Badge bg="primary" style={{ fontSize: "0.75rem", padding: "5px 10px" }}>
            {category}
          </Badge>
          {joinPath.length > 0 && (
            <Badge bg="info" style={{ fontSize: "0.72rem" }}>
              <FaLink /> {joinPath.length} Auto-Joins
            </Badge>
          )}
        </div>

        <div className="rb-topbar-actions">
          <button className="rb-btn rb-btn-outline" onClick={runLiveQuery} disabled={loadingQuery}>
            <FaPlay /> {loadingQuery ? "Running..." : "Run Query"}
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
          >
            <FaFileExport /> Export CSV
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
          >
            <FaFileExport /> Export PDF
          </button>
          <button
            className="rb-btn rb-btn-danger-outline"
            onClick={() => {
              if (window.confirm("Clear all selected columns and filters?")) {
                setSelectedColumns([]);
                setFilters([]);
                setCustomFormulas([]);
                setPreviewData([]);
              }
            }}
          >
            <FaTrash /> Clear
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          STUDIO BODY: 4-Zone Split
          -------------------------------------------------------------------- */}
      <div className="rb-studio-body">
        {/* ==================================================================
            ZONE 1: Entity & Field Explorer (Left Panel)
            ================================================================== */}
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
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          style={{ cursor: "pointer" }}
                        />
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

        {/* ==================================================================
            WORKBENCH (Right Side: Zones 2, 3, 4)
            ================================================================== */}
        <div className="rb-workbench">
          {/* ----------------------------------------------------------------
              ZONE 2: Selected Columns Shelf
              ---------------------------------------------------------------- */}
          <div className="rb-shelf-section">
            <div className="rb-shelf-header">
              <span className="rb-shelf-title">
                Selected Columns Shelf ({selectedColumns.length} Active Columns)
              </span>
              <button className="rb-btn rb-btn-outline" style={{ padding: "4px 10px" }} onClick={() => setShowFormulaModal(true)}>
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

          {/* ----------------------------------------------------------------
              ZONE 3: Filters & Criteria Strip
              ---------------------------------------------------------------- */}
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
            <Button variant="outline-primary" size="sm" onClick={handleAddFilter} style={{ fontSize: "0.75rem", borderRadius: "14px" }}>
              + Add Filter
            </Button>
          </div>

          {/* ----------------------------------------------------------------
              ZONE 4: Live Data Preview & Virtual Grid
              ---------------------------------------------------------------- */}
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
                            <td key={cIdx}>{row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                /* Chart View Placeholder */
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

      {/* --------------------------------------------------------------------
          FORMULA BUILDER MODAL
          -------------------------------------------------------------------- */}
      <FormulaBuilderModal
        show={showFormulaModal}
        onHide={() => setShowFormulaModal(false)}
        availableColumns={selectedColumns}
        onSaveFormula={(newFormula) => {
          setCustomFormulas((prev) => [...prev, newFormula]);
          // Also add as column to selectedColumns shelf
          setSelectedColumns((prev) => [
            ...prev,
            {
              fieldId: -1, // Calculated formula indicator
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
