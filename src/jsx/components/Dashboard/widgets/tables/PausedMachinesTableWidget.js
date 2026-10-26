import React, { useState } from "react";
import { Table, Badge, Button, Modal, Form, Spinner } from "react-bootstrap";
import { FaPauseCircle, FaPlay, FaClock, FaExclamationCircle } from "react-icons/fa";
import { API_WEB_URLS } from "../../../../../constants/constAPI";
import { Fn_AddEditData } from "../../../../../store/Functions";
import { useDispatch } from "react-redux";

const PausedMachinesTableWidget = ({ pausedMachines = [], onRefresh, formatDateTime, isLoading = false }) => {
  const dispatch = useDispatch();
  const [selectedMachineToResume, setSelectedMachineToResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  const userData = JSON.parse(localStorage.getItem("authUser")) || {};
  const currentUserName = userData.name || userData.UserName || "Admin";

  const handleResumeConfirm = async () => {
    if (!selectedMachineToResume) return;

    setResumeLoading(true);
    try {
      const vFormData = new FormData();
      vFormData.append("JobCardMasterId", selectedMachineToResume.JobCardMasterId || selectedMachineToResume.F_JobCardMaster || 0);
      vFormData.append("MachineMasterId", selectedMachineToResume.MachineMasterId || selectedMachineToResume.F_MachineMaster || 0);
      vFormData.append("UserName", currentUserName);

      const postData = {
        formData: {
          id: 0,
          formData: vFormData
        }
      };

      await Fn_AddEditData(
        dispatch,
        () => {},
        postData,
        API_WEB_URLS.RESUME_MACHINE,
        true
      );

      alert(`Machine "${selectedMachineToResume.MachineName}" has been resumed successfully!`);
      setSelectedMachineToResume(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Resume machine error:", err);
      alert(err?.message || "Failed to resume machine. Please try again.");
    } finally {
      setResumeLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dynamic-card card shadow-sm h-100">
        <div className="card-header bg-transparent border-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <FaPauseCircle className="text-danger me-2" size={18} />
            <h6 className="mb-0 fw-bold dynamic-title">Machines On Hold / Paused</h6>
          </div>
          <span className="spinner-border spinner-border-sm text-danger" role="status" style={{ width: "0.85rem", height: "0.85rem" }}></span>
        </div>
        <div className="card-body px-4 pt-1 pb-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer mb-2 p-3 rounded" style={{ height: "48px" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dynamic-card card shadow-sm h-100">
      <div className="card-header bg-transparent border-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <FaPauseCircle className="text-danger me-2" size={18} />
          <h6 className="mb-0 fw-bold dynamic-title">Machines On Hold / Paused</h6>
        </div>
        <span className="badge bg-danger text-white rounded-pill px-3 py-1" style={{ fontSize: "0.75rem" }}>
          {pausedMachines.length} Paused
        </span>
      </div>

      <div className="card-body px-4 pt-1 pb-3">
        {pausedMachines.length === 0 ? (
          <div className="text-center py-4 dynamic-muted" style={{ fontSize: "0.88rem" }}>
            <FaClock size={28} className="text-success mb-2 d-block mx-auto" />
            <span className="fw-semibold dynamic-title">No machines are currently on hold.</span>
            <div className="small dynamic-muted">All active machines are running smoothly!</div>
          </div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: "280px", overflowY: "auto" }}>
            <Table hover className="align-middle mb-0 dynamic-table" style={{ fontSize: "0.82rem" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th>Machine</th>
                  <th>Job Card</th>
                  <th>Pause Reason</th>
                  <th>Paused At</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {pausedMachines.map((m, idx) => (
                  <tr key={m.JobCardLineId || idx}>
                    <td>
                      <div className="fw-bold dynamic-title">{m.MachineName || "Unknown Machine"}</div>
                      <div className="small dynamic-muted" style={{ fontSize: "0.72rem" }}>
                        {m.MachineCode || `ID: ${m.MachineMasterId}`}
                      </div>
                    </td>
                    <td>
                      <Badge bg="secondary" className="px-2 py-1">
                        {m.JobCardNo || `#${m.JobCardMasterId}`}
                      </Badge>
                    </td>
                    <td>
                      <span className="text-danger fw-semibold d-inline-block text-truncate" style={{ maxWidth: "150px" }} title={m.Reason || m.CurrentPauseReason}>
                        {m.Reason || m.CurrentPauseReason || "Shift End / Break"}
                      </span>
                    </td>
                    <td>
                      <span className="small dynamic-muted">
                        {formatDateTime ? formatDateTime(m.PauseStartTime || m.CurrentPauseStartTime) : (m.PauseStartTime || "N/A")}
                      </span>
                    </td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="success"
                        className="py-1 px-3 d-inline-flex align-items-center gap-1"
                        style={{ fontSize: "0.75rem", borderRadius: "16px" }}
                        onClick={() => setSelectedMachineToResume(m)}
                      >
                        <FaPlay size={9} /> Resume
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Resume Confirmation Modal */}
      {selectedMachineToResume && (
        <Modal show={true} onHide={() => setSelectedMachineToResume(null)} centered contentClassName="dynamic-modal-content">
          <Modal.Header closeButton className="dynamic-modal-header">
            <Modal.Title className="h6 fw-bold dynamic-title">
              <FaPlay className="text-success me-2" /> Resume Machine Operation
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-2 dynamic-body">
              Are you sure you want to resume machine:
            </p>
            <div className="p-3 dynamic-subcard rounded-3 mb-3">
              <div className="fw-bold dynamic-title">{selectedMachineToResume.MachineName}</div>
              <div className="small dynamic-muted">Job Card: {selectedMachineToResume.JobCardNo || selectedMachineToResume.JobCardMasterId}</div>
              <div className="small text-danger mt-1">
                <strong>Pause Reason:</strong> {selectedMachineToResume.Reason || selectedMachineToResume.CurrentPauseReason || "Break / Duty Off"}
              </div>
            </div>
            <p className="small dynamic-muted mb-0">
              This will record the resumption time and mark the machine status as running.
            </p>
          </Modal.Body>
          <Modal.Footer className="dynamic-modal-footer">
            <Button variant="secondary" size="sm" onClick={() => setSelectedMachineToResume(null)} disabled={resumeLoading}>
              Cancel
            </Button>
            <Button variant="success" size="sm" onClick={handleResumeConfirm} disabled={resumeLoading}>
              {resumeLoading ? <Spinner size="sm" animation="border" /> : "Confirm Resume"}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default React.memo(PausedMachinesTableWidget);
