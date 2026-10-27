import React, { useState, useEffect, useCallback } from "react";
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
  FaUser
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
  const filteredData = React.useMemo(() => {
    if (!searchFilter.trim()) return dataRows;
    const q = searchFilter.toLowerCase();
    return dataRows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [dataRows, searchFilter]);

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

            <div className="d-flex align-items-center gap-2">
              <div style={{ position: "relative", width: "220px" }}>
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
          ) : filteredData.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaTable size={32} color="#cbd5e1" className="mb-2" />
              <div>No records match the current report filters.</div>
            </div>
          ) : (
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
          )}
        </div>
      </Card>
    </div>
  );
};

export default DynamicCustomReportViewer;
