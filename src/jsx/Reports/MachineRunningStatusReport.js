import React, { useState, useEffect, useMemo, useRef } from "react";
import { Row, Col, Card, Table, Button, Form, Badge, Modal, Spinner } from "react-bootstrap";
import axios from "axios";
import XLSX from "xlsx";
import { FaPrint, FaFileExcel, FaSync, FaInfoCircle, FaSearch, FaCogs, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaBan, FaIndustry } from "react-icons/fa";
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

            if (res.data && (res.data.Success || res.data.success)) {
                const dataObj = res.data.Data || res.data.data;
                const list = Array.isArray(dataObj)
                    ? dataObj
                    : (dataObj?.Steps || dataObj?.steps || dataObj?.DataList || dataObj?.dataList || []);
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
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    transition: all 0.2s ease-in-out;
                }
                .machine-num-cell {
                    font-size: 0.88rem;
                    font-weight: 700;
                    text-align: center;
                    vertical-align: middle;
                }
                .machine-inactive-cell {
                    background-color: #f8d7da !important;
                    color: #721c24 !important;
                    border: 2px solid #dc3545 !important;
                }
                `}
            </style>

            {/* 1. Header Toolbar (matching ItemMachiningTimeReport & MachineDelayDashboard) */}
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 no-print">
                <div>
                    <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                        <FaIndustry className="text-primary" />
                        <span>Machine Running Status</span>
                    </h4>
                    <span className="text-muted small">
                        Real-time running hours, shift targets, MTD utilization & machine health
                    </span>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <Button
                        variant="outline-dark"
                        size="sm"
                        className="shadow-sm d-flex align-items-center gap-1"
                        onClick={fetchReport}
                        disabled={loading}
                    >
                        <FaSync className={loading ? "fa-spin" : ""} /> Refresh
                    </Button>
                    <Button
                        variant="outline-success"
                        size="sm"
                        className="shadow-sm d-flex align-items-center gap-1 fw-bold"
                        onClick={handleExportExcel}
                        disabled={filteredMachines.length === 0}
                    >
                        <FaFileExcel /> Export Excel
                    </Button>
                    <Button
                        variant="dark"
                        size="sm"
                        className="shadow-sm d-flex align-items-center gap-1 fw-bold"
                        onClick={handlePrint}
                        disabled={filteredMachines.length === 0}
                    >
                        <FaPrint /> Print Report
                    </Button>
                </div>
            </div>

            {/* 2. Compact Clean Filter Toolbar */}
            <Card className="no-print mb-3 shadow-sm border-0">
                <Card.Body className="p-3">
                    <Row className="align-items-end g-2">
                        {/* Date Picker */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.8rem" }}>
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
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.8rem" }}>
                                    ⏰ Shift Filter
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={selectedShiftId}
                                    onChange={(e) => setSelectedShiftId(e.target.value)}
                                    className="form-select-sm"
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
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.8rem" }}>
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
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.8rem" }}>
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
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.8rem" }}>
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
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.8rem" }}>
                                    🗓️ Working Days
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

                    {/* Second Row: Search, Quick Dates, View Toggles, Clear Filters */}
                    <Row className="align-items-center mt-3 pt-2 border-top g-2">
                        <Col lg={4} md={6} sm={12}>
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

                        <Col lg={3} md={6} sm={12}>
                            <div className="d-flex gap-1 align-items-center">
                                <span className="text-muted small fw-bold">Date:</span>
                                <Button
                                    variant={reportDate === formatDateToISO(new Date()) ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-1 px-2 text-nowrap"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => setReportDate(formatDateToISO(new Date()))}
                                >
                                    Today
                                </Button>
                                <Button
                                    variant={reportDate === "2026-10-09" ? "primary" : "outline-secondary"}
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

                        <Col lg={3} md={6} sm={6}>
                            <Form.Check
                                type="switch"
                                id="show-mtd-switch"
                                label={<span className="fw-bold text-dark" style={{ fontSize: "0.8rem" }}>Show Actual MTD Hours</span>}
                                checked={showMtd}
                                onChange={(e) => setShowMtd(e.target.checked)}
                            />
                        </Col>

                        <Col lg={2} md={6} sm={6} className="text-md-end text-end">
                            {(selectedShiftId !== "0" || machineTypeId !== "0" || statusFilter !== "all" || performanceFilter !== "all" || searchQuery || workingDays !== 26) && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-danger p-0 fw-bold text-decoration-none"
                                    style={{ fontSize: "0.8rem" }}
                                    onClick={() => {
                                        setSelectedShiftId("0");
                                        setMachineTypeId("0");
                                        setStatusFilter("all");
                                        setPerformanceFilter("all");
                                        setSearchQuery("");
                                        setWorkingDays(26);
                                    }}
                                >
                                    ✕ Clear Filters
                                </Button>
                            )}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* 3. KPI Summary Cards (compact matching ItemMachiningTimeReport) */}
            <Row className="no-print mb-3 g-2">
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2 bg-light">
                        <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>Total Machines</div>
                        <h4 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.35rem" }}>{kpiStats.totalMachines}</h4>
                        <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                            {kpiStats.activeMachines} Active | {kpiStats.inactiveMachines} Band
                        </div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#d4edda", color: "#155724" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>Optimal (&gt; 5hr)</div>
                        <h4 className="mb-0 fw-bold" style={{ fontSize: "1.35rem" }}>{kpiStats.optimalCount}</h4>
                        <div style={{ fontSize: "0.7rem" }}>Green Status</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#fff3cd", color: "#856404" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>Normal (3hr - 5hr)</div>
                        <h4 className="mb-0 fw-bold" style={{ fontSize: "1.35rem" }}>{kpiStats.normalCount}</h4>
                        <div style={{ fontSize: "0.7rem" }}>Yellow Status</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#d1ecf1", color: "#0c5460" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>Low (1hr - 3hr)</div>
                        <h4 className="mb-0 fw-bold" style={{ fontSize: "1.35rem" }}>{kpiStats.lowCount}</h4>
                        <div style={{ fontSize: "0.7rem" }}>Blue Status</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#f8d7da", color: "#721c24" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>Critical (&lt; 1hr)</div>
                        <h4 className="mb-0 fw-bold" style={{ fontSize: "1.35rem" }}>{kpiStats.criticalCount}</h4>
                        <div style={{ fontSize: "0.7rem" }}>Red Status</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2 bg-dark text-white">
                        <div className="text-uppercase fw-bold text-muted" style={{ fontSize: "0.72rem" }}>Daily Running / Util.</div>
                        <h4 className="mb-0 fw-bold text-warning" style={{ fontSize: "1.35rem" }}>
                            {formatHours(kpiStats.totalDailyHours)} <span style={{ fontSize: "0.8rem" }}>hrs</span>
                        </h4>
                        <div className="text-warning-50 fw-bold" style={{ fontSize: "0.7rem" }}>
                            {kpiStats.overallUtilizationPercent}% ({kpiStats.shiftTargetDailyHours}h Target)
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Real-time Shift Status Notice Banner (Hidden on print) */}
            <div className="no-print mb-3">
                {isPlantOffShift ? (
                    <div className="alert alert-secondary border-0 shadow-sm d-flex align-items-center justify-content-between py-1 px-3 mb-0" style={{ backgroundColor: "#e2e8f0", fontSize: "0.8rem" }}>
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-dark py-1 px-2" style={{ fontSize: "0.72rem" }}>🏭 PLANT OFF-SHIFT</span>
                            <span className="fw-bold text-dark">
                                Factory is currently in Off-Shift / Non-Working Hours.
                            </span>
                            <span className="text-muted small">
                                (Machines normally remain stopped outside scheduled shifts).
                            </span>
                        </div>
                        {serverTime && <span className="badge bg-secondary" style={{ fontSize: "0.72rem" }}>Server Time: {serverTime}</span>}
                    </div>
                ) : currentShiftInfo ? (
                    <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between py-1 px-3 mb-0" style={{ fontSize: "0.8rem" }}>
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-success py-1 px-2" style={{ fontSize: "0.72rem" }}>⚡ ACTIVE RUNNING SHIFT</span>
                            <span className="fw-bold text-success">
                                {currentShiftInfo.Name} ({currentShiftInfo.StartTime} - {currentShiftInfo.EndTime})
                            </span>
                            <span className="text-muted small">
                                • Net Working Capacity: {currentShiftInfo.NetWorkingHours} hrs/day • Target: {kpiStats.shiftTargetDailyHours} hrs
                            </span>
                        </div>
                        {serverTime && <span className="badge bg-dark" style={{ fontSize: "0.72rem" }}>Server Time: {serverTime}</span>}
                    </div>
                ) : null}
            </div>

            {/* Print Header (Visible ONLY on Paper Print, Hidden on screen) */}
            <div className="d-none d-print-block mb-3 p-3 bg-light rounded border text-center">
                <h3 className="fw-bold mb-1 text-dark text-uppercase">
                    MACHINE RUNNING STATUS REPORT
                </h3>
                <div className="d-flex justify-content-center gap-3 text-muted fw-bold" style={{ fontSize: "0.85rem" }}>
                    <span>DATE: {formatDateDisplay(reportDate)}</span>
                    <span>•</span>
                    <span>MACHINES DISPLAYED: {filteredMachines.length}</span>
                    <span>•</span>
                    <span>MONTHLY BASIS: {workingDays} WORKING DAYS</span>
                    <span>•</span>
                    <span>TOTAL DAILY RUNNING: {formatHours(kpiStats.totalDailyHours)} HRS</span>
                </div>
            </div>

            {/* 4. Main Report Area & Table */}
            <div className="printable-report-area">
                <Card className="border shadow-sm mb-4">
                    <Card.Header className="bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <h6 className="mb-0 text-dark fw-bold d-flex align-items-center gap-2">
                                <FaCogs className="text-primary" />
                                <span>Machine Running Status Breakdown</span>
                                <Badge bg="secondary" className="ms-1">{filteredMachines.length} Machines</Badge>
                            </h6>
                            <span className="badge bg-light text-dark border py-1 px-2" style={{ fontSize: "0.75rem" }}>
                                📅 {formatDateDisplay(reportDate)}
                            </span>
                            <span className="badge bg-light text-dark border py-1 px-2" style={{ fontSize: "0.75rem" }}>
                                ⏱️ {workingDays} Working Days
                            </span>
                        </div>

                        {/* Inline Compact Rule Legend Strip */}
                        <div className="d-flex align-items-center gap-1 flex-wrap" style={{ fontSize: "0.72rem" }}>
                            <span className="fw-bold text-muted text-uppercase me-1">Rule:</span>
                            <span className="badge" style={{ backgroundColor: "#d4edda", color: "#155724", border: "1px solid #c3e6cb", fontSize: "0.72rem" }}>
                                &gt; 5h Green
                            </span>
                            <span className="badge" style={{ backgroundColor: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", fontSize: "0.72rem" }}>
                                3h - 5h Yellow
                            </span>
                            <span className="badge" style={{ backgroundColor: "#d1ecf1", color: "#0c5460", border: "1px solid #bee5eb", fontSize: "0.72rem" }}>
                                1h - 3h Blue
                            </span>
                            <span className="badge" style={{ backgroundColor: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb", fontSize: "0.72rem" }}>
                                &lt; 1h Red
                            </span>
                            <span className="badge" style={{ backgroundColor: "#f8d7da", color: "#721c24", border: "1px solid #dc3545", fontSize: "0.72rem" }}>
                                Pink = Band
                            </span>
                        </div>
                    </Card.Header>
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
                                <Table bordered hover size="sm" className="align-middle mb-0 text-center" style={{ borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #333" }}>
                                            <th rowSpan={2} style={{ width: "110px", verticalAlign: "middle", fontWeight: "700", fontSize: "0.8rem", padding: "6px 4px" }}>
                                                MACHINE<br />NUMBER
                                            </th>
                                            <th rowSpan={2} style={{ textAlign: "left", verticalAlign: "middle", fontWeight: "700", fontSize: "0.8rem", padding: "6px 8px" }}>
                                                MACHINE NAME
                                            </th>
                                            <th rowSpan={2} style={{ width: "100px", verticalAlign: "middle", fontWeight: "700", fontSize: "0.8rem", padding: "6px 4px" }}>
                                                TYPE
                                            </th>
                                            <th colSpan={showMtd ? 3 : 2} style={{ verticalAlign: "middle", fontWeight: "700", fontSize: "0.8rem", backgroundColor: "#eaecef", padding: "6px 4px" }}>
                                                MACHINE RUNNING TIME
                                            </th>
                                            <th rowSpan={2} style={{ width: "80px", verticalAlign: "middle", fontWeight: "700", fontSize: "0.8rem", padding: "6px 4px" }} className="no-print">
                                                JOBS
                                            </th>
                                            <th rowSpan={2} style={{ width: "95px", verticalAlign: "middle", fontWeight: "700", fontSize: "0.8rem", padding: "6px 4px" }} className="no-print">
                                                DETAILS
                                            </th>
                                        </tr>
                                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                                            <th style={{ width: "120px", fontWeight: "700", fontSize: "0.78rem", backgroundColor: "#e2e6ea", padding: "4px" }}>
                                                {formatDateDisplay(reportDate)}
                                            </th>
                                            <th style={{ width: "120px", fontWeight: "700", fontSize: "0.78rem", backgroundColor: "#e2e6ea", padding: "4px" }}>
                                                MONTHLY
                                            </th>
                                            {showMtd && (
                                                <th style={{ width: "120px", fontWeight: "700", fontSize: "0.78rem", backgroundColor: "#dbe2ef", padding: "4px" }}>
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
                                                    {/* Machine Number - pink highlight if Inactive / Band */}
                                                    <td
                                                        className={`machine-num-cell ${isBand ? "machine-inactive-cell" : ""}`}
                                                        style={{ fontWeight: "700", fontSize: "0.88rem", padding: "6px 4px" }}
                                                    >
                                                        {m.MachineNumber || m.machineNumber || "-"}
                                                        {isBand && (
                                                            <div className="badge bg-danger text-white mt-0.5 d-block" style={{ fontSize: "0.62rem", padding: "2px 4px" }}>
                                                                BAND
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Machine Name */}
                                                    <td className="text-start" style={{ fontWeight: "600", textTransform: "uppercase", fontSize: "0.82rem", padding: "6px 8px" }}>
                                                        <span
                                                            className="text-dark cursor-pointer fw-bold"
                                                            onClick={() => handleOpenDetails(m)}
                                                            title="Click to view Job Cards & details"
                                                        >
                                                            {m.MachineName || m.machineName}
                                                        </span>
                                                        {(m.MachineType || m.machineType) && (
                                                            <span className="text-muted ms-1.5 fw-normal" style={{ fontSize: "0.75rem" }}>
                                                                ({m.MachineType || m.machineType})
                                                            </span>
                                                        )}
                                                        {machStatus === "RUNNING" && (
                                                            <span className="badge bg-success ms-1.5" style={{ fontSize: "0.65rem", padding: "2px 5px" }}>RUNNING</span>
                                                        )}
                                                        {machStatus === "PAUSED" && (
                                                            <span className="badge bg-warning text-dark ms-1.5" style={{ fontSize: "0.65rem", padding: "2px 5px" }}>PAUSED</span>
                                                        )}
                                                        {machStatus === "OFF_SHIFT" && (
                                                            <span className="badge bg-secondary ms-1.5" style={{ fontSize: "0.65rem", padding: "2px 5px" }} title="Planned Off-Shift">OFF-SHIFT</span>
                                                        )}
                                                        {machStatus === "IDLE" && (
                                                            <span className="badge bg-light text-muted border ms-1.5" style={{ fontSize: "0.65rem", padding: "2px 5px" }}>IDLE</span>
                                                        )}
                                                    </td>

                                                    {/* Machine Category (Wood / Metal) */}
                                                    <td style={{ padding: "6px 4px" }}>
                                                        <Badge bg={(m.CategoryType || m.categoryType) === "M" ? "secondary" : "dark"} style={{ fontSize: "0.72rem" }}>
                                                            {m.CategoryName || m.categoryName || ((m.CategoryType || m.categoryType) === "W" ? "Wood" : "Metal")}
                                                        </Badge>
                                                    </td>

                                                    {/* Daily Hours with exact rule color */}
                                                    <td
                                                        style={{ ...ruleStyle.cellStyle, padding: "5px 4px" }}
                                                        className="cursor-pointer"
                                                        onClick={() => handleOpenDetails(m)}
                                                        title={`Click to view breakdown for ${m.MachineName || m.machineName}`}
                                                    >
                                                        <div style={{ fontSize: "0.95rem", fontWeight: "700" }}>
                                                            {formatHours(dailyHrs)}
                                                        </div>
                                                        <div style={{ fontSize: "0.68rem", opacity: 0.85 }}>
                                                            {shiftUtilPct}% of {shiftTargetH}h
                                                        </div>
                                                    </td>

                                                    {/* Monthly Projected Hours (Daily * 26) */}
                                                    <td style={{ fontWeight: "700", fontSize: "0.85rem", backgroundColor: "#fafafa", padding: "6px 4px" }}>
                                                        {formatHours(m.ProjectedMonthlyHours || m.projectedMonthlyHours)}
                                                    </td>

                                                    {/* Optional Actual MTD Hours */}
                                                    {showMtd && (
                                                        <td style={{ fontWeight: "700", fontSize: "0.85rem", backgroundColor: "#f0f4f8", padding: "6px 4px" }}>
                                                            {formatHours(m.ActualMtdHours)}
                                                        </td>
                                                    )}

                                                    {/* Job Cards count (hidden on print) */}
                                                    <td className="no-print" style={{ padding: "6px 4px" }}>
                                                        <Badge bg="light" text="dark" className="border fw-bold" style={{ fontSize: "0.75rem" }}>
                                                            {m.JobCardCount || 0}
                                                        </Badge>
                                                    </td>

                                                    {/* Action Button (hidden on print) */}
                                                    <td className="no-print" style={{ padding: "6px 4px" }}>
                                                        <Button
                                                            variant="outline-info"
                                                            size="sm"
                                                            className="py-0.5 px-2 fw-bold"
                                                            style={{ fontSize: "0.72rem" }}
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
                                        <tr style={{ backgroundColor: "#e9ecef", borderTop: "2px solid #333", fontWeight: "700", fontSize: "0.85rem" }}>
                                            <td colSpan={3} className="text-end pe-3">
                                                TOTAL RUNNING HOURS:
                                            </td>
                                            <td style={{ fontSize: "0.95rem", fontWeight: "800", color: "#155724" }}>
                                                {formatHours(kpiStats.totalDailyHours)}
                                            </td>
                                            <td style={{ fontSize: "0.95rem", fontWeight: "800" }}>
                                                {formatHours(kpiStats.totalProjectedMonthlyHours)}
                                            </td>
                                            {showMtd && (
                                                <td style={{ fontSize: "0.95rem", fontWeight: "800" }}>
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
