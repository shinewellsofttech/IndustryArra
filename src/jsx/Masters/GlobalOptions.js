import React, { useState, useEffect, useCallback } from "react";
import { Row, Col, Button, Card, Form, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { API_WEB_URLS } from "../../constants/constAPI";

const GlobalOptions = () => {
  const [options, setOptions] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [thresholdValue, setThresholdValue] = useState("");
  const [excludedIds, setExcludedIds] = useState("");
  
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Retrieve user session data
  const userData = JSON.parse(localStorage.getItem("authUser")) || {};
  const userId = userData.id || userData.UserId || 0;
  const userToken = userData.token || userData.UserToken || "token";

  // Fetch global options
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
    fetchOptions();
  }, [userId, userToken, fetchOptions]);

  // Initialize form values from database options
  useEffect(() => {
    if (options.length > 0) {
      const opt = options.find((o) => o.OptionKey === "MachineDelayThresholdHours") || options[0];
      if (opt) {
        setThresholdValue(opt.OptionValue || "");
        setExcludedIds(opt.ExcludedMachineIds || "");
      }
    }
  }, [options]);

  const handleMachineToggle = (machineId, isChecked) => {
    const currentIds = excludedIds ? excludedIds.split(",").map((x) => x.trim()).filter(Boolean) : [];
    let updatedIds = [];
    if (isChecked) {
      if (!currentIds.includes(String(machineId))) {
        updatedIds = [...currentIds, String(machineId)];
      } else {
        updatedIds = currentIds;
      }
    } else {
      updatedIds = currentIds.filter((id) => id !== String(machineId));
    }
    setExcludedIds(updatedIds.join(","));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (String(thresholdValue).trim() === "") {
      alert("Threshold value cannot be empty.");
      return;
    }
    setActionLoading(true);
    setSuccessMessage(null);
    try {
      const formData = new FormData();
      formData.append("OptionKey", "MachineDelayThresholdHours");
      formData.append("OptionValue", thresholdValue);
      formData.append("ExcludedMachineIds", excludedIds);

      const response = await axios.post(
        `${API_WEB_URLS.BASE}MachineDelayDashboard/GlobalOptions/Save/${userId}/${userToken}`,
        formData
      );
      if (response.data && response.data.success) {
        setSuccessMessage("Global options updated successfully!");
        fetchOptions();
      } else {
        alert(response.data.message || "Failed to update global options.");
      }
    } catch (err) {
      console.error("Save option error:", err);
      alert(err.response?.data?.message || err.message || "Error saving options.");
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
    <div className="container-fluid py-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="font-w600 mb-1 text-primary">Global Configuration Options</h2>
          <p className="text-muted mb-0">Manage system-wide configuration variables and machine exclusions</p>
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
          <h5 className="mb-0 text-dark fw-bold">System Variables Configuration Form</h5>
        </Card.Header>
        <Card.Body className="p-4">
          <Form onSubmit={handleSave}>
            <Row className="mb-4">
              <Col md="6">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-dark fs-14">
                    Machine Delay Highlight Threshold (Hours)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    placeholder="e.g. 4"
                    className="form-control-lg text-primary fw-bold"
                  />
                  <Form.Text className="text-muted">
                    Specify the threshold in hours. Transitions between machines taking longer than this value will be flagged as delays in the dashboard.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md="12">
                <Form.Group>
                  <Form.Label className="fw-bold text-dark fs-14 d-block mb-1">
                    Exclude Machines from Multiple Job Cards Check
                  </Form.Label>
                  <Form.Text className="text-muted d-block mb-3">
                    Select which machines are allowed to run multiple job cards simultaneously. Programmatic validation will be bypassed for the selected machines.
                  </Form.Text>
                  <div 
                    className="border rounded p-3 bg-light shadow-inner" 
                    style={{ 
                      maxHeight: "300px", 
                      overflowY: "auto",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: "12px"
                    }}
                  >
                    {machines && machines.length > 0 ? (
                      machines.map((m) => {
                        const currentIds = excludedIds ? excludedIds.split(",").map((x) => x.trim()) : [];
                        const isChecked = currentIds.includes(String(m.Id || m.ID));
                        return (
                          <div 
                            key={m.Id || m.ID} 
                            className="p-2 border rounded bg-white shadow-xs d-flex align-items-center hover-shadow-sm transition-all"
                            style={{ borderLeft: isChecked ? "4px solid #3b82f6" : "1px solid #e2e8f0" }}
                          >
                            <Form.Check 
                              type="checkbox"
                              id={`mach-chk-${m.Id || m.ID}`}
                              label={`${m.Name} (${m.MachineNo || 'N/A'})`}
                              checked={isChecked}
                              onChange={(e) => handleMachineToggle(m.Id || m.ID, e.target.checked)}
                              className="mb-0 fw-500 cursor-pointer"
                              style={{ width: "100%" }}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 col-span-full">
                        <Spinner animation="border" size="sm" className="me-2" />
                        <span>Loading machines list...</span>
                      </div>
                    )}
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <div className="border-top pt-4 d-flex justify-content-end">
              <Button 
                type="submit" 
                variant="primary" 
                className="px-4 py-2 fw-semibold"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving Options...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i> Update Global Options
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default GlobalOptions;
