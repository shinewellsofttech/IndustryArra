import React, { useState, useEffect } from "react";
import { Card, Table, Badge, Spinner, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaChartLine, FaExternalLinkAlt, FaSync } from "react-icons/fa";
import { reportBuilderService } from "../../../../../services/reportBuilderService";

const DynamicReportWidget = ({ widgetConfig }) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(widgetConfig?.reportId || null);
  const [reportData, setReportData] = useState([]);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reportTitle, setReportTitle] = useState("Custom Report Widget");

  // Load saved reports for dropdown
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await reportBuilderService.getSavedReports();
        if (res.success && res.data) {
          setReports(res.data);
          if (!selectedReportId && res.data.length > 0) {
            setSelectedReportId(res.data[0].reportId);
            setReportTitle(res.data[0].reportTitle);
          }
        }
      } catch (err) {
        console.error("Error fetching reports for widget:", err);
      }
    };
    fetchReports();
  }, []);

  // Fetch report preview
  const fetchReportPreview = async (rId) => {
    if (!rId) return;
    try {
      setLoading(true);
      const confRes = await reportBuilderService.getReportConfig(rId);
      if (confRes.success && confRes.data) {
        setReportTitle(confRes.data.reportTitle);
        const cfg = confRes.data.parsedConfig || JSON.parse(confRes.data.configJson);
        const execRes = await reportBuilderService.executeQuery(cfg, 1, 5);
        if (execRes.success) {
          setReportData(execRes.data || []);
          setColumnHeaders(execRes.columnHeaders || []);
          setTotalRows(execRes.totalRows || 0);
        }
      }
    } catch (err) {
      console.error("Error executing report preview in widget:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReportId) {
      fetchReportPreview(selectedReportId);
    }
  }, [selectedReportId]);

  return (
    <Card className="h-100 border-0 shadow-sm" style={{ background: "#ffffff" }}>
      <Card.Header className="d-flex justify-content-between align-items-center py-2 px-3 bg-light border-bottom">
        <div className="d-flex align-items-center gap-2">
          <FaChartLine color="#2563eb" />
          <strong style={{ fontSize: "0.85rem", color: "#1e293b" }}>{reportTitle}</strong>
          {totalRows > 0 && (
            <Badge bg="primary" style={{ fontSize: "0.7rem" }}>
              {totalRows} Rows
            </Badge>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          {reports.length > 1 && (
            <select
              className="form-select form-select-sm"
              style={{ fontSize: "0.72rem", width: "130px", padding: "2px 6px" }}
              value={selectedReportId || ""}
              onChange={(e) => setSelectedReportId(parseInt(e.target.value))}
            >
              {reports.map((r) => (
                <option key={r.reportId} value={r.reportId}>
                  {r.reportTitle}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline-secondary"
            size="sm"
            style={{ padding: "2px 6px", fontSize: "0.75rem" }}
            onClick={() => fetchReportPreview(selectedReportId)}
          >
            <FaSync className={loading ? "fa-spin" : ""} />
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            style={{ padding: "2px 6px", fontSize: "0.75rem" }}
            onClick={() => navigate(`/CustomReport/${selectedReportId}`)}
          >
            <FaExternalLinkAlt /> Open
          </Button>
        </div>
      </Card.Header>

      <Card.Body className="p-0" style={{ overflow: "auto" }}>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" variant="primary" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-4 text-muted" style={{ fontSize: "0.8rem" }}>
            No records in this report.
          </div>
        ) : (
          <Table size="sm" hover className="mb-0" style={{ fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {columnHeaders.slice(0, 4).map((h, i) => (
                  <th key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, rIdx) => (
                <tr key={rIdx}>
                  {columnHeaders.slice(0, 4).map((h, cIdx) => (
                    <td key={cIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {row[h] !== null && row[h] !== undefined ? String(row[h]) : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

export default DynamicReportWidget;
