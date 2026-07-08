import React, { useState, useEffect, useCallback } from "react";
import { Row, Col, Button, Table, Card, Badge, Form, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { API_WEB_URLS } from "../../constants/constAPI";

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return "";
  try {
    const formattedStr = String(dateTimeStr).includes("T") ? dateTimeStr : String(dateTimeStr).replace(" ", "T");
    const d = new Date(formattedStr);
    if (isNaN(d.getTime())) return dateTimeStr;

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, "0");

    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  } catch (e) {
    return dateTimeStr;
  }
};

const GlobalOptions = () => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  // Retrieve user session data
  const userData = JSON.parse(localStorage.getItem("authUser")) || {};
  const userId = userData.id || userData.UserId || 0;
  const userToken = userData.token || userData.UserToken || "token";

  const [machines, setMachines] = useState([]);

  // Fetch all machines
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await axios.get(
          `${API_WEB_URLS.BASE}${API_WEB_URLS.MASTER}/${userId}/${userToken}/MachineMaster/Id/0`
        );
        if (response.data && response.data.success && response.data.data?.response) {
          setMachines(response.data.data.response);
        }
      } catch (err) {
        console.error("Error fetching machines in GlobalOptions:", err);
      }
    };
    fetchMachines();
  }, [userId, userToken]);

  const handleCheckboxChange = (machineName, isChecked) => {
    const currentSelected = editValue ? editValue.split(",").map(x => x.trim()).filter(Boolean) : [];
    let updatedSelected = [];
    if (isChecked) {
      if (!currentSelected.some(name => name.toLowerCase() === machineName.toLowerCase())) {
        updatedSelected = [...currentSelected, machineName];
      } else {
        updatedSelected = currentSelected;
      }
    } else {
      updatedSelected = currentSelected.filter(name => name.toLowerCase() !== machineName.toLowerCase());
    }
    setEditValue(updatedSelected.join(", "));
  };

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_WEB_URLS.BASE}MachineDelayDashboard/GlobalOptions/${userId}/${userToken}`
      );
      if (response.data && response.data.success && response.data.data) {
        setOptions(response.data.data);
      } else {
        setError(response.data.message || "Failed to load global options.");
      }
    } catch (err) {
      console.error("Global options fetch error:", err);
      setError(err.response?.data?.message || err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, [userId, userToken]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const handleStartEdit = (opt) => {
    setEditingKey(opt.OptionKey);
    setEditValue(opt.OptionValue);
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const handleSaveOption = async (optKey) => {
    if (editValue.trim() === "") {
      alert("Option value cannot be empty.");
      return;
    }
    setActionLoading(true);
    setSuccessMessage(null);
    try {
      const formData = new FormData();
      formData.append("OptionKey", optKey);
      formData.append("OptionValue", editValue);

      const response = await axios.post(
        `${API_WEB_URLS.BASE}MachineDelayDashboard/GlobalOptions/Save/${userId}/${userToken}`,
        formData
      );
      if (response.data && response.data.success) {
        setSuccessMessage(`Option '${optKey}' updated successfully!`);
        setEditingKey(null);
        fetchOptions();
      } else {
        alert(response.data.message || "Failed to update option.");
      }
    } catch (err) {
      console.error("Save option error:", err);
      alert(err.response?.data?.message || err.message || "Error saving option.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "300px" }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 border-danger">
        <Card.Body className="text-center">
          <i className="fas fa-exclamation-triangle text-danger fs-3 mb-3"></i>
          <h4 className="text-danger">Error Loading Global Options</h4>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchOptions}>
            Retry
          </Button>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="font-w600 mb-1 text-primary">Global Configuration Options</h2>
          <p className="text-muted mb-0">Manage system-wide configuration thresholds, parameters, and metadata</p>
        </div>
        <Button variant="outline-primary" className="btn-sm" onClick={fetchOptions}>
          <i className="fas fa-redo me-1"></i> Refresh
        </Button>
      </div>

      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
          <i className="fas fa-check-circle me-2"></i>
          {successMessage}
        </Alert>
      )}

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-bottom py-3">
          <h5 className="mb-0 text-dark fw-bold">System Configuration Variables</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table className="align-items-center mb-0" hover>
              <thead className="table-light">
                <tr>
                  <th>Configuration Key</th>
                  <th style={{ width: "300px" }}>Value</th>
                  <th>Description</th>
                  <th>Last Updated</th>
                  <th className="text-center" style={{ width: "150px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {options.length > 0 ? (
                  options.map((opt) => (
                    <tr key={opt.Id}>
                      <td className="fw-bold text-primary">{opt.OptionKey}</td>
                      <td>
                        {editingKey === opt.OptionKey ? (
                          opt.OptionKey === "SkipMultiJobCardValidationMachineNames" ? (
                            <div className="border rounded p-2 bg-light" style={{ maxHeight: "150px", overflowY: "auto", minWidth: "250px" }}>
                              {machines && machines.length > 0 ? (
                                machines.map((m) => {
                                  const currentSelected = editValue ? editValue.split(",").map(x => x.trim().toLowerCase()) : [];
                                  const isChecked = currentSelected.includes(m.Name?.trim().toLowerCase());
                                  return (
                                    <Form.Check 
                                      key={m.Id || m.ID}
                                      type="checkbox"
                                      id={`chk-mach-${m.Id || m.ID}`}
                                      label={m.Name}
                                      checked={isChecked}
                                      onChange={(e) => handleCheckboxChange(m.Name, e.target.checked)}
                                      className="mb-1 text-dark fs-12"
                                    />
                                  );
                                })
                              ) : (
                                <span className="text-muted small">Loading machines...</span>
                              )}
                            </div>
                          ) : (
                            <Form.Control
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              size="sm"
                            />
                          )
                        ) : (
                          <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '300px' }}>
                            {opt.OptionValue ? opt.OptionValue.split(",").map((val, idx) => (
                              <Badge key={idx} bg="dark" className="fs-12 px-2.5 py-1.5 text-wrap">
                                {val.trim()}
                              </Badge>
                            )) : (
                              <span className="text-muted fs-12">None</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-muted">{opt.Description || "No description provided."}</td>
                      <td>{formatDateTime(opt.LastUpdated)}</td>
                      <td className="text-center">
                        {editingKey === opt.OptionKey ? (
                          <div className="d-flex justify-content-center">
                            <Button
                              variant="success"
                              size="sm"
                              className="me-2 btn-xs"
                              disabled={actionLoading}
                              onClick={() => handleSaveOption(opt.OptionKey)}
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="btn-xs"
                              disabled={actionLoading}
                              onClick={handleCancelEdit}
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            className="btn-xs"
                            onClick={() => handleStartEdit(opt)}
                          >
                            <i className="fas fa-edit me-1"></i> Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      No configuration variables found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default GlobalOptions;
