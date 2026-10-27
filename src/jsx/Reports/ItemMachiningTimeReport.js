import React, { useState, useEffect, useMemo } from "react";
import { Row, Col, Card, Table, Button, Form, Badge, ProgressBar, Spinner, Nav } from "react-bootstrap";
import axios from "axios";
import XLSX from "xlsx";
import { 
    FaChevronDown, FaChevronRight, FaPrint, FaFileExcel, FaSync, 
    FaSearch, FaCogs, FaClock, FaCheckCircle, FaSpinner, 
    FaBoxes, FaIndustry, FaListUl, FaLayerGroup 
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

const ItemMachiningTimeReport = () => {
    // Filters state
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
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
            let url = `${API_WEB_URLS.BASE}${API_WEB_URLS.ITEM_MACHINING_TIME_REPORT}/${userId}/${token}?`;
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

    // Fetch child breakdown for an expanded row
    const toggleExpandRow = async (row) => {
        const rowKey = `${row.ItemCode}_${row.ContainerNumber}_${row.ContractNo}`;
        
        if (expandedRows[rowKey]) {
            // Already expanded, toggle off
            setExpandedRows(prev => {
                const next = { ...prev };
                delete next[rowKey];
                return next;
            });
            return;
        }

        // Set loading state for this row
        setExpandedRows(prev => ({
            ...prev,
            [rowKey]: { loading: true, data: null, activeTab: "machines" }
        }));

        try {
            const { userId, token } = getAuth();
            let url = `${API_WEB_URLS.BASE}${API_WEB_URLS.ITEM_MACHINING_TIME_REPORT}/Breakdown/${userId}/${token}?itemMasterId=${row.ItemMasterId}&itemCode=${encodeURIComponent(row.ItemCode)}`;
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
                        data: {
                            machines: machines,
                            steps: steps
                        },
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

    // Optional Grouping by Item Code (All-time Item aggregation)
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

    // Export to Excel
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
        XLSX.writeFile(wb, `Item_Machining_Lead_Time_${fromDate}_to_${toDate}.xlsx`);
    };

    // Quick Date Helpers
    const setQuickDate = (type) => {
        const today = new Date();
        if (type === "TODAY") {
            const str = today.toISOString().split("T")[0];
            setFromDate(str);
            setToDate(str);
        } else if (type === "LAST7") {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            setFromDate(d.toISOString().split("T")[0]);
            setToDate(today.toISOString().split("T")[0]);
        } else if (type === "THISMONTH") {
            const d = new Date(today.getFullYear(), today.getMonth(), 1);
            setFromDate(d.toISOString().split("T")[0]);
            setToDate(today.toISOString().split("T")[0]);
        } else if (type === "ALL") {
            setFromDate("");
            setToDate("");
        }
    };

    return (
        <div className="container-fluid item-machining-report p-3">
            {/* Custom Styles */}
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    .printable-area, .printable-area * { visibility: visible; }
                    .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    .table-bordered th, .table-bordered td { border: 1px solid #333 !important; }
                }
                .cursor-pointer { cursor: pointer; }
                .expand-btn {
                    border: none;
                    background: transparent;
                    color: #495057;
                    font-size: 1rem;
                    padding: 2px 6px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                .expand-btn:hover {
                    background: #e9ecef;
                    color: #0d6efd;
                }
                .nested-breakdown-card {
                    background-color: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);
                }
                .table-parent-row:hover {
                    background-color: #f1f5f9 !important;
                }
                .active-time-badge {
                    background-color: #e0f2fe;
                    color: #0369a1;
                    font-weight: 700;
                    padding: 4px 8px;
                    border-radius: 6px;
                    display: inline-block;
                }
                `}
            </style>

            {/* Filter Card (hidden on print) */}
            <Card className="no-print mb-4 shadow-sm border-0">
                <Card.Header className="bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                        <h4 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                            <FaIndustry className="text-primary" />
                            <span>ITEM MACHINING LEAD TIME & MACHINE BREAKDOWN REPORT</span>
                        </h4>
                        <small className="text-muted">
                            Track complete machining lead times, active machine hours, and exact step breakdown per Item, Container & Contract.
                        </small>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <Button
                            variant={groupByItem ? "primary" : "outline-primary"}
                            size="sm"
                            className="d-flex align-items-center gap-1 fw-bold"
                            onClick={() => setGroupByItem(!groupByItem)}
                        >
                            <FaLayerGroup /> {groupByItem ? "Grouped By Item" : "Production Batch View"}
                        </Button>
                        <Button
                            variant="outline-success"
                            size="sm"
                            className="d-flex align-items-center gap-1 fw-bold"
                            onClick={handleExportExcel}
                            disabled={filteredRows.length === 0}
                        >
                            <FaFileExcel /> Export Excel
                        </Button>
                        <Button
                            variant="dark"
                            size="sm"
                            className="d-flex align-items-center gap-1 fw-bold"
                            onClick={() => window.print()}
                            disabled={filteredRows.length === 0}
                        >
                            <FaPrint /> Print
                        </Button>
                    </div>
                </Card.Header>

                <Card.Body className="p-3">
                    <Row className="g-2 align-items-end">
                        {/* From Date */}
                        <Col lg={2} md={3} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    📅 From Date
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="fw-bold"
                                />
                            </Form.Group>
                        </Col>

                        {/* To Date */}
                        <Col lg={2} md={3} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    📅 To Date
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="fw-bold"
                                />
                            </Form.Group>
                        </Col>

                        {/* Quick Dates */}
                        <Col lg={2} md={3} sm={6}>
                            <Form.Label className="fw-bold mb-1 text-muted" style={{ fontSize: "0.8rem" }}>
                                Quick Range
                            </Form.Label>
                            <div className="d-flex gap-1">
                                <Button variant="outline-secondary" size="sm" className="py-1 px-2" style={{ fontSize: "0.75rem" }} onClick={() => setQuickDate("TODAY")}>Today</Button>
                                <Button variant="outline-secondary" size="sm" className="py-1 px-2" style={{ fontSize: "0.75rem" }} onClick={() => setQuickDate("LAST7")}>7 Days</Button>
                                <Button variant="outline-secondary" size="sm" className="py-1 px-2" style={{ fontSize: "0.75rem" }} onClick={() => setQuickDate("THISMONTH")}>Month</Button>
                                <Button variant="outline-secondary" size="sm" className="py-1 px-2" style={{ fontSize: "0.75rem" }} onClick={() => setQuickDate("ALL")}>All</Button>
                            </div>
                        </Col>

                        {/* Shipment / Container Dropdown */}
                        <Col lg={2} md={3} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    📦 Container / Shipment
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={selectedContainerId}
                                    onChange={(e) => setSelectedContainerId(e.target.value)}
                                >
                                    <option value="">All Shipments</option>
                                    {containersList.map(c => (
                                        <option key={c.Id} value={c.Id}>{c.ContainerNumber}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Machine Type Filter */}
                        <Col lg={2} md={3} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    🏭 Machine Type
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={machineTypeId}
                                    onChange={(e) => setMachineTypeId(e.target.value)}
                                >
                                    <option value="">All Types (Wood & Metal)</option>
                                    {categoriesList.map(cat => (
                                        <option key={cat.Id} value={cat.Id}>{cat.FullName || cat.Name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Status Filter */}
                        <Col lg={2} md={3} sm={6}>
                            <Form.Group className="mb-0">
                                <Form.Label className="fw-bold mb-1 text-dark" style={{ fontSize: "0.85rem" }}>
                                    ⚡ Status
                                </Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="COMPLETED">Completed Only</option>
                                    <option value="IN_PROGRESS">In Progress Only</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Second Row: Search query & Refresh */}
                    <Row className="g-2 align-items-center mt-2 pt-2 border-top">
                        <Col md={5} sm={12}>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white">
                                    <FaSearch className="text-muted" />
                                </span>
                                <Form.Control
                                    type="text"
                                    placeholder="Search by Item Code, Item Name, Container No, or Contract No..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <Button variant="outline-secondary" size="sm" onClick={() => setSearchQuery("")}>✕</Button>
                                )}
                            </div>
                        </Col>

                        <Col md={4} sm={6}>
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white">Contract #</span>
                                <Form.Control
                                    type="text"
                                    placeholder="Filter by Contract No..."
                                    value={contractNoQuery}
                                    onChange={(e) => setContractNoQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && fetchReport()}
                                />
                                <Button variant="outline-primary" size="sm" onClick={fetchReport}>Apply</Button>
                            </div>
                        </Col>

                        <Col md={3} sm={6} className="text-end">
                            <Button
                                variant="outline-dark"
                                size="sm"
                                onClick={fetchReport}
                                disabled={loading}
                                className="d-inline-flex align-items-center gap-1"
                            >
                                <FaSync className={loading ? "fa-spin" : ""} /> Refresh Data
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* KPI Cards (hidden on print) */}
            <Row className="no-print mb-4 g-2">
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2 bg-light">
                        <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Total Batches</div>
                        <h3 className="mb-0 fw-bold text-dark">{kpiSummary.totalBatches}</h3>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {kpiSummary.completedBatches} Done | {kpiSummary.inProgressBatches} Active
                        </div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#e0f2fe", color: "#0369a1" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Total Units Produced</div>
                        <h3 className="mb-0 fw-bold">{kpiSummary.totalUnits}</h3>
                        <div style={{ fontSize: "0.75rem" }}>Order Quantity</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Active Machining Time</div>
                        <h3 className="mb-0 fw-bold">{kpiSummary.totalActiveHours} <span style={{ fontSize: "0.85rem" }}>hrs</span></h3>
                        <div style={{ fontSize: "0.75rem" }}>Actual Machine Work</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Avg Time / Batch</div>
                        <h3 className="mb-0 fw-bold">{kpiSummary.avgHoursPerBatch} <span style={{ fontSize: "0.85rem" }}>hrs</span></h3>
                        <div style={{ fontSize: "0.75rem" }}>Average Production Run</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2" style={{ backgroundColor: "#f3e8ff", color: "#7e22ce" }}>
                        <div className="text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>Cycle Time / Unit</div>
                        <h3 className="mb-0 fw-bold">{kpiSummary.avgCycleMinutesPerUnit} <span style={{ fontSize: "0.85rem" }}>min</span></h3>
                        <div style={{ fontSize: "0.75rem" }}>Machining Per Unit</div>
                    </Card>
                </Col>
                <Col xl={2} md={4} sm={6}>
                    <Card className="border-0 shadow-sm text-center py-2 bg-dark text-white">
                        <div className="text-uppercase fw-bold text-white-50" style={{ fontSize: "0.75rem" }}>Current Status</div>
                        <h3 className="mb-0 fw-bold text-warning">{kpiSummary.inProgressBatches}</h3>
                        <div className="text-white-50" style={{ fontSize: "0.75rem" }}>Batches In Machining</div>
                    </Card>
                </Col>
            </Row>

            {/* Printable Report View */}
            <div className="printable-area">
                {/* Print Title Header */}
                <div className="text-center mb-3 p-3 bg-light rounded border">
                    <h3 className="fw-black mb-1 text-dark text-uppercase" style={{ letterSpacing: "1px" }}>
                        ITEM MACHINING LEAD TIME & MACHINE BREAKDOWN REPORT
                    </h3>
                    <div className="d-flex justify-content-center gap-3 text-muted fw-bold" style={{ fontSize: "0.9rem" }}>
                        <span>DATE RANGE: {fromDate || "Earliest"} TO {toDate || "Latest"}</span>
                        <span>•</span>
                        <span>ITEMS DISPLAYED: {filteredRows.length}</span>
                        <span>•</span>
                        <span>TOTAL ACTIVE MACHINING: {kpiSummary.totalActiveHours} HRS</span>
                    </div>
                </div>

                {/* Main Table */}
                <Card className="border shadow-sm mb-4">
                    <Card.Body className="p-0">
                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-2 text-muted fw-bold">Calculating item machining lead times and machine durations...</p>
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="text-center py-5">
                                <FaBoxes size={36} className="text-muted mb-2" />
                                <h5 className="text-dark fw-bold">No Manufacturing Records Found</h5>
                                <p className="text-muted">No item machining history matches the selected date range and filters.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table bordered hover className="align-middle mb-0 text-center" style={{ borderCollapse: "collapse" }}>
                                    <thead className="table-dark">
                                        <tr style={{ fontSize: "0.85rem" }}>
                                            <th style={{ width: "45px" }} className="no-print">EXP</th>
                                            <th style={{ width: "130px" }}>ITEM CODE</th>
                                            <th style={{ textAlign: "left" }}>ITEM NAME</th>
                                            <th style={{ width: "110px" }}>SHIPMENT</th>
                                            <th style={{ width: "120px" }}>CONTRACT #</th>
                                            <th style={{ width: "80px" }}>QTY</th>
                                            <th style={{ width: "70px" }}>JOBS</th>
                                            <th style={{ width: "80px" }}>MACHINES</th>
                                            <th style={{ width: "150px" }}>FIRST START</th>
                                            <th style={{ width: "150px" }}>LAST END</th>
                                            <th style={{ width: "120px" }}>LEAD TIME</th>
                                            <th style={{ width: "130px", backgroundColor: "#0f172a" }}>ACTIVE TIME</th>
                                            <th style={{ width: "110px" }}>PER UNIT</th>
                                            <th style={{ width: "110px" }}>STATUS</th>
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
                                                    {/* Parent Summarized Row */}
                                                    <tr className="table-parent-row">
                                                        {/* Arrow Button to expand */}
                                                        <td className="no-print">
                                                            <button
                                                                className="expand-btn"
                                                                onClick={() => toggleExpandRow(r)}
                                                                title={isExpanded ? "Collapse machine breakdown" : "Expand to view machine breakdown"}
                                                            >
                                                                {isExpanded ? <FaChevronDown className="text-primary" /> : <FaChevronRight />}
                                                            </button>
                                                        </td>

                                                        {/* Item Code */}
                                                        <td className="fw-bold text-dark cursor-pointer" onClick={() => toggleExpandRow(r)}>
                                                            <Badge bg="light" text="dark" className="border fw-bold fs-6">
                                                                {r.ItemCode}
                                                            </Badge>
                                                        </td>

                                                        {/* Item Name */}
                                                        <td className="text-start fw-bold text-dark cursor-pointer" onClick={() => toggleExpandRow(r)}>
                                                            {r.ItemName}
                                                        </td>

                                                        {/* Container / Shipment */}
                                                        <td>
                                                            <Badge bg="secondary" style={{ fontSize: "0.8rem" }}>
                                                                {r.ContainerNumber || "-"}
                                                            </Badge>
                                                        </td>

                                                        {/* Contract No */}
                                                        <td className="text-muted fw-bold" style={{ fontSize: "0.85rem" }}>
                                                            {r.ContractNo || "-"}
                                                        </td>

                                                        {/* Quantity */}
                                                        <td className="fw-bold fs-6">
                                                            {r.OrderQty}
                                                        </td>

                                                        {/* Job Cards Count */}
                                                        <td>
                                                            <Badge bg="light" text="dark" className="border">
                                                                {r.JobCardCount}
                                                            </Badge>
                                                        </td>

                                                        {/* Machine Count */}
                                                        <td>
                                                            <Badge bg="info" className="text-dark">
                                                                {r.MachineCount} M/c
                                                            </Badge>
                                                        </td>

                                                        {/* First Machine Start */}
                                                        <td style={{ fontSize: "0.8rem" }}>
                                                            {formatDateTime(r.FirstStartTime)}
                                                        </td>

                                                        {/* Last Machine End */}
                                                        <td style={{ fontSize: "0.8rem" }}>
                                                            {isCompleted ? (
                                                                formatDateTime(r.LastEndTime)
                                                            ) : (
                                                                <Badge bg="warning" text="dark">In Progress</Badge>
                                                            )}
                                                        </td>

                                                        {/* Elapsed Lead Time (Calendar Duration) */}
                                                        <td className="fw-bold text-secondary" style={{ fontSize: "0.85rem" }}>
                                                            <div>{formatDuration(r.ElapsedMinutes)}</div>
                                                            {r.OffShiftAndWaitHours > 0 && (
                                                                <span className="badge bg-light text-muted border mt-1" style={{ fontSize: "0.68rem" }} title="Includes factory overnight non-shift / idle intervals">
                                                                    💤 {r.OffShiftAndWaitHours}h off-shift/wait
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Active Machining Time */}
                                                        <td>
                                                            <span className="active-time-badge">
                                                                {formatHours(r.ActiveMachiningHours)} hrs
                                                            </span>
                                                            {r.EquivalentShifts !== undefined && (
                                                                <div className="text-muted small mt-1" style={{ fontSize: "0.72rem" }} title="Shift Capacity Equivalence (8hr Net/Shift)">
                                                                    ≈ {r.EquivalentShifts} Shifts
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Minutes Per Unit */}
                                                        <td className="fw-bold text-muted" style={{ fontSize: "0.85rem" }}>
                                                            {formatHours(r.MinutesPerUnit)} m/u
                                                        </td>

                                                        {/* Status */}
                                                        <td>
                                                            {isCompleted ? (
                                                                <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                                                                    <FaCheckCircle size={10} /> Done
                                                                </Badge>
                                                            ) : (
                                                                <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1">
                                                                    <FaSpinner className="fa-spin" size={10} /> Active
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Child View (Arrow Clicked) */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={14} className="p-3 bg-light">
                                                                <div className="nested-breakdown-card p-3">
                                                                    {/* Expanded Header banner */}
                                                                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                                                        <div>
                                                                            <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                                                                                <FaCogs className="text-primary" />
                                                                                <span>Machine-wise Time Breakdown</span>
                                                                                <Badge bg="dark">Item: {r.ItemCode}</Badge>
                                                                                <Badge bg="secondary">Shipment: {r.ContainerNumber}</Badge>
                                                                                {r.ContractNo && <Badge bg="light" text="dark" className="border">Contract: {r.ContractNo}</Badge>}
                                                                            </h5>
                                                                            <small className="text-muted">
                                                                                Total Machining Duration: <strong>{formatHours(r.ActiveMachiningHours)} hrs ({formatDuration(r.ActiveMachiningMinutes)})</strong> across <strong>{r.MachineCount} machines</strong> and <strong>{r.JobCardCount} job cards</strong>.
                                                                            </small>
                                                                        </div>

                                                                        {/* Sub Navigation: Machine View vs Step View */}
                                                                        <Nav variant="pills" activeKey={rowDetail?.activeTab || "machines"} onSelect={(k) => {
                                                                            setExpandedRows(prev => ({
                                                                                ...prev,
                                                                                [rowKey]: { ...prev[rowKey], activeTab: k }
                                                                            }));
                                                                        }}>
                                                                            <Nav.Item>
                                                                                <Nav.Link eventKey="machines" className="py-1 px-3" style={{ fontSize: "0.8rem" }}>
                                                                                    <FaIndustry className="me-1" /> Machines Summary
                                                                                </Nav.Link>
                                                                            </Nav.Item>
                                                                            <Nav.Item>
                                                                                <Nav.Link eventKey="steps" className="py-1 px-3" style={{ fontSize: "0.8rem" }}>
                                                                                    <FaListUl className="me-1" /> Job Card Steps ({rowDetail?.data?.steps?.length || 0})
                                                                                </Nav.Link>
                                                                            </Nav.Item>
                                                                        </Nav>
                                                                    </div>

                                                                    {rowDetail?.loading ? (
                                                                        <div className="text-center py-4">
                                                                            <Spinner animation="border" size="sm" variant="primary" />
                                                                            <span className="ms-2 text-muted fw-bold">Loading machine breakdown...</span>
                                                                        </div>
                                                                    ) : rowDetail?.activeTab === "steps" ? (
                                                                        /* Steps Detailed Table */
                                                                        <div className="table-responsive bg-white rounded border">
                                                                            <Table size="sm" bordered hover className="mb-0 text-center align-middle">
                                                                                <thead className="table-secondary" style={{ fontSize: "0.8rem" }}>
                                                                                    <tr>
                                                                                        <th>#</th>
                                                                                        <th>Job Card No</th>
                                                                                        <th>Series</th>
                                                                                        <th>Process</th>
                                                                                        <th>Machine</th>
                                                                                        <th>Operator</th>
                                                                                        <th>Start Time</th>
                                                                                        <th>End Time</th>
                                                                                        <th>Pause (Min)</th>
                                                                                        <th>Duration</th>
                                                                                        <th>Status</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody style={{ fontSize: "0.8rem" }}>
                                                                                    {rowDetail?.data?.steps?.map((step, sIdx) => (
                                                                                        <tr key={step.StepId || sIdx}>
                                                                                            <td className="fw-bold">{sIdx + 1}</td>
                                                                                            <td className="fw-bold text-primary">{step.JobCardNo}</td>
                                                                                            <td>{step.Series}</td>
                                                                                            <td className="text-start fw-bold">{step.ProcessName}</td>
                                                                                            <td className="text-start">{step.MachineName} (#{step.MachineNumber})</td>
                                                                                            <td>{step.OperatorName}</td>
                                                                                            <td>{formatDateTime(step.StartTime)}</td>
                                                                                            <td>{step.EndTime ? formatDateTime(step.EndTime) : <Badge bg="warning" text="dark">Running</Badge>}</td>
                                                                                            <td className="text-muted">{step.PauseMinutes || 0}</td>
                                                                                            <td className="fw-bold text-success">{formatHours(step.ActiveHours)} hrs</td>
                                                                                            <td>
                                                                                                {step.IsCompleted ? (
                                                                                                    <Badge bg="success">Done</Badge>
                                                                                                ) : step.IsPaused ? (
                                                                                                    <Badge bg="danger">Paused</Badge>
                                                                                                ) : (
                                                                                                    <Badge bg="warning" text="dark">Active</Badge>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </Table>
                                                                        </div>
                                                                    ) : (
                                                                        /* Machine-wise Breakdown Table */
                                                                        <div className="table-responsive bg-white rounded border">
                                                                            <Table size="sm" bordered hover className="mb-0 text-center align-middle">
                                                                                <thead className="table-secondary" style={{ fontSize: "0.85rem" }}>
                                                                                    <tr>
                                                                                        <th style={{ width: "90px" }}>M/C NO</th>
                                                                                        <th style={{ textAlign: "left" }}>MACHINE NAME</th>
                                                                                        <th style={{ width: "90px" }}>TYPE</th>
                                                                                        <th style={{ width: "90px" }}>STEPS</th>
                                                                                        <th style={{ width: "150px" }}>FIRST START</th>
                                                                                        <th style={{ width: "150px" }}>LAST END</th>
                                                                                        <th style={{ width: "100px" }}>PAUSE (MIN)</th>
                                                                                        <th style={{ width: "140px" }}>ACTIVE TIME</th>
                                                                                        <th style={{ width: "180px" }}>% TIME SHARE</th>
                                                                                        <th style={{ width: "110px" }}>STATUS</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {rowDetail?.data?.machines?.map((m, mIdx) => {
                                                                                        const pct = parseFloat(m.MachineSharePercent) || 0;
                                                                                        let barVariant = "primary";
                                                                                        if (pct > 30) barVariant = "success";
                                                                                        else if (pct > 15) barVariant = "info";
                                                                                        else if (pct > 5) barVariant = "warning";

                                                                                        return (
                                                                                            <tr key={m.MachineId || mIdx} style={{ fontSize: "0.85rem" }}>
                                                                                                <td className="fw-bold fs-6">{m.MachineNumber}</td>
                                                                                                <td className="text-start fw-bold text-dark">
                                                                                                    {m.MachineName}
                                                                                                </td>
                                                                                                <td>
                                                                                                    <Badge bg={m.CategoryName === "M" ? "secondary" : "dark"}>
                                                                                                        {m.CategoryName === "W" ? "Wood" : (m.CategoryName === "M" ? "Metal" : m.CategoryName)}
                                                                                                    </Badge>
                                                                                                </td>
                                                                                                <td>
                                                                                                    <Badge bg="light" text="dark" className="border">
                                                                                                        {m.CompletedStepCount} / {m.StepCount}
                                                                                                    </Badge>
                                                                                                </td>
                                                                                                <td style={{ fontSize: "0.8rem" }}>{formatDateTime(m.FirstStartTime)}</td>
                                                                                                <td style={{ fontSize: "0.8rem" }}>{formatDateTime(m.LastEndTime)}</td>
                                                                                                <td className="text-muted">{m.TotalPauseMinutes}</td>
                                                                                                <td className="fw-bold text-primary fs-6">
                                                                                                    {formatHours(m.ActiveMachiningHours)} <span style={{ fontSize: "0.75rem" }}>hrs</span>
                                                                                                </td>
                                                                                                <td>
                                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                                        <ProgressBar
                                                                                                            now={pct}
                                                                                                            variant={barVariant}
                                                                                                            style={{ height: "8px", flex: 1 }}
                                                                                                        />
                                                                                                        <span className="fw-bold text-dark" style={{ minWidth: "40px", fontSize: "0.75rem" }}>
                                                                                                            {pct}%
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td>
                                                                                                    {m.Status === "COMPLETED" ? (
                                                                                                        <Badge bg="success">Done</Badge>
                                                                                                    ) : m.Status === "IN_PROGRESS" ? (
                                                                                                        <Badge bg="warning" text="dark">Active</Badge>
                                                                                                    ) : (
                                                                                                        <Badge bg="secondary">Pending</Badge>
                                                                                                    )}
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </Table>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="table-dark">
                                        <tr style={{ fontWeight: "800", fontSize: "0.9rem" }}>
                                            <td colSpan={5} className="text-end pe-3">TOTAL SUMMARY:</td>
                                            <td>{kpiSummary.totalUnits}</td>
                                            <td colSpan={5}></td>
                                            <td className="text-warning fs-6">{kpiSummary.totalActiveHours} hrs</td>
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
