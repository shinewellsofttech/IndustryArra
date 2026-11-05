import React, { useState, useEffect, useMemo } from "react";
import { Row, Col, Card, Table, Button, Form, Badge, ProgressBar, Spinner, Nav } from "react-bootstrap";
import axios from "axios";
import XLSX from "xlsx";
import { 
    FaChevronDown, FaChevronRight, FaPrint, FaFileExcel, FaSync, 
    FaSearch, FaCogs, FaClock, FaCheckCircle, FaSpinner, 
    FaBoxes, FaIndustry, FaListUl, FaLayerGroup, FaTimes
} from "react-icons/fa";
import { API_WEB_URLS } from "../../constants/constAPI";

// Format hours nicely (e.g. 12.5 hrs or 0.8 hrs)
const formatHours = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "0";
    const num = parseFloat(val);
    if (num === 0) return "0";
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
};

// Format minutes into clean Days, Hours, Mins string
const formatDuration = (totalMinutes) => {
    if (!totalMinutes || isNaN(totalMinutes) || totalMinutes <= 0) return "0m";
    const mins = Math.round(parseFloat(totalMinutes));
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(" ");
};

// Format Date Time (DD-MM-YYYY HH:mm)
const formatDateTime = (ts) => {
    if (!ts) return "-";
    try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts.toString().replace("T", " ");
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return `${day}-${month}-${year} ${time}`;
    } catch {
        return ts;
    }
};

// Date formatter using local time (avoids UTC timezone shift)
const formatDateToISO = (d) => {
    if (!d) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const ItemMachiningTimeReport = () => {
    // Filters state - Default to ALL so data loads immediately
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [quickRange, setQuickRange] = useState("ALL");
    const [itemCodeQuery, setItemCodeQuery] = useState("");
    const [selectedContainerId, setSelectedContainerId] = useState("");
    const [contractNoQuery, setContractNoQuery] = useState("");
    const [machineTypeId, setMachineTypeId] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, COMPLETED, IN_PROGRESS
    const [searchQuery, setSearchQuery] = useState("");
    const [groupByItem, setGroupByItem] = useState(false); // false = Batch View, true = Item Grouped

    // Data state
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [containersList, setContainersList] = useState([]);
    const [categoriesList, setCategoriesList] = useState([]);

    // Expanded rows dictionary: { [rowKey]: { loading: bool, data: { machines: [], steps: [] }, activeTab: 'machines' } }
    const [expandedRows, setExpandedRows] = useState({});

    // Auth Helper
    const getAuth = () => {
        const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userId = authUser?.id || authUser?.ID || "0";
        const token = authUser?.jwtToken || authUser?.token || authUser?.UserToken || authUser?.UserTokenNew || "token";
        return { userId, token };
    };

    // Load Report Data
    const fetchReport = async () => {
        setLoading(true);
        try {
            const { userId, token } = getAuth();
            let url = `${API_WEB_URLS.BASE}${API_WEB_URLS.ITEM_MACHINING_TIME_REPORT}/${userId}/token?`;
            const params = [];
            if (fromDate) params.push(`fromDate=${fromDate}`);
            if (toDate) params.push(`toDate=${toDate}`);
            if (itemCodeQuery.trim()) params.push(`itemCode=${encodeURIComponent(itemCodeQuery.trim())}`);
            if (selectedContainerId) params.push(`containerId=${selectedContainerId}`);
            if (contractNoQuery.trim()) params.push(`contractNo=${encodeURIComponent(contractNoQuery.trim())}`);
            if (machineTypeId) params.push(`machineTypeId=${machineTypeId}`);
            if (statusFilter !== "ALL") params.push(`status=${statusFilter}`);

            url += params.join("&");

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const isSuccess = res.data?.success || res.data?.Success;
            const resData = res.data?.data || res.data?.Data || {};

            if (isSuccess) {
                const fetchedRows = resData.rows || resData.Rows || [];
                const fetchedContainers = resData.containers || resData.Containers || [];
                const fetchedCategories = resData.categories || resData.Categories || [];
                setRows(fetchedRows);
                if (fetchedContainers.length > 0 && containersList.length === 0) setContainersList(fetchedContainers);
                if (fetchedCategories.length > 0 && categoriesList.length === 0) setCategoriesList(fetchedCategories);
            } else {
                setRows([]);
            }
        } catch (error) {
            console.error("Error fetching item machining time report:", error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [fromDate, toDate, selectedContainerId, machineTypeId, statusFilter]);

    // Quick Date Handler
    const handleQuickRange = (type) => {
        setQuickRange(type);
        const today = new Date();
        if (type === "TODAY") {
            const str = formatDateToISO(today);
            setFromDate(str);
            setToDate(str);
        } else if (type === "LAST7") {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            setFromDate(formatDateToISO(d));
            setToDate(formatDateToISO(today));
        } else if (type === "LAST30") {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            setFromDate(formatDateToISO(d));
            setToDate(formatDateToISO(today));
        } else if (type === "THISMONTH") {
            const d = new Date(today.getFullYear(), today.getMonth(), 1);
            setFromDate(formatDateToISO(d));
            setToDate(formatDateToISO(today));
        } else if (type === "ALL") {
            setFromDate("");
            setToDate("");
        }
    };

    const handleResetAllFilters = () => {
        setFromDate("");
        setToDate("");
        setQuickRange("ALL");
        setItemCodeQuery("");
        setSelectedContainerId("");
        setContractNoQuery("");
        setMachineTypeId("");
        setStatusFilter("ALL");
        setSearchQuery("");
    };

    // Fetch child breakdown for an expanded row
    const toggleExpandRow = async (row) => {
        const rowKey = `${row.ItemCode}_${row.ContainerNumber}_${row.ContractNo}`;
        
        if (expandedRows[rowKey]) {
            setExpandedRows(prev => {
                const next = { ...prev };
                delete next[rowKey];
                return next;
            });
            return;
        }

        setExpandedRows(prev => ({
            ...prev,
            [rowKey]: { loading: true, data: null, activeTab: "machines" }
        }));

        try {
            const { userId, token } = getAuth();
            let url = `${API_WEB_URLS.BASE}${API_WEB_URLS.ITEM_MACHINING_TIME_REPORT}/Breakdown/${userId}/token?itemMasterId=${row.ItemMasterId}&itemCode=${encodeURIComponent(row.ItemCode)}`;
            if (row.ContainerId) url += `&containerId=${row.ContainerId}`;
            if (row.ContainerNumber && row.ContainerNumber !== "-") url += `&containerNumber=${encodeURIComponent(row.ContainerNumber)}`;
            if (row.ContractNo && row.ContractNo !== "-") url += `&contractNo=${encodeURIComponent(row.ContractNo)}`;

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const isSuccess = res.data?.success || res.data?.Success;
            const breakdownData = res.data?.data || res.data?.Data || {};

            if (isSuccess) {
                const machines = breakdownData.machines || breakdownData.Machines || [];
                const steps = breakdownData.steps || breakdownData.Steps || [];
                setExpandedRows(prev => ({
                    ...prev,
                    [rowKey]: {
                        loading: false,
                        data: { machines, steps },
                        activeTab: "machines"
                    }
                }));
            } else {
                setExpandedRows(prev => ({
                    ...prev,
                    [rowKey]: { loading: false, data: { machines: [], steps: [] }, activeTab: "machines" }
                }));
            }
        } catch (err) {
            console.error("Error fetching breakdown:", err);
            setExpandedRows(prev => ({
                ...prev,
                [rowKey]: { loading: false, data: { machines: [], steps: [] }, activeTab: "machines" }
            }));
        }
    };

    // Filter rows based on search query
    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return rows;
        const q = searchQuery.toLowerCase().trim();
        return rows.filter(r => 
            (r.ItemCode || "").toLowerCase().includes(q) ||
            (r.ItemName || "").toLowerCase().includes(q) ||
            (r.ContainerNumber || "").toLowerCase().includes(q) ||
            (r.ContractNo || "").toLowerCase().includes(q)
        );
    }, [rows, searchQuery]);

    // Grouping by Item Code (All-time Item aggregation)
    const groupedItemData = useMemo(() => {
        if (!groupByItem) return null;

        const map = new Map();
        filteredRows.forEach(r => {
            const code = r.ItemCode || "Unknown";
            if (!map.has(code)) {
                map.set(code, {
                    ItemMasterId: r.ItemMasterId,
                    ItemCode: code,
                    ItemName: r.ItemName,
                    TotalBatches: 0,
                    TotalUnits: 0,
                    TotalActiveHours: 0,
                    TotalElapsedHours: 0,
                    TotalJobCards: 0,
                    Batches: []
                });
            }
            const g = map.get(code);
            g.TotalBatches += 1;
            g.TotalUnits += (parseFloat(r.OrderQty) || 0);
            g.TotalActiveHours += (parseFloat(r.ActiveMachiningHours) || 0);
            g.TotalElapsedHours += (parseFloat(r.ElapsedHours) || 0);
            g.TotalJobCards += (parseInt(r.JobCardCount) || 0);
            g.Batches.push(r);
        });

        return Array.from(map.values()).map(g => ({
            ...g,
            AvgMachiningHoursPerBatch: g.TotalBatches > 0 ? (g.TotalActiveHours / g.TotalBatches) : 0,
            AvgMinutesPerUnit: g.TotalUnits > 0 ? ((g.TotalActiveHours * 60) / g.TotalUnits) : 0
        }));
    }, [filteredRows, groupByItem]);

    // KPI Metrics calculation
    const kpiSummary = useMemo(() => {
        let totalUnits = 0;
        let totalActiveHours = 0;
        let totalElapsedHours = 0;
        let completedBatches = 0;
        let inProgressBatches = 0;

        filteredRows.forEach(r => {
            totalUnits += (parseFloat(r.OrderQty) || 0);
            totalActiveHours += (parseFloat(r.ActiveMachiningHours) || 0);
            totalElapsedHours += (parseFloat(r.ElapsedHours) || 0);
            if (r.MachiningStatus === "COMPLETED") completedBatches++;
            else inProgressBatches++;
        });

        const totalBatches = filteredRows.length;
        const avgHoursPerBatch = totalBatches > 0 ? (totalActiveHours / totalBatches) : 0;
        const avgCycleMinutesPerUnit = totalUnits > 0 ? ((totalActiveHours * 60) / totalUnits) : 0;

        return {
            totalBatches,
            totalUnits,
            totalActiveHours: formatHours(totalActiveHours),
            avgHoursPerBatch: formatHours(avgHoursPerBatch),
            avgCycleMinutesPerUnit: formatHours(avgCycleMinutesPerUnit),
            completedBatches,
            inProgressBatches
        };
    }, [filteredRows]);

    // Export to Excel matching the report sheet
    const handleExportExcel = () => {
        if (!filteredRows || filteredRows.length === 0) return;

        const excelData = filteredRows.map(r => ({
            "ITEM CODE": r.ItemCode || "",
            "ITEM NAME": r.ItemName || "",
            "CONTAINER / SHIPMENT": r.ContainerNumber || "",
            "CONTRACT NO": r.ContractNo || "",
            "ORDER QTY": parseFloat(r.OrderQty) || 0,
            "JOB CARDS": r.JobCardCount || 0,
            "MACHINES USED": r.MachineCount || 0,
            "FIRST START TIME": formatDateTime(r.FirstStartTime),
            "LAST END TIME": formatDateTime(r.LastEndTime),
            "ELAPSED LEAD TIME": formatDuration(r.ElapsedMinutes),
            "ACTIVE MACHINING (HRS)": parseFloat(r.ActiveMachiningHours) || 0,
            "PAUSE TIME (MIN)": parseFloat(r.TotalPauseMinutes) || 0,
            "CYCLE TIME / UNIT (MIN)": parseFloat(r.MinutesPerUnit) || 0,
            "STATUS": r.MachiningStatus || ""
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Item Machining Lead Time");
        const dateTag = fromDate && toDate ? `${fromDate}_to_${toDate}` : "All_Dates";
        XLSX.writeFile(wb, `Item_Machining_Lead_Time_${dateTag}.xlsx`);
    };

    return (
        <div className="container-fluid item-machining-report-container p-3">
            {/* Embedded Print & Utility Stylesheet */}
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
                `}
            </style>

            {/* 1. Header Toolbar (matching MachineDelayDashboard & MachineRunningStatusReport) */}
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 no-print">
                <div>
                    <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                        <FaIndustry className="text-primary" />
                        <span>Item Machining Lead Time & Breakdown</span>
                    </h4>
                    <span className="text-muted small">
                        Real-time machine cycle times, active work hours, and component lead time progression
                    </span>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <Button
                        variant={groupByItem ? "primary" : "outline-secondary"}
                        size="sm"
                        className="shadow-sm d-flex align-items-center gap-1 fw-bold"
                        onClick={() => setGroupByItem(!groupByItem)}
                    >
                        <FaLayerGroup /> {groupByItem ? "Grouped By Item" : "Production Batch View"}
                    </Button>
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
                        disabled={filteredRows.length === 0}
                    >
                        <FaFileExcel /> Export Excel
                    </Button>
                    <Button
                        variant="dark"
                        size="sm"
                        className="shadow-sm d-flex align-items-center gap-1 fw-bold"
                        onClick={() => window.print()}
                        disabled={filteredRows.length === 0}
                    >
                        <FaPrint /> Print Report
                    </Button>
                </div>
            </div>

            {/* 2. Compact Clean Filter Toolbar */}
            <Card className="no-print mb-4 shadow-sm border-0">
                <Card.Body className="p-3">
                    <Row className="align-items-end g-2">
                        {/* From Date */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    📅 From Date
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={fromDate}
                                    onChange={(e) => {
                                        setFromDate(e.target.value);
                                        setQuickRange("CUSTOM");
                                    }}
                                    className="form-control-sm fw-bold"
                                />
                            </Form.Group>
                        </Col>

                        {/* To Date */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    📅 To Date
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={toDate}
                                    onChange={(e) => {
                                        setToDate(e.target.value);
                                        setQuickRange("CUSTOM");
                                    }}
                                    className="form-control-sm fw-bold"
                                />
                            </Form.Group>
                        </Col>

                        {/* Container / Shipment */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    📦 Shipment / Container
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={selectedContainerId}
                                    onChange={(e) => setSelectedContainerId(e.target.value)}
                                    className="form-select-sm"
                                >
                                    <option value="">All Shipments</option>
                                    {containersList.map((c) => (
                                        <option key={c.Id} value={c.Id}>
                                            {c.ContainerNumber}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Machine Type */}
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
                                    <option value="">All Types (Wood & Metal)</option>
                                    {categoriesList.map((cat) => (
                                        <option key={cat.Id} value={cat.Id}>
                                            {cat.FullName || cat.Name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Status */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    ⚡ Status
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="form-select-sm"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="COMPLETED">Completed Only</option>
                                    <option value="IN_PROGRESS">In Progress Only</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Contract No */}
                        <Col lg={2} md={4} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    Contract #
                                </Form.Label>
                                <div className="input-group input-group-sm">
                                    <Form.Control
                                        type="text"
                                        placeholder="Filter contract..."
                                        value={contractNoQuery}
                                        onChange={(e) => setContractNoQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && fetchReport()}
                                        className="form-control-sm"
                                    />
                                    <Button variant="outline-primary" size="sm" onClick={fetchReport}>
                                        Apply
                                    </Button>
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Second Row: Quick Filter Search & Range buttons */}
                    <Row className="align-items-center mt-3 pt-2 border-top g-2">
                        <Col lg={4} md={6} sm={12}>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white">
                                    <FaSearch className="text-muted" />
                                </span>
                                <Form.Control
                                    type="text"
                                    placeholder="Search Item Code, Name, Shipment, Contract..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="border-start-0"
                                />
                                {searchQuery && (
                                    <Button variant="outline-secondary" size="sm" onClick={() => setSearchQuery("")}>
                                        ✕
                                    </Button>
                                )}
                            </div>
                        </Col>

                        <Col lg={5} md={6} sm={12}>
                            <div className="d-flex gap-1 align-items-center">
                                <span className="text-muted small fw-bold">Date:</span>
                                <Button
                                    variant={quickRange === "TODAY" ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-1 px-2 text-nowrap"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => handleQuickRange("TODAY")}
                                >
                                    Today
                                </Button>
                                <Button
                                    variant={quickRange === "LAST7" ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-1 px-2 text-nowrap"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => handleQuickRange("LAST7")}
                                >
                                    7 Days
                                </Button>
                                <Button
                                    variant={quickRange === "LAST30" ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-1 px-2 text-nowrap"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => handleQuickRange("LAST30")}
                                >
                                    30 Days
                                </Button>
                                <Button
                                    variant={quickRange === "ALL" ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-1 px-2 text-nowrap"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => handleQuickRange("ALL")}
                                >
                                    All Data
                                </Button>
                            </div>
                        </Col>

                        <Col lg={3} md={12} className="text-md-end">
                            {(fromDate || toDate || selectedContainerId || machineTypeId || statusFilter !== "ALL" || searchQuery) && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-danger p-0 fw-bold text-decoration-none"
                                    onClick={handleResetAllFilters}
                                >
                                    ✕ Clear Filters
                                </Button>
                            )}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* 3. KPI Summary Cards (Matching MachineRunningStatusReport & MachineDelayDashboard exactly) */}
            <Row className="no-print mb-4 g-2">
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2 bg-light">
                        <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Total Batches</div>
                        <h3 className="mb-0 fw-bold text-dark">{kpiSummary.totalBatches}</h3>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>{kpiSummary.totalUnits} Units Total</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#d4edda", color: "#155724" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Total Machining</div>
                        <h3 className="mb-0 fw-bold">{kpiSummary.totalActiveHours} <span style={{ fontSize: "0.85rem" }}>hrs</span></h3>
                        <div style={{ fontSize: "0.75rem" }}>Actual Machine Runtime</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#d1ecf1", color: "#0c5460" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Avg Time / Batch</div>
                        <h3 className="mb-0 fw-bold">{kpiSummary.avgHoursPerBatch} <span style={{ fontSize: "0.85rem" }}>hrs</span></h3>
                        <div style={{ fontSize: "0.75rem" }}>Mean Batch Duration</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#fff3cd", color: "#856404" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>In Progress</div>
                        <h3 className="mb-0 fw-bold text-dark">{kpiSummary.inProgressBatches}</h3>
                        <div style={{ fontSize: "0.75rem" }}>Active Batches</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#e2e3e5", color: "#383d41" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Completed</div>
                        <h3 className="mb-0 fw-bold">{kpiSummary.completedBatches}</h3>
                        <div style={{ fontSize: "0.75rem" }}>Finished Batches</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2 bg-dark text-white">
                        <div className="text-uppercase fw-bold text-muted" style={{ fontSize: "0.75rem" }}>Cycle Time / Unit</div>
                        <h3 className="mb-0 fw-bold text-warning">{kpiSummary.avgCycleMinutesPerUnit} <span style={{ fontSize: "0.85rem" }}>min</span></h3>
                        <div className="text-warning-50 fw-bold" style={{ fontSize: "0.75rem" }}>Per Item Piece</div>
                    </Card>
                </Col>
            </Row>

            {/* Print Header (Visible ONLY on Paper Print, Hidden on screen) */}
            <div className="d-none d-print-block mb-3 p-3 bg-light rounded border text-center">
                <h3 className="fw-bold mb-1 text-dark text-uppercase">
                    ITEM MACHINING LEAD TIME & MACHINE BREAKDOWN REPORT
                </h3>
                <div className="d-flex justify-content-center gap-3 text-muted fw-bold" style={{ fontSize: "0.85rem" }}>
                    <span>DATE RANGE: {fromDate || "Earliest"} TO {toDate || "Latest"}</span>
                    <span>•</span>
                    <span>ITEMS DISPLAYED: {filteredRows.length}</span>
                    <span>•</span>
                    <span>TOTAL ACTIVE MACHINING: {kpiSummary.totalActiveHours} HRS</span>
                </div>
            </div>

            {/* 4. Main Data Table Card */}
            <div className="printable-report-area">
                <Card className="border shadow-sm mb-4">
                    <Card.Header className="bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 text-dark fw-bold d-flex align-items-center gap-2">
                            <FaBoxes className="text-primary" />
                            <span>{groupByItem ? "Grouped By Item Summary" : "Production Batches Machining Lead Times"}</span>
                            <Badge bg="secondary" className="ms-1">{filteredRows.length} Records</Badge>
                        </h6>
                        <span className="text-muted small">
                            Showing {filteredRows.length} of {rows.length} total batches
                        </span>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-2 text-muted fw-bold">Loading machining lead times and machine durations...</p>
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="text-center py-5 px-3">
                                <FaBoxes size={36} className="text-muted mb-2 opacity-50" />
                                <h5 className="text-dark fw-bold">No Matching Records Found</h5>
                                <p className="text-muted small mb-3">
                                    No production batches match the selected date range or filter criteria.
                                </p>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    style={{ fontSize: "0.8rem", fontWeight: 600 }}
                                    onClick={handleResetAllFilters}
                                >
                                    Reset Filters to View All Batches
                                </Button>
                            </div>
                        ) : groupByItem ? (
                            /* Grouped By Item View */
                            <div className="table-responsive">
                                <Table bordered hover className="align-middle mb-0 text-center" style={{ borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #333" }}>
                                            <th style={{ width: "130px", fontWeight: "800", verticalAlign: "middle" }}>ITEM CODE</th>
                                            <th style={{ textAlign: "left", fontWeight: "800", verticalAlign: "middle" }}>ITEM NAME</th>
                                            <th style={{ width: "90px", fontWeight: "800", verticalAlign: "middle" }}>BATCHES</th>
                                            <th style={{ width: "100px", fontWeight: "800", verticalAlign: "middle" }}>TOTAL QTY</th>
                                            <th style={{ width: "90px", fontWeight: "800", verticalAlign: "middle" }}>JOB CARDS</th>
                                            <th style={{ width: "140px", fontWeight: "800", verticalAlign: "middle", backgroundColor: "#eaecef" }}>TOTAL ACTIVE TIME</th>
                                            <th style={{ width: "130px", fontWeight: "800", verticalAlign: "middle" }}>AVG TIME / BATCH</th>
                                            <th style={{ width: "130px", fontWeight: "800", verticalAlign: "middle" }}>CYCLE TIME / UNIT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedItemData?.map((item) => (
                                            <tr key={item.ItemCode} className="hover-shadow">
                                                <td>
                                                    <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: "0.85rem" }}>
                                                        {item.ItemCode}
                                                    </span>
                                                </td>
                                                <td className="text-start fw-bold text-dark">
                                                    {item.ItemName}
                                                </td>
                                                <td className="fw-bold">{item.TotalBatches}</td>
                                                <td className="fw-bold text-primary">{item.TotalUnits}</td>
                                                <td>{item.TotalJobCards}</td>
                                                <td style={{ backgroundColor: "#f0f4f8" }}>
                                                    <span className="badge bg-light text-primary border border-primary px-2 py-1 fw-bold" style={{ fontSize: "0.85rem" }}>
                                                        {formatHours(item.TotalActiveHours)} hrs
                                                    </span>
                                                </td>
                                                <td className="fw-bold text-secondary">
                                                    {formatHours(item.AvgMachiningHoursPerBatch)} hrs
                                                </td>
                                                <td className="fw-bold text-muted">
                                                    {formatHours(item.AvgMinutesPerUnit)} min
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        ) : (
                            /* Default Batch View */
                            <div className="table-responsive">
                                <Table bordered hover className="align-middle mb-0 text-center" style={{ borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #333" }}>
                                            <th style={{ width: "40px", verticalAlign: "middle" }} className="no-print">EXP</th>
                                            <th style={{ width: "120px", fontWeight: "800", verticalAlign: "middle" }}>ITEM CODE</th>
                                            <th style={{ textAlign: "left", fontWeight: "800", verticalAlign: "middle" }}>ITEM NAME</th>
                                            <th style={{ width: "110px", fontWeight: "800", verticalAlign: "middle" }}>SHIPMENT</th>
                                            <th style={{ width: "105px", fontWeight: "800", verticalAlign: "middle" }}>CONTRACT #</th>
                                            <th style={{ width: "75px", fontWeight: "800", verticalAlign: "middle" }}>QTY</th>
                                            <th style={{ width: "65px", fontWeight: "800", verticalAlign: "middle" }}>JOBS</th>
                                            <th style={{ width: "65px", fontWeight: "800", verticalAlign: "middle" }}>M/C</th>
                                            <th style={{ width: "130px", fontWeight: "800", verticalAlign: "middle" }}>FIRST START</th>
                                            <th style={{ width: "130px", fontWeight: "800", verticalAlign: "middle" }}>LAST END</th>
                                            <th style={{ width: "110px", fontWeight: "800", verticalAlign: "middle" }}>LEAD TIME</th>
                                            <th style={{ width: "120px", fontWeight: "800", verticalAlign: "middle", backgroundColor: "#eaecef" }}>MACHINING HRS</th>
                                            <th style={{ width: "95px", fontWeight: "800", verticalAlign: "middle" }}>PER UNIT</th>
                                            <th style={{ width: "110px", fontWeight: "800", verticalAlign: "middle" }}>STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRows.map((r, idx) => {
                                            const rowKey = `${r.ItemCode}_${r.ContainerNumber}_${r.ContractNo}`;
                                            const isExpanded = !!expandedRows[rowKey];
                                            const rowDetail = expandedRows[rowKey];
                                            const isCompleted = r.MachiningStatus === "COMPLETED";

                                            return (
                                                <React.Fragment key={rowKey || idx}>
                                                    <tr className="hover-shadow">
                                                        {/* Expand Button */}
                                                        <td className="no-print">
                                                            <Button
                                                                variant={isExpanded ? "primary" : "outline-secondary"}
                                                                size="sm"
                                                                className="py-0 px-2"
                                                                style={{ fontSize: "0.72rem" }}
                                                                onClick={() => toggleExpandRow(r)}
                                                                title={isExpanded ? "Collapse machine breakdown" : "Expand to view machine breakdown"}
                                                            >
                                                                {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                                            </Button>
                                                        </td>

                                                        {/* Item Code */}
                                                        <td className="cursor-pointer" onClick={() => toggleExpandRow(r)}>
                                                            <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: "0.82rem" }}>
                                                                {r.ItemCode}
                                                            </span>
                                                        </td>

                                                        {/* Item Name */}
                                                        <td className="text-start fw-bold text-dark cursor-pointer" onClick={() => toggleExpandRow(r)}>
                                                            {r.ItemName}
                                                        </td>

                                                        {/* Container / Shipment */}
                                                        <td>
                                                            <span className="badge bg-light text-dark border" style={{ fontSize: "0.75rem" }}>
                                                                {r.ContainerNumber || "-"}
                                                            </span>
                                                        </td>

                                                        {/* Contract No */}
                                                        <td className="text-muted fw-bold" style={{ fontSize: "0.78rem" }}>
                                                            {r.ContractNo || "-"}
                                                        </td>

                                                        {/* Quantity */}
                                                        <td className="fw-bold">{r.OrderQty}</td>

                                                        {/* Job Cards Count */}
                                                        <td>{r.JobCardCount}</td>

                                                        {/* Machine Count */}
                                                        <td>{r.MachineCount}</td>

                                                        {/* First Machine Start */}
                                                        <td style={{ fontSize: "0.76rem" }}>
                                                            {formatDateTime(r.FirstStartTime)}
                                                        </td>

                                                        {/* Last Machine End */}
                                                        <td style={{ fontSize: "0.76rem" }}>
                                                            {isCompleted ? (
                                                                formatDateTime(r.LastEndTime)
                                                            ) : (
                                                                <Badge bg="warning" text="dark" className="px-2 py-1 d-inline-flex align-items-center gap-1">
                                                                    <FaClock size={9} /> In Progress
                                                                </Badge>
                                                            )}
                                                        </td>

                                                        {/* Elapsed Lead Time */}
                                                        <td style={{ fontSize: "0.78rem" }}>
                                                            <strong>{formatDuration(r.ElapsedMinutes)}</strong>
                                                        </td>

                                                        {/* Active Machining Time */}
                                                        <td style={{ backgroundColor: "#f0f4f8" }}>
                                                            <span className="badge bg-light text-primary border border-primary px-2 py-1 fw-bold" style={{ fontSize: "0.85rem" }}>
                                                                {formatHours(r.ActiveMachiningHours)} hrs
                                                            </span>
                                                        </td>

                                                        {/* Minutes Per Unit */}
                                                        <td className="text-muted fw-bold" style={{ fontSize: "0.78rem" }}>
                                                            {formatHours(r.MinutesPerUnit)} m/u
                                                        </td>

                                                        {/* Status */}
                                                        <td>
                                                            {isCompleted ? (
                                                                <Badge bg="success" className="px-2 py-1 d-inline-flex align-items-center gap-1">
                                                                    <FaCheckCircle size={9} /> Completed
                                                                </Badge>
                                                            ) : (
                                                                <Badge bg="warning" text="dark" className="px-2 py-1 d-inline-flex align-items-center gap-1">
                                                                    <FaSpinner className="fa-spin" size={9} /> In Progress
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Drawer (Matching MachineDelayDashboard drilldown) */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={14} className="p-3 bg-light border-bottom">
                                                                <Card className="border shadow-sm">
                                                                    <Card.Header className="bg-white py-2 px-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                                                                        <div>
                                                                            <strong className="text-dark d-flex align-items-center gap-2" style={{ fontSize: "0.9rem" }}>
                                                                                <FaCogs className="text-primary" />
                                                                                Machine Breakdown: Item {r.ItemCode} ({r.ItemName})
                                                                            </strong>
                                                                            <small className="text-muted d-block" style={{ fontSize: "0.78rem" }}>
                                                                                Total Machining: <strong>{formatHours(r.ActiveMachiningHours)} hrs</strong> ({formatDuration(r.ActiveMachiningMinutes)}) across {r.MachineCount} machines and {r.JobCardCount} job cards.
                                                                            </small>
                                                                        </div>

                                                                        <Nav variant="pills" activeKey={rowDetail?.activeTab || "machines"} onSelect={(k) => {
                                                                            setExpandedRows(prev => ({
                                                                                ...prev,
                                                                                [rowKey]: { ...prev[rowKey], activeTab: k }
                                                                            }));
                                                                        }}>
                                                                            <Nav.Item>
                                                                                <Nav.Link eventKey="machines" style={{ padding: "4px 12px", fontSize: "0.78rem" }}>
                                                                                    <FaIndustry className="me-1" /> Machines Summary
                                                                                </Nav.Link>
                                                                            </Nav.Item>
                                                                            <Nav.Item>
                                                                                <Nav.Link eventKey="steps" style={{ padding: "4px 12px", fontSize: "0.78rem" }}>
                                                                                    <FaListUl className="me-1" /> Job Card Steps ({rowDetail?.data?.steps?.length || 0})
                                                                                </Nav.Link>
                                                                            </Nav.Item>
                                                                        </Nav>
                                                                    </Card.Header>

                                                                    <Card.Body className="p-0">
                                                                        {rowDetail?.loading ? (
                                                                            <div className="text-center py-4">
                                                                                <Spinner animation="border" size="sm" variant="primary" />
                                                                                <span className="ms-2 text-muted fw-bold" style={{ fontSize: "0.82rem" }}>
                                                                                    Loading machine breakdown details...
                                                                                </span>
                                                                            </div>
                                                                        ) : rowDetail?.activeTab === "steps" ? (
                                                                            /* Steps Table */
                                                                            <div className="table-responsive">
                                                                                <Table size="sm" bordered hover className="mb-0 text-center align-middle" style={{ fontSize: "0.78rem" }}>
                                                                                    <thead className="thead-light" style={{ backgroundColor: "#f8f9fa" }}>
                                                                                        <tr>
                                                                                            <th style={{ width: "35px" }}>#</th>
                                                                                            <th>Job Card No</th>
                                                                                            <th>Series</th>
                                                                                            <th style={{ textAlign: "left" }}>Process</th>
                                                                                            <th style={{ textAlign: "left" }}>Machine</th>
                                                                                            <th>Operator</th>
                                                                                            <th>Start Time</th>
                                                                                            <th>End Time</th>
                                                                                            <th>Pause (Min)</th>
                                                                                            <th style={{ backgroundColor: "#eaecef" }}>Duration</th>
                                                                                            <th>Status</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {rowDetail?.data?.steps?.map((step, sIdx) => (
                                                                                            <tr key={step.StepId || sIdx}>
                                                                                                <td>{sIdx + 1}</td>
                                                                                                <td className="fw-bold text-primary">{step.JobCardNo}</td>
                                                                                                <td>{step.Series}</td>
                                                                                                <td className="text-start fw-bold">{step.ProcessName}</td>
                                                                                                <td className="text-start">{step.MachineName} (#{step.MachineNumber})</td>
                                                                                                <td>{step.OperatorName}</td>
                                                                                                <td>{formatDateTime(step.StartTime)}</td>
                                                                                                <td>
                                                                                                    {step.EndTime ? (
                                                                                                        formatDateTime(step.EndTime)
                                                                                                    ) : (
                                                                                                        <Badge bg="warning" text="dark" className="px-2 py-1">
                                                                                                            <FaSpinner className="fa-spin me-1" size={8} /> Running
                                                                                                        </Badge>
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="text-muted">{step.PauseMinutes || 0}</td>
                                                                                                <td className="fw-bold text-primary">{formatHours(step.ActiveHours)} hrs</td>
                                                                                                <td>
                                                                                                    {step.IsCompleted ? (
                                                                                                        <Badge bg="success" className="px-2 py-1">
                                                                                                            <FaCheckCircle size={8} className="me-1" /> Completed
                                                                                                        </Badge>
                                                                                                    ) : (
                                                                                                        <Badge bg="warning" text="dark" className="px-2 py-1">
                                                                                                            <FaSpinner className="fa-spin me-1" size={8} /> In Progress
                                                                                                        </Badge>
                                                                                                    )}
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </Table>
                                                                            </div>
                                                                        ) : (
                                                                            /* Machines Summary Table */
                                                                            <div className="table-responsive">
                                                                                <Table size="sm" bordered hover className="mb-0 text-center align-middle" style={{ fontSize: "0.78rem" }}>
                                                                                    <thead className="thead-light" style={{ backgroundColor: "#f8f9fa" }}>
                                                                                        <tr>
                                                                                            <th style={{ width: "90px" }}>M/C NO</th>
                                                                                            <th style={{ textAlign: "left" }}>MACHINE NAME</th>
                                                                                            <th>TYPE</th>
                                                                                            <th>STEPS</th>
                                                                                            <th>FIRST START</th>
                                                                                            <th>LAST END</th>
                                                                                            <th>PAUSE (MIN)</th>
                                                                                            <th style={{ backgroundColor: "#eaecef" }}>ACTIVE TIME</th>
                                                                                            <th style={{ width: "160px" }}>% TIME SHARE</th>
                                                                                            <th>STATUS</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {rowDetail?.data?.machines?.map((m, mIdx) => {
                                                                                            const pct = parseFloat(m.MachineSharePercent) || 0;
                                                                                            return (
                                                                                                <tr key={m.MachineId || mIdx}>
                                                                                                    <td className="fw-bold">{m.MachineNumber}</td>
                                                                                                    <td className="text-start fw-bold text-dark">{m.MachineName}</td>
                                                                                                    <td>
                                                                                                        <span className="badge bg-light text-dark border">
                                                                                                            {m.CategoryName === "W" ? "Wood" : (m.CategoryName === "M" ? "Metal" : m.CategoryName)}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                    <td>{m.CompletedStepCount} / {m.StepCount}</td>
                                                                                                    <td>{formatDateTime(m.FirstStartTime)}</td>
                                                                                                    <td>{formatDateTime(m.LastEndTime)}</td>
                                                                                                    <td className="text-muted">{m.TotalPauseMinutes}</td>
                                                                                                    <td className="fw-bold text-primary">
                                                                                                        {formatHours(m.ActiveMachiningHours)} hrs
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        <div className="d-flex align-items-center gap-1 justify-content-center">
                                                                                                            <ProgressBar now={pct} variant="primary" style={{ height: "6px", width: "90px" }} />
                                                                                                            <span style={{ fontSize: "0.72rem", fontWeight: 700, minWidth: "32px" }}>{pct}%</span>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        {m.Status === "COMPLETED" ? (
                                                                                                            <Badge bg="success" className="px-2 py-1">
                                                                                                                <FaCheckCircle size={8} className="me-1" /> Completed
                                                                                                            </Badge>
                                                                                                        ) : (
                                                                                                            <Badge bg="warning" text="dark" className="px-2 py-1">
                                                                                                                <FaSpinner className="fa-spin me-1" size={8} /> In Progress
                                                                                                            </Badge>
                                                                                                        )}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            );
                                                                                        })}
                                                                                    </tbody>
                                                                                </Table>
                                                                            </div>
                                                                        )}
                                                                    </Card.Body>
                                                                </Card>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="table-light border-top">
                                        <tr style={{ fontWeight: 700, fontSize: "0.82rem" }}>
                                            <td colSpan={5} className="text-end pe-3">TOTAL SUMMARY:</td>
                                            <td>{kpiSummary.totalUnits}</td>
                                            <td colSpan={5}></td>
                                            <td className="text-primary">{kpiSummary.totalActiveHours} hrs</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default ItemMachiningTimeReport;
