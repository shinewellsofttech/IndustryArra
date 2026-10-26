import React from "react";
import { Doughnut } from "react-chartjs-2";
import { FaChartPie } from "react-icons/fa";

const DelayDoughnutWidget = ({ counts = {}, onSliceClick }) => {
  const running = counts.running || 0;
  const paused = counts.paused || 0;
  const idle = counts.idle || 0;

  const data = {
    labels: ["Running Machines", "Paused / On Hold", "Idle Machines"],
    datasets: [
      {
        data: [running, paused, idle],
        backgroundColor: ["#1cc88a", "#e74a3b", "#858796"],
        hoverBackgroundColor: ["#17a673", "#be2617", "#60616f"],
        borderColor: ["#ffffff", "#ffffff", "#ffffff"],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          padding: 15,
          font: { family: "Poppins", size: 12, weight: "500" }
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.parsed || 0;
            const total = running + paused + idle;
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return ` ${label}: ${value} (${pct}%)`;
          }
        }
      }
    },
    onClick: (evt, elements) => {
      if (elements.length > 0 && onSliceClick) {
        const idx = elements[0].index;
        const types = ["RUNNING", "PAUSED", "IDLE"];
        onSliceClick(types[idx]);
      }
    },
  };

  return (
    <div className="dynamic-card card shadow-sm h-100">
      <div className="card-header bg-transparent border-0 pt-3 pb-0 px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <FaChartPie className="text-primary me-2" size={16} />
          <h6 className="mb-0 fw-bold dynamic-title">Machine Fleet Allocation</h6>
        </div>
        <span className="badge bg-secondary text-white" style={{ fontSize: "0.72rem" }}>
          Live Distribution
        </span>
      </div>
      <div className="card-body px-4 pb-3 pt-2">
        <div style={{ height: "240px", position: "relative" }}>
          <Doughnut data={data} options={options} />
          <div 
            style={{
              position: "absolute",
              top: "43%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none"
            }}
          >
            <div className="fw-bold fs-4 dynamic-title">{running + paused + idle}</div>
            <div className="dynamic-muted" style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>Fleet Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DelayDoughnutWidget);
