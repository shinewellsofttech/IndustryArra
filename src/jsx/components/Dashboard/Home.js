import React, { useState, useEffect, useCallback } from "react";
import { Row, Col, Button, Table, Card, Badge, Form, Spinner, Modal, Tabs, Tab } from "react-bootstrap";
import axios from "axios";
import { Doughnut, Bar } from "react-chartjs-2";
import { API_WEB_URLS } from "../../../constants/constAPI";
import { HubConnectionBuilder } from "@microsoft/signalr";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { 
  FaExclamationTriangle, 
  FaClock, 
  FaRedo, 
  FaDesktop, 
  FaCogs, 
  FaPauseCircle, 
  FaChartBar, 
  FaTimesCircle, 
  FaCircle, 
  FaEye, 
  FaExclamationCircle, 
  FaRoute 
} from "react-icons/fa";

// Register Chart.js elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Format date helper matching QRScanner format
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

// Helper for formatting decimal delay hours to hours and minutes
const formatDelayText = (hoursVal) => {
  if (hoursVal === null || hoursVal === undefined) return "N/A";
  const hoursNum = parseFloat(hoursVal);
  if (isNaN(hoursNum)) return "N/A";
  
  if (hoursNum < 1) {
    const mins = Math.round(hoursNum * 60);
    return `${mins} mins`;
  }
  const h = Math.floor(hoursNum);
  const m = Math.round((hoursNum - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const Home = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState("ALL"); // ALL | RUNNING | IDLE | DELAYED
  const [selectedMachineFilter, setSelectedMachineFilter] = useState("");

  // Threshold edit state
  const [thresholdVal, setThresholdVal] = useState(4);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);
  const [showThresholdInput, setShowThresholdInput] = useState(false);
  // Job card drilldown flow state
  const [selectedJobCardId, setSelectedJobCardId] = useState(null);
  const [selectedJobCardNo, setSelectedJobCardNo] = useState("");
  const [jobCardFlow, setJobCardFlow] = useState([]);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);

  // Retrieve user session data
  const userData = JSON.parse(localStorage.getItem("authUser")) || {};
  const userId = userData.id || userData.UserId || 0;
  const userToken = userData.token || userData.UserToken || "token";

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_WEB_URLS.BASE}MachineDelayDashboard/${userId}/${userToken}`
      );
      if (response.data && response.data.success && response.data.data) {
        setData(response.data.data);
        setThresholdVal(response.data.data.thresholdHours || 4);
      } else {
        setError(response.data.message || "Failed to load dashboard data.");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.response?.data?.message || err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, [userId, userToken]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Establish SignalR connection for real-time dashboard updates
  useEffect(() => {
    let connection = null;

    const startSignalR = async () => {
      try {
        const hubUrl = API_WEB_URLS.BASE.replace("/api/V1/", "/qrScannerHub").replace("/api/v1/", "/qrScannerHub");
        console.log("🔌 Dashboard connecting to SignalR Hub at:", hubUrl);

        connection = new HubConnectionBuilder()
          .withUrl(hubUrl)
          .withAutomaticReconnect()
          .build();

        connection.on("ReceiveUpdate", (updatedJobCardId) => {
          console.log("⚡ SignalR Update Received on Dashboard. Refreshing dashboard data...");
          fetchDashboardData();
        });

        await connection.start();
        console.log("✅ Dashboard SignalR Connected Successfully!");
      } catch (err) {
        console.warn("❌ Dashboard SignalR Connection Failed:", err);
      }
    };

    startSignalR();

    return () => {
      if (connection) {
        connection.stop().catch(err => console.warn("Error stopping dashboard SignalR connection:", err));
      }
    };
  }, [fetchDashboardData]);

  // Handle threshold update
  const handleUpdateThreshold = async (e) => {
    e.preventDefault();
    if (parseFloat(thresholdVal) <= 0) {
      alert("Please enter a valid positive value for threshold hours.");
      return;
    }
    setIsUpdatingThreshold(true);
    try {
      const formData = new FormData();
      formData.append("ThresholdHours", thresholdVal);

      const response = await axios.post(
        `${API_WEB_URLS.BASE}MachineDelayDashboard/UpdateThreshold/${userId}/${userToken}`,
        formData
      );
      if (response.data && response.data.success) {
        setShowThresholdInput(false);
        fetchDashboardData();
      } else {
        alert(response.data.message || "Failed to update threshold.");
      }
    } catch (err) {
      console.error("Threshold update error:", err);
      alert(err.response?.data?.message || err.message || "Error updating threshold.");
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  // Handle drilldown click for a Job Card
  const handleViewJobCardFlow = async (jobCardId, jobCardNo) => {
    setSelectedJobCardId(jobCardId);
    setSelectedJobCardNo(jobCardNo);
    setLoadingFlow(true);
    setJobCardFlow([]);
    setShowFlowModal(true);

    try {
      const response = await axios.get(
        `${API_WEB_URLS.BASE}MachineDelayDashboard/JobCardFlow/${userId}/${userToken}/${jobCardId}`
      );
      if (response.data && response.data.success && response.data.data) {
        setJobCardFlow(response.data.data);
      } else {
        alert(response.data.message || "Failed to fetch flow steps.");
      }
    } catch (err) {
      console.error("Flow fetch error:", err);
      alert(err.response?.data?.message || err.message || "Error loading flow.");
    } finally {
      setLoadingFlow(false);
    }
  };

  // Clear filters helper
  const handleClearFilters = () => {
    setSelectedCategory("ALL");
    setSelectedMachineFilter("");
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
        <Spinner animation="border" variant="primary" role="status" style={{ width: "3rem", height: "3rem" }} />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 border-danger">
        <Card.Body className="text-center">
          <FaExclamationTriangle className="text-danger fs-3 mb-3" />
          <h4 className="text-danger">Dashboard Error</h4>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchDashboardData}>
            Retry
          </Button>
        </Card.Body>
      </Card>
    );
  }

  const counts = data?.machineCounts || { total: 0, running: 0, idle: 0, delayedTransitionsCount: 0 };
  const runningMachines = data?.runningMachines || [];
  const delayedTransitions = data?.delayedTransitions || [];
  const chartStats = data?.chartStats || [];


  // Filter lists based on selected states
  const filteredRunning = runningMachines.filter((m) => {
    const matchesCategory = selectedCategory === "ALL" || selectedCategory === "RUNNING";
    const matchesMachineName = !selectedMachineFilter || m.MachineName.toLowerCase().includes(selectedMachineFilter.toLowerCase()) || m.MachineCode.toLowerCase().includes(selectedMachineFilter.toLowerCase());
    return matchesCategory && matchesMachineName;
  });

  const filteredDelayed = delayedTransitions.filter((t) => {
    const matchesCategory = selectedCategory === "ALL" || selectedCategory === "DELAYED";
    const matchesMachineName = !selectedMachineFilter || 
      t.CurrentMachineName.toLowerCase().includes(selectedMachineFilter.toLowerCase()) || 
      t.CurrentMachineCode.toLowerCase().includes(selectedMachineFilter.toLowerCase()) ||
      t.NextMachineName.toLowerCase().includes(selectedMachineFilter.toLowerCase()) || 
      t.NextMachineCode.toLowerCase().includes(selectedMachineFilter.toLowerCase());
    return matchesCategory && matchesMachineName;
  });

  // Doughnut Chart: Running vs Idle
  const donutData = {
    labels: ["Running Machines", "Idle Machines"],
    datasets: [
      {
        data: [counts.running, counts.idle],
        backgroundColor: ["#2dce89", "#f5365c"],
        hoverBackgroundColor: ["#2dce89cc", "#f5365ccc"],
        borderWidth: 1,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { font: { family: "Poppins", size: 12 } },
      },
    },
    onClick: (evt, elements) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        setSelectedCategory(idx === 0 ? "RUNNING" : "IDLE");
      }
    },
  };

  // Bar Chart: Delay Counts per Machine
  const barData = {
    labels: chartStats.map((item) => item.MachineName),
    datasets: [
      {
        label: "Delayed Transitions",
        data: chartStats.map((item) => item.DelayCount),
        backgroundColor: "#5e72e4",
        hoverBackgroundColor: "#5e72e4cc",
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterBody: (context) => {
            const index = context[0].dataIndex;
            const avgDelay = chartStats[index]?.AverageDelayHours || 0;
            return `Avg Idle Time: ${formatDelayText(avgDelay)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
    onClick: (evt, elements) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        setSelectedMachineFilter(chartStats[idx].MachineName);
      }
    },
  };

  // Group logs by ParentContainerNo to construct visual trees


  return (
    <div className="container-fluid py-4">


      {/* KPI Cards */}
      <Row className="mb-4">
        <Col xl={3} sm={6} className="mb-4 mb-xl-0">
          <Card 
            className={`border-left-primary h-100 ${selectedCategory === "ALL" ? "border-primary" : ""}`}
            style={{ cursor: "pointer", transition: "0.2s" }}
            onClick={() => setSelectedCategory("ALL")}
          >
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-xs font-weight-bold text-uppercase text-primary d-block mb-1">Total Machines</span>
                <h3 className="mb-0 font-weight-bold">{counts.total}</h3>
              </div>
              <div className="icon-shape bg-primary-light p-3 rounded-circle">
                <FaDesktop className="text-primary fs-4" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} sm={6} className="mb-4 mb-xl-0">
          <Card 
            className={`border-left-success h-100 ${selectedCategory === "RUNNING" ? "border-success" : ""}`}
            style={{ cursor: "pointer", transition: "0.2s" }}
            onClick={() => setSelectedCategory("RUNNING")}
          >
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-xs font-weight-bold text-uppercase text-success d-block mb-1">Running Machines</span>
                <h3 className="mb-0 font-weight-bold">{counts.running}</h3>
              </div>
              <div className="icon-shape bg-success-light p-3 rounded-circle">
                <FaCogs className="text-success fs-4" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} sm={6} className="mb-4 mb-xl-0">
          <Card 
            className={`border-left-danger h-100 ${selectedCategory === "IDLE" ? "border-danger" : ""}`}
            style={{ cursor: "pointer", transition: "0.2s" }}
            onClick={() => setSelectedCategory("IDLE")}
          >
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-xs font-weight-bold text-uppercase text-danger d-block mb-1">Idle Machines</span>
                <h3 className="mb-0 font-weight-bold">{counts.idle}</h3>
              </div>
              <div className="icon-shape bg-danger-light p-3 rounded-circle">
                <FaPauseCircle className="text-danger fs-4" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} sm={6}>
          <Card 
            className={`border-left-warning h-100 ${selectedCategory === "DELAYED" ? "border-warning" : ""}`}
            style={{ cursor: "pointer", transition: "0.2s" }}
            onClick={() => setSelectedCategory("DELAYED")}
          >
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-xs font-weight-bold text-uppercase text-warning d-block mb-1">Delayed Transitions</span>
                <h3 className="mb-0 font-weight-bold">{counts.delayedTransitionsCount}</h3>
              </div>
              <div className="icon-shape bg-warning-light p-3 rounded-circle">
                <FaExclamationTriangle className="text-warning fs-4" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Section 1: Machine Performance & Delays */}
      {/* Chart Section */}
      <Row className="mb-4">
        <Col lg={4} className="mb-4 mb-lg-0">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0 text-dark font-w500">Machine Status Ratio</h5>
              <small className="text-muted">Click segment to filter table lists</small>
            </Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center" style={{ minHeight: "260px" }}>
              <div style={{ height: "230px", width: "100%" }}>
                <Doughnut data={donutData} options={donutOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0 text-dark font-w500">Delays by Completion Machine</h5>
                <small className="text-muted">Click bars to filter by completion machine</small>
              </div>
            </Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center" style={{ minHeight: "260px" }}>
              {chartStats.length > 0 ? (
                <div style={{ height: "230px", width: "100%" }}>
                  <Bar data={barData} options={barOptions} />
                </div>
              ) : (
                <div className="text-center text-muted">
                  <FaChartBar className="fs-2 mb-2 d-block" />
                  No delayed transitions reported to generate chart.
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters Summary & Reset */}
      {(selectedCategory !== "ALL" || selectedMachineFilter) && (
        <div className="alert alert-primary d-flex justify-content-between align-items-center p-3 mb-4 shadow-sm">
          <div>
            <strong>Active Filters:</strong>{" "}
            {selectedCategory !== "ALL" && (
              <Badge bg="light" text="primary" className="me-2 p-2">
                Status: {selectedCategory}
              </Badge>
            )}
            {selectedMachineFilter && (
              <Badge bg="light" text="primary" className="p-2">
                Machine: {selectedMachineFilter}
              </Badge>
            )}
          </div>
          <Button variant="light" className="btn-sm text-primary fw-bold" onClick={handleClearFilters}>
            <FaTimesCircle className="me-1" /> Clear Filters
          </Button>
        </div>
      )}

      {/* Dashboard Tables */}
      <Row className="mb-4">
        {/* Table 1: Running Machines */}
        {(selectedCategory === "ALL" || selectedCategory === "RUNNING") && (
          <Col lg={filteredDelayed.length === 0 ? 12 : 6} className="mb-4">
            <Card className="shadow-sm border-0 h-100">
              <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-dark fw-bold">
                  <FaCircle className="text-success me-2 animate-pulse" />
                  Currently Running Machines ({filteredRunning.length})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table className="align-items-center table-flush mb-0" hover>
                    <thead className="thead-light">
                      <tr>
                        <th>Machine</th>
                        <th>Shipment No</th>
                        <th>Job Card No</th>
                        <th>Started At</th>
                        <th>Running For</th>
                        <th>Operator</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRunning.length > 0 ? (
                        filteredRunning.map((m) => (
                          <tr key={m.JobCardLineId} className={m.IsDelayedRun ? "table-danger text-danger font-weight-bold" : ""}>
                            <td>
                              <span className="fw-bold">{m.MachineName}</span>
                              <div className="text-xs text-muted">{m.MachineCode}</div>
                            </td>
                            <td>{m.ShipmentNo || <span className="text-muted">N/A</span>}</td>
                            <td>
                              <Badge bg="light" text="primary" className="fs-12 p-2" style={{ cursor: "pointer" }} onClick={() => handleViewJobCardFlow(m.JobCardMasterId, m.JobCardNo)}>
                                {m.JobCardNo}
                              </Badge>
                            </td>
                            <td>{formatDateTime(m.StartTime)}</td>
                            <td>
                              <Badge bg={m.IsDelayedRun ? "danger" : "success"} className="p-2 fs-11">
                                {formatDelayText(m.RunningMinutes / 60.0)}
                              </Badge>
                              {m.IsDelayedRun ? (
                                <span className="text-danger ms-2 fw-bold text-xs d-block mt-1">
                                  <FaExclamationTriangle className="me-1" />ALERT (DELAY)
                                </span>
                              ) : null}
                            </td>
                            <td>{m.OperatorName || <span className="text-muted">N/A</span>}</td>
                            <td className="text-center">
                              <Button variant="info" className="btn-xs" onClick={() => handleViewJobCardFlow(m.JobCardMasterId, m.JobCardNo)}>
                                <FaEye className="me-1" /> View Flow
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-4">
                            No running machines match your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Table 2: Delayed Transitions */}
        {(selectedCategory === "ALL" || selectedCategory === "DELAYED") && (
          <Col lg={filteredRunning.length === 0 ? 12 : 6} className="mb-4">
            <Card className="shadow-sm border-0 h-100">
              <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-dark fw-bold text-warning">
                  <FaExclamationCircle className="me-2" />
                  Delayed Transitions ({filteredDelayed.length})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table className="align-items-center table-flush mb-0" hover>
                    <thead className="thead-light">
                      <tr>
                        <th>Shipment No</th>
                        <th>Job Card</th>
                        <th>From Machine</th>
                        <th>Finished</th>
                        <th>To Machine</th>
                        <th>Idle Time</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDelayed.length > 0 ? (
                        filteredDelayed.map((t, idx) => (
                          <tr key={idx}>
                            <td>{t.ShipmentNo || <span className="text-muted">N/A</span>}</td>
                            <td>
                              <Badge bg="light" text="primary" className="fs-12 p-2" style={{ cursor: "pointer" }} onClick={() => handleViewJobCardFlow(t.JobCardMasterId, t.JobCardNo)}>
                                {t.JobCardNo}
                              </Badge>
                            </td>
                            <td>
                              <span className="fw-bold">{t.CurrentMachineName}</span>
                              <div className="text-xs text-muted">{t.CurrentMachineCode}</div>
                            </td>
                            <td>{formatDateTime(t.CurrentEndTime)}</td>
                            <td>
                              {t.NextMachineName ? (
                                <>
                                  <span className="fw-bold">{t.NextMachineName}</span>
                                  <div className="text-xs text-muted">{t.NextMachineCode}</div>
                                </>
                              ) : (
                                <span className="text-muted">None (Last step)</span>
                              )}
                            </td>
                            <td>
                              <Badge bg="danger" className="p-2 fs-11">
                                {formatDelayText(t.DelayHours)}
                              </Badge>
                            </td>
                            <td className="text-center">
                              <Button variant="info" className="btn-xs" onClick={() => handleViewJobCardFlow(t.JobCardMasterId, t.JobCardNo)}>
                                <FaEye className="me-1" /> View Flow
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-4">
                            No delayed transitions match your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>



      {/* Drill-down Flow Modal */}
      <Modal show={showFlowModal} onHide={() => setShowFlowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="text-white fw-bold">
            <FaRoute className="me-2 text-white" />
            Job Card Process Flow: {selectedJobCardNo}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ minHeight: "250px" }}>
          {loadingFlow ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : jobCardFlow.length > 0 ? (
            <div className="timeline-container px-2">
              <div className="table-responsive">
                <Table bordered hover>
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "80px" }} className="text-center">Seq #</th>
                      <th>Machine Name & Code</th>
                      <th>Status</th>
                      <th>Timestamps</th>
                      <th>Operator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobCardFlow.map((step, idx) => {
                      const hasStarted = !!step.StartTime;
                      const hasEnded = !!step.EndTime;
                      
                      let badgeBg = "secondary";
                      let statusText = "NOT STARTED";
                      if (hasStarted && !hasEnded) {
                        badgeBg = "warning";
                        statusText = "IN PROGRESS";
                      } else if (hasStarted && hasEnded) {
                        badgeBg = "success";
                        statusText = "COMPLETED";
                      }

                      // Calculate transit delay from previous step
                      let transitDelayHtml = null;
                      if (idx > 0) {
                        const prevStep = jobCardFlow[idx - 1];
                        if (prevStep.EndTime) {
                          const currentEnd = new Date(prevStep.EndTime.replace(" ", "T"));
                          const nextStart = step.StartTime ? new Date(step.StartTime.replace(" ", "T")) : new Date();
                          const diffHours = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 3600);
                          
                          if (diffHours >= parseFloat(thresholdVal)) {
                            transitDelayHtml = (
                              <tr key={`delay-${idx}`} className="table-danger">
                                <td colSpan="5" className="text-center py-1 text-danger font-w500 text-xs">
                                  <FaExclamationTriangle className="me-1" />
                                  TRANSIT IDLE DELAY: {formatDelayText(diffHours)}
                                </td>
                              </tr>
                            );
                          } else {
                            transitDelayHtml = (
                              <tr key={`delay-${idx}`} className="table-light text-muted">
                                <td colSpan="5" className="text-center py-1 text-xs">
                                  Transit Time: {formatDelayText(diffHours)}
                                </td>
                              </tr>
                            );
                          }
                        }
                      }

                      return (
                        <React.Fragment key={step.JobCardLineId}>
                          {transitDelayHtml}
                          <tr className={statusText === "IN PROGRESS" ? "table-warning-light" : ""}>
                            <td className="text-center fw-bold">{step.Series}</td>
                            <td>
                              <span className="fw-bold">{step.MachineName}</span>
                              <div className="text-xs text-muted">{step.MachineCode}</div>
                            </td>
                            <td>
                              <Badge bg={badgeBg} className="p-2 fs-11 text-uppercase">
                                {statusText}
                              </Badge>
                            </td>
                            <td>
                              <div className="text-xs">
                                {step.StartTime ? (
                                  <div>
                                    <strong className="text-success">Start:</strong> {formatDateTime(step.StartTime)}
                                  </div>
                                ) : (
                                  <div className="text-muted">Not Started Yet</div>
                                )}
                                {step.EndTime && (
                                  <div className="mt-1">
                                    <strong className="text-danger">End:</strong> {formatDateTime(step.EndTime)}
                                  </div>
                                )}
                                {step.StartTime && step.EndTime && step.TotalTimeTaken > 0 && (
                                  <div className="mt-1 text-muted">
                                    <strong>Run Time:</strong> {formatDelayText(step.TotalTimeTaken / 60.0)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>{step.OperatorName || <span className="text-muted">N/A</span>}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted py-5">No process steps found for this Job Card.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFlowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Home;