import React from "react";
import { FaFileAlt, FaSyncAlt, FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const ActiveJobCardsKpi = ({ counts = {}, runningMachines = [] }) => {
  const navigate = useNavigate();
  const activeJobCards = counts.runningJobCards || runningMachines.length || 0;

  return (
    <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px", background: "#ffffff" }}>
      <div className="card-header bg-transparent border-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <FaFileAlt className="text-info me-2" size={18} />
          <h6 className="mb-0 fw-bold text-dark">Job Card Operations</h6>
        </div>
        <button 
          className="btn btn-sm btn-link text-info text-decoration-none p-0 fw-semibold"
          style={{ fontSize: "0.78rem" }}
          onClick={() => navigate("/JobCardForm")}
        >
          View All <FaArrowRight size={10} className="ms-1" />
        </button>
      </div>
      <div className="card-body px-4 pt-1 pb-3">
        <div 
          className="p-3 rounded-3"
          style={{ background: "#f0f8ff", border: "1px solid #d0e7ff" }}
        >
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="text-muted fw-semibold" style={{ fontSize: "0.8rem" }}>
              Job Cards Currently In-Process
            </span>
            <span className="badge bg-info text-white rounded-pill px-2 py-1" style={{ fontSize: "0.7rem" }}>
              Active
            </span>
          </div>
          <div className="d-flex align-items-baseline gap-2">
            <h3 className="mb-0 fw-bold text-info" style={{ fontSize: "1.8rem" }}>
              {activeJobCards}
            </h3>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              cards running on floor
            </span>
          </div>
          <div className="text-muted small mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.72rem" }}>
            <FaSyncAlt size={10} className="text-info" /> Real-time tracking through QR Scanner & Machine checkpoints
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ActiveJobCardsKpi);
