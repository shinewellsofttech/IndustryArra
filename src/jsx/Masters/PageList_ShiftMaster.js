import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Row, Col, Card, Table, Button, Badge, Modal, Form, Spinner, Alert } from "react-bootstrap";
import { FaClock, FaPlus, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaSun, FaMoon, FaToggleOn, FaToggleOff, FaInfoCircle, FaCalendarCheck } from "react-icons/fa";
import axios from "axios";
import { API_WEB_URLS } from "../../constants/constAPI";
import PageTitle from "../layouts/PageTitle";
import usePagePermissions from "../../helpers/usePagePermissions";

export const PageList_ShiftMaster = () => {
    const [shifts, setShifts] = useState([]);
    const [currentShiftInfo, setCurrentShiftInfo] = useState(null);
    const [serverTime, setServerTime] = useState("");
    const [isPlantOffShift, setIsPlantOffShift] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
    const [formData, setFormData] = useState({
        id: 0,
        name: "",
        code: "",
        startTime: "08:00",
        endTime: "17:00",
        breakMinutes: 60,
        crossesMidnight: false,
        isActive: true,
        description: ""
    });

    const { canAdd, canEdit, canDelete } = usePagePermissions("ShiftMaster");

    const authUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("authUser")) || {};
        } catch {
            return {};
        }
    }, []);

    const userId = authUser.id || 1;
    const userToken = authUser.token || "token";

    // Fetch Shifts & Status
    const fetchShifts = useCallback(async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.SHIFT_MASTER}/${userId}/${userToken}`;
            const res = await axios.get(url);
            const data = res.data?.data || res.data?.Data || {};
            setShifts(data.dataList || data.DataList || []);
            setCurrentShiftInfo(data.currentShift || data.CurrentShift || null);
            setServerTime(data.serverTime || data.ServerTime || "");
            setIsPlantOffShift(data.isPlantOffShift !== undefined ? data.isPlantOffShift : (data.currentShift == null));
        } catch (err) {
            console.error("Error fetching shifts:", err);
            setErrorMsg("Failed to load shifts. " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    }, [userId, userToken]);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    // Live computed hours for Modal form
    const formComputedHours = useMemo(() => {
        if (!formData.startTime || !formData.endTime) return { gross: 0, net: 0 };
        const [sh, sm] = formData.startTime.split(":").map(Number);
        const [eh, em] = formData.endTime.split(":").map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return { gross: 0, net: 0 };

        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;
        let grossMins = 0;

        if (formData.crossesMidnight || endMins < startMins) {
            grossMins = (1440 - startMins) + endMins;
        } else {
            grossMins = endMins - startMins;
        }

        const gross = Math.max(0, parseFloat((grossMins / 60).toFixed(2)));
        const breakMins = parseInt(formData.breakMinutes, 10) || 0;
        const net = Math.max(0, parseFloat(((grossMins - breakMins) / 60).toFixed(2)));
        return { gross, net };
    }, [formData.startTime, formData.endTime, formData.crossesMidnight, formData.breakMinutes]);

    // KPI Summary
    const kpi = useMemo(() => {
        const total = shifts.length;
        const active = shifts.filter(s => s.IsActive).length;
        const inactive = total - active;
        const totalNetHours = shifts
            .filter(s => s.IsActive)
            .reduce((sum, s) => sum + (parseFloat(s.NetWorkingHours) || 0), 0);

        return { total, active, inactive, totalNetHours: totalNetHours.toFixed(1) };
    }, [shifts]);

    // Modal Handlers
    const handleOpenAdd = () => {
        setModalMode("add");
        setFormData({
            id: 0,
            name: "",
            code: "",
            startTime: "08:00",
            endTime: "17:00",
            breakMinutes: 60,
            crossesMidnight: false,
            isActive: true,
            description: ""
        });
        setShowModal(true);
    };

    const handleOpenEdit = (shift) => {
        setModalMode("edit");
        setFormData({
            id: shift.Id,
            name: shift.Name || "",
            code: shift.Code || "",
            startTime: shift.StartTime || "08:00",
            endTime: shift.EndTime || "17:00",
            breakMinutes: shift.BreakMinutes || 0,
            crossesMidnight: !!shift.CrossesMidnight,
            isActive: shift.IsActive !== false,
            description: shift.Description || ""
        });
        setShowModal(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const isAdd = modalMode === "add";
            const url = isAdd
                ? `${API_WEB_URLS.BASE}${API_WEB_URLS.SHIFT_MASTER}/${userId}/${userToken}`
                : `${API_WEB_URLS.BASE}${API_WEB_URLS.SHIFT_MASTER}/${userId}/${userToken}/${formData.id}`;

            const method = isAdd ? axios.post : axios.put;
            const res = await method(url, formData);

            if (res.data && (res.data.success || res.data.Success)) {
                setSuccessMsg(isAdd ? "Shift created successfully!" : "Shift updated successfully!");
                setShowModal(false);
                fetchShifts();
            } else {
                setErrorMsg(res.data?.message || res.data?.Message || "Failed to save shift.");
            }
        } catch (err) {
            console.error("Save error:", err);
            setErrorMsg(err.response?.data?.message || err.message || "Failed to save shift.");
        } finally {
            setSaving(false);
        }
    };

    // Quick Toggle Active / Inactive
    const handleToggleActive = async (shift) => {
        try {
            const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.SHIFT_MASTER}/ToggleActive/${userId}/${userToken}/${shift.Id}`;
            const res = await axios.post(url);
            if (res.data && (res.data.success || res.data.Success)) {
                setSuccessMsg(`Shift '${shift.Name}' status updated.`);
                fetchShifts();
            }
        } catch (err) {
            setErrorMsg("Failed to toggle shift status.");
        }
    };

    // Delete Shift
    const handleDelete = async (shift) => {
        if (!window.confirm(`Are you sure you want to delete shift '${shift.Name}'?`)) return;
        try {
            const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.SHIFT_MASTER}/${userId}/${userToken}/${shift.Id}`;
            const res = await axios.delete(url);
            if (res.data && (res.data.success || res.data.Success)) {
                setSuccessMsg(`Shift '${shift.Name}' deleted.`);
                fetchShifts();
            }
        } catch (err) {
            setErrorMsg("Failed to delete shift.");
        }
    };

    return (
        <div className="container-fluid py-2">
            <PageTitle activeMenu="Shift Master" motherMenu="Documentation" />

            {/* Current Plant Shift Status Banner */}
            <div className="mb-3">
                <Card className={`border-0 shadow-sm ${isPlantOffShift ? "bg-warning bg-opacity-10 border-start border-4 border-warning" : "bg-success bg-opacity-10 border-start border-4 border-success"}`}>
                    <Card.Body className="py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div className="d-flex align-items-center gap-2">
                            {isPlantOffShift ? (
                                <FaMoon size={22} className="text-warning" />
                            ) : (
                                <FaSun size={22} className="text-success" />
                            )}
                            <div>
                                <h6 className="mb-0 fw-bold">
                                    {isPlantOffShift ? (
                                        <span className="text-dark">🏭 Plant is Currently <strong>OFF-SHIFT (Closed / Non-Working Hours)</strong></span>
                                    ) : (
                                        <span className="text-success">🟢 Current Active Shift: <strong>{currentShiftInfo?.Name}</strong> ({currentShiftInfo?.StartTime} - {currentShiftInfo?.EndTime})</span>
                                    )}
                                </h6>
                                <small className="text-muted">
                                    {isPlantOffShift
                                        ? "Machines outside shift hours are automatically treated as Planned Off-Shift rather than idle delays."
                                        : `Active production running. Total planned working capacity: ${kpi.totalNetHours} hrs/day across ${kpi.active} active shift(s).`}
                                </small>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Badge bg="dark" className="px-3 py-2 fs-7 d-flex align-items-center gap-1">
                                <FaClock /> Server Time: {serverTime || "Live"}
                            </Badge>
                        </div>
                    </Card.Body>
                </Card>
            </div>

            {/* KPI Cards */}
            <Row className="g-3 mb-3">
                <Col xl={3} sm={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="p-3 d-flex align-items-center gap-3">
                            <div className="p-3 bg-primary bg-opacity-10 rounded-3 text-primary">
                                <FaClock size={24} />
                            </div>
                            <div>
                                <small className="text-muted text-uppercase fw-bold">Total Shifts</small>
                                <h4 className="fw-bold mb-0 text-dark">{kpi.total}</h4>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={3} sm={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="p-3 d-flex align-items-center gap-3">
                            <div className="p-3 bg-success bg-opacity-10 rounded-3 text-success">
                                <FaCheckCircle size={24} />
                            </div>
                            <div>
                                <small className="text-muted text-uppercase fw-bold">Active Shifts</small>
                                <h4 className="fw-bold mb-0 text-success">{kpi.active}</h4>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={3} sm={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="p-3 d-flex align-items-center gap-3">
                            <div className="p-3 bg-info bg-opacity-10 rounded-3 text-info">
                                <FaCalendarCheck size={24} />
                            </div>
                            <div>
                                <small className="text-muted text-uppercase fw-bold">Daily Planned Capacity</small>
                                <h4 className="fw-bold mb-0 text-dark">{kpi.totalNetHours} <span className="fs-6 text-muted">hrs/day</span></h4>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={3} sm={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="p-3 d-flex align-items-center gap-3">
                            <div className="p-3 bg-secondary bg-opacity-10 rounded-3 text-secondary">
                                <FaTimesCircle size={24} />
                            </div>
                            <div>
                                <small className="text-muted text-uppercase fw-bold">Inactive Shifts</small>
                                <h4 className="fw-bold mb-0 text-muted">{kpi.inactive}</h4>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Notification Messages */}
            {successMsg && (
                <Alert variant="success" dismissible onClose={() => setSuccessMsg("")} className="py-2">
                    {successMsg}
                </Alert>
            )}
            {errorMsg && (
                <Alert variant="danger" dismissible onClose={() => setErrorMsg("")} className="py-2">
                    {errorMsg}
                </Alert>
            )}

            {/* Shifts Table Card */}
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <h5 className="fw-bold mb-0 text-dark">Production Shift Schedules</h5>
                        <small className="text-muted">Manage active working hours used by Machine Running Status, Delay Dashboard & Lead Time Reports.</small>
                    </div>
                    <div>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleOpenAdd}
                            className="d-inline-flex align-items-center gap-2 fw-semibold px-3 py-2"
                        >
                            <FaPlus /> Add New Shift
                        </Button>
                    </div>
                </Card.Header>

                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted fw-bold">Loading Shift Schedules...</p>
                        </div>
                    ) : shifts.length === 0 ? (
                        <div className="text-center py-5">
                            <FaClock size={40} className="text-muted mb-2" />
                            <h6 className="fw-bold text-dark">No Shift Records Found</h6>
                            <p className="text-muted">Click 'Add New Shift' to define your factory working hours.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0 text-center">
                                <thead className="table-dark">
                                    <tr style={{ fontSize: "0.85rem" }}>
                                        <th style={{ width: "90px" }}>CODE</th>
                                        <th style={{ textAlign: "left" }}>SHIFT NAME</th>
                                        <th style={{ width: "160px" }}>TIMING SCHEDULE</th>
                                        <th style={{ width: "120px" }}>BREAK / LUNCH</th>
                                        <th style={{ width: "110px" }}>GROSS TIME</th>
                                        <th style={{ width: "130px", backgroundColor: "#0f172a" }}>NET WORKING</th>
                                        <th style={{ width: "110px" }}>NIGHT SHIFT</th>
                                        <th style={{ width: "110px" }}>STATUS</th>
                                        <th style={{ width: "150px" }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shifts.map((s) => {
                                        const isCurrent = currentShiftInfo?.Id === s.Id;
                                        return (
                                            <tr key={s.Id} className={isCurrent ? "table-success bg-opacity-25" : ""}>
                                                {/* Code */}
                                                <td>
                                                    <Badge bg="light" text="dark" className="border fw-bold fs-6">
                                                        {s.Code}
                                                    </Badge>
                                                </td>

                                                {/* Name */}
                                                <td className="text-start">
                                                    <div className="fw-bold text-dark">
                                                        {s.Name}
                                                        {isCurrent && (
                                                            <Badge bg="success" className="ms-2">Running Now</Badge>
                                                        )}
                                                    </div>
                                                    {s.Description && (
                                                        <small className="text-muted d-block">{s.Description}</small>
                                                    )}
                                                </td>

                                                {/* Timing */}
                                                <td>
                                                    <Badge bg="secondary" style={{ fontSize: "0.85rem" }}>
                                                        {s.StartTime} - {s.EndTime}
                                                    </Badge>
                                                </td>

                                                {/* Break */}
                                                <td className="text-muted">
                                                    {s.BreakMinutes} mins
                                                </td>

                                                {/* Gross */}
                                                <td className="fw-semibold">
                                                    {s.GrossHours} hrs
                                                </td>

                                                {/* Net Working */}
                                                <td>
                                                    <span className="fw-bold text-primary fs-6">
                                                        {s.NetWorkingHours} hrs
                                                    </span>
                                                </td>

                                                {/* Night Shift / Crosses Midnight */}
                                                <td>
                                                    {s.CrossesMidnight ? (
                                                        <Badge bg="dark" className="d-inline-flex align-items-center gap-1">
                                                            <FaMoon size={10} /> Night
                                                        </Badge>
                                                    ) : (
                                                        <Badge bg="light" text="dark" className="border">
                                                            Day
                                                        </Badge>
                                                    )}
                                                </td>

                                                {/* Active / Inactive Status */}
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm p-0 border-0"
                                                        onClick={() => handleToggleActive(s)}
                                                        title="Click to toggle Active / Inactive"
                                                    >
                                                        {s.IsActive ? (
                                                            <Badge bg="success" className="d-inline-flex align-items-center gap-1 cursor-pointer">
                                                                <FaCheckCircle size={10} /> Active
                                                            </Badge>
                                                        ) : (
                                                            <Badge bg="secondary" className="d-inline-flex align-items-center gap-1 cursor-pointer">
                                                                <FaTimesCircle size={10} /> Inactive
                                                            </Badge>
                                                        )}
                                                    </button>
                                                </td>

                                                {/* Actions */}
                                                <td>
                                                    <div className="d-flex justify-content-center gap-1">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            onClick={() => handleOpenEdit(s)}
                                                            title="Edit Shift"
                                                        >
                                                            <FaEdit />
                                                        </Button>
                                                        <Button
                                                            variant={s.IsActive ? "outline-warning" : "outline-success"}
                                                            size="sm"
                                                            onClick={() => handleToggleActive(s)}
                                                            title={s.IsActive ? "Inactivate Shift" : "Activate Shift"}
                                                        >
                                                            {s.IsActive ? <FaToggleOn /> : <FaToggleOff />}
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDelete(s)}
                                                            title="Delete Shift"
                                                        >
                                                            <FaTrash />
                                                        </Button>
                                                    </div>
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

            {/* Add / Edit Shift Modal */}
            <Modal show={showModal} onHide={() => !saving && setShowModal(false)} centered backdrop="static">
                <Form onSubmit={handleFormSubmit}>
                    <Modal.Header closeButton={!saving} className="border-bottom">
                        <Modal.Title className="fw-bold">
                            {modalMode === "add" ? "Create New Shift" : "Edit Shift Configuration"}
                        </Modal.Title>
                    </Modal.Header>

                    <Modal.Body className="p-4">
                        <Row className="g-3">
                            {/* Shift Name */}
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Shift Name <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. Morning Shift, General Shift, Night Shift"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>

                            {/* Shift Code */}
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Code <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. S1, GS"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </Form.Group>
                            </Col>

                            {/* Start Time */}
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Start Time <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => {
                                            const st = e.target.value;
                                            const crosses = formData.endTime && formData.endTime < st;
                                            setFormData({ ...formData, startTime: st, crossesMidnight: crosses });
                                        }}
                                        required
                                    />
                                </Form.Group>
                            </Col>

                            {/* End Time */}
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">End Time <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => {
                                            const et = e.target.value;
                                            const crosses = formData.startTime && et < formData.startTime;
                                            setFormData({ ...formData, endTime: et, crossesMidnight: crosses });
                                        }}
                                        required
                                    />
                                </Form.Group>
                            </Col>

                            {/* Break / Lunch Minutes */}
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Break / Lunch (Mins)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        max="240"
                                        value={formData.breakMinutes}
                                        onChange={(e) => setFormData({ ...formData, breakMinutes: e.target.value })}
                                    />
                                    <Form.Text className="text-muted">Deducted from gross duration</Form.Text>
                                </Form.Group>
                            </Col>

                            {/* Crosses Midnight Checkbox */}
                            <Col md={6} className="d-flex align-items-center">
                                <Form.Check
                                    type="checkbox"
                                    id="crossesMidnightCheck"
                                    label="Crosses Midnight (Night Shift)"
                                    className="fw-bold mt-3"
                                    checked={formData.crossesMidnight}
                                    onChange={(e) => setFormData({ ...formData, crossesMidnight: e.target.checked })}
                                />
                            </Col>

                            {/* Computed Duration Preview Box */}
                            <Col md={12}>
                                <div className="p-3 bg-light rounded border d-flex justify-content-between align-items-center">
                                    <div>
                                        <small className="text-muted d-block text-uppercase fw-bold">Gross Duration</small>
                                        <span className="fw-bold fs-6">{formComputedHours.gross} hrs</span>
                                    </div>
                                    <div className="text-center">
                                        <small className="text-muted d-block text-uppercase fw-bold">Lunch Break</small>
                                        <span className="text-muted">{formData.breakMinutes || 0} mins</span>
                                    </div>
                                    <div className="text-end">
                                        <small className="text-muted d-block text-uppercase fw-bold">Net Working Hours</small>
                                        <span className="fw-bold fs-5 text-primary">{formComputedHours.net} hrs</span>
                                    </div>
                                </div>
                            </Col>

                            {/* Active Toggle */}
                            <Col md={12}>
                                <Form.Check
                                    type="switch"
                                    id="isActiveSwitch"
                                    label="Active Shift (Enabled for production tracking)"
                                    className="fw-bold"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                            </Col>

                            {/* Description */}
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Description / Notes</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="Optional shift notes..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>

                    <Modal.Footer className="border-top">
                        <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Saving...
                                </>
                            ) : (
                                modalMode === "add" ? "Create Shift" : "Save Changes"
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default PageList_ShiftMaster;
