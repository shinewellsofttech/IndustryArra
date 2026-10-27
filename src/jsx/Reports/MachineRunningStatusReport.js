import React, { useState, useEffect, useMemo, useRef } from "react";
import { Row, Col, Card, Table, Button, Form, Badge, Modal, Spinner } from "react-bootstrap";
import axios from "axios";
import XLSX from "xlsx";
import { FaPrint, FaFileExcel, FaSync, FaInfoCircle, FaSearch, FaCogs, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaBan } from "react-icons/fa";
import { API_WEB_URLS } from "../../constants/constAPI";

// Helper to format float hours into neat string (e.g. 4.0 -> "4", 7.5 -> "7.5", 0.5 -> "0.5")
const formatHours = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "0";
    const num = parseFloat(val);
    if (num === 0) return "0";
    return Number.isInteger(num) ? num.toString() : num.toFixed(1);
};

// Format date to YYYY-MM-DD
const formatDateToISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Format date for display in table header (DD-MM-YYYY)
const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
};

// Determine rule-based category & styling matching user image
// Rule:
// More than 5hr = Green
// 3hr to 5hr = Yellow
// 1hr to 3hr = Blue
// Less than 1hr = Red
const getCategoryStyle = (dailyHours, isActive) => {
    const hours = parseFloat(dailyHours) || 0;
    if (hours > 5.0) {
        return {
            category: "OPTIMAL",
            label: "> 5hr",
            bgColor: "#d4edda", // soft green
            textColor: "#155724",
            borderColor: "#c3e6cb",
            badgeClass: "badge-success",
            cellStyle: { backgroundColor: "#d4edda", color: "#155724", fontWeight: "700" }
        };
    } else if (hours >= 3.0 && hours <= 5.0) {
        return {
            category: "NORMAL",
            label: "3hr - 5hr",
            bgColor: "#fff3cd", // soft yellow
            textColor: "#856404",
            borderColor: "#ffeeba",
            badgeClass: "badge-warning",
            cellStyle: { backgroundColor: "#fff3cd", color: "#856404", fontWeight: "700" }
        };
    } else if (hours >= 1.0 && hours < 3.0) {
        return {
            category: "LOW",
            label: "1hr - 3hr",
            bgColor: "#d1ecf1", // soft blue / cyan
            textColor: "#0c5460",
            borderColor: "#bee5eb",
            badgeClass: "badge-info",
            cellStyle: { backgroundColor: "#d1ecf1", color: "#0c5460", fontWeight: "700" }
        };
    } else {
        return {
            category: "CRITICAL",
            label: "< 1hr",
            bgColor: "#f8d7da", // soft red
            textColor: "#721c24",
            borderColor: "#f5c6cb",
            badgeClass: "badge-danger",
            cellStyle: { backgroundColor: "#f8d7da", color: "#721c24", fontWeight: "700" }
        };
    }
};

const MachineRunningStatusReport = () => {
    // Current date default (or 2026-10-09 if user wants to match image directly)
    const [reportDate, setReportDate] = useState(() => {
        // Check if there is data in October 2026 as per user's sheet
        const now = new Date();
        return formatDateToISO(now);
    });

    const [machineTypeId, setMachineTypeId] = useState("0"); // 0: All, 1: Wood (W), 2: Metal (M)
    const [machineCategories, setMachineCategories] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all"); // "all", "active", "inactive"
    const [performanceFilter, setPerformanceFilter] = useState("all"); // "all", "OPTIMAL", "NORMAL", "LOW", "CRITICAL"
    const [workingDays, setWorkingDays] = useState(26); // Default 26 working days per month
    const [searchQuery, setSearchQuery] = useState("");
    const [showMtd, setShowMtd] = useState(false);
    const [selectedShiftId, setSelectedShiftId] = useState("0"); // 0: All Shifts
    const [shiftsList, setShiftsList] = useState([]);
    const [currentShiftInfo, setCurrentShiftInfo] = useState(null);
    const [isPlantOffShift, setIsPlantOffShift] = useState(false);
    const [serverTime, setServerTime] = useState("");

    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [kpiStats, setKpiStats] = useState({
        totalMachines: 0,
        activeMachines: 0,
        inactiveMachines: 0,
        optimalCount: 0,
        normalCount: 0,
        lowCount: 0,
        criticalCount: 0,
        totalDailyHours: 0,
        totalProjectedMonthlyHours: 0,
        totalActualMtdHours: 0,
        shiftTargetDailyHours: 8.0,
        overallUtilizationPercent: 0
    });

    // Drilldown Modal state
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [drilldownDetails, setDrilldownDetails] = useState([]);

    // Fetch Auth Credentials
    const getAuth = () => {
        const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userId = authUser?.id || authUser?.ID || "0";
        const token = authUser?.jwtToken || authUser?.token || authUser?.UserToken || authUser?.UserTokenNew || "token";
        return { userId, token };
    };

    // Load Machine Categories (Wood, Metal, etc.)
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { userId, token } = getAuth();
                const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.MASTER}/${userId}/${token}/CategoryMaster/Id/0`;
                const res = await axios.get(url);
                if (res.data) {
                    const list = res.data.dataList || res.data.response || res.data || [];
                    if (Array.isArray(list)) {
                        setMachineCategories(list);
                    }
                }
            } catch (err) {
                console.warn("Could not load categories:", err);
            }
        };
        fetchCategories();
    }, []);

    // Load Report Data
    const fetchReport = async () => {
        setLoading(true);
        try {
            const { userId, token } = getAuth();
            let isActiveParam = "";
            if (statusFilter === "active") isActiveParam = "&isActive=true";
            if (statusFilter === "inactive") isActiveParam = "&isActive=false";
            const shiftParam = selectedShiftId && selectedShiftId !== "0" ? `&shiftId=${selectedShiftId}` : "";
            const machineTypeParam = (machineTypeId && machineTypeId !== "0") ? `&machineTypeId=${machineTypeId}` : "";

            const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.MACHINE_RUNNING_STATUS_REPORT}/${userId}/token?reportDate=${reportDate}&workingDays=${workingDays}${machineTypeParam}${isActiveParam}${shiftParam}`;
            
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && (res.data.Success || res.data.success)) {
                const resData = res.data.Data || res.data.data || {};
                const items = Array.isArray(resData) ? resData : (resData.Rows || resData.rows || []);
                const shifts = resData.Shifts || resData.shifts || [];
                const currentShift = resData.CurrentShift || resData.currentShift || null;
                const offShift = resData.IsPlantOffShift ?? resData.isPlantOffShift ?? false;
                const srvTime = resData.ServerTime || resData.serverTime || "";

                setReportData(items);
                if (shifts.length > 0) {
                    setShiftsList(shifts);
                }
                setCurrentShiftInfo(currentShift);
                setIsPlantOffShift(offShift);
                setServerTime(srvTime);

                // Compute KPI counts & sums
                let opt = 0, norm = 0, low = 0, crit = 0, act = 0, inact = 0;
                let dailySum = 0, projSum = 0, mtdSum = 0;
                let targetHours = 8.0;

                items.forEach(m => {
                    const isMActive = m.IsActive !== false && m.IsActive !== 0 && m.isActive !== false && m.isActive !== 0;
                    if (isMActive) act++; else inact++;
                    const dH = parseFloat(m.DailyHours || m.dailyHours) || 0;
                    dailySum += dH;
                    projSum += (parseFloat(m.ProjectedMonthlyHours || m.projectedMonthlyHours) || 0);
                    mtdSum += (parseFloat(m.ActualMtdHours || m.actualMtdHours) || 0);
                    const shiftTarget = m.ShiftTargetHours || m.shiftTargetHours || m.ShiftTargetDailyHours || m.shiftTargetDailyHours;
                    if (shiftTarget) targetHours = parseFloat(shiftTarget);

                    if (dH > 5.0) opt++;
                    else if (dH >= 3.0 && dH <= 5.0) norm++;
                    else if (dH >= 1.0 && dH < 3.0) low++;
                    else crit++;
                });

                const totalPotentialShiftHours = (act || 1) * targetHours;
                const overallUtil = totalPotentialShiftHours > 0 
                    ? Math.round((dailySum / totalPotentialShiftHours) * 100) 
                    : 0;

                setKpiStats({
                    totalMachines: items.length,
                    activeMachines: act,
                    inactiveMachines: inact,
                    optimalCount: opt,
                    normalCount: norm,
                    lowCount: low,
                    criticalCount: crit,
                    totalDailyHours: dailySum,
                    totalProjectedMonthlyHours: projSum,
                    totalActualMtdHours: mtdSum,
                    shiftTargetDailyHours: targetHours,
                    overallUtilizationPercent: overallUtil
                });
            } else {
                setReportData([]);
            }
        } catch (error) {
            console.error("Error fetching machine running status:", error);
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [reportDate, machineTypeId, statusFilter, workingDays, selectedShiftId]);

    // Open Drilldown Details
    const handleOpenDetails = async (machine) => {
        setSelectedMachine(machine);
        setModalOpen(true);
        setDetailsLoading(true);
        setDrilldownDetails([]);

        try {
            const { userId, token } = getAuth();
            const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.MACHINE_RUNNING_STATUS_REPORT}/Details/${userId}/token/${machine.MachineId || machine.machineId}?reportDate=${reportDate}`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.Success) {
                const list = Array.isArray(res.data.Data) ? res.data.Data : (res.data.Data?.Steps || []);
                setDrilldownDetails(list);
            }
        } catch (err) {
            console.error("Error fetching drilldown details:", err);
        } finally {
            setDetailsLoading(false);
        }
    };

    // Filtered data for view based on performance category and search query
    const filteredMachines = useMemo(() => {
        return reportData.filter(item => {
            // Performance filter
            if (performanceFilter !== "all") {
                const hours = parseFloat(item.DailyHours) || 0;
                if (performanceFilter === "OPTIMAL" && !(hours > 5.0)) return false;
                if (performanceFilter === "NORMAL" && !(hours >= 3.0 && hours <= 5.0)) return false;
                if (performanceFilter === "LOW" && !(hours >= 1.0 && hours < 3.0)) return false;
                if (performanceFilter === "CRITICAL" && !(hours < 1.0)) return false;
            }

            // Search query filter (machine number or name)
            if (searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase().trim();
                const mNo = (item.MachineNumber || "").toString().toLowerCase();
                const mName = (item.MachineName || "").toLowerCase();
                if (!mNo.includes(q) && !mName.includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [reportData, performanceFilter, searchQuery]);

    // Export to Excel matching the report sheet
    const handleExportExcel = () => {
        if (!filteredMachines || filteredMachines.length === 0) return;

        const excelRows = filteredMachines.map(m => ({
            "MACHINE NUMBER": m.MachineNumber || "",
            "MACHINE NAME": m.MachineName || "",
            "CATEGORY": m.CategoryName || "",
            [`MACHINE RUNNING TIME (${formatDateDisplay(reportDate)})`]: parseFloat(m.DailyHours) || 0,
            "MONTHLY PROJECTED (HRS)": parseFloat(m.ProjectedMonthlyHours) || 0,
            "ACTUAL MTD (HRS)": parseFloat(m.ActualMtdHours) || 0,
            "JOB CARDS RUN": m.JobCardCount || 0,
            "STATUS": m.IsActive ? "ACTIVE" : "BAND / INACTIVE",
            "PERFORMANCE": m.PerformanceCategory || ""
        }));

        const ws = XLSX.utils.json_to_sheet(excelRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Machine Running Status");
        XLSX.writeFile(wb, `Machine_Running_Status_${reportDate}.xlsx`);
    };

    // Trigger Print
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="container-fluid machine-running-report-container p-3">
            {/* Print Stylesheet */}
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-report-area, .printable-report-area * {
                        visibility: visible;
                    }
                    .printable-report-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .table-bordered th, .table-bordered td {
                        border: 1px solid #222 !important;
                    }
                    .card {
                        border: none !important;
                        box-shadow: none !important;
                    }
                }
                .cursor-pointer {
                    cursor: pointer;
                }
                .hover-shadow:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                    transition: all 0.2s ease-in-out;
                }
                .rule-box {
                    background: #f8f9fa;
                    border: 2px dashed #6c757d;
                    border-radius: 8px;
                    padding: 12px 18px;
                }
                .machine-num-cell {
                    font-size: 1.15rem;
                    font-weight: 700;
                    text-align: center;
                    vertical-align: middle;
                }
                .machine-inactive-cell {
                    background-color: #f8d7da !important;
                    color: #721c24 !important;
                    border: 2px solid #dc3545 !important;
                }
                .report-title-header {
                    background: #e9ecef;
                    border: 2px solid #343a40;
                    padding: 14px 20px;
                    text-align: center;
                    border-radius: 6px;
                    margin-bottom: 20px;
                }
                `}
            </style>

            {/* Filter Toolbar (hidden on print) */}
            <Card className="no-print mb-4 shadow-sm border-0">
                <Card.Body className="p-3">
                    <Row className="align-items-end g-2">
                        {/* Date Picker */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    📅 Report Date
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                    size="sm"
                                    className="form-control-sm fw-bold"
                                />
                            </Form.Group>
                        </Col>

                        {/* Shift Selector */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    ⏰ Shift Filter
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={selectedShiftId}
                                    onChange={(e) => setSelectedShiftId(e.target.value)}
                                    className="form-select-sm fw-bold border-primary"
                                >
                                    <option value="0">All Active Shifts</option>
                                    {shiftsList.map(s => (
                                        <option key={s.Id} value={s.Id}>
                                            {s.Name} ({s.StartTime}-{s.EndTime})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Machine Type Filter */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    🏭 Machine Type
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={machineTypeId}
                                    onChange={(e) => setMachineTypeId(e.target.value)}
                                    className="form-select-sm"
                                >
                                    <option value="0">All Types (Wood & Metal)</option>
                                    {machineCategories.map(cat => (
                                        <option key={cat.Id} value={cat.Id}>
                                            {cat.CategoryName || cat.Name} ({cat.CategoryType || "Cat"})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Status Filter (Active / Band) */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    ⚡ Machine Status
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="form-select-sm"
                                >
                                    <option value="all">All Machines</option>
                                    <option value="active">Active Only</option>
                                    <option value="inactive">Band / Inactive Only</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Performance Category Filter */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    🎯 Performance
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={performanceFilter}
                                    onChange={(e) => setPerformanceFilter(e.target.value)}
                                    className="form-select-sm"
                                >
                                    <option value="all">All Performance</option>
                                    <option value="OPTIMAL">🟢 Optimal (&gt; 5hr)</option>
                                    <option value="NORMAL">🟡 Normal (3hr - 5hr)</option>
                                    <option value="LOW">🔵 Low (1hr - 3hr)</option>
                                    <option value="CRITICAL">🔴 Critical (&lt; 1hr)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Working Days Multiplier */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    🗓️ Working Days (Monthly)
                                </Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="31"
                                    size="sm"
                                    value={workingDays}
                                    onChange={(e) => setWorkingDays(Math.max(1, parseInt(e.target.value) || 26))}
                                    className="form-control-sm text-center fw-bold"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Second Row: Search, Quick Dates, Actions, View Toggles */}
                    <Row className="align-items-center mt-3 pt-2 border-top g-2">
                        <Col lg={3} md={4} sm={12}>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white">
                                    <FaSearch className="text-muted" />
                                </span>
                                <Form.Control
                                    type="text"
                                    placeholder="Search by Machine # or Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="border-start-0"
                                />
                                {searchQuery && (
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => setSearchQuery("")}
                                    >
                                        ✕
                                    </Button>
                                )}
                            </div>
                        </Col>

                        <Col lg={2} md={3} sm={6}>
                            <div className="d-flex gap-1 align-items-center">
                                <span className="text-muted small fw-bold">Date:</span>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="py-1 px-2 text-nowrap"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => setReportDate(formatDateToISO(new Date()))}
                                >
                                    Today
                                </Button>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="py-1 px-2 text-nowrap"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => setReportDate("2026-10-09")}
                                    title="Date matching sample photo"
                                >
                                    09-10-2026
                                </Button>
                            </div>
                        </Col>

                        <Col lg={2} md={5} sm={6}>
                            <Form.Check
                                type="switch"
                                id="show-mtd-switch"
                                label={<span className="fw-bold text-dark" style={{ fontSize: "0.85rem" }}>Show Actual MTD Hours</span>}
                                checked={showMtd}
                                onChange={(e) => setShowMtd(e.target.checked)}
                            />
                        </Col>

                        <Col lg={5} md={12} className="text-md-end d-flex gap-2 justify-content-md-end justify-content-start">
                            <Button
                                variant="outline-dark"
                                size="sm"
                                onClick={fetchReport}
                                disabled={loading}
                                className="d-flex align-items-center gap-1"
                            >
                                <FaSync className={loading ? "fa-spin" : ""} /> Refresh
                            </Button>
                            <Button
                                variant="outline-success"
                                size="sm"
                                onClick={handleExportExcel}
                                disabled={filteredMachines.length === 0}
                                className="d-flex align-items-center gap-1 fw-bold"
                            >
                                <FaFileExcel /> Export Excel
                            </Button>
                            <Button
                                variant="dark"
                                size="sm"
                                onClick={handlePrint}
                                disabled={filteredMachines.length === 0}
                                className="d-flex align-items-center gap-1 fw-bold"
                            >
                                <FaPrint /> Print Report
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* KPI Summary Cards (hidden on print) */}
            <Row className="no-print mb-4 g-2">
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2 bg-light">
                        <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Total Machines</div>
                        <h3 className="mb-0 fw-bold text-dark">{kpiStats.totalMachines}</h3>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {kpiStats.activeMachines} Active | {kpiStats.inactiveMachines} Band
                        </div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#d4edda", color: "#155724" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Optimal (&gt; 5hr)</div>
                        <h3 className="mb-0 fw-bold">{kpiStats.optimalCount}</h3>
                        <div style={{ fontSize: "0.75rem" }}>Green Status</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#fff3cd", color: "#856404" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Normal (3hr - 5hr)</div>
                        <h3 className="mb-0 fw-bold">{kpiStats.normalCount}</h3>
                        <div style={{ fontSize: "0.75rem" }}>Yellow Status</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#d1ecf1", color: "#0c5460" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Low (1hr - 3hr)</div>
                        <h3 className="mb-0 fw-bold">{kpiStats.lowCount}</h3>
                        <div style={{ fontSize: "0.75rem" }}>Blue Status</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#f8d7da", color: "#721c24" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Critical (&lt; 1hr)</div>
                        <h3 className="mb-0 fw-bold">{kpiStats.criticalCount}</h3>
                        <div style={{ fontSize: "0.75rem" }}>Red Status</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2 bg-dark text-white">
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Daily Running / Util.</div>
                        <h3 className="mb-0 fw-bold text-warning">{formatHours(kpiStats.totalDailyHours)} <span style={{ fontSize: "0.9rem" }}>hrs</span></h3>
                        <div className="text-warning-50 fw-bold" style={{ fontSize: "0.75rem" }}>
                            {kpiStats.overallUtilizationPercent}% Util ({kpiStats.shiftTargetDailyHours}h Shift Target)
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Real-time Shift Status Notice Banner (Hidden on print) */}
            <div className="no-print mb-3">
                {isPlantOffShift ? (
                    <div className="alert alert-secondary border-0 shadow-sm d-flex align-items-center justify-content-between py-2 px-3 mb-0" style={{ backgroundColor: "#e2e8f0" }}>
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-dark p-2" style={{ fontSize: "0.85rem" }}>🏭 PLANT OFF-SHIFT</span>
                            <span className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                                Factory is currently in Off-Shift / Non-Working Hours.
                            </span>
                            <span className="text-muted small">
                                (Machines normally remain stopped outside scheduled shifts. Any idle machine during this window is normal planned off-shift).
                            </span>
                        </div>
                        {serverTime && <span className="badge bg-secondary">Server Time: {serverTime}</span>}
                    </div>
                ) : currentShiftInfo ? (
                    <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between py-2 px-3 mb-0">
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-success p-2" style={{ fontSize: "0.85rem" }}>⚡ ACTIVE RUNNING SHIFT</span>
                            <span className="fw-bold text-success" style={{ fontSize: "0.9rem" }}>
                                {currentShiftInfo.Name} ({currentShiftInfo.StartTime} - {currentShiftInfo.EndTime})
                            </span>
                            <span className="text-muted small">
                                • Net Working Capacity: {currentShiftInfo.NetWorkingHours} hrs/day • Target: {kpiStats.shiftTargetDailyHours} hrs
                            </span>
                        </div>
                        {serverTime && <span className="badge bg-dark">Server Time: {serverTime}</span>}
                    </div>
                ) : null}
            </div>

            {/* Main Report Area (Printable) */}
            <div className="printable-report-area">
                {/* Title Header matching the uploaded photo */}
                <div className="report-title-header">
                    <h1 className="fw-black mb-1 text-uppercase text-dark tracking-wide" style={{ letterSpacing: "2px", fontWeight: "900", fontSize: "2.3rem" }}>
                        MACHINE
                    </h1>
                    <h2 className="fw-black mb-0 text-uppercase text-dark tracking-wide" style={{ letterSpacing: "2px", fontWeight: "900", fontSize: "2rem" }}>
                        RUNNING STATUS
                    </h2>
                </div>

                <Row className="mb-3 align-items-center">
                    <Col md={8}>
                        <div className="d-flex align-items-center gap-3">
                            <span className="badge bg-secondary p-2" style={{ fontSize: "0.95rem" }}>
                                📅 DATE: <strong>{formatDateDisplay(reportDate)}</strong>
                            </span>
                            <span className="badge bg-light text-dark border p-2" style={{ fontSize: "0.95rem" }}>
                                🏭 MACHINES DISPLAYED: <strong>{filteredMachines.length}</strong>
                            </span>
                            <span className="badge bg-light text-dark border p-2" style={{ fontSize: "0.95rem" }}>
                                ⏱️ MONTHLY BASIS: <strong>{workingDays} Working Days</strong>
                            </span>
                        </div>
                    </Col>
                    {/* RULE Legend Box on top right matching user image */}
                    <Col md={4} className="text-md-end mt-2 mt-md-0">
                        <div className="rule-box d-inline-block text-start shadow-sm">
                            <h6 className="fw-bold mb-2 text-dark text-uppercase border-bottom pb-1" style={{ fontSize: "0.9rem", letterSpacing: "1px" }}>
                                RULE:
                            </h6>
                            <div className="d-flex flex-column gap-1" style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                                <div className="d-flex align-items-center gap-2">
                                    <span style={{ width: "16px", height: "16px", backgroundColor: "#28a745", borderRadius: "3px", display: "inline-block" }}></span>
                                    <span>More than 5hr = Green</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span style={{ width: "16px", height: "16px", backgroundColor: "#ffc107", borderRadius: "3px", display: "inline-block" }}></span>
                                    <span>3hr to 5hr = Yellow</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span style={{ width: "16px", height: "16px", backgroundColor: "#17a2b8", borderRadius: "3px", display: "inline-block" }}></span>
                                    <span>1hr to 3hr = Blue</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span style={{ width: "16px", height: "16px", backgroundColor: "#dc3545", borderRadius: "3px", display: "inline-block" }}></span>
                                    <span>Less than 1hr = Red</span>
                                </div>
                                <div className="d-flex align-items-center gap-2 mt-1 pt-1 border-top">
                                    <span style={{ width: "16px", height: "16px", backgroundColor: "#f8d7da", border: "1px solid #dc3545", borderRadius: "3px", display: "inline-block" }}></span>
                                    <span className="text-danger">Pink Highlight = Band / Inactive</span>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Table matching the exact visual sheet */}
                <Card className="border shadow-sm mb-4">
                    <Card.Body className="p-0">
                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-2 text-muted fw-bold">Calculating running hours from job card intervals...</p>
                            </div>
                        ) : filteredMachines.length === 0 ? (
                            <div className="text-center py-5">
                                <FaInfoCircle size={36} className="text-muted mb-2" />
                                <h5 className="text-dark fw-bold">No Machines Found</h5>
                                <p className="text-muted">No machine data matches the selected date and filters.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table bordered hover className="align-middle mb-0 text-center" style={{ borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #333" }}>
                                            <th rowSpan={2} style={{ width: "120px", verticalAlign: "middle", fontWeight: "800", fontSize: "0.95rem" }}>
                                                MACHINE<br />NUMBER
                                            </th>
                                            <th rowSpan={2} style={{ textAlign: "left", verticalAlign: "middle", fontWeight: "800", fontSize: "0.95rem" }}>
                                                MACHINE NAME
                                            </th>
                                            <th rowSpan={2} style={{ width: "110px", verticalAlign: "middle", fontWeight: "800", fontSize: "0.95rem" }}>
                                                TYPE
                                            </th>
                                            <th colSpan={showMtd ? 3 : 2} style={{ verticalAlign: "middle", fontWeight: "800", fontSize: "0.95rem", backgroundColor: "#eaecef" }}>
                                                MACHINE RUNNING TIME
                                            </th>
                                            <th rowSpan={2} style={{ width: "90px", verticalAlign: "middle", fontWeight: "800", fontSize: "0.95rem" }} className="no-print">
                                                JOBS
                                            </th>
                                            <th rowSpan={2} style={{ width: "110px", verticalAlign: "middle", fontWeight: "800", fontSize: "0.95rem" }} className="no-print">
                                                DETAILS
                                            </th>
                                        </tr>
                                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                                            <th style={{ width: "140px", fontWeight: "800", fontSize: "0.9rem", backgroundColor: "#e2e6ea" }}>
                                                {formatDateDisplay(reportDate)}
                                            </th>
                                            <th style={{ width: "140px", fontWeight: "800", fontSize: "0.9rem", backgroundColor: "#e2e6ea" }}>
                                                MONTHLY
                                            </th>
                                            {showMtd && (
                                                <th style={{ width: "140px", fontWeight: "800", fontSize: "0.9rem", backgroundColor: "#dbe2ef" }}>
                                                    ACTUAL MTD
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMachines.map((m, idx) => {
                                            const dailyHrs = m.DailyHours ?? m.dailyHours ?? 0;
                                            const isBand = (m.IsActive === false || m.IsActive === 0 || m.isActive === false || m.isActive === 0);
                                            const ruleStyle = getCategoryStyle(dailyHrs, !isBand);
                                            const shiftTargetH = m.ShiftTargetHours ?? m.shiftTargetHours ?? m.ShiftTargetDailyHours ?? m.shiftTargetDailyHours ?? 8.0;
                                            const shiftUtilPct = Math.round(parseFloat(m.ShiftUtilizationPercent ?? m.shiftUtilizationPercent ?? ((parseFloat(dailyHrs) / parseFloat(shiftTargetH)) * 100)) || 0);
                                            const machStatus = m.MachineCurrentStatus || m.machineCurrentStatus || (isBand ? "BAND" : "IDLE");

                                            return (
                                                <tr key={m.MachineId || m.machineId || idx} className="hover-shadow">
                                                    {/* Machine Number - pink highlight if Inactive / Band like #28 in image */}
                                                    <td
                                                        className={`machine-num-cell ${isBand ? "machine-inactive-cell" : ""}`}
                                                        style={{ fontWeight: "800" }}
                                                    >
                                                        {m.MachineNumber || m.machineNumber || "-"}
                                                        {isBand && (
                                                            <div className="badge bg-danger text-white mt-1 d-block" style={{ fontSize: "0.65rem" }}>
                                                                BAND
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Machine Name */}
                                                    <td className="text-start" style={{ fontWeight: "700", textTransform: "uppercase", fontSize: "0.95rem" }}>
                                                        <span
                                                            className="text-dark cursor-pointer"
                                                            onClick={() => handleOpenDetails(m)}
                                                            title="Click to view Job Cards & details"
                                                        >
                                                            {m.MachineName || m.machineName}
                                                        </span>
                                                        {(m.MachineType || m.machineType) && (
                                                            <span className="text-muted ms-2 fw-normal" style={{ fontSize: "0.8rem" }}>
                                                                ({m.MachineType || m.machineType})
                                                            </span>
                                                        )}
                                                        {machStatus === "RUNNING" && (
                                                            <span className="badge bg-success ms-2" style={{ fontSize: "0.68rem" }}>RUNNING</span>
                                                        )}
                                                        {machStatus === "PAUSED" && (
                                                            <span className="badge bg-warning text-dark ms-2" style={{ fontSize: "0.68rem" }}>PAUSED</span>
                                                        )}
                                                        {machStatus === "OFF_SHIFT" && (
                                                            <span className="badge bg-secondary ms-2" style={{ fontSize: "0.68rem" }} title="Planned Off-Shift / Outside Shift Hours">OFF-SHIFT</span>
                                                        )}
                                                        {machStatus === "IDLE" && (
                                                            <span className="badge bg-light text-muted border ms-2" style={{ fontSize: "0.68rem" }}>IDLE</span>
                                                        )}
                                                    </td>

                                                    {/* Machine Category (Wood / Metal) */}
                                                    <td>
                                                        <Badge bg={(m.CategoryType || m.categoryType) === "M" ? "secondary" : "dark"} style={{ fontSize: "0.75rem" }}>
                                                            {m.CategoryName || m.categoryName || ((m.CategoryType || m.categoryType) === "W" ? "Wood" : "Metal")}
                                                        </Badge>
                                                    </td>

                                                    {/* Daily Hours with exact rule color matching image */}
                                                    <td
                                                        style={ruleStyle.cellStyle}
                                                        className="cursor-pointer"
                                                        onClick={() => handleOpenDetails(m)}
                                                        title={`Click to view breakdown for ${m.MachineName || m.machineName}`}
                                                    >
                                                        <div style={{ fontSize: "1.1rem" }}>
                                                            {formatHours(dailyHrs)}
                                                        </div>
                                                        <div style={{ fontSize: "0.7rem", opacity: 0.9 }}>
                                                            {shiftUtilPct}% of {shiftTargetH}h Shift
                                                        </div>
                                                    </td>

                                                    {/* Monthly Projected Hours (Daily * 26) */}
                                                    <td style={{ fontWeight: "700", fontSize: "1.05rem", backgroundColor: "#fafafa" }}>
                                                        {formatHours(m.ProjectedMonthlyHours || m.projectedMonthlyHours)}
                                                    </td>

                                                    {/* Optional Actual MTD Hours */}
                                                    {showMtd && (
                                                        <td style={{ fontWeight: "700", fontSize: "1.05rem", backgroundColor: "#f0f4f8" }}>
                                                            {formatHours(m.ActualMtdHours)}
                                                        </td>
                                                    )}

                                                    {/* Job Cards count (hidden on print) */}
                                                    <td className="no-print">
                                                        <Badge bg="light" text="dark" className="border fw-bold">
                                                            {m.JobCardCount || 0}
                                                        </Badge>
                                                    </td>

                                                    {/* Action Button (hidden on print) */}
                                                    <td className="no-print">
                                                        <Button
                                                            variant="outline-info"
                                                            size="sm"
                                                            className="py-1 px-2 fw-bold"
                                                            style={{ fontSize: "0.75rem" }}
                                                            onClick={() => handleOpenDetails(m)}
                                                        >
                                                            View Logs
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ backgroundColor: "#e9ecef", borderTop: "2px solid #333", fontWeight: "800" }}>
                                            <td colSpan={3} className="text-end pe-3" style={{ fontSize: "1rem" }}>
                                                TOTAL RUNNING HOURS:
                                            </td>
                                            <td style={{ fontSize: "1.15rem", fontWeight: "900", color: "#155724" }}>
                                                {formatHours(kpiStats.totalDailyHours)}
                                            </td>
                                            <td style={{ fontSize: "1.15rem", fontWeight: "900" }}>
                                                {formatHours(kpiStats.totalProjectedMonthlyHours)}
                                            </td>
                                            {showMtd && (
                                                <td style={{ fontSize: "1.15rem", fontWeight: "900" }}>
                                                    {formatHours(kpiStats.totalActualMtdHours)}
                                                </td>
                                            )}
                                            <td colSpan={2} className="no-print"></td>
                                        </tr>
                                    </tfoot>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </div>

            {/* Drilldown Modal (Job Card breakdown for selected machine) */}
            <Modal
                show={modalOpen}
                onHide={() => setModalOpen(false)}
                size="xl"
                centered
                className="no-print"
            >
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2">
                        <FaCogs className="text-primary" />
                        <span>Machine Running Log Details</span>
                        {selectedMachine && (
                            <Badge bg="dark" className="ms-2">
                                #{selectedMachine.MachineNumber} - {selectedMachine.MachineName}
                            </Badge>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3">
                    {selectedMachine && (
                        <div className="bg-light p-3 rounded mb-3 border">
                            <Row className="g-2 text-center text-md-start">
                                <Col md={3} sm={6}>
                                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>Machine Name</div>
                                    <div className="fw-bold text-dark">{selectedMachine.MachineName}</div>
                                </Col>
                                <Col md={2} sm={6}>
                                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>Category</div>
                                    <div className="fw-bold text-dark">{selectedMachine.CategoryName}</div>
                                </Col>
                                <Col md={2} sm={6}>
                                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>Date</div>
                                    <div className="fw-bold text-dark">{formatDateDisplay(reportDate)}</div>
                                </Col>
                                <Col md={2} sm={6}>
                                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>Operational Hours</div>
                                    <div className="fw-bold text-success fs-5">{formatHours(selectedMachine.DailyHours)} hrs</div>
                                </Col>
                                <Col md={3} sm={6}>
                                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>Status</div>
                                    <div>
                                        {selectedMachine.IsActive ? (
                                            <Badge bg="success"><FaCheckCircle /> Active</Badge>
                                        ) : (
                                            <Badge bg="danger"><FaBan /> Inactive / Band</Badge>
                                        )}
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    )}

                    {detailsLoading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted fw-bold">Loading step records and intervals...</p>
                        </div>
                    ) : drilldownDetails.length === 0 ? (
                        <div className="text-center py-4">
                            <FaInfoCircle size={32} className="text-muted mb-2" />
                            <h6 className="fw-bold text-dark">No Job Cards Recorded</h6>
                            <p className="text-muted mb-0">No job card execution was active on this machine for {formatDateDisplay(reportDate)}.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table bordered hover size="sm" className="align-middle mb-0 text-center">
                                <thead className="table-dark">
                                    <tr>
                                        <th>#</th>
                                        <th>Job Card No</th>
                                        <th>Shipment</th>
                                        <th>Process Name</th>
                                        <th>Product / Component</th>
                                        <th>Qty</th>
                                        <th>Operator</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                        <th>Pause (Min)</th>
                                        <th>Step Duration (Hr)</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drilldownDetails.map((det, i) => {
                                        const formatTime = (ts) => {
                                            if (!ts) return "-";
                                            const s = ts.toString();
                                            if (s.includes("T")) {
                                                const parts = s.split("T");
                                                return parts[1]?.substring(0, 8) || s;
                                            }
                                            return s;
                                        };

                                        const dur = det.DurationHours !== undefined ? det.DurationHours : (det.StepHours || 0);
                                        const pause = det.TotalPauseMinutes !== undefined ? det.TotalPauseMinutes : (det.PauseDurationMinutes || 0);
                                        const isRunning = !det.EndTime;

                                        return (
                                            <tr key={det.JobCardLineId || det.JobCardStepId || i}>
                                                <td className="fw-bold">{i + 1}</td>
                                                <td className="fw-bold text-primary">{det.JobCardNo || "-"}</td>
                                                <td>{det.ShipmentNo || "-"}</td>
                                                <td className="fw-bold text-dark text-start">{det.ProcessName || "Processing"}</td>
                                                <td className="text-start" style={{ fontSize: "0.85rem" }}>
                                                    {det.ItemName || "-"}
                                                </td>
                                                <td className="fw-bold">{det.Quantity || det.Qty || 0}</td>
                                                <td>{det.OperatorName || "-"}</td>
                                                <td style={{ fontSize: "0.85rem" }}>{formatTime(det.StartTime)}</td>
                                                <td style={{ fontSize: "0.85rem" }}>{isRunning ? <Badge bg="warning" text="dark">In Progress</Badge> : formatTime(det.EndTime)}</td>
                                                <td className="text-muted">{pause}</td>
                                                <td className="fw-bold text-success">{formatHours(dur)}</td>
                                                <td>
                                                    {det.IsPaused ? (
                                                        <Badge bg="danger">Paused</Badge>
                                                    ) : isRunning ? (
                                                        <Badge bg="warning" text="dark">Running</Badge>
                                                    ) : (
                                                        <Badge bg="success">Completed</Badge>
                                                    )}
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
                    <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default MachineRunningStatusReport;
