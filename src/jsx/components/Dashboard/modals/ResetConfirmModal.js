import React from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { FaUndo, FaExclamationTriangle } from "react-icons/fa";

const ResetConfirmModal = ({ show, onHide, onConfirmReset, loading = false }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h6 fw-bold d-flex align-items-center text-danger">
          <FaUndo className="me-2" /> Reset Dashboard Layout
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-4">
        <div className="d-flex align-items-start gap-3">
          <div 
            className="p-3 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"
            style={{ width: "48px", height: "48px", background: "rgba(220, 53, 69, 0.1)" }}
          >
            <FaExclamationTriangle size={24} />
          </div>
          <div>
            <h6 className="fw-bold text-dark mb-1">Restore Default Layout?</h6>
            <p className="text-muted small mb-0">
              This will remove your custom widget arrangements, hidden widget states, and restore the recommended default template for your role.
            </p>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirmReset} disabled={loading} className="px-3">
          {loading ? <Spinner size="sm" animation="border" /> : "Yes, Reset to Default"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ResetConfirmModal;
