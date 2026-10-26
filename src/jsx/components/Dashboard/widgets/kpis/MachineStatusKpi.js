import React from "react";
import { FaCogs, FaPlay, FaPauseCircle, FaCircle, FaDesktop } from "react-icons/fa";

const MachineStatusKpi = ({ counts = {}, onKpiClick }) => {
  const total = counts.total || 0;
  const running = counts.running || 0;
  const paused = counts.paused || 0;
  const idle = counts.idle || 0;

  const kpis = [
    {
      title: "Total Machines",
      value: total,
      icon: FaDesktop,
      color: "#4e73df",
      badgeBg: "rgba(78, 115, 223, 0.12)",
      subtext: "Configured in master",
      filterType: "TOTAL"
    },
    {
      title: "Running Machines",
      value: running,
      icon: FaPlay,
      color: "#1cc88a",
      badgeBg: "rgba(28, 200, 138, 0.12)",
      subtext: "Active production",
      filterType: "RUNNING"
    },
    {
      title: "Paused / On Hold",
      value: paused,
      icon: FaPauseCircle,
      color: "#e74a3b",
      badgeBg: "rgba(231, 74, 59, 0.12)",
      subtext: "Job cards paused",
      filterType: "PAUSED"
    },
    {
      title: "Idle Machines",
      value: idle,
      icon: FaCircle,
      color: "#858796",
      badgeBg: "rgba(133, 135, 150, 0.12)",
      subtext: "No active job card",
      filterType: "IDLE"
    }
  ];

  return (
    <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px" }}>
      <div className="card-header bg-transparent border-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <FaCogs className="text-primary me-2" size={18} />
          <h6 className="mb-0 fw-bold text-dark">Machine Fleet Status</h6>
        </div>
        <span className="badge bg-light text-muted px-2 py-1" style={{ fontSize: "0.75rem" }}>
          Live Fleet
        </span>
      </div>
      <div className="card-body px-4 pt-1 pb-3">
        <div className="row g-3">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="col-6 col-md-3">
                <div 
                  className="p-3 rounded-3 h-100 position-relative"
                  style={{ 
                    background: "#f8f9fc",
                    border: "1px solid #eaecf4",
                    cursor: onKpiClick ? "pointer" : "default",
                    transition: "transform 0.15s ease-in-out"
                  }}
                  onClick={() => onKpiClick && onKpiClick(kpi.filterType)}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted fw-semibold text-truncate" style={{ fontSize: "0.75rem" }}>
                      {kpi.title}
                    </span>
                    <span 
                      className="rounded-circle d-flex align-items-center justify-content-center p-1"
                      style={{ background: kpi.badgeBg, color: kpi.color, width: "26px", height: "26px" }}
                    >
                      <Icon size={12} />
                    </span>
                  </div>
                  <h3 className="mb-0 fw-bold" style={{ color: kpi.color, fontSize: "1.6rem" }}>
                    {kpi.value}
                  </h3>
                  <div className="text-muted small mt-1" style={{ fontSize: "0.7rem" }}>
                    {kpi.subtext}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MachineStatusKpi);
