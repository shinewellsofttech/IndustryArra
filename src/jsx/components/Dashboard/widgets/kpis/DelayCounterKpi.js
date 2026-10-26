import React from "react";
import { FaClock, FaExclamationTriangle, FaHourglassHalf } from "react-icons/fa";

const DelayCounterKpi = ({ delayedTransitions = [], thresholdHours = 4, onKpiClick, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="dynamic-card card shadow-sm h-100">
        <div className="card-header bg-transparent border-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="text-warning me-2" size={18} />
            <h6 className="mb-0 fw-bold dynamic-title">Transition Delays</h6>
          </div>
          <span className="spinner-border spinner-border-sm text-warning" role="status" style={{ width: "0.85rem", height: "0.85rem" }}></span>
        </div>
        <div className="card-body px-4 pt-1 pb-3">
          <div className="row g-3">
            {[1, 2].map((i) => (
              <div key={i} className="col-6">
                <div className="dynamic-subcard p-3 h-100 skeleton-shimmer" style={{ minHeight: "85px" }}>
                  <div className="skeleton-line skeleton-shimmer mb-2 w-50" style={{ height: "10px" }} />
                  <div className="skeleton-line skeleton-shimmer mb-1 w-75" style={{ height: "26px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const delayedCount = delayedTransitions.length;

  // Calculate total delay hours across all delayed transitions
  const totalDelayHours = delayedTransitions.reduce((acc, curr) => {
    const delay = parseFloat(curr.DelayHours || curr.delayHours || 0);
    return acc + (isNaN(delay) ? 0 : delay);
  }, 0);

  return (
    <div className="dynamic-card card shadow-sm h-100">
      <div className="card-header bg-transparent border-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <FaExclamationTriangle className="text-warning me-2" size={18} />
          <h6 className="mb-0 fw-bold dynamic-title">Transition Delays</h6>
        </div>
        <span className="badge bg-warning text-dark px-2 py-1" style={{ fontSize: "0.75rem" }}>
          &gt; {thresholdHours}h Threshold
        </span>
      </div>
      <div className="card-body px-4 pt-1 pb-3">
        <div className="row g-3">
          <div className="col-6">
            <div 
              className="p-3 rounded-3 h-100"
              style={{ 
                background: "rgba(246, 194, 62, 0.12)", 
                border: "1px solid rgba(246, 194, 62, 0.35)",
                cursor: onKpiClick ? "pointer" : "default" 
              }}
              onClick={() => onKpiClick && onKpiClick("DELAYED_COUNT")}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-semibold dynamic-title" style={{ fontSize: "0.75rem" }}>
                  Delayed Transfers
                </span>
                <FaClock className="text-warning" size={14} />
              </div>
              <h3 className="mb-0 fw-bold text-warning" style={{ fontSize: "1.6rem" }}>
                {delayedCount}
              </h3>
              <div className="small mt-1 dynamic-muted" style={{ fontSize: "0.7rem" }}>
                Exceeded {thresholdHours} hrs
              </div>
            </div>
          </div>

          <div className="col-6">
            <div 
              className="p-3 rounded-3 h-100"
              style={{ 
                background: "rgba(231, 74, 59, 0.12)", 
                border: "1px solid rgba(231, 74, 59, 0.35)",
                cursor: onKpiClick ? "pointer" : "default" 
              }}
              onClick={() => onKpiClick && onKpiClick("TOTAL_DELAY_HOURS")}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-semibold dynamic-title" style={{ fontSize: "0.75rem" }}>
                  Total Lost Time
                </span>
                <FaHourglassHalf className="text-danger" size={14} />
              </div>
              <h3 className="mb-0 fw-bold text-danger" style={{ fontSize: "1.6rem" }}>
                {totalDelayHours.toFixed(1)} <span style={{ fontSize: "0.85rem", fontWeight: "normal" }}>hrs</span>
              </h3>
              <div className="small mt-1 dynamic-muted" style={{ fontSize: "0.7rem" }}>
                Cumulative delay
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DelayCounterKpi);
