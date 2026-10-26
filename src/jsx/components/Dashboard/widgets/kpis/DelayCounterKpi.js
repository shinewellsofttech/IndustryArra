import React from "react";
import { FaClock, FaExclamationTriangle, FaHourglassHalf } from "react-icons/fa";

const DelayCounterKpi = ({ delayedTransitions = [], thresholdHours = 4, onKpiClick }) => {
  const delayedCount = delayedTransitions.length;

  // Calculate total delay hours across all delayed transitions
  const totalDelayHours = delayedTransitions.reduce((acc, curr) => {
    const delay = parseFloat(curr.DelayHours || curr.delayHours || 0);
    return acc + (isNaN(delay) ? 0 : delay);
  }, 0);

  return (
    <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px", background: "#ffffff" }}>
      <div className="card-header bg-transparent border-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <FaExclamationTriangle className="text-warning me-2" size={18} />
          <h6 className="mb-0 fw-bold" style={{ color: "#1e293b" }}>Transition Delays</h6>
        </div>
        <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1" style={{ fontSize: "0.75rem", background: "rgba(246, 194, 62, 0.15)", border: "1px solid #f6c23e" }}>
          &gt; {thresholdHours}h Threshold
        </span>
      </div>
      <div className="card-body px-4 pt-1 pb-3">
        <div className="row g-3">
          <div className="col-6">
            <div 
              className="p-3 rounded-3 h-100"
              style={{ 
                background: "#fff9e6", 
                border: "1px solid #ffeeba",
                cursor: onKpiClick ? "pointer" : "default" 
              }}
              onClick={() => onKpiClick && onKpiClick("DELAYED_COUNT")}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-semibold" style={{ fontSize: "0.75rem", color: "#854d0e" }}>
                  Delayed Transfers
                </span>
                <FaClock className="text-warning" size={14} />
              </div>
              <h3 className="mb-0 fw-bold" style={{ fontSize: "1.6rem", color: "#b45309" }}>
                {delayedCount}
              </h3>
              <div className="small mt-1" style={{ fontSize: "0.7rem", color: "#a16207" }}>
                Exceeded {thresholdHours} hrs
              </div>
            </div>
          </div>

          <div className="col-6">
            <div 
              className="p-3 rounded-3 h-100"
              style={{ 
                background: "#fff5f5", 
                border: "1px solid #f8d7da",
                cursor: onKpiClick ? "pointer" : "default" 
              }}
              onClick={() => onKpiClick && onKpiClick("TOTAL_DELAY_HOURS")}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-semibold" style={{ fontSize: "0.75rem", color: "#991b1b" }}>
                  Total Lost Time
                </span>
                <FaHourglassHalf className="text-danger" size={14} />
              </div>
              <h3 className="mb-0 fw-bold text-danger" style={{ fontSize: "1.6rem" }}>
                {totalDelayHours.toFixed(1)} <span style={{ fontSize: "0.85rem", fontWeight: "normal", color: "#991b1b" }}>hrs</span>
              </h3>
              <div className="text-muted small mt-1" style={{ fontSize: "0.7rem" }}>
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
