import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { parseBarcodeValue } from "./BarcodeHelper";
import { Fn_GetReport, Fn_AddEditData } from "../../store/Functions";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

// Play a physical scanner sound using the Web Audio API
const playBeepSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (error) {
    console.warn("Audio Context beep error:", error);
  }
};

const getMachineStatusText = (m) => {
  if (!m) return "NOT STARTED";
  const hasStarted = !!m.StartTime;
  const hasEnded = !!m.EndTime;
  if (hasStarted && !hasEnded) return "IN PROGRESS";
  if (hasStarted && hasEnded) return "COMPLETED";
  return "NOT STARTED";
};

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return "";
  try {
    const formattedStr = String(dateTimeStr).includes('T') ? dateTimeStr : String(dateTimeStr).replace(' ', 'T');
    const d = new Date(formattedStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  } catch (e) {
    return dateTimeStr;
  }
};

// ─── Machine Control Panel Component ─────────────────────────────────────────
const MachineControlPanel = ({ machine, onStart, onStop, actionLoading }) => {
  if (!machine) return null;

  const hasStarted = !!machine.StartTime;
  const hasEnded = !!machine.EndTime;

  let statusText = "NOT STARTED";
  let badgeColor = "#64748b";
  let badgeBg = "#f1f5f9";

  if (hasStarted && !hasEnded) {
    statusText = "IN PROGRESS";
    badgeColor = "#d97706";
    badgeBg = "#fef3c7";
  } else if (hasStarted && hasEnded) {
    statusText = "COMPLETED";
    badgeColor = "#16a34a";
    badgeBg = "#dcfce7";
  }

  return (
    <div
      style={{
        marginTop: "16px",
        padding: "16px",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
        backgroundColor: "#f8fafc",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
          STATUS:
        </span>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 700,
            color: badgeColor,
            backgroundColor: badgeBg,
          }}
        >
          ● {statusText}
        </span>
      </div>

      {hasStarted && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "8px" }}>
          <span style={{ fontWeight: 600 }}>Start Time:</span>
          <span style={{ fontFamily: "monospace", fontSize: "11.5px" }}>{formatDateTime(machine.StartTime)}</span>
        </div>
      )}
      {hasEnded && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "16px" }}>
          <span style={{ fontWeight: 600 }}>End Time:</span>
          <span style={{ fontFamily: "monospace", fontSize: "11.5px" }}>{formatDateTime(machine.EndTime)}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
        <button
          onClick={onStart}
          disabled={actionLoading || hasEnded}
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: hasEnded ? "#cbd5e1" : "#16a34a",
            color: "#fff",
            fontWeight: 600,
            fontSize: "13px",
            cursor: hasEnded ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            opacity: actionLoading ? 0.7 : 1,
          }}
        >
          {actionLoading ? (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          ) : (
            <i className="fas fa-play"></i>
          )}
          START
        </button>

        <button
          onClick={onStop}
          disabled={actionLoading || !hasStarted || hasEnded}
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: (!hasStarted || hasEnded) ? "#cbd5e1" : "#dc2626",
            color: "#fff",
            fontWeight: 600,
            fontSize: "13px",
            cursor: (!hasStarted || hasEnded) ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            opacity: actionLoading ? 0.7 : 1,
          }}
        >
          {actionLoading ? (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          ) : (
            <i className="fas fa-stop"></i>
          )}
          STOP
        </button>
      </div>
    </div>
  );
};

// ─── Scanned Wood Job Card View ───────────────────────────────────────────────
const ScannedWoodJobCard = ({ 
  jobCard, 
  parsedIds, 
  machineList,
  selectedMachineId,
  onMachineSelect,
  machineData, 
  onStartMachine, 
  onStopMachine, 
  actionLoading, 
  onRescan 
}) => {
  const cell = (label, value, labelStyle = {}, valueStyle = {}) => (
    <div className="responsive-cell" style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
      <div
        className="responsive-cell-label"
        style={{
          width: "38%",
          padding: "10px 14px",
          background: "#f0fdf4",
          fontWeight: 700,
          color: "#065f46",
          fontSize: 13,
          borderRight: "1px solid #e2e8f0",
          ...labelStyle,
        }}
      >
        {label}
      </div>
      <div
        className="responsive-cell-value"
        style={{
          flex: 1,
          padding: "10px 14px",
          color: "#1a202c",
          fontSize: 13,
          fontWeight: 500,
          ...valueStyle,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );

  return (
    <div className="container-fluid" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header Banner */}
      <div
        className="responsive-banner"
        style={{
          background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
          borderRadius: "12px 12px 0 0",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ color: "#a7f3d0", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
            WOOD JOB CARD — SCAN SUCCESSFUL
          </div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {jobCard.JobCardNo || "Job Card"}
          </div>
        </div>
        <button
          style={{
            background: "#1e293b",
            border: "none",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={onRescan}
        >
          <i className="fas fa-qrcode"></i> Scan Again
        </button>
      </div>

      {/* Details Container */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
        }}
      >
        {/* Main Grid */}
        <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div className="responsive-border-r" style={{ borderRight: "1px solid #e2e8f0" }}>
            {cell("WOOD MACHINE CENTRE", "JOB CARD")}
            {cell("SHIPMENT NO", jobCard.ContainerNumber)}
            {cell("PRODUCT CODE", jobCard.ProductCode)}
            {cell("COMPONENT", jobCard.ComponentsName)}
          </div>
          <div>
            {cell("JOB CARD NO", jobCard.JobCardNo)}
            {cell("INSPECTION DATE", jobCard.InspectionDate)}
            {cell("ITEM NAME", jobCard.ItemName)}
            {cell("ORDER QTY", jobCard.OrderQty)}
          </div>
        </div>

        {/* Batch Code and Component Qty */}
        <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div className="responsive-border-r" style={{ borderRight: "1px solid #e2e8f0" }}>
            {cell("BATCH CODE", jobCard.BatchCode)}
          </div>
          <div>
            {cell("COMPONENT QUANTITY", jobCard.ComponentQty)}
          </div>
        </div>

        {/* Wood Issue Size Section */}
        <div style={{ borderTop: "2px solid #e2e8f0" }}>
          <div
            style={{
              padding: "8px 14px",
              background: "#ecfdf5",
              fontWeight: 700,
              color: "#065f46",
              fontSize: 12,
              letterSpacing: 1,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            WOOD ISSUE SIZE (inch)
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "8px 12px", color: "#475569", fontWeight: 600, textAlign: "center" }}>Length (in inch)</th>
                  <th style={{ borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "8px 12px", color: "#475569", fontWeight: 600, textAlign: "center" }}>Width (in inch)</th>
                  <th style={{ borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "8px 12px", color: "#475569", fontWeight: 600, textAlign: "center" }}>Thickness (in inch)</th>
                  <th style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 12px", color: "#475569", fontWeight: 600, textAlign: "center" }}>CFT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                    {jobCard.W1 ? (jobCard.W1 % 1 === 0 ? Math.round(jobCard.W1) : jobCard.W1.toFixed(2)) : "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                    {jobCard.W2 ? (jobCard.W2 % 1 === 0 ? Math.round(jobCard.W2) : jobCard.W2.toFixed(2)) : "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                    {jobCard.W3 ? (jobCard.W3 % 1 === 0 ? Math.round(jobCard.W3) : jobCard.W3.toFixed(2)) : "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                    {jobCard.CFT ? (jobCard.CFT % 1 === 0 ? Math.round(jobCard.CFT) : jobCard.CFT.toFixed(4)) : "—"}
                  </td>
                </tr>
                {/* Additional Wood Issue Size Row */}
                {(jobCard.W_1 || jobCard.W_2 || jobCard.W_3 || jobCard.CFT2) && (
                  <tr>
                    <td style={{ borderRight: "1px solid #e2e8f0", padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                      {jobCard.W_1 ? (jobCard.W_1 % 1 === 0 ? Math.round(jobCard.W_1) : jobCard.W_1.toFixed(2)) : "—"}
                    </td>
                    <td style={{ borderRight: "1px solid #e2e8f0", padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                      {jobCard.W_2 ? (jobCard.W_2 % 1 === 0 ? Math.round(jobCard.W_2) : jobCard.W_2.toFixed(2)) : "—"}
                    </td>
                    <td style={{ borderRight: "1px solid #e2e8f0", padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                      {jobCard.W_3 ? (jobCard.W_3 % 1 === 0 ? Math.round(jobCard.W_3) : jobCard.W_3.toFixed(2)) : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                      {jobCard.CFT2 ? (jobCard.CFT2 % 1 === 0 ? Math.round(jobCard.CFT2) : jobCard.CFT2.toFixed(4)) : "—"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Final Dimension mm Section */}
        <div style={{ borderTop: "2px solid #e2e8f0" }}>
          <div
            style={{
              padding: "8px 14px",
              background: "#ecfdf5",
              fontWeight: 700,
              color: "#065f46",
              fontSize: 12,
              letterSpacing: 1,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            FINAL DIMENSIONS (mm)
          </div>
          <div className="responsive-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {cell("Length (L)", jobCard.F1 ? (jobCard.F1 % 1 === 0 ? Math.round(jobCard.F1) : jobCard.F1.toFixed(2)) : "")}
            {cell("Width (W)", jobCard.F2 ? (jobCard.F2 % 1 === 0 ? Math.round(jobCard.F2) : jobCard.F2.toFixed(2)) : "")}
            {cell("Thickness (T)", jobCard.F3 ? (jobCard.F3 % 1 === 0 ? Math.round(jobCard.F3) : jobCard.F3.toFixed(2)) : "")}
          </div>
        </div>

        {/* Notes */}
        {jobCard.Notes && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#fffbeb" }}>
            <span style={{ fontWeight: 700, color: "#92400e", fontSize: 12 }}>NOTES: </span>
            <span style={{ fontSize: 13, color: "#78350f" }}>{jobCard.Notes}</span>
          </div>
        )}

        {/* Machine Selection Dropdown & Control Panel */}
        <div style={{ padding: "20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          {(() => {
            const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
            const machineMasterId = authUser?.machineMaster;

            if (machineMasterId) {
              return machineData ? (
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    <i className="fas fa-desktop mr-2" style={{ color: "#065f46" }}></i> ASSIGNED MACHINE
                  </label>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: "16px"
                  }}>
                    {machineData.MachineName || "Unnamed Machine"} ({machineData.MachineNo || "N/A"}) - {getMachineStatusText(machineData)}
                  </div>
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    actionLoading={actionLoading}
                  />
                </div>
              ) : (
                <div className="alert alert-warning" style={{ margin: 0, fontSize: "13px" }}>
                  Assigned machine is not mapped or not found for this Job Card.
                </div>
              );
            }

            return (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    <i className="fas fa-desktop mr-2" style={{ color: "#065f46" }}></i> SELECT MACHINE FOR OPERATION
                  </label>
                  <select
                    value={selectedMachineId || ""}
                    onChange={(e) => onMachineSelect(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#1e293b",
                      outline: "none",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      fontFamily: "Poppins, sans-serif"
                    }}
                  >
                    <option value="">-- Choose Machine --</option>
                    {machineList && machineList.map((m) => (
                      <option key={m.ID} value={m.ID}>
                        {m.MachineName || "Unnamed Machine"} ({m.MachineNo || "N/A"}) - {getMachineStatusText(m)}
                      </option>
                    ))}
                  </select>
                </div>

                {machineData && (
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    actionLoading={actionLoading}
                  />
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// ─── Scanned Metal Job Card View ──────────────────────────────────────────────
const ScannedMetalJobCard = ({ 
  jobCard, 
  parsedIds, 
  machineList,
  selectedMachineId,
  onMachineSelect,
  machineData, 
  onStartMachine, 
  onStopMachine, 
  actionLoading, 
  onRescan 
}) => {
  const cell = (label, value, labelStyle = {}, valueStyle = {}) => (
    <div className="responsive-cell" style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
      <div
        className="responsive-cell-label"
        style={{
          width: "38%",
          padding: "10px 14px",
          background: "#eff6ff",
          fontWeight: 700,
          color: "#1e3a8a",
          fontSize: 13,
          borderRight: "1px solid #e2e8f0",
          ...labelStyle,
        }}
      >
        {label}
      </div>
      <div
        className="responsive-cell-value"
        style={{
          flex: 1,
          padding: "10px 14px",
          color: "#1a202c",
          fontSize: 13,
          fontWeight: 500,
          ...valueStyle,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );

  return (
    <div className="container-fluid" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header Banner */}
      <div
        className="responsive-banner"
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
          borderRadius: "12px 12px 0 0",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ color: "#dbeafe", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
            METAL JOB CARD — SCAN SUCCESSFUL
          </div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {jobCard.JobCardNo || "Job Card"}
          </div>
        </div>
        <button
          style={{
            background: "#1e293b",
            border: "none",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={onRescan}
        >
          <i className="fas fa-qrcode"></i> Scan Again
        </button>
      </div>

      {/* Details Container */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
        }}
      >
        {/* Main Grid */}
        <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div className="responsive-border-r" style={{ borderRight: "1px solid #e2e8f0" }}>
            {cell("WOOD MACHINE CENTRE", "JOB CARD")}
            {cell("SHIPMENT NO", jobCard.ContainerNumber)}
            {cell("ITEM NAME", jobCard.ItemName)}
            {cell("COMPONENT", jobCard.ComponentsName)}
          </div>
          <div>
            {cell("JOB CARD NO", jobCard.JobCardNo)}
            {cell("INSPECTION DATE", jobCard.InspectionDate)}
            {cell("ORDER QTY", jobCard.OrderQty)}
            {cell("COMPONENT QTY.", jobCard.ComponentQty)}
          </div>
        </div>

        {/* Batch Code Fields */}
        <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div className="responsive-border-r" style={{ borderRight: "1px solid #e2e8f0" }}>
            {cell("BATCH CODE OF MATERIAL", jobCard.BatchCode)}
          </div>
          <div>
            {cell("BATCH CODE OF POWDER", jobCard.PowderBatchCode)}
          </div>
        </div>

        {/* Final Dimension mm Section */}
        <div style={{ borderTop: "2px solid #e2e8f0" }}>
          <div
            style={{
              padding: "8px 14px",
              background: "#eff6ff",
              fontWeight: 700,
              color: "#1e3a8a",
              fontSize: 12,
              letterSpacing: 1,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            FINAL DIMENSIONS (mm)
          </div>
          <div className="responsive-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {cell("Length", jobCard.F1 ? (jobCard.F1 % 1 === 0 ? Math.round(jobCard.F1) : jobCard.F1.toFixed(2)) : "")}
            {cell("Width", jobCard.F2 ? (jobCard.F2 % 1 === 0 ? Math.round(jobCard.F2) : jobCard.F2.toFixed(2)) : "")}
            {cell("Thickness", jobCard.F3 ? (jobCard.F3 % 1 === 0 ? Math.round(jobCard.F3) : jobCard.F3.toFixed(2)) : "")}
          </div>
        </div>

        {/* Notes */}
        {jobCard.Notes && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#fffbeb" }}>
            <span style={{ fontWeight: 700, color: "#92400e", fontSize: 12 }}>NOTES: </span>
            <span style={{ fontSize: 13, color: "#78350f" }}>{jobCard.Notes}</span>
          </div>
        )}

        {/* Machine Selection Dropdown & Control Panel */}
        <div style={{ padding: "20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          {(() => {
            const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
            const machineMasterId = authUser?.machineMaster;

            if (machineMasterId) {
              return machineData ? (
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e3a8a", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    <i className="fas fa-desktop mr-2" style={{ color: "#1e3a8a" }}></i> ASSIGNED MACHINE
                  </label>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: "16px"
                  }}>
                    {machineData.MachineName || "Unnamed Machine"} ({machineData.MachineNo || "N/A"}) - {getMachineStatusText(machineData)}
                  </div>
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    actionLoading={actionLoading}
                  />
                </div>
              ) : (
                <div className="alert alert-warning" style={{ margin: 0, fontSize: "13px" }}>
                  Assigned machine is not mapped or not found for this Job Card.
                </div>
              );
            }

            return (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e3a8a", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    <i className="fas fa-desktop mr-2" style={{ color: "#1e3a8a" }}></i> SELECT MACHINE FOR OPERATION
                  </label>
                  <select
                    value={selectedMachineId || ""}
                    onChange={(e) => onMachineSelect(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#1e293b",
                      outline: "none",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      fontFamily: "Poppins, sans-serif"
                    }}
                  >
                    <option value="">-- Choose Machine --</option>
                    {machineList && machineList.map((m) => (
                      <option key={m.ID} value={m.ID}>
                        {m.MachineName || "Unnamed Machine"} ({m.MachineNo || "N/A"}) - {getMachineStatusText(m)}
                      </option>
                    ))}
                  </select>
                </div>

                {machineData && (
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    actionLoading={actionLoading}
                  />
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// ─── Scanned MDF Job Card View ────────────────────────────────────────────────
const ScannedMDFJobCard = ({ 
  jobCard, 
  parsedIds, 
  machineList,
  selectedMachineId,
  onMachineSelect,
  machineData, 
  onStartMachine, 
  onStopMachine, 
  actionLoading, 
  onRescan 
}) => {
  const cell = (label, value, labelStyle = {}, valueStyle = {}) => (
    <div className="responsive-cell" style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
      <div
        className="responsive-cell-label"
        style={{
          width: "38%",
          padding: "10px 14px",
          background: "#fff7ed",
          fontWeight: 700,
          color: "#c2410c",
          fontSize: 13,
          borderRight: "1px solid #e2e8f0",
          ...labelStyle,
        }}
      >
        {label}
      </div>
      <div
        className="responsive-cell-value"
        style={{
          flex: 1,
          padding: "10px 14px",
          color: "#1a202c",
          fontSize: 13,
          fontWeight: 500,
          ...valueStyle,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );

  return (
    <div className="container-fluid" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header Banner */}
      <div
        className="responsive-banner"
        style={{
          background: "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)",
          borderRadius: "12px 12px 0 0",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ color: "#ffedd5", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
            MDF JOB CARD — SCAN SUCCESSFUL
          </div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {jobCard.JobCardNo || "Job Card"}
          </div>
        </div>
        <button
          style={{
            background: "#1e293b",
            border: "none",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={onRescan}
        >
          <i className="fas fa-qrcode"></i> Scan Again
        </button>
      </div>

      {/* Details Container */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
        }}
      >
        {/* Main Grid */}
        <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div className="responsive-border-r" style={{ borderRight: "1px solid #e2e8f0" }}>
            {cell("SHIPMENT NO", jobCard.ContainerNumber)}
            {cell("INSPECTION DATE", jobCard.InspectionDate)}
            {cell("ITEM CODE", jobCard.ProductCode)}
            {cell("COMPONENT NAME", jobCard.ComponentsName)}
          </div>
          <div>
            {cell("JOB CARD NUMBER", jobCard.JobCardNo)}
            {cell("ITEM NAME", jobCard.ItemName)}
            {cell("ORDER QUANTITY", jobCard.OrderQty)}
            {cell("COMPONENT QTY", jobCard.ComponentQty)}
          </div>
        </div>

        {/* Batch Code */}
        <div style={{ borderTop: "1px solid #e2e8f0" }}>
          {cell("BATCH CODE", jobCard.BatchCode)}
        </div>

        {/* MDF Sheet Size Section */}
        <div style={{ borderTop: "2px solid #e2e8f0" }}>
          <div
            style={{
              padding: "8px 14px",
              background: "#fff7ed",
              fontWeight: 700,
              color: "#c2410c",
              fontSize: 12,
              letterSpacing: 1,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            MDF SHEET SIZE
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "8px 12px", color: "#475569", fontWeight: 600, textAlign: "center" }}>L (ft)</th>
                  <th style={{ borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "8px 12px", color: "#475569", fontWeight: 600, textAlign: "center" }}>W (ft)</th>
                  <th style={{ borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", padding: "8px 12px", color: "#475569", fontWeight: 600, textAlign: "center" }}>Thk. (mm)</th>
                  <th style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 12px", color: "#475569", fontWeight: 600, textAlign: "center" }}>Required Sheet Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", textAlign: "center", fontWeight: 600 }}>
                    {jobCard.W1 ? (jobCard.W1 % 1 === 0 ? Math.round(jobCard.W1) : jobCard.W1.toFixed(2)) : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", textAlign: "center", fontWeight: 600 }}>
                    {jobCard.W2 ? (jobCard.W2 % 1 === 0 ? Math.round(jobCard.W2) : jobCard.W2.toFixed(2)) : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", textAlign: "center", fontWeight: 600 }}>
                    {jobCard.W3 ? (jobCard.W3 % 1 === 0 ? Math.round(jobCard.W3) : jobCard.W3.toFixed(2)) : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                    {jobCard.Qty2 || "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Final Dimension mm Section */}
        <div style={{ borderTop: "2px solid #e2e8f0" }}>
          <div
            style={{
              padding: "8px 14px",
              background: "#fff7ed",
              fontWeight: 700,
              color: "#c2410c",
              fontSize: 12,
              letterSpacing: 1,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            FINAL COMPONENT DIMENSION (mm)
          </div>
          <div className="responsive-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {cell("Length", jobCard.F1 ? (jobCard.F1 % 1 === 0 ? Math.round(jobCard.F1) : jobCard.F1.toFixed(2)) : "")}
            {cell("Width", jobCard.F2 ? (jobCard.F2 % 1 === 0 ? Math.round(jobCard.F2) : jobCard.F2.toFixed(2)) : "")}
            {cell("Thickness", jobCard.F3 ? (jobCard.F3 % 1 === 0 ? Math.round(jobCard.F3) : jobCard.F3.toFixed(2)) : "")}
          </div>
        </div>

        {/* Notes */}
        {jobCard.Notes && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#fffbeb" }}>
            <span style={{ fontWeight: 700, color: "#92400e", fontSize: 12 }}>NOTES: </span>
            <span style={{ fontSize: 13, color: "#78350f" }}>{jobCard.Notes}</span>
          </div>
        )}

        {/* Machine Selection Dropdown & Control Panel */}
        <div style={{ padding: "20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          {(() => {
            const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
            const machineMasterId = authUser?.machineMaster;

            if (machineMasterId) {
              return machineData ? (
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#c2410c", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    <i className="fas fa-desktop mr-2" style={{ color: "#c2410c" }}></i> ASSIGNED MACHINE
                  </label>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: "16px"
                  }}>
                    {machineData.MachineName || "Unnamed Machine"} ({machineData.MachineNo || "N/A"}) - {getMachineStatusText(machineData)}
                  </div>
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    actionLoading={actionLoading}
                  />
                </div>
              ) : (
                <div className="alert alert-warning" style={{ margin: 0, fontSize: "13px" }}>
                  Assigned machine is not mapped or not found for this Job Card.
                </div>
              );
            }

            return (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#c2410c", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    <i className="fas fa-desktop mr-2" style={{ color: "#c2410c" }}></i> SELECT MACHINE FOR OPERATION
                  </label>
                  <select
                    value={selectedMachineId || ""}
                    onChange={(e) => onMachineSelect(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#1e293b",
                      outline: "none",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      fontFamily: "Poppins, sans-serif"
                    }}
                  >
                    <option value="">-- Choose Machine --</option>
                    {machineList && machineList.map((m) => (
                      <option key={m.ID} value={m.ID}>
                        {m.MachineName || "Unnamed Machine"} ({m.MachineNo || "N/A"}) - {getMachineStatusText(m)}
                      </option>
                    ))}
                  </select>
                </div>

                {machineData && (
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    actionLoading={actionLoading}
                  />
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// ─── Selector ScannedJobCardView Component ─────────────────────────────────────
const ScannedJobCardView = ({ 
  jobCard, 
  parsedIds, 
  machineList,
  selectedMachineId,
  onMachineSelect,
  machineData, 
  onStartMachine, 
  onStopMachine, 
  actionLoading, 
  onRescan 
}) => {
  const cat = String(parsedIds?.F_CategoryMaster || jobCard?.F_CategoryMaster || "");
  
  const responsiveStyles = (
    <style>{`
      @media (max-width: 767px) {
        .responsive-banner {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 12px !important;
          text-align: center !important;
          padding: 16px !important;
        }
        .responsive-banner button {
          justify-content: center !important;
          width: 100% !important;
        }
        .responsive-grid-2 {
          grid-template-columns: 1fr !important;
        }
        .responsive-grid-3 {
          grid-template-columns: 1fr !important;
        }
        .responsive-border-r {
          border-right: none !important;
        }
        .responsive-cell {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        .responsive-cell-label {
          width: 100% !important;
          border-right: none !important;
          border-bottom: 1px dashed #e2e8f0 !important;
          padding: 6px 12px !important;
        }
        .responsive-cell-value {
          padding: 6px 12px !important;
        }
      }
    `}</style>
  );

  let viewComponent = null;
  if (cat === "4" || cat === "16") {
    viewComponent = (
      <ScannedMetalJobCard
        jobCard={jobCard}
        parsedIds={parsedIds}
        machineList={machineList}
        selectedMachineId={selectedMachineId}
        onMachineSelect={onMachineSelect}
        machineData={machineData}
        onStartMachine={onStartMachine}
        onStopMachine={onStopMachine}
        actionLoading={actionLoading}
        onRescan={onRescan}
      />
    );
  } else if (cat === "5") {
    viewComponent = (
      <ScannedMDFJobCard
        jobCard={jobCard}
        parsedIds={parsedIds}
        machineList={machineList}
        selectedMachineId={selectedMachineId}
        onMachineSelect={onMachineSelect}
        machineData={machineData}
        onStartMachine={onStartMachine}
        onStopMachine={onStopMachine}
        actionLoading={actionLoading}
        onRescan={onRescan}
      />
    );
  } else {
    viewComponent = (
      <ScannedWoodJobCard
        jobCard={jobCard}
        parsedIds={parsedIds}
        machineList={machineList}
        selectedMachineId={selectedMachineId}
        onMachineSelect={onMachineSelect}
        machineData={machineData}
        onStartMachine={onStartMachine}
        onStopMachine={onStopMachine}
        actionLoading={actionLoading}
        onRescan={onRescan}
      />
    );
  }

  return (
    <>
      {responsiveStyles}
      {viewComponent}
    </>
  );
};

// ─── Main QR Scanner Component ─────────────────────────────────────────────────
const QRScanner = () => {
  const [lastScanned, setLastScanned] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [jobCardData, setJobCardData] = useState(null);   // fetched job card
  const [machineData, setMachineData] = useState(null);   // fetched machine row
  const [machineList, setMachineList] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [parsedIds, setParsedIds] = useState(null);
  const [scanMode, setScanMode] = useState("camera"); // "camera" | "file"
  const [actionLoading, setActionLoading] = useState(false);
  const fileInputRef = useRef(null);

  const qrCodeRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const API_URL_JOBCARD   = "GetJobCard/0/token";
  const API_URL_JOBCARDL  = "GetJobCardL/0/token";

  // Helper to format date to SQL server format YYYY-MM-DD HH:mm:ss
  const getFormattedDateTime = () => {
    const date = new Date();
    const pad = (num) => String(num).padStart(2, "0");
    
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  const handleMachineSelect = (machineId) => {
    setSelectedMachineId(machineId);
    const matched = machineList.find(m => String(m.ID) === String(machineId));
    setMachineData(matched || null);
  };

  const handleStartMachine = async () => {
    if (!machineData || actionLoading) return;
    setActionLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("authUser"));
      const nowStr = getFormattedDateTime();
      
      const vFormData = new FormData();
      // Append all existing fields from machineData
      Object.keys(machineData).forEach(key => {
        const val = machineData[key];
        vFormData.append(key, val !== null && val !== undefined ? String(val) : "");
      });
      // Explicitly set/override target fields
      vFormData.set("Id", machineData.ID);
      vFormData.set("UserId", user?.id || "");
      vFormData.set("StartDate", nowStr);
      vFormData.set("EndDate", machineData.EndTime || "");

      console.log("--- handleStartMachine: Appended Form Data ---");
      for (let [key, val] of vFormData.entries()) {
        console.log(`${key}:`, val);
      }

      await Fn_AddEditData(
        dispatch,
        (s) => {}, // Dummy state setter
        { arguList: { id: 0, formData: vFormData } },
        "TransferL/0/token",
        true,
        "Id",
        () => {}, // Dummy navigate
        "#"
      );

      // Update local state to reflect changes
      const updatedData = {
        ...machineData,
        StartTime: nowStr,
        StartDate: nowStr
      };
      setMachineData(updatedData);
      setMachineList(prevList => prevList.map(m => 
        String(m.ID) === String(machineData.ID) ? updatedData : m
      ));
      
      alert("Machine started successfully!");
    } catch (err) {
      console.error("Error starting machine:", err);
      alert("Failed to start machine. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopMachine = async () => {
    if (!machineData || actionLoading) return;
    setActionLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("authUser"));
      const nowStr = getFormattedDateTime();
      
      const vFormData = new FormData();
      // Append all existing fields from machineData
      Object.keys(machineData).forEach(key => {
        const val = machineData[key];
        vFormData.append(key, val !== null && val !== undefined ? String(val) : "");
      });
      // Explicitly set/override target fields
      vFormData.set("Id", machineData.ID);
      vFormData.set("UserId", user?.id || "");
      vFormData.set("StartDate", machineData.StartTime || "");
      vFormData.set("EndDate", nowStr);

      console.log("--- handleStopMachine: Appended Form Data ---");
      for (let [key, val] of vFormData.entries()) {
        console.log(`${key}:`, val);
      }

      await Fn_AddEditData(
        dispatch,
        (s) => {}, // Dummy state setter
        { arguList: { id: 0, formData: vFormData } },
        "TransferL/0/token",
        true,
        "Id",
        () => {}, // Dummy navigate
        "#"
      );

      // Update local state to reflect changes
      const updatedData = {
        ...machineData,
        EndTime: nowStr,
        EndDate: nowStr
      };
      setMachineData(updatedData);
      setMachineList(prevList => prevList.map(m => 
        String(m.ID) === String(machineData.ID) ? updatedData : m
      ));
      
      alert("Machine stopped successfully!");
    } catch (err) {
      console.error("Error stopping machine:", err);
      alert("Failed to stop machine. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Initialize the Html5Qrcode scanner instance once on component mount
  useEffect(() => {
    qrCodeRef.current = new Html5Qrcode("reader");

    return () => {
      if (qrCodeRef.current) {
        try {
          qrCodeRef.current.stop().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  // Copy to clipboard helper
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Fetch job card + machine data from scanned IDs
  const fetchJobCardData = useCallback(async (ids) => {
    if (!ids) return;
    setFetchLoading(true);
    setFetchError(null);
    setJobCardData(null);
    setMachineData(null);
    setMachineList([]);
    setSelectedMachineId("");

    try {
      let vformData = new FormData();
      vformData.append("F_ContainerMasterL", ids.F_ContainerMasterL);
      vformData.append("Categories",         ids.F_CategoryMaster);
      vformData.append("F_ItemMaster",        ids.F_ItemMaster);

      let jobCards = [];
      try {
        jobCards = await Fn_GetReport(
          dispatch,
          (data) => { jobCards = data; },
          "tenderData",
          API_URL_JOBCARD,
          { arguList: { id: 0, formData: vformData } },
          true
        );
      } catch (e) { /* no job cards */ }

      // Filter to matching component/job card first
      const matchingCard = Array.isArray(jobCards)
        ? jobCards.find(
            (c) =>
              String(c.F_ComponentsMaster) === String(ids.F_ComponentsMaster)
          ) || jobCards[0]
        : null;

      setJobCardData(matchingCard || null);

      let machines = [];
      if (matchingCard) {
        // Prepare API call for GetJobCardL using matching job card details
        let vformDataL = new FormData();
        vformDataL.append("F_ContainerMasterL", ids.F_ContainerMasterL);
        vformDataL.append("Categories",         ids.F_CategoryMaster);
        vformDataL.append("F_ItemMaster",        ids.F_ItemMaster);
        vformDataL.append("F_JobCardMaster",    matchingCard.ID);
        vformDataL.append("F_JobCardMasterH",   matchingCard.ID);

        try {
          machines = await Fn_GetReport(
            dispatch,
            (data) => { machines = data; },
            "tenderData",
            API_URL_JOBCARDL,
            { arguList: { id: 0, formData: vformDataL } },
            true
          );
        } catch (e) { /* no machines */ }
      }

      const fetchedMachines = Array.isArray(machines) ? machines : [];
      // Client-side filter to strictly match F_JobCardMaster with the scanned job card ID
      const jobCardMachines = matchingCard 
        ? fetchedMachines.filter((m) => String(m.F_JobCardMaster) === String(matchingCard.ID))
        : fetchedMachines;
      
      setMachineList(jobCardMachines);

      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      const machineMasterId = authUser?.machineMaster;

      // Find matching machine: priority is authUser's machineMasterId, then scanned F_MachineMaster
      let matchingMachine = null;
      if (machineMasterId) {
        matchingMachine = jobCardMachines.find(
          (m) =>
            String(m.ID) === String(machineMasterId) ||
            String(m.F_MachineMaster) === String(machineMasterId)
        );
      } else if (ids.F_MachineMaster) {
        matchingMachine = jobCardMachines.find(
          (m) =>
            String(m.ID) === String(ids.F_MachineMaster) ||
            String(m.F_MachineMaster) === String(ids.F_MachineMaster)
        );
      }

      if (matchingMachine) {
        setMachineData(matchingMachine);
        setSelectedMachineId(String(matchingMachine.ID));
      } else {
        setMachineData(null);
        setSelectedMachineId("");
      }

      if (!matchingCard) {
        setFetchError("Job card not found for the scanned QR code.");
      }
    } catch (err) {
      console.error("Error fetching job card data:", err);
      setFetchError("Failed to load job card. Please try again.");
    } finally {
      setFetchLoading(false);
    }
  }, [dispatch]);

  // Handler for successful scans
  const handleScanSuccess = useCallback(async (decodedText) => {
    console.log("QR Code Scanned successfully! Decoded Text:", decodedText);
    playBeepSound();
    const now = Date.now();
    setLastScanned(decodedText);

    // Parse the 5 IDs from the scanned QR code
    const ids = parseBarcodeValue(decodedText);
    console.log("Parsed IDs from QR Code:", ids);
    setParsedIds(ids);

    // Set loading state immediately to display overlay and freeze inputs
    setFetchLoading(true);

    // Stop the camera
    if (qrCodeRef.current && isCameraActive) {
      setIsTransitioning(true);
      try {
        await qrCodeRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.error("Failed to stop camera after scan:", err);
      } finally {
        setIsTransitioning(false);
      }
    }

    // Fetch job card data if we have valid IDs
    if (ids) {
      fetchJobCardData(ids);
    } else {
      setFetchLoading(false);
    }
  }, [fetchJobCardData, isCameraActive]);

  // Toggle between Camera and File scan modes
  const handleModeChange = async (mode) => {
    if (mode === scanMode) return;
    setScanMode(mode);
    setFetchError(null);
    if (mode === "file" && isCameraActive) {
      await stopCamera();
    }
  };

  // Extract QR code value from uploaded image file
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFetchError(null);

    try {
      if (!qrCodeRef.current) {
        qrCodeRef.current = new Html5Qrcode("reader");
      }
      const decodedText = await qrCodeRef.current.scanFile(file, false);
      await handleScanSuccess(decodedText);
    } catch (err) {
      console.error("Error scanning uploaded image:", err);
      setFetchError("Could not find any valid QR code in the uploaded image. Please ensure the QR code is clear and try again.");
    }
  };

  // Start the camera
  const startCamera = async () => {
    if (!qrCodeRef.current || isTransitioning) return;
    setIsTransitioning(true);
    // Reset job card view when starting new scan
    setJobCardData(null);
    setMachineData(null);
    setMachineList([]);
    setSelectedMachineId("");
    setFetchError(null);
    setParsedIds(null);
    setLastScanned(null);

    // Make the reader element visible first so html5-qrcode can mount to it
    setIsCameraActive(true);

    // Wait a short moment (100ms) for React to render the visible reader container
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      await qrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.max(250, Math.floor(minEdge * 0.7));
            return { width: size, height: size };
          }
        },
        handleScanSuccess,
        () => {} // Silent failure
      );
    } catch (err) {
      console.error("Failed to start camera:", err);
      setIsCameraActive(false);
      alert("Could not access camera. Please check camera permissions and make sure you are using HTTPS.");
    } finally {
      setIsTransitioning(false);
    }
  };

  // Stop the camera manually
  const stopCamera = async () => {
    if (!qrCodeRef.current || isTransitioning) return;
    setIsTransitioning(true);

    try {
      await qrCodeRef.current.stop();
      setIsCameraActive(false);
    } catch (err) {
      console.error("Failed to stop camera:", err);
    } finally {
      setIsTransitioning(false);
    }
  };


  const handleRescan = () => {
    setJobCardData(null);
    setMachineData(null);
    setMachineList([]);
    setSelectedMachineId("");
    setFetchError(null);
    setParsedIds(null);
    setLastScanned(null);
  };

  // ── If we have a job card loaded, show the job card view ──────

  if (fetchError && !jobCardData) {
    return (
      <div className="container-fluid">
        <div
          style={{
            border: "1px solid #fca5a5",
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
            background: "#fff5f5",
          }}
        >
          <i className="fas fa-exclamation-triangle" style={{ fontSize: 48, color: "#dc2626", marginBottom: 16 }}></i>
          <h5 style={{ color: "#dc2626", fontWeight: 700 }}>Failed to Load Job Card</h5>
          <p style={{ color: "#7f1d1d" }}>{fetchError}</p>
          {lastScanned && (
            <p style={{ color: "#6b7280", fontSize: 13 }}>
              Scanned: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{lastScanned}</code>
            </p>
          )}
          <button
            onClick={handleRescan}
            style={{
              background: "#065f46",
              color: "#fff",
              border: "none",
              padding: "12px 28px",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            <i className="fas fa-redo" style={{ marginRight: 8 }}></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (jobCardData) {
    return (
      <ScannedJobCardView
        jobCard={jobCardData}
        parsedIds={parsedIds}
        machineList={machineList}
        selectedMachineId={selectedMachineId}
        onMachineSelect={handleMachineSelect}
        machineData={machineData}
        onStartMachine={handleStartMachine}
        onStopMachine={handleStopMachine}
        actionLoading={actionLoading}
        onRescan={handleRescan}
      />
    );
  }

  // ── Default: Camera Scanner View ─────────────────────────────────────────────
  return (
    <div className="container-fluid" style={{ fontFamily: "Poppins, sans-serif" }}>
      <style>{`
        @keyframes scan {
          0% { top: 15px; opacity: 0.8; }
          50% { top: calc(100% - 18px); opacity: 0.8; }
          100% { top: 15px; opacity: 0.8; }
        }
        .laser-line {
          position: absolute;
          left: 15px;
          width: calc(100% - 30px);
          height: 3px;
          background: linear-gradient(to right, transparent, #34d399, transparent);
          box-shadow: 0 0 8px #34d399, 0 0 15px #34d399;
          animation: scan 2.2s infinite linear;
          z-index: 10;
          pointer-events: none;
        }
        .viewfinder-corner {
          position: absolute;
          width: 24px;
          height: 24px;
          border-color: #34d399;
          border-style: solid;
          pointer-events: none;
          z-index: 10;
          filter: drop-shadow(0 0 2px rgba(52, 211, 153, 0.5));
        }
        .corner-tl { top: 15px; left: 15px; border-width: 3px 0 0 3px; border-top-left-radius: 6px; }
        .corner-tr { top: 15px; right: 15px; border-width: 3px 3px 0 0; border-top-right-radius: 6px; }
        .corner-bl { bottom: 15px; left: 15px; border-width: 0 0 3px 3px; border-bottom-left-radius: 6px; }
        .corner-br { bottom: 15px; right: 15px; border-width: 0 3px 3px 0; border-bottom-right-radius: 6px; }
      `}</style>

      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6 mb-4">
          <div className="card shadow-lg" style={{ border: "1px solid #065f46", borderRadius: "12px", overflow: "hidden" }}>
            <div className="card-header" style={{ backgroundColor: "#065f46", padding: "18px 20px" }}>
              <div className="d-flex justify-content-between align-items-center w-100">
                <h4 className="card-title text-white mb-0 font-w700" style={{ fontSize: "1.1rem" }}>
                  <i className="fas fa-qrcode mr-2"></i> QR Code Scanner
                </h4>
                <span className={`badge px-3 py-1.5 fs-12 font-w600 ${isCameraActive ? "badge-success" : "badge-light"}`} style={isCameraActive ? { backgroundColor: "#34d399", color: "#065f46" } : {}}>
                  {isCameraActive ? "● SCANNING ACTIVE" : "● OFFLINE"}
                </span>
              </div>
            </div>
            <div className="card-body text-center d-flex flex-column justify-content-between align-items-center" style={{ minHeight: "440px", padding: "20px 20px", position: "relative" }}>
              {fetchLoading && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "#ffffff",
                  zIndex: 99,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "20px",
                  borderRadius: "12px"
                }}>
                  <div className="spinner-border" role="status" style={{ color: "#065f46", width: "56px", height: "56px", borderWidth: "5px" }}>
                    <span className="sr-only">Loading...</span>
                  </div>
                  <div>
                    <h5 className="font-w700 text-dark mb-1" style={{ fontSize: "1.1rem" }}>Processing Scan</h5>
                    <p className="text-muted fs-13 text-center mb-0" style={{ maxWidth: "280px" }}>
                      Retrieving Job Card and assigned machine details. Please wait...
                    </p>
                  </div>
                </div>
              )}

              {/* Scan Mode Segmented Control */}
              <div 
                style={{
                  display: "flex",
                  background: "#f1f5f9",
                  padding: "4px",
                  borderRadius: "8px",
                  width: "100%",
                  maxWidth: "400px",
                  marginBottom: "20px"
                }}
              >
                <button
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "13px",
                    transition: "all 0.2s",
                    background: scanMode === "camera" ? "#fff" : "transparent",
                    color: scanMode === "camera" ? "#0f172a" : "#64748b",
                    boxShadow: scanMode === "camera" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                  }}
                  onClick={() => handleModeChange("camera")}
                >
                  <i className="fas fa-camera" style={{ marginRight: 6 }}></i>
                  Live Camera
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "13px",
                    transition: "all 0.2s",
                    background: scanMode === "file" ? "#fff" : "transparent",
                    color: scanMode === "file" ? "#0f172a" : "#64748b",
                    boxShadow: scanMode === "file" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                  }}
                  onClick={() => handleModeChange("file")}
                >
                  <i className="fas fa-upload" style={{ marginRight: 6 }}></i>
                  Upload Image
                </button>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: "none" }}
              />

              {/* Reader container: always in DOM so clientWidth is available */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: "400px",
                  margin: "0 auto",
                  boxShadow: isCameraActive ? "0 10px 25px -5px rgba(0,0,0,0.1)" : "none",
                  display: scanMode === "camera" ? "block" : "none"
                }}
              >
                {isCameraActive && (
                  <>
                    <div className="laser-line"></div>
                    <div className="viewfinder-corner corner-tl"></div>
                    <div className="viewfinder-corner corner-tr"></div>
                    <div className="viewfinder-corner corner-bl"></div>
                    <div className="viewfinder-corner corner-br"></div>
                  </>
                )}

                <div
                  id="reader"
                  style={{
                    width: "100%",
                    border: isCameraActive ? "2px solid #065f46" : "none",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "#000000",
                    display: isCameraActive ? "block" : "none"
                  }}
                ></div>

                {!isCameraActive && (
                  <div style={{
                    width: "100%",
                    height: "280px",
                    border: "2px dashed #065f46",
                    borderRadius: "12px",
                    backgroundColor: "#f8f9fa",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "20px"
                  }}>
                    <div className="mb-3 d-flex justify-content-center align-items-center" style={{ width: "70px", height: "70px", borderRadius: "50%", backgroundColor: "#e6f4ea" }}>
                      <i className="fas fa-camera" style={{ fontSize: "2rem", color: "#065f46" }}></i>
                    </div>
                    <h5 className="font-w700 text-dark mb-1" style={{ fontSize: "1.1rem" }}>Camera is Offline</h5>
                    <p className="text-muted fs-13 text-center mb-0" style={{ maxWidth: "260px" }}>
                      Tap the button below to turn on the camera and scan a QR Code.
                    </p>
                  </div>
                )}
              </div>

              {/* Upload panel view */}
              {scanMode === "file" && (
                <div
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    width: "100%",
                    maxWidth: "400px",
                    height: "280px",
                    border: "2px dashed #0284c7",
                    borderRadius: "12px",
                    backgroundColor: "#f0f9ff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#e0f2fe";
                    e.currentTarget.style.borderColor = "#0369a1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0f9ff";
                    e.currentTarget.style.borderColor = "#0284c7";
                  }}
                >
                  <div className="mb-3 d-flex justify-content-center align-items-center" style={{ width: "70px", height: "70px", borderRadius: "50%", backgroundColor: "#e0f2fe" }}>
                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: "2rem", color: "#0284c7" }}></i>
                  </div>
                  <h5 className="font-w700 text-dark mb-1" style={{ fontSize: "1.1rem" }}>Upload QR Image</h5>
                  <p className="text-muted fs-13 text-center mb-0" style={{ maxWidth: "260px" }}>
                    Click here to select an image from your device containing the QR Code.
                  </p>
                </div>
              )}

              <div className="w-100 mt-4" style={{ maxWidth: "400px" }}>
                {scanMode === "file" ? (
                  <button
                    className="btn btn-info btn-block py-2.5 font-w700 fs-16 shadow-sm text-white"
                    style={{ backgroundColor: "#0284c7", borderColor: "#0284c7", borderRadius: "6px", transition: "all 0.2s" }}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  >
                    <i className="fas fa-image mr-2"></i> SELECT IMAGE FILE
                  </button>
                ) : !isCameraActive ? (
                  <button
                    className="btn btn-primary btn-block py-2.5 font-w700 fs-16 shadow-sm"
                    style={{ backgroundColor: "#065f46", borderColor: "#065f46", borderRadius: "6px", transition: "all 0.2s" }}
                    onClick={startCamera}
                    disabled={isTransitioning}
                  >
                    {isTransitioning ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Starting Camera...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-power-off mr-2"></i> TURN ON CAMERA
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    className="btn btn-danger btn-block py-2.5 font-w700 fs-16 shadow-sm"
                    style={{ borderRadius: "6px" }}
                    onClick={stopCamera}
                    disabled={isTransitioning}
                  >
                    {isTransitioning ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Stopping Camera...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-stop mr-2"></i> TURN OFF CAMERA
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
