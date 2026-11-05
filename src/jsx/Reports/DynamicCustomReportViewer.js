import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Row, Col, Card, Button, Badge, Spinner, Form, Table } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaTable,
  FaFileExport,
  FaEdit,
  FaSync,
  FaArrowLeft,
  FaSearch,
  FaCalendarAlt,
  FaUser,
  FaChevronDown,
  FaChevronRight,
  FaSitemap,
  FaLayerGroup
} from "react-icons/fa";
import { reportBuilderService } from "../../services/reportBuilderService";
import "./ReportBuilderStudio.css";

const DynamicCustomReportViewer = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [dataRows, setDataRows] = useState([]);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Hierarchical Master-Detail & View Style State
  const [viewStyle, setViewStyle] = useState("tree"); // 'tree' | 'smart' | 'flat'
  const [groupByColumn, setGroupByColumn] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // -------------------------------------------------------------------------
  // 1. Fetch Report Metadata & Configuration
  // -------------------------------------------------------------------------
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoadingConfig(true);
        const res = await reportBuilderService.getReportConfig(reportId);
        if (res.success && res.data) {
          setReport(res.data);
          const cfg = res.data.parsedConfig || (res.data.configJson ? JSON.parse(res.data.configJson) : null);
          if (cfg) {
            if (cfg.viewStyle) setViewStyle(cfg.viewStyle);
            if (cfg.groupByColumn) setGroupByColumn(cfg.groupByColumn);
          }
        }
      } catch (err) {
        console.error("Failed to load report definition:", err);
      } finally {
        setLoadingConfig(false);
      }
    };

    if (reportId) {
      fetchConfig();
    }
  }, [reportId]);

  // -------------------------------------------------------------------------
  // 2. Execute Saved Query
  // -------------------------------------------------------------------------
  const executeReport = useCallback(async () => {
    if (!report) return;

    const config = report.parsedConfig || JSON.parse(report.configJson);
    if (!config) return;

    try {
      setLoadingData(true);
      const res = await reportBuilderService.executeQuery(config, pageNumber, pageSize);
      if (res.success) {
        setDataRows(res.data || []);
        setColumnHeaders(res.columnHeaders || []);
        setTotalRows(res.totalRows || 0);
        setExecutionTimeMs(res.executionTimeMs || 0);
      }
    } catch (err) {
      console.error("Failed to execute report:", err);
    } finally {
      setLoadingData(false);
    }
  }, [report, pageNumber, pageSize]);

  useEffect(() => {
    if (report) {
      executeReport();
    }
  }, [report, pageNumber, pageSize]);

  // -------------------------------------------------------------------------
  // 3. Client-side Search Filtering
  // -------------------------------------------------------------------------
  const filteredData = useMemo(() => {
    if (!searchFilter.trim()) return dataRows;
    const q = searchFilter.toLowerCase();
    return dataRows.filter((row) =>
      Object.values(row).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
    );
  }, [dataRows, searchFilter]);

  // -------------------------------------------------------------------------
  // 4. Hierarchical Master-Detail Grouping
  // -------------------------------------------------------------------------
  const effectiveGroupByColumn = useMemo(() => {
    if (groupByColumn && columnHeaders.includes(groupByColumn)) return groupByColumn;
    const match = columnHeaders.find((c) =>
      /container.*no|container.*number|contract.*no|batch.*no|jobcard.*no|job.*card/i.test(c)
    );
    return match || columnHeaders[0] || "";
  }, [groupByColumn, columnHeaders]);

  const groupedData = useMemo(() => {
    if (!effectiveGroupByColumn || filteredData.length === 0) return [];
    const groupsMap = new Map();
    filteredData.forEach((row) => {
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
  }, [filteredData, effectiveGroupByColumn]);

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

  useEffect(() => {
    if (groupedData.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groupedData.slice(0, 5).map((g) => g.groupKey)));
    }
  }, [groupedData]);

  // -------------------------------------------------------------------------
  // 5. Render Viewer Content (Tree / Merged / Flat)
  // -------------------------------------------------------------------------
  const renderViewerContent = () => {
    if (filteredData.length === 0) {
      return (
        <div className="text-center py-5 text-muted">
          <FaTable size={32} color="#cbd5e1" className="mb-2" />
          <div>No records match the current report filters.</div>
        </div>
      );
    }

    // 1. MASTER-DETAIL ACCORDION TREE VIEW
    if (viewStyle === "tree") {
      const childCols = columnHeaders.filter((c) => c !== effectiveGroupByColumn);

      return (
        <div className="rb-tree-container p-3">
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
                    <Table hover responsive className="rb-table mb-0">
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
                    </Table>
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
        return filteredData.some((r) => {
          const v = r[col];
          return v !== null && v !== undefined && !isNaN(Number(v)) && typeof v !== "boolean";
        });
      });

      return (
        <Table hover responsive className="rb-table mb-0">
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
        </Table>
      );
    }

    // 3. FLAT GRID VIEW (DEFAULT)
    return (
      <Table hover responsive className="rb-table mb-0">
        <thead>
          <tr>
            {columnHeaders.map((col, idx) => (
              <th key={idx}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, rIdx) => (
            <tr key={rIdx}>
              {columnHeaders.map((col, cIdx) => (
                <td key={cIdx}>{row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  if (loadingConfig) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2 text-muted fw-bold">Loading Custom Report Definition...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-5">
        <h4 className="text-danger">Report Not Found</h4>
        <p className="text-muted">The requested custom report ID does not exist or has been deleted.</p>
        <Button variant="outline-primary" size="sm" onClick={() => navigate("/ReportBuilder")}>
          Open Report Builder
        </Button>
      </div>
    );
  }

  const parsedCfg = report.parsedConfig || JSON.parse(report.configJson);

  return (
    <div className="p-3" style={{ background: "#f8fafc", minHeight: "calc(100vh - 100px)" }}>
      {/* Top Banner */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body className="p-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => navigate(-1)}
                  style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}
                >
                  <FaArrowLeft />
                </Button>
                <h4 className="mb-0 fw-bold" style={{ color: "#0f172a" }}>
                  {report.reportTitle}
                </h4>
                <Badge bg="primary" style={{ fontSize: "0.75rem" }}>
                  {report.category || "Custom Reports"}
                </Badge>
              </div>
              {report.description && (
                <p className="text-muted mb-0 mt-1 ms-4" style={{ fontSize: "0.85rem" }}>
                  {report.description}
                </p>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => navigate(`/ReportBuilder/${reportId}`)}
              >
                <FaEdit /> Edit in Studio
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={executeReport}
                disabled={loadingData}
              >
                <FaSync className={loadingData ? "fa-spin" : ""} /> Refresh
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => reportBuilderService.exportCSV(parsedCfg)}
              >
                <FaFileExport /> Export CSV
              </Button>
              <Button
                variant="outline-dark"
                size="sm"
                onClick={() => reportBuilderService.exportPDF(parsedCfg)}
              >
                <FaFileExport /> Export PDF
              </Button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3" style={{ fontSize: "0.8rem", color: "#64748b" }}>
              <span>
                <FaUser /> Created By: <strong>{report.createdByName || "System"}</strong>
              </span>
              <span>
                Total Rows: <strong>{totalRows}</strong>
              </span>
              <span>
                Speed: <strong>{executionTimeMs} ms</strong>
              </span>
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
                    style={{ width: "150px", fontSize: "0.75rem", padding: "2px 6px" }}
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

              <div style={{ position: "relative", width: "200px" }}>
                <FaSearch
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    fontSize: "0.8rem"
                  }}
                />
                <Form.Control
                  type="text"
                  placeholder="Quick filter on-screen..."
                  size="sm"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ paddingLeft: "30px", fontSize: "0.8rem" }}
                />
              </div>

              <Form.Select
                size="sm"
                style={{ width: "95px", fontSize: "0.8rem" }}
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
              >
                <option value={50}>50 Rows</option>
                <option value={100}>100 Rows</option>
                <option value={500}>500 Rows</option>
              </Form.Select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Grid Container */}
      <Card className="border-0 shadow-sm" style={{ overflow: "hidden" }}>
        <div style={{ maxHeight: "calc(100vh - 280px)", overflow: "auto" }}>
          {loadingData ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="text-muted mt-2" style={{ fontSize: "0.85rem" }}>
                Executing query with zero-lock isolation...
              </div>
            </div>
          ) : (
            renderViewerContent()
          )}
        </div>
      </Card>
    </div>
  );
};

export default DynamicCustomReportViewer;
