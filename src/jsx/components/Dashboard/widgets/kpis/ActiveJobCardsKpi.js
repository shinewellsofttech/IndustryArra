import React from "react";
import { FaFileAlt, FaSyncAlt, FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const ActiveJobCardsKpi = ({ counts = {}, runningMachines = [], isLoading = false, onKpiClick }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="dynamic-card card shadow-sm h-100">
        <div className="card-header bg-transparent border-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <FaFileAlt className="text-info me-2" size={18} />
            <h6 className="mb-0 fw-bold dynamic-title">Job Card Operations</h6>
          </div>
          <span className="spinner-border spinner-border-sm text-info" role="status" style={{ width: "0.85rem", height: "0.85rem" }}></span>
        </div>
        <div className="card-body px-4 pt-1 pb-3">
          <div className="dynamic-subcard p-3 h-100 skeleton-shimmer" style={{ minHeight: "85px" }}>
            <div className="skeleton-line skeleton-shimmer mb-2 w-50" style={{ height: "10px" }} />
            <div className="skeleton-line skeleton-shimmer mb-1 w-75" style={{ height: "28px" }} />
          </div>
        </div>
      </div>
    );
  }

  const activeJobCards = counts.runningJobCards || runningMachines.length || 0;

  return (
    <div className="dynamic-card card shadow-sm h-100">
      <div className="card-header bg-transparent border-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <FaFileAlt className="text-info me-2" size={18} />
          <h6 className="mb-0 fw-bold dynamic-title">Job Card Operations</h6>
        </div>
        <button 
          className="btn btn-sm btn-link text-info text-decoration-none p-0 fw-semibold"
          style={{ fontSize: "0.78rem" }}
          onClick={() => navigate("/ActiveJobCards")}
          title="Open real-time Active Job Cards floor report"
        >
          View All <FaArrowRight size={10} className="ms-1" />
        </button>
      </div>
      <div className="card-body px-4 pt-1 pb-3">
        <div 
          className="p-3 rounded-3"
          style={{ 
            background: "rgba(13, 202, 240, 0.12)", 
            border: "1px solid rgba(13, 202, 240, 0.35)",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onClick={() => {
            if (onKpiClick) {
              onKpiClick("RUNNING");
            } else {
              navigate("/ActiveJobCards");
            }
          }}
          title="Click to view running Job Cards"
        >
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="fw-semibold dynamic-title" style={{ fontSize: "0.8rem" }}>
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
            <span className="dynamic-muted" style={{ fontSize: "0.8rem" }}>
              cards running on floor
            </span>
          </div>
          <div className="small mt-2 d-flex align-items-center gap-1 dynamic-muted" style={{ fontSize: "0.72rem" }}>
            <FaSyncAlt size={10} className="text-info" /> Real-time tracking through QR Scanner & Machine checkpoints
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ActiveJobCardsKpi);
