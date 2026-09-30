import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Row, Col, Card, Table, Button, Badge, Modal, Form, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { API_WEB_URLS } from "../../constants/constAPI";
import PageTitle from "../layouts/PageTitle";
import usePagePermissions from "../../helpers/usePagePermissions";

export const PageList_DepartmentMaster = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    code: "",
    sequence: 0,
    isMachineTracking: false,
    colorCode: "#2563eb",
    description: "",
    isActive: true,
  });

  const { canAdd, canEdit } = usePagePermissions("DepartmentMaster");

  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("authUser")) || {};
    } catch {
      return {};
    }
  }, []);

  const userId = authUser.id || 1;
  const userToken = authUser.token || "token";

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.DEPARTMENT_MASTER}/${userId}/${userToken}`;
      const res = await axios.get(url);
      if (res.data && res.data.data && res.data.data.dataList) {
        setDepartments(res.data.data.dataList);
      } else {
        setDepartments([]);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
      setErrorMsg("Failed to load departments. " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [userId, userToken]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenAdd = () => {
    const nextSeq = departments.length > 0 ? Math.max(...departments.map((d) => Number(d.Sequence) || 0)) + 1 : 1;
    setFormData({
      id: 0,
      name: "",
      code: "",
      sequence: nextSeq,
      isMachineTracking: false,
      colorCode: "#4f46e5",
      description: "",
      isActive: true,
    });
    setModalMode("add");
    setShowModal(true);
  };

  const handleOpenEdit = (dept) => {
    setFormData({
      id: dept.Id,
      name: dept.Name || "",
      code: dept.Code || "",
      sequence: dept.Sequence || 0,
      isMachineTracking: !!dept.IsMachineTracking,
      colorCode: dept.ColorCode || "#4f46e5",
      description: dept.Description || "",
      isActive: dept.IsActive !== false && dept.IsActive !== 0,
    });
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Department name is required.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        Id: formData.id,
        Name: formData.name.trim(),
        Code: formData.code.trim() || formData.name.trim().substring(0, 4).toUpperCase(),
        Sequence: Number(formData.sequence) || 0,
        IsMachineTracking: !!formData.isMachineTracking,
        ColorCode: formData.colorCode || "#4f46e5",
        Description: formData.description?.trim() || "",
        IsActive: !!formData.isActive,
      };

      if (modalMode === "add") {
        const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.DEPARTMENT_MASTER}/${userId}/${userToken}`;
        await axios.post(url, payload);
        setSuccessMsg(`Department "${payload.Name}" added successfully.`);
      } else {
        const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.DEPARTMENT_MASTER}/${userId}/${userToken}/${formData.id}`;
        await axios.put(url, payload);
        setSuccessMsg(`Department "${payload.Name}" updated successfully.`);
      }

      setShowModal(false);
      await fetchDepartments();
    } catch (err) {
      console.error("Error saving department:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to save department.");
    } finally {
      setSaving(false);
    }
  };

  // Reorder Handler: Move department up or down and persist to DB
  const handleMove = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= departments.length) return;

    const reordered = [...departments];
    const [movedItem] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, movedItem);

    // Reassign sequence numbers 1..N
    const updatedWithSequence = reordered.map((d, idx) => ({
      ...d,
      Sequence: idx + 1,
    }));

    setDepartments(updatedWithSequence);

    try {
      const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.DEPARTMENT_MASTER_REORDER}/${userId}/${userToken}`;
      const payload = {
        Orders: updatedWithSequence.map((d) => ({
          DepartmentId: d.Id,
          Sequence: d.Sequence,
        })),
      };
      await axios.post(url, payload);
      setSuccessMsg("Department sequence updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error reordering departments:", err);
      setErrorMsg("Failed to save new order. " + (err.response?.data?.message || err.message));
      fetchDepartments();
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate department "${dept.Name}"?`)) {
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const url = `${API_WEB_URLS.BASE}${API_WEB_URLS.DEPARTMENT_MASTER}/${userId}/${userToken}/${dept.Id}`;
      const res = await axios.delete(url);
      setSuccessMsg(res.data?.message || "Department processed.");
      await fetchDepartments();
    } catch (err) {
      console.error("Error deleting department:", err);
      setErrorMsg("Failed to delete department. " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid">
      <PageTitle activeMenu="Department Master" motherMenu="Masters" pageContent="Department Master" />

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg("")}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg("")}>
          <i className="fas fa-check-circle me-2"></i>
          {successMsg}
        </Alert>
      )}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <Card.Title className="mb-0">
              <i className="fas fa-sitemap me-2 text-primary"></i>
              Department Workflow & Ordering Master
            </Card.Title>
            <small className="text-muted">
              Configure manufacturing departments, their sequence flow order, and tracking mode (Machine vs Batch).
            </small>
          </div>
          <div>
            {canAdd && (
              <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                <i className="fas fa-plus me-1"></i> Add Department
              </Button>
            )}
            <Button variant="outline-secondary" size="sm" className="ms-2" onClick={fetchDepartments}>
              <i className="fas fa-sync-alt"></i>
            </Button>
          </div>
        </Card.Header>

        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading departments...</p>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
              <h5>No Departments Found</h5>
              <p className="text-muted">Click "Add Department" to create your first department.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover bordered className="align-middle">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: "120px", textAlign: "center" }}>Order / Move</th>
                    <th style={{ width: "60px", textAlign: "center" }}>Seq</th>
                    <th>Department Name</th>
                    <th style={{ width: "120px" }}>Code</th>
                    <th>Tracking Type</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Status</th>
                    <th style={{ width: "150px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, index) => {
                    const isFirst = index === 0;
                    const isLast = index === departments.length - 1;
                    const isActive = dept.IsActive !== false && dept.IsActive !== 0;

                    return (
                      <tr key={dept.Id} style={{ opacity: isActive ? 1 : 0.6 }}>
                        <td style={{ textAlign: "center" }}>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="p-1 px-2 me-1"
                            disabled={isFirst || saving}
                            onClick={() => handleMove(index, "up")}
                            title="Move Up"
                          >
                            <i className="fas fa-arrow-up"></i>
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="p-1 px-2"
                            disabled={isLast || saving}
                            onClick={() => handleMove(index, "down")}
                            title="Move Down"
                          >
                            <i className="fas fa-arrow-down"></i>
                          </Button>
                        </td>
                        <td style={{ textAlign: "center", fontWeight: "700" }}>
                          <span className="badge bg-light text-dark border">{dept.Sequence}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span
                              style={{
                                display: "inline-block",
                                width: "14px",
                                height: "14px",
                                borderRadius: "4px",
                                backgroundColor: dept.ColorCode || "#4f46e5",
                                marginRight: "10px",
                              }}
                            ></span>
                            <span style={{ fontWeight: "600", fontSize: "15px" }}>{dept.Name}</span>
                          </div>
                          {dept.Description && (
                            <small className="text-muted d-block ms-4">{dept.Description}</small>
                          )}
                        </td>
                        <td>
                          <code>{dept.Code || "-"}</code>
                        </td>
                        <td>
                          {dept.IsMachineTracking ? (
                            <Badge bg="info" className="px-2 py-1">
                              <i className="fas fa-cogs me-1"></i> Machine Level (Components)
                            </Badge>
                          ) : (
                            <Badge bg="secondary" className="px-2 py-1">
                              <i className="fas fa-boxes me-1"></i> Batch Transfer (Container)
                            </Badge>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {isActive ? (
                            <Badge bg="success">Active</Badge>
                          ) : (
                            <Badge bg="danger">Inactive</Badge>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {canEdit && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="me-2"
                              onClick={() => handleOpenEdit(dept)}
                              title="Edit Department"
                            >
                              <i className="fas fa-edit"></i> Edit
                            </Button>
                          )}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(dept)}
                            title="Delete / Deactivate"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
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

      {/* Add / Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>
              {modalMode === "add" ? (
                <>
                  <i className="fas fa-plus-circle me-2 text-primary"></i> Add New Department
                </>
              ) : (
                <>
                  <i className="fas fa-edit me-2 text-warning"></i> Edit Department
                </>
              )}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>
                Department Name <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. ASSEMBLY, SANDING, BUFFING"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department Code</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. ASSY, BUFF"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    maxLength={10}
                  />
                  <Form.Text className="text-muted">Short identifier</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Flow Sequence</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: Number(e.target.value) })}
                    required
                  />
                  <Form.Text className="text-muted">Display order in reports</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Tracking Type</Form.Label>
              <Form.Select
                value={formData.isMachineTracking ? "machine" : "transfer"}
                onChange={(e) => setFormData({ ...formData, isMachineTracking: e.target.value === "machine" })}
              >
                <option value="transfer">Batch / Container Transfer (Assembly, Sanding, Polish, QC, Pack)</option>
                <option value="machine">Machine Level / Components (Wood Issue, CNC, Machine cuts)</option>
              </Form.Select>
              <Form.Text className="text-muted">
                {formData.isMachineTracking
                  ? "Tracks individual parts across machine QR scanners."
                  : "Tracks container quantity transitions between departments."}
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Badge / Tag Color</Form.Label>
                  <div className="d-flex align-items-center">
                    <Form.Control
                      type="color"
                      value={formData.colorCode}
                      onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
                      style={{ width: "50px", height: "38px", padding: "2px", cursor: "pointer" }}
                    />
                    <Form.Control
                      type="text"
                      className="ms-2"
                      value={formData.colorCode}
                      onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
                      maxLength={10}
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <div className="mt-2">
                    <Form.Check
                      type="switch"
                      id="department-active-switch"
                      label={formData.isActive ? "Active" : "Inactive"}
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Operational notes or workstation description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" /> Saving...
                </>
              ) : (
                "Save Department"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default PageList_DepartmentMaster;
