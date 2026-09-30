import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { parseBarcodeValue } from "./BarcodeHelper";
import { Fn_GetReport, Fn_AddEditData, Fn_FillListData } from "../../store/Functions";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { HubConnectionBuilder, HttpTransportType } from "@microsoft/signalr";
import { API_WEB_URLS } from "../../constants/constAPI";
import axios from "axios";

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
  const isBypassed = !!(m.IsBypassed === 1 || m.IsBypassed === true || m.IsBypassed === "1" || (m.UserName && String(m.UserName).includes("BYPASS")));
  if (isBypassed) return "BYPASSED";
  const isPaused = !!(m.IsPaused === 1 || m.IsPaused === true || m.IsPaused === "1");
  if (isPaused) return "PAUSED";
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

// Helper to get formatted option label with real-time status and fallback process
const getMachineOptionLabel = (m, skipMachineIds = "") => {
  if (!m) return "";
  const isBypassed = !!(m.IsBypassed === 1 || m.IsBypassed === true || m.IsBypassed === "1" || (m.UserName && String(m.UserName).includes("BYPASS")));
  const isPaused = !!(m.IsPaused === 1 || m.IsPaused === true || m.IsPaused === "1");
  const hasStarted = m.StartTime && String(m.StartTime).trim() !== "";
  const hasEnded = m.EndTime && String(m.EndTime).trim() !== "";

  const shouldSkipValidation = (mach, skipListString) => {
    if (!mach || !skipListString) return false;
    const machId = mach.F_MachineMaster || mach.ID || mach.Id || mach.MachineId || mach.MachineMasterId;
    const list = skipListString.split(',').map(x => x.trim());
    return list.includes(String(machId));
  };

  const isEngagedElsewhere = m.EngagedJobCardNo && 
                             String(m.EngagedJobCardNo).trim() !== "" &&
                             !shouldSkipValidation(m, skipMachineIds);

  let statusLabel = "";
  if (isBypassed) {
    statusLabel = "⏩ BYPASSED";
  } else if (isPaused) {
    statusLabel = "⏸️ PAUSED (ON HOLD)";
  } else if (hasStarted && !hasEnded) {
    statusLabel = "🟡 IN PROGRESS";
  } else if (hasStarted && hasEnded) {
    statusLabel = "🟢 COMPLETED";
  } else if (isEngagedElsewhere) {
    statusLabel = `⚠️ BUSY (ON ${m.EngagedJobCardNo})`;
  } else {
    statusLabel = "🔴 NOT STARTED";
  }

  const machineName = m.MachineName || "Unnamed Machine";
  const machineNo = m.MachineNo || "N/A";
  const processStr = m.Process && String(m.Process).trim() !== "" ? m.Process : "General Operations";

  return `${statusLabel} | ${machineName} (${machineNo}) - ${processStr}`;
};

// ─── Machine Control Panel Component ─────────────────────────────────────────
const MachineControlPanel = ({ 
  machine, 
  onStart, 
  onStop, 
  onPause = null,
  onResume = null,
  actionLoading, 
  isPrevStarted = true, 
  prevMachineName = "", 
  skipMachineIds = "",
  onOpenBypassModal = null,
  unstartedPrecedingCount = 0
}) => {
  if (!machine) return null;

  const isBypassed = !!(machine.IsBypassed === 1 || machine.IsBypassed === true || machine.IsBypassed === "1" || (machine.UserName && String(machine.UserName).includes("BYPASS")));
  const isPaused = !!(machine.IsPaused === 1 || machine.IsPaused === true || machine.IsPaused === "1");
  const hasStarted = !!machine.StartTime;
  const hasEnded = !!machine.EndTime;

  const shouldSkipValidation = (mach, skipListString) => {
    if (!mach || !skipListString) return false;
    const machId = mach.F_MachineMaster || mach.ID || mach.Id || mach.MachineId || mach.MachineMasterId;
    const list = skipListString.split(',').map(x => x.trim());
    return list.includes(String(machId));
  };

  const isEngagedElsewhere = machine.EngagedJobCardNo && 
                             String(machine.EngagedJobCardNo).trim() !== "" &&
                             !shouldSkipValidation(machine, skipMachineIds);

  let statusText = "NOT STARTED";
  let badgeColor = "#64748b";
  let badgeBg = "#f1f5f9";

  if (isBypassed) {
    statusText = "BYPASSED (REJECTION)";
    badgeColor = "#0284c7";
    badgeBg = "#e0f2fe";
  } else if (isPaused) {
    statusText = "PAUSED (SHIFT OFF / HOLD)";
    badgeColor = "#ea580c";
    badgeBg = "#ffedd5";
  } else if (hasStarted && !hasEnded) {
    statusText = "IN PROGRESS";
    badgeColor = "#d97706";
    badgeBg = "#fef3c7";
  } else if (hasStarted && hasEnded) {
    statusText = "COMPLETED";
    badgeColor = "#16a34a";
    badgeBg = "#dcfce7";
  } else if (isEngagedElsewhere) {
    statusText = `BUSY (ON ${machine.EngagedJobCardNo})`;
    badgeColor = "#dc2626";
    badgeBg = "#fee2e2";
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

      {isBypassed && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          fontSize: "12px",
          color: "#0369a1",
          backgroundColor: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: "6px",
          padding: "8px 12px",
          marginBottom: "12px"
        }}>
          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            <i className="fas fa-forward"></i>
            <span>Marked as Bypassed for Rejection Material</span>
          </div>
          {machine.BypassReason && (
            <div style={{ fontSize: "11.5px", color: "#0284c7" }}>
              Reason: <em>{machine.BypassReason}</em>
            </div>
          )}
        </div>
      )}

      {isPaused && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          fontSize: "12px",
          color: "#9a3412",
          backgroundColor: "#fff7ed",
          border: "1px solid #fed7aa",
          borderRadius: "8px",
          padding: "10px 12px",
          marginBottom: "12px"
        }}>
          <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", color: "#c2410c" }}>
            <i className="fas fa-pause-circle" style={{ fontSize: "14px" }}></i>
            <span>Machine Operation Paused (Duty Off / Shift Ended)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
            <span><strong>Reason:</strong> {machine.CurrentPauseReason || "Shift End / Duty Off"}</span>
            {machine.CurrentPauseStartTime && (
              <span><strong>Paused At:</strong> {formatDateTime(machine.CurrentPauseStartTime)}</span>
            )}
          </div>
          {Number(machine.TotalPauseTime) > 0 && (
            <div style={{ fontSize: "11px", color: "#ea580c" }}>
              Total Prior Pause Time: {Math.floor(Number(machine.TotalPauseTime) / 60)} hrs {Math.round(Number(machine.TotalPauseTime) % 60)} mins
            </div>
          )}
        </div>
      )}

      {hasStarted && !isBypassed && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "8px" }}>
          <span style={{ fontWeight: 600 }}>Start Time:</span>
          <span style={{ fontFamily: "monospace", fontSize: "11.5px" }}>{formatDateTime(machine.StartTime)}</span>
        </div>
      )}
      {hasEnded && !isBypassed && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "16px" }}>
          <span style={{ fontWeight: 600 }}>End Time:</span>
          <span style={{ fontFamily: "monospace", fontSize: "11.5px" }}>{formatDateTime(machine.EndTime)}</span>
        </div>
      )}

      {isPaused ? (
        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button
            onClick={onResume}
            disabled={actionLoading}
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: actionLoading ? "#cbd5e1" : "#16a34a",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: actionLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: "0 2px 4px rgba(22, 163, 74, 0.3)"
            }}
          >
            {actionLoading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <i className="fas fa-play"></i>
            )}
            ▶️ RESUME
          </button>

          <button
            onClick={onStop}
            disabled={actionLoading}
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: actionLoading ? "#cbd5e1" : "#dc2626",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: actionLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
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
      ) : (
        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button
            onClick={onStart}
            disabled={actionLoading || hasStarted || hasEnded || !isPrevStarted || isEngagedElsewhere || isBypassed}
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "6px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: (hasStarted || hasEnded || !isPrevStarted || isEngagedElsewhere || isBypassed) ? "#cbd5e1" : "#16a34a",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: (hasStarted || hasEnded || !isPrevStarted || isEngagedElsewhere || isBypassed) ? "not-allowed" : "pointer",
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
            onClick={onPause}
            disabled={actionLoading || !hasStarted || hasEnded || isBypassed || isPaused}
            title="Pause machine operation at shift end / duty off"
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "6px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: (!hasStarted || hasEnded || isBypassed || isPaused) ? "#cbd5e1" : "#ea580c",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: (!hasStarted || hasEnded || isBypassed || isPaused) ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: (!hasStarted || hasEnded || isBypassed || isPaused) ? "none" : "0 2px 4px rgba(234, 88, 12, 0.3)",
              opacity: actionLoading ? 0.7 : 1,
            }}
          >
            <i className="fas fa-pause"></i>
            PAUSE
          </button>

          <button
            onClick={onStop}
            disabled={actionLoading || !hasStarted || hasEnded || isBypassed}
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "6px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: (!hasStarted || hasEnded || isBypassed) ? "#cbd5e1" : "#dc2626",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: (!hasStarted || hasEnded || isBypassed) ? "not-allowed" : "pointer",
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
      )}

      {!isPrevStarted && !isBypassed && (
        <div style={{
          marginTop: "12px",
          padding: "10px 12px",
          backgroundColor: "#fff7ed",
          borderRadius: "8px",
          border: "1px solid #fed7aa",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <div style={{ color: "#dc2626", fontSize: "12.5px", fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: "6px" }}>
            <i className="fas fa-exclamation-triangle"></i>
            <span>Please start the previous machine ({prevMachineName || "preceding machine"}) first.</span>
          </div>
          {onOpenBypassModal && unstartedPrecedingCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", paddingTop: "6px", borderTop: "1px dashed #fdba74" }}>
              <span style={{ fontSize: "11.5px", color: "#9a3412", fontWeight: 500 }}>
                Using rejection or pre-sized material?
              </span>
              <button
                type="button"
                onClick={onOpenBypassModal}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  backgroundColor: "#ea580c",
                  color: "#fff",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 1px 3px rgba(234, 88, 12, 0.3)"
                }}
              >
                <i className="fas fa-forward"></i>
                ⚡ Bypass Previous Machines ({unstartedPrecedingCount})
              </button>
            </div>
          )}
        </div>
      )}

      {isEngagedElsewhere && (
        <div style={{ color: "#dc2626", fontSize: "12.5px", fontWeight: 600, marginTop: "12px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px" }}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>This machine is currently active on Job Card No: {machine.EngagedJobCardNo}. Please end that operation first.</span>
        </div>
      )}
    </div>
  );
};

// ─── Auth Header Helper for Scanner API Calls ──────────────────────────────
const getAuthHeaders = () => {
  try {
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const token =
      authUser?.jwtToken ||
      authUser?.token ||
      authUser?.UserToken ||
      authUser?.UserTokenNew ||
      authUser?.accessToken ||
      authUser?.Token ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwtToken") ||
      localStorage.getItem("accessToken");
    if (token) {
      const cleanToken = String(token).trim();
      return {
        Authorization: cleanToken.startsWith("Bearer ") ? cleanToken : `Bearer ${cleanToken}`
      };
    }
  } catch (e) {
    console.error("Error reading auth header:", e);
  }
  return {};
};

// ─── Machine Swap Modal Component ──────────────────────────────────────────
const MachineSwapModal = ({
  isOpen,
  onClose,
  currentMachine,
  jobCard,
  availableMachines,
  loadingMachines,
  onSubmitSwap,
  submitLoading,
  isBulk = false,
  sessionsList = []
}) => {
  const [targetMachineId, setTargetMachineId] = useState("");
  const [reasonCategory, setReasonCategory] = useState("Workload Balancing / Long Queue");
  const [customReason, setCustomReason] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTargetMachineId("");
      setReasonCategory("Workload Balancing / Long Queue");
      setCustomReason("");
      setSearchFilter("");
    }
  }, [isOpen]);

  if (!isOpen || !currentMachine) return null;

  const currentMachId = currentMachine?.F_MachineMaster ?? currentMachine?.ID ?? currentMachine?.Id;
  const isAlreadyStarted = !!(currentMachine.StartTime && String(currentMachine.StartTime).trim() !== "");

  const filteredMachines = (availableMachines || []).filter(m => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    const name = String(m.Name || m.MachineName || "").toLowerCase();
    const no = String(m.MachineNo || m.Code || "").toLowerCase();
    return name.includes(q) || no.includes(q);
  });

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(3px)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily: "Poppins, sans-serif"
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "14px",
        maxWidth: "540px",
        width: "100%",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h5 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fas fa-exchange-alt" style={{ color: "#38bdf8" }}></i>
              {isBulk ? `Bulk Machine Switch (${sessionsList.length} Job Cards)` : "Change / Re-assign Machine"}
            </h5>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "3px" }}>
              {isBulk ? (
                <span>
                  Switching machine for {sessionsList.length} active sessions:{" "}
                  <strong style={{ color: "#38bdf8" }}>
                    {sessionsList.map(s => s.jobCardData?.JobCardNo || s.label).filter(Boolean).join(", ")}
                  </strong>
                </span>
              ) : (
                <span>Job Card: {jobCard?.JobCardNo || currentMachine?.JobCardNo || "N/A"}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", maxHeight: "75vh", overflowY: "auto" }}>
          {isAlreadyStarted && (
            <div style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "16px",
              color: "#991b1b",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <i className="fas fa-exclamation-circle fs-16"></i>
              <span>Cannot change machine: This operation has already started or completed on this step.</span>
            </div>
          )}

          {/* Current Machine Info Card */}
          <div style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "18px"
          }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Current Machine
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
              {currentMachine.MachineName || "Unnamed Machine"} ({currentMachine.MachineNo || "N/A"})
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
              <span style={{ fontWeight: 600 }}>Operation: </span>{currentMachine.Process || "General Operations"}
            </div>
          </div>

          {/* New Machine Selection */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
              Select New Machine <span style={{ color: "#ef4444" }}>*</span>
            </label>

            <input
              type="text"
              placeholder="Search machine name or code..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                marginBottom: "8px"
              }}
            />

            {loadingMachines ? (
              <div style={{ textAlign: "center", padding: "16px", color: "#64748b", fontSize: "13px" }}>
                <span className="spinner-border spinner-border-sm mr-2"></span> Loading available machines...
              </div>
            ) : (
              <select
                value={targetMachineId}
                onChange={(e) => setTargetMachineId(e.target.value)}
                disabled={isAlreadyStarted}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: isAlreadyStarted ? "#f1f5f9" : "#fff",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  color: "#1e293b",
                  outline: "none",
                  cursor: isAlreadyStarted ? "not-allowed" : "pointer"
                }}
              >
                <option value="">
                  {filteredMachines.length === 0
                    ? "-- No Machines Available --"
                    : `-- Choose Target Machine (${filteredMachines.length} available) --`}
                </option>
                {filteredMachines.map((m) => {
                  const mId = m.ID ?? m.Id ?? m.F_MachineMaster;
                  const isCurrent = String(mId) === String(currentMachId);
                  const isBusy = !!(m.EngagedJobCardNo && String(m.EngagedJobCardNo).trim() !== "");
                  return (
                    <option key={mId} value={mId} disabled={isCurrent}>
                      {isCurrent ? `[CURRENT] ` : isBusy ? `⚠️ [BUSY on JC: ${m.EngagedJobCardNo}] ` : `✅ `}
                      {m.Name || m.MachineName || `Machine #${mId}`} {m.MachineNo ? `(${m.MachineNo})` : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Reason Category */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
              Reason for Change <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              disabled={isAlreadyStarted}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#1e293b",
                backgroundColor: isAlreadyStarted ? "#f1f5f9" : "#fff"
              }}
            >
              <option value="Workload Balancing / Long Queue">Workload Balancing / Long Queue</option>
              <option value="Machine Breakdown / Maintenance">Machine Breakdown / Under Maintenance</option>
              <option value="Operator Reassignment">Operator Reassignment</option>
              <option value="Tooling / Setup Available on Machine">Tooling / Setup Available on Other Machine</option>
              <option value="Quality / Calibration Issue">Quality / Calibration Issue</option>
              <option value="Other">Other Reason</option>
            </select>
          </div>

          {/* Additional Notes */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>
              Remarks / Specific Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Panel Saw 1 maintenance, shifting to Panel Saw 2"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              disabled={isAlreadyStarted}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                resize: "vertical"
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px"
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmitSwap(targetMachineId, reasonCategory, customReason)}
            disabled={isAlreadyStarted || !targetMachineId || submitLoading}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: (isAlreadyStarted || !targetMachineId || submitLoading) ? "#94a3b8" : "#0284c7",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: (isAlreadyStarted || !targetMachineId || submitLoading) ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {submitLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                {isBulk ? "Updating All Machines..." : "Updating..."}
              </>
            ) : (
              <>
                <i className={isBulk ? "fas fa-check-double" : "fas fa-check"}></i>{" "}
                {isBulk ? `Update All (${sessionsList.length}) Machines` : "Update Machine"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Machine Bypass Modal Component (Rejection / Pre-sized Material) ────────
const MachineBypassModal = ({
  isOpen,
  onClose,
  targetMachine,
  jobCard,
  precedingMachines = [],
  onSubmitBypass,
  submitLoading = false
}) => {
  const [reasonCategory, setReasonCategory] = useState("Rejection Material Re-use (Scrap / Offcut Wood)");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReasonCategory("Rejection Material Re-use (Scrap / Offcut Wood)");
      setCustomReason("");
    }
  }, [isOpen]);

  if (!isOpen || !targetMachine) return null;

  const targetName = targetMachine.MachineName || "Selected Machine";
  const targetNo = targetMachine.MachineNo || "N/A";
  const jcNo = jobCard?.JobCardNo || targetMachine?.JobCardNo || "N/A";

  const handleConfirm = () => {
    const fullReason = customReason && customReason.trim()
      ? `${reasonCategory}: ${customReason.trim()}`
      : reasonCategory;
    onSubmitBypass(fullReason);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(3px)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily: "Poppins, sans-serif"
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "14px",
        maxWidth: "560px",
        width: "100%",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h5 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fas fa-forward"></i>
              Bypass Previous Machines (Rejection Material)
            </h5>
            <div style={{ color: "#ffedd5", fontSize: "12px", marginTop: "3px" }}>
              Job Card: <strong style={{ color: "#fff" }}>{jcNo}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitLoading}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffedd5",
              fontSize: "18px",
              cursor: submitLoading ? "not-allowed" : "pointer",
              padding: "4px 8px"
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", maxHeight: "70vh", overflowY: "auto" }}>
          {/* Explanation Banner */}
          <div style={{
            backgroundColor: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "16px",
            fontSize: "12.5px",
            color: "#9a3412",
            lineHeight: 1.5
          }}>
            <i className="fas fa-info-circle me-1" style={{ color: "#ea580c" }}></i>
            Starting directly from <strong>{targetName} ({targetNo})</strong> using rejection or pre-sized offcut material.
            The unstarted preceding machines below will be marked as bypassed so this machine unlocks immediately.
          </div>

          {/* Preceding Machines List */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
              Preceding Machines to Bypass ({precedingMachines.length}):
            </label>
            <div style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              maxHeight: "150px",
              overflowY: "auto",
              backgroundColor: "#f8fafc"
            }}>
              {precedingMachines.length > 0 ? (
                precedingMachines.map((m, idx) => (
                  <div key={m.ID || idx} style={{
                    padding: "8px 12px",
                    borderBottom: idx < precedingMachines.length - 1 ? "1px solid #e2e8f0" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px"
                  }}>
                    <div>
                      <strong style={{ color: "#1e293b" }}>{m.MachineName || "Machine"}</strong>
                      <span style={{ color: "#64748b", marginLeft: "6px" }}>({m.MachineNo || "N/A"})</span>
                      <div style={{ color: "#64748b", fontSize: "11px" }}>{m.Process || "General"}</div>
                    </div>
                    <span style={{
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "10.5px",
                      fontWeight: 600
                    }}>
                      Will Bypass
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: "10px", color: "#64748b", fontSize: "12px", textAlign: "center" }}>
                  All previous machines in sequence will be marked done.
                </div>
              )}
            </div>
          </div>

          {/* Reason Selection */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
              Reason for Bypass <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              disabled={submitLoading}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                backgroundColor: "#fff",
                outline: "none"
              }}
            >
              <option value="Rejection Material Re-use (Scrap / Offcut Wood)">Rejection Material Re-use (Scrap / Offcut Wood)</option>
              <option value="Pre-sized offcut stock used directly">Pre-sized offcut stock used directly</option>
              <option value="Salvaged component from QC rejection">Salvaged component from QC rejection</option>
              <option value="Pre-processed stock from previous job">Pre-processed stock from previous job</option>
              <option value="Custom Reason">Custom Reason (Specify below)</option>
            </select>
          </div>

          {/* Custom remarks */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>
              Remarks / Specific Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Using 2.5ft offcuts from JC-0045 directly on Rip Saw"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              disabled={submitLoading}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                resize: "vertical"
              }}
            />
          </div>

          {/* Safety Guarantees Notice */}
          <div style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            padding: "10px 12px",
            fontSize: "11.5px",
            color: "#166534"
          }}>
            <div>✔ <strong>Zero Dashboard Disturbance:</strong> Bypassed machines will not count as Running Machines.</div>
            <div style={{ marginTop: "4px" }}>✔ <strong>Zero Delay Incurred:</strong> Runtime is recorded as 0 minutes (no false idle delays).</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px"
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitLoading}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitLoading ? "not-allowed" : "pointer"
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitLoading}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: submitLoading ? "#94a3b8" : "#ea580c",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 4px rgba(234, 88, 12, 0.3)"
            }}
          >
            {submitLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Bypassing Machines...
              </>
            ) : (
              <>
                <i className="fas fa-forward"></i>
                Confirm & Bypass Machines
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Machine Pause Modal Component (Duty Off / Shift End / Break) ───────────
const MachinePauseModal = ({
  isOpen,
  onClose,
  targetMachine,
  jobCard,
  onConfirmPause,
  submitLoading = false
}) => {
  const [reasonCategory, setReasonCategory] = useState("Shift End / Duty Off (Will resume next day / shift)");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReasonCategory("Shift End / Duty Off (Will resume next day / shift)");
      setCustomReason("");
    }
  }, [isOpen]);

  if (!isOpen || !targetMachine) return null;

  const targetName = targetMachine.MachineName || "Selected Machine";
  const targetNo = targetMachine.MachineNo || "N/A";
  const jcNo = jobCard?.JobCardNo || targetMachine?.JobCardNo || "N/A";
  const processStr = targetMachine.Process || "General Operations";

  const handleConfirm = () => {
    const fullReason = customReason && customReason.trim()
      ? `${reasonCategory}: ${customReason.trim()}`
      : reasonCategory;
    onConfirmPause(fullReason);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(3px)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily: "Poppins, sans-serif"
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "14px",
        maxWidth: "540px",
        width: "100%",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h5 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fas fa-pause-circle" style={{ color: "#fef3c7" }}></i>
              Pause Machine Operation
            </h5>
            <small style={{ color: "#fed7aa", fontSize: "12px" }}>
              Job Card No: {jcNo} | Step: {processStr}
            </small>
          </div>
          <button
            onClick={onClose}
            disabled={submitLoading}
            style={{
              background: "transparent",
              border: "none",
              color: "#fef3c7",
              fontSize: "18px",
              cursor: submitLoading ? "not-allowed" : "pointer",
              padding: "4px 8px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", maxHeight: "75vh", overflowY: "auto" }}>
          {/* Target Machine Info */}
          <div style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px"
          }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
              Active Machine Step
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#78350f", marginTop: "2px" }}>
              {targetName} ({targetNo})
            </div>
            <div style={{ fontSize: "12px", color: "#92400e", marginTop: "3px" }}>
              <strong>Process:</strong> {processStr}
            </div>
          </div>

          {/* Reason Selection */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
              Select Pause Reason <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              disabled={submitLoading}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#1e293b",
                backgroundColor: "#fff"
              }}
            >
              <option value="Shift End / Duty Off (Will resume next day / shift)">
                🌙 Shift End / Duty Off (Will resume next day / shift)
              </option>
              <option value="Lunch / Tea Break">
                ☕ Lunch / Tea Break
              </option>
              <option value="Material Waiting / Tooling Change">
                📦 Material Waiting / Tooling Change
              </option>
              <option value="Maintenance / Machine Inspection">
                🔧 Maintenance / Machine Inspection
              </option>
              <option value="Quality Inspection / Approval Hold">
                🔍 Quality Inspection / Approval Hold
              </option>
              <option value="Other">
                ✏️ Other / Custom Reason
              </option>
            </select>
          </div>

          {/* Additional Notes */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>
              Remarks / Specific Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. 50 pcs completed, balance 50 pcs will be cut tomorrow morning..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              disabled={submitLoading}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                resize: "vertical"
              }}
            />
          </div>

          {/* Business Guarantees Notice */}
          <div style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            padding: "10px 12px",
            fontSize: "11.5px",
            color: "#166534"
          }}>
            <div>✔ <strong>Overnight Safety:</strong> Machine will NOT count as running on dashboard while factory is closed.</div>
            <div style={{ marginTop: "4px" }}>✔ <strong>Timer Freezes:</strong> Pause interval will be deducted from total cycle time upon completion.</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px"
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitLoading}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitLoading ? "not-allowed" : "pointer"
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitLoading}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: submitLoading ? "#94a3b8" : "#d97706",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 4px rgba(217, 119, 6, 0.3)"
            }}
          >
            {submitLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Pausing Machine...
              </>
            ) : (
              <>
                <i className="fas fa-pause"></i>
                Confirm & Pause Machine
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Machine Change Logs Modal Component ───────────────────────────────────
const MachineLogsModal = ({
  isOpen,
  onClose,
  jobCard,
  logsList,
  loading
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(3px)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily: "Poppins, sans-serif"
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "14px",
        maxWidth: "680px",
        width: "100%",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h5 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fas fa-history" style={{ color: "#38bdf8" }}></i>
              Machine Change Audit Logs
            </h5>
            <small style={{ color: "#94a3b8", fontSize: "12px" }}>
              Job Card No: {jobCard?.JobCardNo || "N/A"}
            </small>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", maxHeight: "70vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <span className="spinner-border spinner-border-sm mr-2"></span> Loading audit logs...
            </div>
          ) : (!logsList || logsList.length === 0) ? (
            <div style={{
              textAlign: "center",
              padding: "40px 20px",
              backgroundColor: "#f8fafc",
              borderRadius: "10px",
              border: "1px dashed #cbd5e1",
              color: "#64748b"
            }}>
              <i className="fas fa-clipboard-check fs-30 mb-2" style={{ color: "#94a3b8" }}></i>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#475569" }}>No Machine Changes Recorded</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                All operations on this Job Card are running on their originally allocated machines.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {logsList.map((log, index) => {
                const logId = log.Id ?? log.id ?? log.ID ?? index;
                const processName = log.ProcessName ?? log.processName ?? log.Process ?? log.process ?? "Operation";
                const changeDate = log.ChangeDateFormatted ?? log.changeDateFormatted ?? log.ChangeDate ?? log.changeDate ?? "Recently";
                const oldMachine = log.OldMachineName ?? log.oldMachineName ?? log.OldMachine ?? log.oldMachine ?? "Previous Machine";
                const newMachine = log.NewMachineName ?? log.newMachineName ?? log.NewMachine ?? log.newMachine ?? "New Machine";
                const reason = log.Reason ?? log.reason ?? "Not specified";
                const changedBy = log.ChangedByUserName ?? log.changedByUserName ?? log.UserName ?? log.userName ?? "Operator";

                return (
                  <div
                    key={logId}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      backgroundColor: "#f8fafc"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <span style={{
                        backgroundColor: "#e0f2fe",
                        color: "#0369a1",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11.5px",
                        fontWeight: 700
                      }}>
                        {processName}
                      </span>
                      <span style={{ fontSize: "11.5px", color: "#64748b", fontFamily: "monospace" }}>
                        <i className="far fa-clock mr-1"></i>
                        {changeDate}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "8px 0" }}>
                      <div style={{
                        backgroundColor: "#fee2e2",
                        color: "#991b1b",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                        fontWeight: 600
                      }}>
                        <i className="fas fa-times-circle mr-1"></i>
                        {oldMachine}
                      </div>
                      <i className="fas fa-arrow-right" style={{ color: "#94a3b8", fontSize: "14px" }}></i>
                      <div style={{
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                        fontWeight: 700
                      }}>
                        <i className="fas fa-check-circle mr-1"></i>
                        {newMachine}
                      </div>
                    </div>

                    <div style={{ fontSize: "12.5px", color: "#334155", marginTop: "6px" }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>Reason: </span>
                      {reason}
                    </div>

                    <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                      <span style={{ fontWeight: 600 }}>Changed By: </span>
                      {changedBy}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
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
  onRescan,
  skipMachineIds = "",
  onOpenSwapModal = null,
  onOpenLogsModal = null,
  onOpenBypassModal = null,
  onPauseMachine = null,
  onResumeMachine = null
}) => {
  console.log("ScannedWoodJobCard received skipMachineIds prop:", skipMachineIds);
  const currentIndex = machineList && machineData 
    ? machineList.findIndex(m => String(m.ID) === String(machineData.ID)) 
    : -1;
  const prevMachine = currentIndex > 0 ? machineList[currentIndex - 1] : null;
  const isPrevStarted = currentIndex > 0 
    ? (prevMachine && prevMachine.StartTime && String(prevMachine.StartTime).trim() !== "") 
    : true;
  const prevMachineName = prevMachine ? `${prevMachine.MachineName || "Unnamed Machine"} (${prevMachine.MachineNo || "N/A"})` : "";

  const unstartedPreceding = (currentIndex > 0 && machineList)
    ? machineList.slice(0, currentIndex).filter(m => !m.StartTime || String(m.StartTime).trim() === "")
    : [];
  const unstartedPrecedingCount = unstartedPreceding.length;

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
        {/* Job Card No Only */}
        <div>
          {cell("JOB CARD NO", jobCard.JobCardNo)}
        </div>

        {/* Machine Selection Dropdown & Control Panel */}
        <div style={{ padding: "20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          {(() => {
            const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
            const machineMasterId = authUser?.machineMaster;

            if (machineMasterId) {
              return machineData ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", margin: 0, letterSpacing: "0.5px" }}>
                      <i className="fas fa-desktop mr-2" style={{ color: "#065f46" }}></i> ASSIGNED MACHINE
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {unstartedPrecedingCount > 0 && machineData && (!machineData.StartTime || String(machineData.StartTime).trim() === "") && (
                        <button
                          type="button"
                          onClick={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                          disabled={actionLoading}
                          title="Bypass previous machines for rejection material"
                          style={{
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "1px solid #f97316",
                            backgroundColor: "#fff7ed",
                            color: "#ea580c",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-forward"></i> Bypass ({unstartedPrecedingCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenSwapModal && onOpenSwapModal(machineData)}
                        disabled={actionLoading || (machineData?.StartTime && String(machineData.StartTime).trim() !== "")}
                        title={machineData?.StartTime ? "Cannot change: operation already started" : "Switch / Update machine"}
                        style={{
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #10b981",
                          backgroundColor: "#ecfdf5",
                          color: "#047857",
                          cursor: (machineData?.StartTime && String(machineData.StartTime).trim() !== "") ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <i className="fas fa-exchange-alt"></i> Switch Machine
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenLogsModal && onOpenLogsModal(jobCard)}
                        style={{
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          color: "#475569",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <i className="fas fa-history"></i> Logs
                      </button>
                    </div>
                  </div>
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
                    {getMachineOptionLabel(machineData, skipMachineIds)}
                  </div>
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    onPause={() => onPauseMachine && onPauseMachine(machineData)}
                    onResume={() => onResumeMachine && onResumeMachine(machineData)}
                    actionLoading={actionLoading}
                    isPrevStarted={isPrevStarted}
                    prevMachineName={prevMachineName}
                    skipMachineIds={skipMachineIds}
                    onOpenBypassModal={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                    unstartedPrecedingCount={unstartedPrecedingCount}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", margin: 0, letterSpacing: "0.5px" }}>
                      <i className="fas fa-desktop mr-2" style={{ color: "#065f46" }}></i> SELECT MACHINE FOR OPERATION
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {unstartedPrecedingCount > 0 && machineData && (!machineData.StartTime || String(machineData.StartTime).trim() === "") && (
                        <button
                          type="button"
                          onClick={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                          disabled={actionLoading}
                          title="Bypass previous machines for rejection material"
                          style={{
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "1px solid #f97316",
                            backgroundColor: "#fff7ed",
                            color: "#ea580c",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-forward"></i> Bypass ({unstartedPrecedingCount})
                        </button>
                      )}
                      {machineData && (
                        <button
                          type="button"
                          onClick={() => onOpenSwapModal && onOpenSwapModal(machineData)}
                          disabled={actionLoading || (machineData?.StartTime && String(machineData.StartTime).trim() !== "")}
                          title={machineData?.StartTime ? "Cannot change: operation already started" : "Switch / Update machine"}
                          style={{
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "1px solid #10b981",
                            backgroundColor: "#ecfdf5",
                            color: "#047857",
                            cursor: (machineData?.StartTime && String(machineData.StartTime).trim() !== "") ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-exchange-alt"></i> Switch Machine
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenLogsModal && onOpenLogsModal(jobCard)}
                        style={{
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          color: "#475569",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <i className="fas fa-history"></i> Logs
                      </button>
                    </div>
                  </div>
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
                        {getMachineOptionLabel(m, skipMachineIds)}
                      </option>
                    ))}
                  </select>
                </div>

                {machineData && (
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    onPause={() => onPauseMachine && onPauseMachine(machineData)}
                    onResume={() => onResumeMachine && onResumeMachine(machineData)}
                    actionLoading={actionLoading}
                    isPrevStarted={isPrevStarted}
                    prevMachineName={prevMachineName}
                    skipMachineIds={skipMachineIds}
                    onOpenBypassModal={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                    unstartedPrecedingCount={unstartedPrecedingCount}
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
  onRescan,
  skipMachineIds = "",
  onOpenSwapModal = null,
  onOpenLogsModal = null,
  onOpenBypassModal = null,
  onPauseMachine = null,
  onResumeMachine = null
}) => {
  const currentIndex = machineList && machineData 
    ? machineList.findIndex(m => String(m.ID) === String(machineData.ID)) 
    : -1;
  const prevMachine = currentIndex > 0 ? machineList[currentIndex - 1] : null;
  const isPrevStarted = currentIndex > 0 
    ? (prevMachine && prevMachine.StartTime && String(prevMachine.StartTime).trim() !== "") 
    : true;
  const prevMachineName = prevMachine ? `${prevMachine.MachineName || "Unnamed Machine"} (${prevMachine.MachineNo || "N/A"})` : "";

  const unstartedPreceding = (currentIndex > 0 && machineList)
    ? machineList.slice(0, currentIndex).filter(m => !m.StartTime || String(m.StartTime).trim() === "")
    : [];
  const unstartedPrecedingCount = unstartedPreceding.length;

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
        {/* Job Card No Only */}
        <div>
          {cell("JOB CARD NO", jobCard.JobCardNo)}
        </div>

        {/* Machine Selection Dropdown & Control Panel */}
        <div style={{ padding: "20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          {(() => {
            const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
            const machineMasterId = authUser?.machineMaster;

            if (machineMasterId) {
              return machineData ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e3a8a", margin: 0, letterSpacing: "0.5px" }}>
                      <i className="fas fa-desktop mr-2" style={{ color: "#1e3a8a" }}></i> ASSIGNED MACHINE
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {unstartedPrecedingCount > 0 && machineData && (!machineData.StartTime || String(machineData.StartTime).trim() === "") && (
                        <button
                          type="button"
                          onClick={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                          disabled={actionLoading}
                          title="Bypass previous machines for rejection material"
                          style={{
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "1px solid #f97316",
                            backgroundColor: "#fff7ed",
                            color: "#ea580c",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-forward"></i> Bypass ({unstartedPrecedingCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenSwapModal && onOpenSwapModal(machineData)}
                        disabled={actionLoading || (machineData?.StartTime && String(machineData.StartTime).trim() !== "")}
                        title={machineData?.StartTime ? "Cannot change: operation already started" : "Switch / Update machine"}
                        style={{
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #3b82f6",
                          backgroundColor: "#eff6ff",
                          color: "#1d4ed8",
                          cursor: (machineData?.StartTime && String(machineData.StartTime).trim() !== "") ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <i className="fas fa-exchange-alt"></i> Switch Machine
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenLogsModal && onOpenLogsModal(jobCard)}
                        style={{
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          color: "#475569",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <i className="fas fa-history"></i> Logs
                      </button>
                    </div>
                  </div>
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
                    {getMachineOptionLabel(machineData, skipMachineIds)}
                  </div>
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    onPause={() => onPauseMachine && onPauseMachine(machineData)}
                    onResume={() => onResumeMachine && onResumeMachine(machineData)}
                    actionLoading={actionLoading}
                    isPrevStarted={isPrevStarted}
                    prevMachineName={prevMachineName}
                    skipMachineIds={skipMachineIds}
                    onOpenBypassModal={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                    unstartedPrecedingCount={unstartedPrecedingCount}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e3a8a", margin: 0, letterSpacing: "0.5px" }}>
                      <i className="fas fa-desktop mr-2" style={{ color: "#1e3a8a" }}></i> SELECT MACHINE FOR OPERATION
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {unstartedPrecedingCount > 0 && machineData && (!machineData.StartTime || String(machineData.StartTime).trim() === "") && (
                        <button
                          type="button"
                          onClick={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                          disabled={actionLoading}
                          title="Bypass previous machines for rejection material"
                          style={{
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "1px solid #f97316",
                            backgroundColor: "#fff7ed",
                            color: "#ea580c",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-forward"></i> Bypass ({unstartedPrecedingCount})
                        </button>
                      )}
                      {machineData && (
                        <button
                          type="button"
                          onClick={() => onOpenSwapModal && onOpenSwapModal(machineData)}
                          disabled={actionLoading || (machineData?.StartTime && String(machineData.StartTime).trim() !== "")}
                          title={machineData?.StartTime ? "Cannot change: operation already started" : "Switch / Update machine"}
                          style={{
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "1px solid #3b82f6",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            cursor: (machineData?.StartTime && String(machineData.StartTime).trim() !== "") ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-exchange-alt"></i> Switch Machine
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenLogsModal && onOpenLogsModal(jobCard)}
                        style={{
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          color: "#475569",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <i className="fas fa-history"></i> Logs
                      </button>
                    </div>
                  </div>
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
                        {getMachineOptionLabel(m, skipMachineIds)}
                      </option>
                    ))}
                  </select>
                </div>

                {machineData && (
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    onPause={() => onPauseMachine && onPauseMachine(machineData)}
                    onResume={() => onResumeMachine && onResumeMachine(machineData)}
                    actionLoading={actionLoading}
                    isPrevStarted={isPrevStarted}
                    prevMachineName={prevMachineName}
                    skipMachineIds={skipMachineIds}
                    onOpenBypassModal={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                    unstartedPrecedingCount={unstartedPrecedingCount}
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
  onRescan,
  skipMachineIds = "",
  onOpenSwapModal = null,
  onOpenLogsModal = null,
  onOpenBypassModal = null,
  onPauseMachine = null,
  onResumeMachine = null
}) => {
  const currentIndex = machineList && machineData 
    ? machineList.findIndex(m => String(m.ID) === String(machineData.ID)) 
    : -1;
  const prevMachine = currentIndex > 0 ? machineList[currentIndex - 1] : null;
  const isPrevStarted = currentIndex > 0 
    ? (prevMachine && prevMachine.StartTime && String(prevMachine.StartTime).trim() !== "") 
    : true;
  const prevMachineName = prevMachine ? `${prevMachine.MachineName || "Unnamed Machine"} (${prevMachine.MachineNo || "N/A"})` : "";

  const unstartedPreceding = (currentIndex > 0 && machineList)
    ? machineList.slice(0, currentIndex).filter(m => !m.StartTime || String(m.StartTime).trim() === "")
    : [];
  const unstartedPrecedingCount = unstartedPreceding.length;

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
        {/* Job Card No Only */}
        <div>
          {cell("JOB CARD NO", jobCard.JobCardNo)}
        </div>

        {/* Machine Selection Dropdown & Control Panel */}
        <div style={{ padding: "20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          {(() => {
            const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
            const machineMasterId = authUser?.machineMaster;

            if (machineMasterId) {
              return machineData ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#c2410c", margin: 0, letterSpacing: "0.5px" }}>
                      <i className="fas fa-desktop mr-2" style={{ color: "#c2410c" }}></i> ASSIGNED MACHINE
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {unstartedPrecedingCount > 0 && machineData && (!machineData.StartTime || String(machineData.StartTime).trim() === "") && (
                        <button
                          type="button"
                          onClick={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                          disabled={actionLoading}
                          title="Bypass previous machines for rejection material"
                          style={{
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "1px solid #f97316",
                            backgroundColor: "#fff7ed",
                            color: "#ea580c",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-forward"></i> Bypass ({unstartedPrecedingCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenSwapModal && onOpenSwapModal(machineData)}
                        disabled={actionLoading || (machineData?.StartTime && String(machineData.StartTime).trim() !== "")}
                        title={machineData?.StartTime ? "Cannot change: operation already started" : "Switch / Update machine"}
                        style={{
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #f97316",
                          backgroundColor: "#fff7ed",
                          color: "#c2410c",
                          cursor: (machineData?.StartTime && String(machineData.StartTime).trim() !== "") ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <i className="fas fa-exchange-alt"></i> Switch Machine
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenLogsModal && onOpenLogsModal(jobCard)}
                        style={{
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          color: "#475569",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <i className="fas fa-history"></i> Logs
                      </button>
                    </div>
                  </div>
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
                    {getMachineOptionLabel(machineData, skipMachineIds)}
                  </div>
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    onPause={() => onPauseMachine && onPauseMachine(machineData)}
                    onResume={() => onResumeMachine && onResumeMachine(machineData)}
                    actionLoading={actionLoading}
                    isPrevStarted={isPrevStarted}
                    prevMachineName={prevMachineName}
                    skipMachineIds={skipMachineIds}
                    onOpenBypassModal={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                    unstartedPrecedingCount={unstartedPrecedingCount}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#c2410c", margin: 0, letterSpacing: "0.5px" }}>
                      <i className="fas fa-desktop mr-2" style={{ color: "#c2410c" }}></i> SELECT MACHINE FOR OPERATION
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {unstartedPrecedingCount > 0 && machineData && (!machineData.StartTime || String(machineData.StartTime).trim() === "") && (
                        <button
                          type="button"
                          onClick={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                          disabled={actionLoading}
                          title="Bypass previous machines for rejection material"
                          style={{
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "1px solid #f97316",
                            backgroundColor: "#fff7ed",
                            color: "#ea580c",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-forward"></i> Bypass ({unstartedPrecedingCount})
                        </button>
                      )}
                      {machineData && (
                        <button
                          type="button"
                          onClick={() => onOpenSwapModal && onOpenSwapModal(machineData)}
                          disabled={actionLoading || (machineData?.StartTime && String(machineData.StartTime).trim() !== "")}
                          title={machineData?.StartTime ? "Cannot change: operation already started" : "Switch / Update machine"}
                          style={{
                            padding: "3px 10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "5px",
                            border: "1px solid #f97316",
                            backgroundColor: "#fff7ed",
                            color: "#c2410c",
                            cursor: (machineData?.StartTime && String(machineData.StartTime).trim() !== "") ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-exchange-alt"></i> Switch Machine
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenLogsModal && onOpenLogsModal(jobCard)}
                        style={{
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          color: "#475569",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <i className="fas fa-history"></i> Logs
                      </button>
                    </div>
                  </div>
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
                        {getMachineOptionLabel(m, skipMachineIds)}
                      </option>
                    ))}
                  </select>
                </div>

                {machineData && (
                  <MachineControlPanel
                    machine={machineData}
                    onStart={onStartMachine}
                    onStop={onStopMachine}
                    onPause={() => onPauseMachine && onPauseMachine(machineData)}
                    onResume={() => onResumeMachine && onResumeMachine(machineData)}
                    actionLoading={actionLoading}
                    isPrevStarted={isPrevStarted}
                    prevMachineName={prevMachineName}
                    skipMachineIds={skipMachineIds}
                    onOpenBypassModal={() => onOpenBypassModal && onOpenBypassModal(machineData)}
                    unstartedPrecedingCount={unstartedPrecedingCount}
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
  onRescan,
  skipMachineIds = "",
  onMinimize = null,
  sessionCount = 0,
  onOpenSwapModal = null,
  onOpenLogsModal = null,
  onOpenBypassModal = null,
  onPauseMachine = null,
  onResumeMachine = null
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
        skipMachineIds={skipMachineIds}
        onOpenSwapModal={onOpenSwapModal}
        onOpenLogsModal={onOpenLogsModal}
        onOpenBypassModal={onOpenBypassModal}
        onPauseMachine={onPauseMachine}
        onResumeMachine={onResumeMachine}
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
        skipMachineIds={skipMachineIds}
        onOpenSwapModal={onOpenSwapModal}
        onOpenLogsModal={onOpenLogsModal}
        onOpenBypassModal={onOpenBypassModal}
        onPauseMachine={onPauseMachine}
        onResumeMachine={onResumeMachine}
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
        skipMachineIds={skipMachineIds}
        onOpenSwapModal={onOpenSwapModal}
        onOpenLogsModal={onOpenLogsModal}
        onOpenBypassModal={onOpenBypassModal}
        onPauseMachine={onPauseMachine}
        onResumeMachine={onResumeMachine}
      />
    );
  }

  return (
    <>
      {responsiveStyles}

      {/* Minimize + Scan Another Banner */}
      {onMinimize && (
        <div style={{
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
          borderBottom: "2px solid #34d399",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600 }}>
            📋 {sessionCount} session{sessionCount !== 1 ? "s" : ""} queued — minimize to scan another
          </span>
          <button
            onClick={onMinimize}
            style={{
              background: "linear-gradient(135deg, #059669, #34d399)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 18px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(52,211,153,0.3)"
            }}
          >
            <i className="fas fa-minus-square"></i>
            Minimize &amp; Scan Another
          </button>
        </div>
      )}

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
  const [cameraFacingMode, setCameraFacingMode] = useState("user"); // "user" (front) by default, or "environment" (back)
  const cameraFacingModeRef = useRef("user");

  // ── Multi-session state ───────────────────────────────────────────────────────
  const [scannedSessions, setScannedSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null); // which session is expanded
  const activeSession = useMemo(() => {
    return scannedSessions.find(s => s.id === activeSessionId) || null;
  }, [scannedSessions, activeSessionId]);
  const [bulkStartLoading, setBulkStartLoading] = useState(false);
  const [bulkStopLoading, setBulkStopLoading] = useState(false);

  // Legacy single-session state — kept for fetchJobCardData internals
  const [jobCardData, setJobCardData] = useState(null);
  const [machineData, setMachineData] = useState(null);
  const [machineList, setMachineList] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Machine Swap & Audit Logs State ──────────────────────────────────────────
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isBulkSwap, setIsBulkSwap] = useState(false);
  const [swapTargetMachine, setSwapTargetMachine] = useState(null);
  const [allAvailableMachines, setAllAvailableMachines] = useState([]);
  const [swapMachinesLoading, setSwapMachinesLoading] = useState(false);
  const [swapSubmitLoading, setSwapSubmitLoading] = useState(false);

  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [logsJobCard, setLogsJobCard] = useState(null);
  const [machineLogsList, setMachineLogsList] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Machine Bypass State (Rejection / Pre-sized Material) ─────────────────────
  const [isBypassModalOpen, setIsBypassModalOpen] = useState(false);
  const [bypassTargetMachine, setBypassTargetMachine] = useState(null);
  const [bypassSubmitLoading, setBypassSubmitLoading] = useState(false);

  // ── Machine Pause State (Duty Off / Shift End / Break) ────────────────────────
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseTargetMachine, setPauseTargetMachine] = useState(null);
  const [pauseSubmitLoading, setPauseSubmitLoading] = useState(false);
  const [bulkPauseLoading, setBulkPauseLoading] = useState(false);

  const bypassPrecedingMachines = useMemo(() => {
    if (!bypassTargetMachine) return [];
    const list = (activeSession?.machineList && activeSession.machineList.length > 0)
      ? activeSession.machineList
      : machineList;
    const targetMasterId = String(bypassTargetMachine.F_MachineMaster || bypassTargetMachine.MachineMasterId || bypassTargetMachine.ID);
    const targetIdx = list.findIndex(m => 
      String(m.F_MachineMaster || m.MachineMasterId || m.ID) === targetMasterId ||
      String(m.ID) === String(bypassTargetMachine.ID)
    );
    if (targetIdx <= 0) return [];
    return list.slice(0, targetIdx).filter(m => !m.StartTime || String(m.StartTime).trim() === "");
  }, [bypassTargetMachine, activeSession, machineList]);

  const handleOpenBypassModal = (targetMach = null) => {
    const mach = targetMach || machineData || activeSession?.machineData;
    if (!mach) return;
    setBypassTargetMachine(mach);
    setIsBypassModalOpen(true);
  };

  const handleCloseBypassModal = () => {
    setIsBypassModalOpen(false);
    setBypassTargetMachine(null);
  };

  const handleSubmitMachineBypass = async (reason) => {
    const mach = bypassTargetMachine || machineData || activeSession?.machineData;
    if (!mach) {
      alert("Target machine is not selected.");
      return;
    }

    const jc = jobCardData || activeSession?.jobCardData;
    const jcId = jc?.ID || jc?.Id || mach.F_JobCardMaster || "0";
    const targetMachMasterId = mach.F_MachineMaster || mach.MachineMasterId || mach.ID || mach.Id;

    if (!jcId || jcId === "0") {
      alert("Job Card ID is missing.");
      return;
    }

    setBypassSubmitLoading(true);
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      const userId = authUser?.id || authUser?.ID || "0";
      const userName = authUser?.name || authUser?.username || "Operator";
      const headers = getAuthHeaders();

      const payload = {
        JobCardMasterId: parseInt(jcId, 10),
        TargetMachineMasterId: parseInt(targetMachMasterId, 10),
        Reason: reason || "Rejection Material Re-use (Scrap / Offcut Wood)"
      };

      const res = await axios.post(
        `${API_WEB_URLS.BASE}${API_WEB_URLS.BYPASS_PRECEDING_MACHINES}/${userId}/token`,
        payload,
        { headers }
      );

      if (res?.data?.Success || res?.data?.success || res?.status === 200) {
        const bypassedCount = res?.data?.BypassedCount ?? (res?.data?.bypassedCount ?? 0);
        const nowIso = new Date().toISOString();

        // Target machine in current machine list
        const currentList = (activeSession?.machineList && activeSession.machineList.length > 0)
          ? activeSession.machineList
          : machineList;

        const targetIdx = currentList.findIndex(m => 
          String(m.F_MachineMaster || m.MachineMasterId || m.ID) === String(targetMachMasterId) ||
          String(m.ID) === String(mach.ID)
        );

        const updateBypassedItem = (m, idx) => {
          if (targetIdx > 0 && idx >= 0 && idx < targetIdx && (!m.StartTime || String(m.StartTime).trim() === "")) {
            return {
              ...m,
              StartTime: nowIso,
              EndTime: nowIso,
              IsBypassed: 1,
              BypassReason: reason,
              UserName: `BYPASS: ${userName}`
            };
          }
          return m;
        };

        const updatedList = currentList.map(updateBypassedItem);

        // Update single state
        setMachineList(updatedList);
        const updatedTargetMach = updatedList[targetIdx] || mach;
        setMachineData(updatedTargetMach);

        // Update active session state if multi-session active
        if (activeSessionId) {
          setScannedSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
              const sTargetIdx = (s.machineList || []).findIndex(m => 
                String(m.F_MachineMaster || m.MachineMasterId || m.ID) === String(targetMachMasterId) ||
                String(m.ID) === String(mach.ID)
              );
              const sUpdatedList = (s.machineList || []).map((m, idx) => {
                if (sTargetIdx > 0 && idx >= 0 && idx < sTargetIdx && (!m.StartTime || String(m.StartTime).trim() === "")) {
                  return {
                    ...m,
                    StartTime: nowIso,
                    EndTime: nowIso,
                    IsBypassed: 1,
                    BypassReason: reason,
                    UserName: `BYPASS: ${userName}`
                  };
                }
                return m;
              });

              return {
                ...s,
                machineList: sUpdatedList,
                machineData: sUpdatedList[sTargetIdx] || s.machineData
              };
            }
            return s;
          }));
        }

        alert(`✅ Successfully bypassed ${bypassedCount} preceding machine(s) for rejection material! You can now start ${mach.MachineName || "the target machine"}.`);
        setIsBypassModalOpen(false);
        setBypassTargetMachine(null);
      } else {
        alert(res?.data?.Message || "Failed to bypass preceding machines.");
      }
    } catch (err) {
      console.error("Machine bypass error:", err);
      const errMsg = err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Failed to bypass preceding machines.";
      alert(`❌ Error: ${errMsg}`);
    } finally {
      setBypassSubmitLoading(false);
    }
  };

  // ── Machine Pause Handlers (Shift End / Duty Off / Breaks) ────────────────────
  const handleOpenPauseModal = (targetMach = null) => {
    const mach = targetMach || machineData || activeSession?.machineData;
    if (!mach) return;
    setPauseTargetMachine(mach);
    setIsPauseModalOpen(true);
  };

  const handleClosePauseModal = () => {
    setIsPauseModalOpen(false);
    setPauseTargetMachine(null);
  };

  const handleConfirmPauseMachine = async (reason) => {
    const mach = pauseTargetMachine || machineData || activeSession?.machineData;
    if (!mach) {
      alert("No machine selected to pause.");
      return;
    }
    const jc = jobCardData || activeSession?.jobCardData;
    const jcId = jc?.ID || jc?.Id || mach.F_JobCardMaster || "0";
    const machMasterId = mach.F_MachineMaster || mach.MachineMasterId || mach.ID || mach.Id;

    if (!jcId || jcId === "0" || !machMasterId) {
      alert("Job Card or Machine identification is missing.");
      return;
    }

    setPauseSubmitLoading(true);
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      const userId = authUser?.id || authUser?.ID || "0";
      const userName = authUser?.name || authUser?.username || "Operator";
      const headers = getAuthHeaders();

      const payload = {
        JobCardMasterId: parseInt(jcId, 10),
        MachineMasterId: parseInt(machMasterId, 10),
        Reason: reason || "Shift End / Duty Off",
        UserName: userName
      };

      const res = await axios.post(
        `${API_WEB_URLS.BASE}${API_WEB_URLS.PAUSE_MACHINE}/${userId}/token`,
        payload,
        { headers }
      );

      if (res?.data?.Success || res?.data?.success || res?.status === 200) {
        const nowIso = new Date().toISOString();
        const updatedMach = {
          ...mach,
          IsPaused: 1,
          CurrentPauseStartTime: nowIso,
          CurrentPauseReason: reason || "Shift End / Duty Off",
          PausedByUserName: userName
        };

        setMachineData(updatedMach);
        setMachineList(prevList => prevList.map(m =>
          (String(m.F_MachineMaster || m.ID) === String(machMasterId) || String(m.ID) === String(mach.ID))
            ? { ...m, ...updatedMach }
            : m
        ));

        if (activeSessionId) {
          setScannedSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                machineData: updatedMach,
                machineList: (s.machineList || []).map(m =>
                  (String(m.F_MachineMaster || m.ID) === String(machMasterId) || String(m.ID) === String(mach.ID))
                    ? { ...m, ...updatedMach }
                    : m
                )
              };
            }
            return s;
          }));
        }

        handleClosePauseModal();
        alert("Machine operation paused successfully! It will not count as running overnight.");
      } else {
        alert(res?.data?.Message || "Failed to pause machine.");
      }
    } catch (err) {
      console.error("Error pausing machine:", err);
      alert(err?.response?.data?.Message || err?.message || "Failed to pause machine.");
    } finally {
      setPauseSubmitLoading(false);
    }
  };

  const handleResumeMachine = async (targetMach = null) => {
    const mach = targetMach || machineData || activeSession?.machineData;
    if (!mach || actionLoading) return;

    const jc = jobCardData || activeSession?.jobCardData;
    const jcId = jc?.ID || jc?.Id || mach.F_JobCardMaster || "0";
    const machMasterId = mach.F_MachineMaster || mach.MachineMasterId || mach.ID || mach.Id;

    if (!jcId || jcId === "0" || !machMasterId) {
      alert("Job Card or Machine identification is missing.");
      return;
    }

    if (!window.confirm(`Resume work on ${mach.MachineName || "this machine"} for Job Card ${jc?.JobCardNo || ""}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      const userId = authUser?.id || authUser?.ID || "0";
      const userName = authUser?.name || authUser?.username || "Operator";
      const headers = getAuthHeaders();

      const payload = {
        JobCardMasterId: parseInt(jcId, 10),
        MachineMasterId: parseInt(machMasterId, 10),
        UserName: userName
      };

      const res = await axios.post(
        `${API_WEB_URLS.BASE}${API_WEB_URLS.RESUME_MACHINE}/${userId}/token`,
        payload,
        { headers }
      );

      if (res?.data?.Success || res?.data?.success || res?.status === 200) {
        const addedMins = res?.data?.Data?.Response?.AddedPauseMinutes || 0;
        const currentTotal = Number(mach.TotalPauseTime) || 0;

        const updatedMach = {
          ...mach,
          IsPaused: 0,
          CurrentPauseStartTime: null,
          CurrentPauseReason: null,
          TotalPauseTime: currentTotal + addedMins
        };

        setMachineData(updatedMach);
        setMachineList(prevList => prevList.map(m =>
          (String(m.F_MachineMaster || m.ID) === String(machMasterId) || String(m.ID) === String(mach.ID))
            ? { ...m, ...updatedMach }
            : m
        ));

        if (activeSessionId) {
          setScannedSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                machineData: updatedMach,
                machineList: (s.machineList || []).map(m =>
                  (String(m.F_MachineMaster || m.ID) === String(machMasterId) || String(m.ID) === String(mach.ID))
                    ? { ...m, ...updatedMach }
                    : m
                )
              };
            }
            return s;
          }));
        }

        alert("Machine resumed successfully! Active runtime timer restarted.");
      } else {
        alert(res?.data?.Message || "Failed to resume machine.");
      }
    } catch (err) {
      console.error("Error resuming machine:", err);
      alert(err?.response?.data?.Message || err?.message || "Failed to resume machine.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkPauseAll = async () => {
    const unpausedRunning = scannedSessions.filter(s => {
      if (!s.machineData) return false;
      const isStarted = !!(s.machineData.StartTime && String(s.machineData.StartTime).trim() !== "");
      const isStopped = !!(s.machineData.EndTime && String(s.machineData.EndTime).trim() !== "");
      const isPaused = !!(s.machineData.IsPaused === 1 || s.machineData.IsPaused === true || s.machineData.IsPaused === "1");
      return isStarted && !isStopped && !isPaused;
    });

    if (unpausedRunning.length === 0) return;

    if (!window.confirm(`Pause all ${unpausedRunning.length} active running machines for Shift End / Duty Off?`)) {
      return;
    }

    setBulkPauseLoading(true);
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      const userId = authUser?.id || authUser?.ID || "0";
      const userName = authUser?.name || authUser?.username || "Operator";
      const headers = getAuthHeaders();
      const nowIso = new Date().toISOString();

      for (const s of unpausedRunning) {
        const jcId = s.jobCardData?.ID || s.jobCardData?.Id || s.machineData?.F_JobCardMaster || "0";
        const machMasterId = s.machineData?.F_MachineMaster || s.machineData?.MachineMasterId || s.machineData?.ID;
        if (jcId && machMasterId) {
          try {
            await axios.post(
              `${API_WEB_URLS.BASE}${API_WEB_URLS.PAUSE_MACHINE}/${userId}/token`,
              {
                JobCardMasterId: parseInt(jcId, 10),
                MachineMasterId: parseInt(machMasterId, 10),
                Reason: "Shift End / Duty Off",
                UserName: userName
              },
              { headers }
            );
          } catch (e) {
            console.error("Bulk pause error for session", s.id, e);
          }
        }
      }

      setScannedSessions(prev => prev.map(s => {
        const isTarget = unpausedRunning.some(ur => ur.id === s.id);
        if (isTarget && s.machineData) {
          return {
            ...s,
            machineData: {
              ...s.machineData,
              IsPaused: 1,
              CurrentPauseStartTime: nowIso,
              CurrentPauseReason: "Shift End / Duty Off",
              PausedByUserName: userName
            }
          };
        }
        return s;
      }));

      if (machineData && (!machineData.EndTime) && machineData.StartTime) {
        setMachineData(prev => ({
          ...prev,
          IsPaused: 1,
          CurrentPauseStartTime: nowIso,
          CurrentPauseReason: "Shift End / Duty Off",
          PausedByUserName: userName
        }));
      }

      alert(`Successfully paused ${unpausedRunning.length} active machine(s) for Shift End!`);
    } catch (err) {
      console.error("Bulk pause error:", err);
      alert("Error while pausing machines: " + (err.message || err));
    } finally {
      setBulkPauseLoading(false);
    }
  };

  const handleOpenSwapModal = async (machine, isBulk = false) => {
    if (!machine) return;
    if (!isBulk) {
      setIsBulkSwap(false);
    }
    setSwapTargetMachine(machine);
    setIsSwapModalOpen(true);
    setSwapMachinesLoading(true);

    const headers = getAuthHeaders();
    let machineOptions = [];

    // Attempt 1: Call JobCardMachineSwap/AvailableMachines with auth
    try {
      const resp = await axios.get(
        `${API_WEB_URLS.BASE}JobCardMachineSwap/AvailableMachines/0/token`,
        { headers }
      );
      const list =
        resp?.data?.Data?.response ||
        resp?.data?.data?.response ||
        resp?.data?.response ||
        resp?.data?.Data?.DataList ||
        resp?.data?.dataList ||
        resp?.data?.data ||
        resp?.data;
      if (Array.isArray(list) && list.length > 0) {
        machineOptions = list;
      }
    } catch (err) {
      console.warn("AvailableMachines endpoint failed or returned error, attempting fallback to MachineMaster:", err);
    }

    // Attempt 2: Standard MachineMaster endpoint with auth headers
    if (!machineOptions || machineOptions.length === 0) {
      try {
        const fallbackResp = await axios.get(
          `${API_WEB_URLS.BASE}${API_WEB_URLS.MASTER}/0/token/MachineMaster/Id/0`,
          { headers }
        );
        const fList =
          fallbackResp?.data?.Data?.DataList ||
          fallbackResp?.data?.data?.dataList ||
          fallbackResp?.data?.dataList ||
          fallbackResp?.data?.data?.response ||
          fallbackResp?.data?.response ||
          fallbackResp?.data;
        if (Array.isArray(fList) && fList.length > 0) {
          machineOptions = fList;
        }
      } catch (e) {
        console.warn("MachineMaster fallback failed:", e);
      }
    }

    // Attempt 3: In-memory machines from current job card / session
    if (!machineOptions || machineOptions.length === 0) {
      const stateMachines = (machineList && machineList.length > 0)
        ? machineList
        : (activeSession?.machineList && activeSession.machineList.length > 0)
          ? activeSession.machineList
          : [];
      if (stateMachines.length > 0) {
        machineOptions = stateMachines;
      }
    }

    // Normalize machine records so ID, Name, MachineNo are guaranteed
    const normalized = (machineOptions || []).map(m => {
      const rawId = m.ID ?? m.Id ?? m.id ?? m.F_MachineMaster ?? m.MachineId ?? m.MachineMasterId;
      const rawName = m.Name || m.MachineName || m.name || (m.MachineNo ? `Machine ${m.MachineNo}` : `Machine #${rawId}`);
      const rawNo = m.MachineNo || m.Code || m.code || m.machineno || "";
      const rawEngaged = m.EngagedJobCardNo || "";
      return {
        ...m,
        ID: rawId,
        Id: rawId,
        Name: rawName,
        MachineName: rawName,
        MachineNo: rawNo,
        EngagedJobCardNo: rawEngaged
      };
    }).filter(m => m.ID != null && String(m.ID).trim() !== "");

    setAllAvailableMachines(normalized);
    setSwapMachinesLoading(false);
  };

  const handleOpenBulkSwapModal = () => {
    if (scannedSessions.length < 2) return;
    const firstMachine = scannedSessions[0]?.machineData;
    if (!firstMachine) return;
    setIsBulkSwap(true);
    handleOpenSwapModal(firstMachine, true);
  };

  const handleCloseSwapModal = () => {
    setIsSwapModalOpen(false);
    setSwapTargetMachine(null);
    setIsBulkSwap(false);
  };

  const handleSubmitMachineSwap = async (targetMachineId, reasonCategory, customReason) => {
    if (!targetMachineId) {
      alert("Please select a target machine.");
      return;
    }

    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userName = authUser?.name || authUser?.username || authUser?.fullName || "Operator";
    const userId = authUser?.id || authUser?.ID || "0";

    // ── Bulk Switch Mode ──────────────────────────────────────────────────────
    if (isBulkSwap) {
      const allHaveMachine = scannedSessions.every(s => !!s.machineData);
      const firstMachineId = scannedSessions[0]?.machineData
        ? String(scannedSessions[0].machineData.F_MachineMaster || scannedSessions[0].machineData.ID || "")
        : null;
      const allSameMachine = allHaveMachine && scannedSessions.every(s => {
        const mid = String(s.machineData.F_MachineMaster || s.machineData.ID || "");
        return mid === firstMachineId;
      });
      const noneStarted = scannedSessions.every(s =>
        !s.machineData?.StartTime || String(s.machineData.StartTime).trim() === ""
      );

      if (!allHaveMachine || !allSameMachine || !noneStarted) {
        alert("Bulk switch requirement violated: All sessions must have the same unstarted machine selected.");
        return;
      }

      const reasonText = customReason && customReason.trim()
        ? `[Bulk Switch] ${reasonCategory}: ${customReason.trim()}`
        : `[Bulk Switch] ${reasonCategory}`;

      setSwapSubmitLoading(true);
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const updatedSessionIds = [];

      try {
        const headers = getAuthHeaders();
        const newMachObj = allAvailableMachines.find(m => String(m.ID ?? m.Id) === String(targetMachineId));
        let resolvedNewMachineName = newMachObj?.Name || newMachObj?.MachineName || "Selected Machine";
        let resolvedNewMachineNo = newMachObj?.MachineNo || "";

        for (const session of scannedSessions) {
          try {
            const lineId = session.machineData.ID ?? session.machineData.Id;
            const jcId = session.machineData.F_JobCardMaster || session.jobCardData?.ID || session.jobCardData?.Id || "0";

            const vFormData = new FormData();
            vFormData.append("JobCardLineId", lineId);
            vFormData.append("F_JobCardMaster", jcId);
            vFormData.append("NewMachineId", targetMachineId);
            vFormData.append("Reason", reasonText);
            vFormData.append("ChangedByUserName", userName);

            const res = await axios.post(
              `${API_WEB_URLS.BASE}JobCardMachineSwap/UpdateMachine/${userId}/token`,
              vFormData,
              { headers }
            );

            if (res?.data?.Success || res?.data?.success || res?.status === 200) {
              successCount++;
              updatedSessionIds.push(session.id);
              if (res?.data?.Data?.NewMachineName) {
                resolvedNewMachineName = res.data.Data.NewMachineName;
              }
              if (res?.data?.Data?.NewMachineNo) {
                resolvedNewMachineNo = res.data.Data.NewMachineNo;
              }
            } else {
              errorCount++;
              errors.push(`${session.jobCardData?.JobCardNo || session.label}: ${res?.data?.Message || "Failed"}`);
            }
          } catch (itemErr) {
            errorCount++;
            const errMsg = itemErr?.response?.data?.Message || itemErr?.response?.data?.message || itemErr?.message || "Failed";
            errors.push(`${session.jobCardData?.JobCardNo || session.label}: ${errMsg}`);
          }
        }

        // Apply state updates for all sessions that succeeded
        if (successCount > 0) {
          setScannedSessions(prev => prev.map(s => {
            if (updatedSessionIds.includes(s.id) && s.machineData) {
              const lineId = s.machineData.ID ?? s.machineData.Id;
              const updatedMachine = {
                ...s.machineData,
                F_MachineMaster: targetMachineId,
                MachineName: resolvedNewMachineName,
                MachineNo: resolvedNewMachineNo,
                StartTime: null,
                EndTime: null,
                StartDate: null,
                EndDate: null,
              };

              return {
                ...s,
                selectedMachineId: String(targetMachineId),
                machineData: updatedMachine,
                machineList: (s.machineList || []).map(m =>
                  String(m.ID ?? m.Id) === String(lineId) ? updatedMachine : m
                )
              };
            }
            return s;
          }));

          // If active session was in the updated list, keep legacy single state synced
          if (activeSessionId && updatedSessionIds.includes(activeSessionId)) {
            setSelectedMachineId(String(targetMachineId));
            if (machineData) {
              setMachineData(prev => ({
                ...prev,
                F_MachineMaster: targetMachineId,
                MachineName: resolvedNewMachineName,
                MachineNo: resolvedNewMachineNo,
                StartTime: null,
                EndTime: null,
                StartDate: null,
                EndDate: null,
              }));
            }
            if (machineList && machineList.length > 0) {
              setMachineList(prevList => prevList.map(m =>
                String(m.ID ?? m.Id) === String(swapTargetMachine?.ID ?? swapTargetMachine?.Id)
                  ? {
                      ...m,
                      F_MachineMaster: targetMachineId,
                      MachineName: resolvedNewMachineName,
                      MachineNo: resolvedNewMachineNo,
                      StartTime: null,
                      EndTime: null,
                      StartDate: null,
                      EndDate: null,
                    }
                  : m
              ));
            }
          }

          if (errorCount === 0) {
            alert(`✅ Bulk machine switch successful! All ${successCount} job cards updated to '${resolvedNewMachineName}'.`);
          } else {
            alert(`⚠️ Bulk machine switch finished with partial results:\n- ${successCount} succeeded\n- ${errorCount} failed\n\nErrors:\n${errors.join("\n")}`);
          }

          setIsSwapModalOpen(false);
          setSwapTargetMachine(null);
          setIsBulkSwap(false);
        } else {
          alert(`❌ Bulk machine switch failed for all job cards:\n${errors.join("\n")}`);
        }
      } catch (err) {
        console.error("Bulk machine swap unexpected error:", err);
        alert(`❌ Unexpected error during bulk machine switch: ${err?.message || "Failed"}`);
      } finally {
        setSwapSubmitLoading(false);
      }
      return;
    }

    // ── Single Switch Mode ────────────────────────────────────────────────────
    if (!swapTargetMachine) {
      alert("Please select a target machine.");
      return;
    }

    if (swapTargetMachine.StartTime && String(swapTargetMachine.StartTime).trim() !== "") {
      alert("Cannot change machine: this operation has already started or completed.");
      return;
    }

    const reasonText = customReason && customReason.trim()
      ? `${reasonCategory}: ${customReason.trim()}`
      : reasonCategory;

    setSwapSubmitLoading(true);
    try {
      const lineId = swapTargetMachine.ID ?? swapTargetMachine.Id;
      const jcId = swapTargetMachine.F_JobCardMaster || jobCardData?.ID || jobCardData?.Id || "0";

      const vFormData = new FormData();
      vFormData.append("JobCardLineId", lineId);
      vFormData.append("F_JobCardMaster", jcId);
      vFormData.append("NewMachineId", targetMachineId);
      vFormData.append("Reason", reasonText);
      vFormData.append("ChangedByUserName", userName);

      const headers = getAuthHeaders();
      const res = await axios.post(
        `${API_WEB_URLS.BASE}JobCardMachineSwap/UpdateMachine/${userId}/token`,
        vFormData,
        { headers }
      );
      if (res?.data?.Success || res?.data?.success || res?.status === 200) {
        const newMachObj = allAvailableMachines.find(m => String(m.ID ?? m.Id) === String(targetMachineId));
        const newMachineName = res?.data?.Data?.NewMachineName || newMachObj?.Name || newMachObj?.MachineName || "Selected Machine";
        const newMachineNo = res?.data?.Data?.NewMachineNo || newMachObj?.MachineNo || "";

        const updatedMachine = {
          ...swapTargetMachine,
          F_MachineMaster: targetMachineId,
          MachineName: newMachineName,
          MachineNo: newMachineNo,
          StartTime: null,
          EndTime: null,
          StartDate: null,
          EndDate: null,
        };

        setMachineData(updatedMachine);
        setSelectedMachineId(String(targetMachineId));

        const matchId = swapTargetMachine.ID ?? swapTargetMachine.Id;
        setMachineList(prevList => prevList.map(m =>
          String(m.ID ?? m.Id) === String(matchId) ? updatedMachine : m
        ));

        setScannedSessions(prev => prev.map(s => {
          const matchLine = s.machineList?.find(m => String(m.ID ?? m.Id) === String(matchId));
          if (matchLine) {
            return {
              ...s,
              selectedMachineId: String(targetMachineId),
              machineData: updatedMachine,
              machineList: s.machineList.map(m => String(m.ID ?? m.Id) === String(matchId) ? updatedMachine : m)
            };
          }
          return s;
        }));

        alert(`✅ Machine updated successfully to '${newMachineName}'!`);
        setIsSwapModalOpen(false);
        setSwapTargetMachine(null);
      } else {
        alert(res?.data?.Message || res?.data?.message || "Failed to update machine.");
      }
    } catch (err) {
      console.error("Machine swap error:", err);
      const errMsg = err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Failed to update machine.";
      alert(errMsg);
    } finally {
      setSwapSubmitLoading(false);
    }
  };

  const handleOpenLogsModal = async (jc) => {
    const targetJc = jc || (activeSession ? activeSession.jobCardData : null) || jobCardData;
    const jcId =
      targetJc?.ID ??
      targetJc?.Id ??
      targetJc?.F_JobCardMaster ??
      targetJc?.JobCardMasterId ??
      targetJc?.JobCardId ??
      targetJc?.JobCardNo ??
      jobCardData?.ID ??
      jobCardData?.Id ??
      parsedIds?.F_JobCardMaster ??
      "0";

    if (!jcId || String(jcId).trim() === "0" || String(jcId).trim() === "") {
      alert("Job Card details not found.");
      return;
    }

    setLogsJobCard(targetJc || jobCardData);
    setIsLogsModalOpen(true);
    setLogsLoading(true);

    try {
      const headers = getAuthHeaders();
      const res = await axios.get(
        `${API_WEB_URLS.BASE}JobCardMachineSwap/GetMachineChangeLogs/0/token/${encodeURIComponent(String(jcId).trim())}`,
        { headers }
      );
      const logs =
        res?.data?.Data?.response ||
        res?.data?.data?.response ||
        res?.data?.response ||
        res?.data?.Data?.DataList ||
        res?.data?.dataList ||
        res?.data?.Data ||
        res?.data?.data ||
        res?.data ||
        [];
      setMachineLogsList(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error("Failed to load machine change logs:", err);
      setMachineLogsList([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCloseLogsModal = () => {
    setIsLogsModalOpen(false);
    setLogsJobCard(null);
  };

  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [parsedIds, setParsedIds] = useState(null);
  const [scanMode, setScanMode] = useState("camera"); // "camera" | "file"
  const [actionLoading, setActionLoading] = useState(false);
  const [skipMachineIds, setSkipMachineIds] = useState("");
  const skipMachineIdsRef = useRef(""); // ref to avoid stale closure in callbacks
  const fileInputRef = useRef(null);

  const qrCodeRef = useRef(null);
  const isCameraActiveRef = useRef(false);
  const isScanningRef = useRef(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const API_URL_JOBCARD   = "GetJobCard/0/token";
  const API_URL_JOBCARDL  = "GetJobCardL/0/token";

  // Helper to format date to SQL server format YYYY-MM-DDTHH:mm:ss (SSMS format)
  const getFormattedDateTime = () => {
    const date = new Date();
    const pad = (num) => String(num).padStart(2, "0");
    
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
  };

  // ── Session helpers ───────────────────────────────────────────────────────────

  /** Per-session machine select */
  const handleMachineSelectForSession = (sessionId, machineId) => {
    setScannedSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const matched = s.machineList.find(m => String(m.ID) === String(machineId));
      return { ...s, selectedMachineId: machineId, machineData: matched || null };
    }));
    // Also keep legacy state in sync for the active session
    if (sessionId === activeSessionId) {
      setSelectedMachineId(machineId);
      setMachineData(scannedSessions.find(s => s.id === sessionId)?.machineList.find(m => String(m.ID) === String(machineId)) || null);
    }
  };

  /** Minimize current active session and restart camera for next scan */
  const handleMinimizeAndScanAnother = (sessionId) => {
    // Minimize the current session (Unlimited sessions allowed)
    setScannedSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, isMinimized: true } : s
    ));
    setActiveSessionId(null);
    // Clear legacy single-session state
    setJobCardData(null);
    setMachineData(null);
    setMachineList([]);
    setSelectedMachineId("");
    setParsedIds(null);
    setFetchError(null);
    setLastScanned(null);
    // Restart camera
    startCamera(true);
  };

  /** Expand a minimized session */
  const handleExpandSession = (sessionId) => {
    const session = scannedSessions.find(s => s.id === sessionId);
    if (!session) return;
    // Stop camera if active
    if (isCameraActiveRef.current) {
      stopCamera();
    }
    setScannedSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, isMinimized: false } : s
    ));
    setActiveSessionId(sessionId);
    // Sync legacy state
    setJobCardData(session.jobCardData);
    setMachineData(session.machineData);
    setMachineList(session.machineList);
    setSelectedMachineId(session.selectedMachineId);
    setParsedIds(session.parsedIds);
  };

  /** Remove a session */
  const handleRemoveSession = (sessionId) => {
    setScannedSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setJobCardData(null);
      setMachineData(null);
      setMachineList([]);
      setSelectedMachineId("");
      setParsedIds(null);
    }
  };

  /** Start all sessions that have a pending machine (skip busy ones) */
  const handleBulkStartAll = async () => {
    const shouldSkipValidation = (mach, skipListString) => {
      if (!mach || !skipListString) return false;
      const machId = mach.F_MachineMaster || mach.ID;
      const list = skipListString.split(',').map(x => x.trim());
      return list.includes(String(machId));
    };

    const currentSkipIds = skipMachineIdsRef.current;
    const pendingSessions = scannedSessions.filter(s => {
      if (!s.machineData) return false;
      if (s.machineData.StartTime && String(s.machineData.StartTime).trim() !== "") return false;
      return true;
    });

    if (pendingSessions.length === 0) {
      alert("No pending machines to start.");
      return;
    }

    setBulkStartLoading(true);
    const skippedLabels = [];
    const failedLabels = [];
    let startedCount = 0;

    for (const session of pendingSessions) {
      const mach = session.machineData;
      const isEngagedElsewhere = mach.EngagedJobCardNo &&
        String(mach.EngagedJobCardNo).trim() !== "" &&
        !shouldSkipValidation(mach, currentSkipIds);

      if (isEngagedElsewhere) {
        skippedLabels.push(`${session.label} (Machine busy on ${mach.EngagedJobCardNo})`);
        continue;
      }

      try {
        const user = JSON.parse(localStorage.getItem("authUser"));
        const nowStr = getFormattedDateTime();
        const vFormData = new FormData();
        vFormData.append("F_JobCardMaster", mach.F_JobCardMaster || session.jobCardData?.ID || session.parsedIds?.F_JobCardMaster || "");
        vFormData.append("F_MachineMaster", mach.F_MachineMaster || session.parsedIds?.F_MachineMaster || session.selectedMachineId || "");
        vFormData.append("NewDate", nowStr);
        vFormData.append("Type", "1");

        await Fn_AddEditData(
          dispatch,
          (s) => {},
          { arguList: { id: 0, formData: vFormData } },
          "UpdateTransferDateByJobCard/0/token",
          true,
          "Id",
          () => {},
          "#"
        );

        const updatedMach = { ...mach, StartTime: nowStr, StartDate: nowStr };
        setScannedSessions(prev => prev.map(s =>
          s.id === session.id
            ? { ...s, machineData: updatedMach, machineList: s.machineList.map(m => String(m.ID) === String(mach.ID) ? updatedMach : m) }
            : s
        ));
        if (activeSessionId === session.id) {
          setMachineData(updatedMach);
          setMachineList(prev => prev.map(m => String(m.ID) === String(mach.ID) ? updatedMach : m));
        }
        startedCount++;
      } catch (err) {
        failedLabels.push(session.label);
      }
    }

    setBulkStartLoading(false);

    let msg = `✅ Started ${startedCount} machine(s).`;
    if (skippedLabels.length > 0) msg += `\n\n⚠️ Skipped (machine busy):\n${skippedLabels.join('\n')}`;
    if (failedLabels.length > 0) msg += `\n\n❌ Failed:\n${failedLabels.join('\n')}`;
    alert(msg);
  };

  /** Stop all sessions that are currently running (have StartTime but no EndTime) */
  const handleBulkStopAll = async () => {
    const runningSessions = scannedSessions.filter(s => {
      if (!s.machineData) return false;
      const isStarted = !!(s.machineData.StartTime && String(s.machineData.StartTime).trim() !== "");
      const isStopped = !!(s.machineData.EndTime && String(s.machineData.EndTime).trim() !== "");
      return isStarted && !isStopped;
    });

    if (runningSessions.length === 0) {
      alert("No running machines to stop.");
      return;
    }

    setBulkStopLoading(true);
    const failedLabels = [];
    let stoppedCount = 0;

    for (const session of runningSessions) {
      const mach = session.machineData;
      try {
        const nowStr = getFormattedDateTime();
        const vFormData = new FormData();
        vFormData.append("F_JobCardMaster", mach.F_JobCardMaster || session.jobCardData?.ID || session.parsedIds?.F_JobCardMaster || "");
        vFormData.append("F_MachineMaster", mach.F_MachineMaster || session.parsedIds?.F_MachineMaster || session.selectedMachineId || "");
        vFormData.append("NewDate", nowStr);
        vFormData.append("Type", "2");

        await Fn_AddEditData(
          dispatch,
          (s) => {},
          { arguList: { id: 0, formData: vFormData } },
          "UpdateTransferDateByJobCard/0/token",
          true,
          "Id",
          () => {},
          "#"
        );

        const updatedMach = { ...mach, EndTime: nowStr, EndDate: nowStr };
        setScannedSessions(prev => prev.map(s =>
          s.id === session.id
            ? { ...s, machineData: updatedMach, machineList: s.machineList.map(m => String(m.ID) === String(mach.ID) ? updatedMach : m) }
            : s
        ));

        if (activeSessionId === session.id) {
          setMachineData(updatedMach);
          setMachineList(prev => prev.map(m => String(m.ID) === String(mach.ID) ? updatedMach : m));
        }

        stoppedCount++;
      } catch (err) {
        failedLabels.push(session.label);
      }
    }

    setBulkStopLoading(false);

    let msg = `✅ Stopped ${stoppedCount} machine(s).`;
    if (failedLabels.length > 0) msg += `\n\n❌ Failed:\n${failedLabels.join('\n')}`;
    alert(msg);
  };

  // Legacy single-session machine select (used when no multi-session active)
  const handleMachineSelect = (machineId) => {
    if (activeSessionId) {
      handleMachineSelectForSession(activeSessionId, machineId);
    } else {
      setSelectedMachineId(machineId);
      const matched = machineList.find(m => String(m.ID) === String(machineId));
      setMachineData(matched || null);
    }
  };

  const handleStartMachine = async () => {
    if (!machineData || actionLoading) return;

    // Programmatic Validation: Check if machine is busy with another job card
    const shouldSkipValidation = (mach, skipListString) => {
      if (!mach || !skipListString) return false;
      const machId = mach.F_MachineMaster || mach.ID || mach.Id || mach.MachineId || mach.MachineMasterId;
      const list = skipListString.split(',').map(x => x.trim());
      return list.includes(String(machId));
    };

    // Use ref here to avoid stale closure — skipMachineIds from closure may be empty
    const currentSkipIds = skipMachineIdsRef.current;
    console.log("handleStartMachine: skipMachineIds from ref:", currentSkipIds);
    const isEngagedElsewhere = machineData.EngagedJobCardNo && 
                               String(machineData.EngagedJobCardNo).trim() !== "" &&
                               !shouldSkipValidation(machineData, currentSkipIds);
              
    if (isEngagedElsewhere) {
      alert(`This machine is currently active on Job Card No: ${machineData.EngagedJobCardNo}. Please end that operation first.`);
      return;
    }

    // Programmatic Validation: Check if preceding machine has started
    const currentIndex = (machineList || []).findIndex(m => String(m.ID) === String(machineData.ID));
    const prevMachine = currentIndex > 0 ? machineList[currentIndex - 1] : null;
    const isPrevStarted = currentIndex > 0 
      ? (prevMachine && prevMachine.StartTime && String(prevMachine.StartTime).trim() !== "") 
      : true;
    if (!isPrevStarted) {
      alert(`Please start the previous machine (${prevMachine?.MachineName || "preceding machine"}) first.`);
      return;
    }

    setActionLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("authUser"));
      const nowStr = getFormattedDateTime();
      
      const vFormData = new FormData();
      vFormData.append("F_JobCardMaster", machineData.F_JobCardMaster || jobCardData?.ID || parsedIds?.F_JobCardMaster || "");
      vFormData.append("F_MachineMaster", machineData.F_MachineMaster || parsedIds?.F_MachineMaster || selectedMachineId || "");
      vFormData.append("NewDate", nowStr);
      vFormData.append("Type", "1");

      console.log("--- handleStartMachine: Appended Form Data ---");
      for (let [key, val] of vFormData.entries()) {
        console.log(`${key}:`, val);
      }

      await Fn_AddEditData(
        dispatch,
        (s) => {}, // Dummy state setter
        { arguList: { id: 0, formData: vFormData } },
        "UpdateTransferDateByJobCard/0/token",
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
      if (activeSessionId) {
        setScannedSessions(prev => prev.map(s =>
          s.id === activeSessionId
            ? { ...s, machineData: updatedData, machineList: s.machineList.map(m => String(m.ID) === String(machineData.ID) ? updatedData : m) }
            : s
        ));
      }
      
      alert("Machine started successfully!");
    } catch (err) {
      console.error("Error starting machine:", err);
      let errMsg = "Failed to start machine. Please try again.";
      if (err?.response?.data?.Message) {
        errMsg = err.response.data.Message;
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err?.message) {
        errMsg = err.message;
      } else if (typeof err === "string") {
        errMsg = err;
      }
      alert(errMsg);
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
      vFormData.append("F_JobCardMaster", machineData.F_JobCardMaster || jobCardData?.ID || parsedIds?.F_JobCardMaster || "");
      vFormData.append("F_MachineMaster", machineData.F_MachineMaster || parsedIds?.F_MachineMaster || selectedMachineId || "");
      vFormData.append("NewDate", nowStr);
      vFormData.append("Type", "2");

      console.log("--- handleStopMachine: Appended Form Data ---");
      for (let [key, val] of vFormData.entries()) {
        console.log(`${key}:`, val);
      }

      await Fn_AddEditData(
        dispatch,
        (s) => {}, // Dummy state setter
        { arguList: { id: 0, formData: vFormData } },
        "UpdateTransferDateByJobCard/0/token",
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
      if (activeSessionId) {
        setScannedSessions(prev => prev.map(s =>
          s.id === activeSessionId
            ? { ...s, machineData: updatedData, machineList: s.machineList.map(m => String(m.ID) === String(machineData.ID) ? updatedData : m) }
            : s
        ));
      }
      
      alert("Machine stopped successfully!");
    } catch (err) {
      console.error("Error stopping machine:", err);
      let errMsg = "Failed to stop machine. Please try again.";
      if (err?.response?.data?.Message) {
        errMsg = err.response.data.Message;
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err?.message) {
        errMsg = err.message;
      } else if (typeof err === "string") {
        errMsg = err;
      }
      alert(errMsg);
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
          if (isCameraActiveRef.current) {
            qrCodeRef.current.stop().catch(() => {});
          }
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
  const fetchJobCardData = useCallback(async (ids, isSilent = false) => {
    if (!ids) return;
    if (!isSilent) {
      setFetchLoading(true);
      setFetchError(null);
      setJobCardData(null);
      setMachineData(null);
      setMachineList([]);
      setSelectedMachineId("");
    }

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

      // Find matching machine: priority is authUser's machineMasterId, then previously selectedMachineId, then scanned F_MachineMaster
      const currentSelectedId = selectedMachineIdRef.current;
      let matchingMachine = null;
      if (machineMasterId) {
        matchingMachine = jobCardMachines.find(
          (m) =>
            String(m.ID) === String(machineMasterId) ||
            String(m.F_MachineMaster) === String(machineMasterId)
        );
      } else if (currentSelectedId) {
        matchingMachine = jobCardMachines.find(
          (m) => String(m.ID) === String(currentSelectedId)
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

      // ── Create / register new session ──────────────────────────────────────
      if (matchingCard && !isSilent) {
        const newSessionId = Date.now();
        const jcNo = matchingCard.JobCardNo || matchingCard.JobCard || matchingCard.ID || "?";
        const newSession = {
          id: newSessionId,
          jobCardData: matchingCard,
          machineList: jobCardMachines,
          machineData: matchingMachine || null,
          selectedMachineId: matchingMachine ? String(matchingMachine.ID) : "",
          parsedIds: ids,
          isMinimized: false,
          label: `JC-${jcNo}`
        };
        setScannedSessions(prev => [...prev, newSession]);
        setActiveSessionId(newSessionId);
      }
      // ───────────────────────────────────────────────────────────────────────

      if (!matchingCard) {
        if (!isSilent) {
          setFetchError("Job card not found for the scanned QR code.");
        }
      }

    } catch (err) {
      console.error("Error fetching job card data:", err);
      if (!isSilent) {
        setFetchError("Failed to load job card. Please try again.");
      }
    } finally {
      if (!isSilent) {
        setFetchLoading(false);
      }
    }
  }, [dispatch]);

  const jobCardDataRef = useRef(null);
  const parsedIdsRef = useRef(null);
  const selectedMachineIdRef = useRef("");

  useEffect(() => {
    jobCardDataRef.current = jobCardData;
  }, [jobCardData]);

  useEffect(() => {
    parsedIdsRef.current = parsedIds;
  }, [parsedIds]);

  useEffect(() => {
    selectedMachineIdRef.current = selectedMachineId;
  }, [selectedMachineId]);

  // Keep skipMachineIdsRef in sync with state so callbacks always read latest value
  useEffect(() => {
    skipMachineIdsRef.current = skipMachineIds;
  }, [skipMachineIds]);

  // Load global options to find skip machine IDs list
  useEffect(() => {
    const fetchGlobalOptions = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userId = user.id || user.UserId || 0;
        // JWT sent via Authorization header by ApiHelper - use literal 'token' in path
        
        const dataList = await Fn_FillListData(
          dispatch,
          () => {},
          "gridData",
          `MachineDelayDashboard/GlobalOptions/${userId}/token`
        );
        console.log("[GlobalOptions] resolved dataList:", dataList);
        if (Array.isArray(dataList)) {
          console.log("[GlobalOptions] keys in first item:", dataList[0] ? Object.keys(dataList[0]) : "(empty array)");
          const skipOpt = dataList.find(opt => opt.OptionKey === "MachineDelayThresholdHours");
          console.log("[GlobalOptions] MachineDelayThresholdHours entry:", skipOpt);
          if (skipOpt) {
            const excludedIds = skipOpt.ExcludedMachineIds || "";
            setSkipMachineIds(excludedIds);
            skipMachineIdsRef.current = excludedIds; // set ref immediately — don't wait for useEffect
            console.log("[GlobalOptions] ✅ setSkipMachineIds called with:", excludedIds);
          } else {
            console.warn("[GlobalOptions] ❌ No entry found with OptionKey === 'MachineDelayThresholdHours'. Available keys:", dataList.map(o => o.OptionKey));
          }
        } else {
          console.warn("[GlobalOptions] ❌ dataList is not an array:", typeof dataList, dataList);
        }
      } catch (err) {
        console.error("Error fetching global options in QRScanner:", err);
      }
    };
    fetchGlobalOptions();
  }, []);

  // Establish SignalR connection for real-time updates
  useEffect(() => {
    let connection = null;

    const startSignalR = async () => {
      try {
        const hubUrl = API_WEB_URLS.BASE.replace("/api/V1/", "/qrScannerHub").replace("/api/v1/", "/qrScannerHub");
        console.log("🔌 Connecting to SignalR Hub at:", hubUrl);

        connection = new HubConnectionBuilder()
          .withUrl(hubUrl)
          .withAutomaticReconnect()
          .build();

        connection.on("ReceiveUpdate", (updatedJobCardId) => {
          console.log("⚡ SignalR Update Received. Broadcasting refresh...");
          const currentParsedIds = parsedIdsRef.current;
          
          if (currentParsedIds) {
            console.log("🔄 Syncing local scanner view with database...");
            fetchJobCardData(currentParsedIds, true);
          }
        });

        await connection.start();
        console.log("✅ SignalR Connected Successfully!");
      } catch (err) {
        console.warn("❌ SignalR Connection Failed:", err);
      }
    };

    startSignalR();

    return () => {
      if (connection) {
        connection.stop().catch(err => console.warn("Error stopping SignalR connection:", err));
      }
    };
  }, [fetchJobCardData]);

  // Handler for successful scans
  const handleScanSuccess = useCallback(async (decodedText) => {
    if (!isScanningRef.current) {
      console.log("Duplicate scan detected and ignored.");
      return;
    }
    isScanningRef.current = false;

    console.log("QR Code Scanned successfully! Decoded Text:", decodedText);
    playBeepSound();
    setLastScanned(decodedText);

    // Parse the 5 IDs from the scanned QR code
    const ids = parseBarcodeValue(decodedText);
    console.log("Parsed IDs from QR Code:", ids);
    setParsedIds(ids);

    // Set loading state immediately to display overlay and freeze inputs
    setFetchLoading(true);

    // Stop the camera
    if (qrCodeRef.current && isCameraActiveRef.current) {
      setIsTransitioning(true);
      try {
        await qrCodeRef.current.stop();
        setIsCameraActive(false);
        isCameraActiveRef.current = false;
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
  }, [fetchJobCardData]);

  // Toggle between Camera and File scan modes
  const handleModeChange = async (mode) => {
    if (mode === scanMode) return;
    setScanMode(mode);
    setFetchError(null);
    if (mode === "file" && isCameraActiveRef.current) {
      await stopCamera();
    }
  };

  // Extract QR code value from uploaded image file
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFetchError(null);

    // Reset file input so the same file can be re-selected next time
    if (event.target) event.target.value = "";

    try {
      // Html5Qrcode instance becomes stale after one scanFile() use.
      // Destroy the old instance and create a fresh one every time for file scanning.
      // We use a temporary element id so it doesn't conflict with the live camera "reader" div.
      const tempId = "qr-file-reader-temp";
      let tempEl = document.getElementById(tempId);
      if (!tempEl) {
        tempEl = document.createElement("div");
        tempEl.id = tempId;
        tempEl.style.display = "none";
        document.body.appendChild(tempEl);
      }

      // Always create a fresh instance for file scanning
      const fileScanner = new Html5Qrcode(tempId);

      isScanningRef.current = true;
      const decodedText = await fileScanner.scanFile(file, false);

      // Clean up the temp instance
      try { await fileScanner.clear(); } catch (_) {}

      await handleScanSuccess(decodedText);
    } catch (err) {
      console.error("Error scanning uploaded image:", err);
      isScanningRef.current = false;
      setFetchError("Could not find any valid QR code in the uploaded image. Please ensure the QR code is clear and try again.");
    }
  };


  // Start the camera
  // preserveSessions=true: don't clear the sessions array (called from minimize)
  const startCamera = async (preserveSessions = false, targetFacingMode = null) => {
    if (!qrCodeRef.current || isTransitioning) return;
    setIsTransitioning(true);

    const mode = targetFacingMode || cameraFacingModeRef.current || "user";
    setCameraFacingMode(mode);
    cameraFacingModeRef.current = mode;

    // If camera is somehow already running, stop it first to reset state
    try {
      if (qrCodeRef.current && (qrCodeRef.current.isScanning || qrCodeRef.current.getState)) {
        const isScanning = typeof qrCodeRef.current.isScanning === 'boolean'
          ? qrCodeRef.current.isScanning
          : (typeof qrCodeRef.current.getState === 'function' && qrCodeRef.current.getState() === 2);
        if (isScanning) {
          await qrCodeRef.current.stop();
        }
      }
    } catch (e) {
      console.warn("Error stopping active scanner session before restart:", e);
    }

    // Reset single-session state (sessions array is preserved)
    setJobCardData(null);
    setMachineData(null);
    setMachineList([]);
    setSelectedMachineId("");
    setFetchError(null);
    setParsedIds(null);
    setLastScanned(null);
    setActiveSessionId(null);

    // Make the reader element visible first so html5-qrcode can mount to it
    setIsCameraActive(true);
    isCameraActiveRef.current = true;

    // Wait a short moment (200ms) for React to render the visible reader container
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      isScanningRef.current = true;
      await qrCodeRef.current.start(
        { facingMode: mode },
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
      isCameraActiveRef.current = false;
      isScanningRef.current = false;
      alert("Could not access camera. Please check camera permissions and make sure you are using HTTPS.");
    } finally {
      setIsTransitioning(false);
    }
  };

  // Switch camera between Front and Back (environment / user)
  const handleSwitchFacingMode = async (newMode = null) => {
    const nextMode = newMode || (cameraFacingModeRef.current === "user" ? "environment" : "user");
    if (nextMode === cameraFacingModeRef.current && isCameraActiveRef.current) return;

    setCameraFacingMode(nextMode);
    cameraFacingModeRef.current = nextMode;

    if (isCameraActiveRef.current) {
      setIsTransitioning(true);
      try {
        if (qrCodeRef.current) {
          await qrCodeRef.current.stop();
        }
        isCameraActiveRef.current = false;
        isScanningRef.current = false;
        setIsCameraActive(false);

        // Short pause for html5-qrcode video element cleanup
        await new Promise((resolve) => setTimeout(resolve, 250));
        await startCamera(true, nextMode);
      } catch (err) {
        console.error("Failed to switch camera:", err);
        setIsTransitioning(false);
      }
    }
  };

  // Stop the camera manually
  const stopCamera = async () => {
    if (!qrCodeRef.current || isTransitioning) return;
    setIsTransitioning(true);

    try {
      if (isCameraActiveRef.current) {
        await qrCodeRef.current.stop();
      }
      setIsCameraActive(false);
      isCameraActiveRef.current = false;
      isScanningRef.current = false;
    } catch (err) {
      console.error("Failed to stop camera:", err);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleRescan = () => {
    // If this session was in the sessions array, remove it
    if (activeSessionId) {
      setScannedSessions(prev => prev.filter(s => s.id !== activeSessionId));
      setActiveSessionId(null);
    }
    setJobCardData(null);
    setMachineData(null);
    setMachineList([]);
    setSelectedMachineId("");
    setFetchError(null);
    setParsedIds(null);
    setLastScanned(null);
    // Automatically restart the camera when clicking rescan/try again
    startCamera();
  };

  // ── Minimized Sessions Bar ─────────────────────────────────────────────────
  const MinimizedSessionsBar = () => {
    if (scannedSessions.length === 0) return null;

    // ── Start All validation ──────────────────────────────────────────────────
    const allHaveMachine  = scannedSessions.every(s => !!s.machineData);
    const firstMachineId  = scannedSessions[0]?.machineData
      ? String(scannedSessions[0].machineData.F_MachineMaster || scannedSessions[0].machineData.ID || "")
      : null;
    const allSameMachine  = allHaveMachine && scannedSessions.every(s => {
      const mid = String(s.machineData.F_MachineMaster || s.machineData.ID || "");
      return mid === firstMachineId;
    });
    const noneStarted     = scannedSessions.every(s =>
      !s.machineData?.StartTime || String(s.machineData.StartTime).trim() === ""
    );
    const canStartAll     = scannedSessions.length > 1 && allHaveMachine && allSameMachine && noneStarted;

    // Reason why Start All button is disabled (shown as tooltip)
    let disabledReason = "";
    if (scannedSessions.length <= 1) {
      disabledReason = "Need at least 2 sessions";
    } else if (!allHaveMachine) {
      disabledReason = "Select machine in all sessions first";
    } else if (!allSameMachine) {
      disabledReason = "All sessions must have same machine selected";
    } else if (!noneStarted) {
      disabledReason = "One or more sessions already started";
    }

    // ── Switch All validation (Identical machines across all queued sessions & none started) ──
    const canSwitchAll    = scannedSessions.length > 1 && allHaveMachine && allSameMachine && noneStarted;
    let switchDisabledReason = "";
    if (scannedSessions.length <= 1) {
      switchDisabledReason = "Need at least 2 sessions";
    } else if (!allHaveMachine) {
      switchDisabledReason = "Select machine in all sessions first";
    } else if (!allSameMachine) {
      switchDisabledReason = "All sessions must have same machine selected";
    } else if (!noneStarted) {
      switchDisabledReason = "One or more sessions already started";
    }

    // ── Stop All validation ───────────────────────────────────────────────────
    const runningSessions = scannedSessions.filter(s => {
      if (!s.machineData) return false;
      const isStarted = !!(s.machineData.StartTime && String(s.machineData.StartTime).trim() !== "");
      const isStopped = !!(s.machineData.EndTime && String(s.machineData.EndTime).trim() !== "");
      return isStarted && !isStopped;
    });
    const canStopAll      = scannedSessions.length > 1 && runningSessions.length > 0;

    // Active unpaused running sessions eligible for Pause All at shift end
    const activeUnpausedRunningSessions = scannedSessions.filter(s => {
      if (!s.machineData) return false;
      const isStarted = !!(s.machineData.StartTime && String(s.machineData.StartTime).trim() !== "");
      const isStopped = !!(s.machineData.EndTime && String(s.machineData.EndTime).trim() !== "");
      const isPaused  = !!(s.machineData.IsPaused === 1 || s.machineData.IsPaused === true || s.machineData.IsPaused === "1");
      return isStarted && !isStopped && !isPaused;
    });

    // Reason why Stop All button is disabled (shown as tooltip)
    let stopDisabledReason = "";
    if (scannedSessions.length <= 1) {
      stopDisabledReason = "Need at least 2 sessions";
    } else if (runningSessions.length === 0) {
      const anyStarted = scannedSessions.some(s => !!(s.machineData?.StartTime && String(s.machineData.StartTime).trim() !== ""));
      if (!anyStarted) {
        stopDisabledReason = "No sessions running yet";
      } else {
        stopDisabledReason = "All running sessions already stopped";
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    return (
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderTop: "2px solid #34d399",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.3)"
      }}>
        <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap", marginRight: 4 }}>
          📋 SESSIONS:
        </span>

        {scannedSessions.map((session, idx) => {
          const hasMachine = !!session.machineData;
          const isPaused   = !!(session.machineData?.IsPaused === 1 || session.machineData?.IsPaused === true || session.machineData?.IsPaused === "1");
          const isStarted  = !!(session.machineData?.StartTime && String(session.machineData.StartTime).trim() !== "");
          const isStopped  = !!(session.machineData?.EndTime && String(session.machineData.EndTime).trim() !== "");
          const isActive   = session.id === activeSessionId;

          return (
            <div key={session.id} style={{
              display: "flex",
              alignItems: "center",
              background: isActive
                ? "#34d399"
                : (isStopped
                  ? "#1e293b"
                  : (isPaused
                    ? "#7c2d12"
                    : (isStarted ? "#14532d" : (hasMachine ? "#1e3a2f" : "#3b1f0a")))),
              border: `1px solid ${isActive
                ? "#34d399"
                : (isStopped
                  ? "#475569"
                  : (isPaused
                    ? "#ea580c"
                    : (isStarted ? "#22c55e" : (hasMachine ? "#2d5a3d" : "#c2410c"))))}`,
              borderRadius: "20px",
              padding: "4px 10px 4px 12px",
              gap: "6px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}>
              <span
                onClick={() => handleExpandSession(session.id)}
                style={{
                  color: isActive
                    ? "#0f172a"
                    : (isStopped
                      ? "#94a3b8"
                      : (isPaused
                        ? "#fdba74"
                        : (isStarted ? "#86efac" : (hasMachine ? "#34d399" : "#fb923c")))),
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap"
                }}
              >
                #{idx + 1} {session.label}
                {!hasMachine
                  ? " ⚠️ Select machine"
                  : isStopped
                    ? " 🛑 Done"
                    : isPaused
                      ? " ⏸️ Paused"
                      : isStarted
                        ? " ⚡ Running"
                        : ` — ${session.machineData?.MachineName || "Machine"} ⏳`
                }
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveSession(session.id); }}
                style={{
                  background: "none",
                  border: "none",
                  color: isActive ? "#0f172a" : "#94a3b8",
                  cursor: "pointer",
                  padding: "0",
                  fontSize: "14px",
                  lineHeight: 1,
                  fontWeight: 700
                }}
                title="Remove session"
              >×</button>
            </div>
          );
        })}

        {/* Bulk Action Buttons (Switch All, Start All & Stop All) */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Switch All button */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            {!canSwitchAll && switchDisabledReason && (
              <span style={{ color: "#38bdf8", fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                ℹ️ {switchDisabledReason}
              </span>
            )}
            <button
              onClick={canSwitchAll ? handleOpenBulkSwapModal : undefined}
              disabled={!canSwitchAll || bulkStartLoading || bulkStopLoading || swapSubmitLoading}
              title={canSwitchAll ? `Switch machine for all ${scannedSessions.length} sessions` : switchDisabledReason}
              style={{
                background: canSwitchAll
                  ? "linear-gradient(135deg, #0284c7, #38bdf8)"
                  : "#1e293b",
                color: canSwitchAll ? "#fff" : "#475569",
                border: `1px solid ${canSwitchAll ? "transparent" : "#334155"}`,
                borderRadius: "20px",
                padding: "6px 16px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: canSwitchAll && !bulkStartLoading && !bulkStopLoading && !swapSubmitLoading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                boxShadow: canSwitchAll ? "0 2px 8px rgba(56,189,248,0.3)" : "none",
                transition: "all 0.3s",
                opacity: canSwitchAll ? 1 : 0.5
              }}
            >
              <i className="fas fa-exchange-alt"></i> Switch All ({scannedSessions.length})
            </button>
          </div>

          {/* Start All button */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            {!canStartAll && disabledReason && (
              <span style={{ color: "#fb923c", fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                ⚠️ {disabledReason}
              </span>
            )}
            <button
              onClick={canStartAll ? handleBulkStartAll : undefined}
              disabled={!canStartAll || bulkStartLoading || bulkStopLoading}
              title={canStartAll ? "Start all sessions" : disabledReason}
              style={{
                background: canStartAll
                  ? (bulkStartLoading ? "#374151" : "linear-gradient(135deg, #059669, #34d399)")
                  : "#1e293b",
                color: canStartAll ? "#fff" : "#475569",
                border: `1px solid ${canStartAll ? "transparent" : "#334155"}`,
                borderRadius: "20px",
                padding: "6px 16px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: canStartAll && !bulkStartLoading && !bulkStopLoading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                boxShadow: canStartAll ? "0 2px 8px rgba(52,211,153,0.3)" : "none",
                transition: "all 0.3s",
                opacity: canStartAll ? 1 : 0.5
              }}
            >
              {bulkStartLoading ? (
                <><span className="spinner-border spinner-border-sm" role="status"></span> Starting...</>
              ) : (
                <><i className="fas fa-play-circle"></i> Start All ({scannedSessions.length})</>
              )}
            </button>
          </div>

          {/* Pause All button (Shift End / Duty Off) */}
          {activeUnpausedRunningSessions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
              <button
                onClick={handleBulkPauseAll}
                disabled={bulkPauseLoading || bulkStartLoading || bulkStopLoading}
                title={`Pause all ${activeUnpausedRunningSessions.length} active running machine(s) for Duty Off / Shift End`}
                style={{
                  background: "linear-gradient(135deg, #d97706, #ea580c)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "20px",
                  padding: "6px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: (bulkPauseLoading || bulkStartLoading || bulkStopLoading) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(234,88,12,0.3)",
                  transition: "all 0.3s"
                }}
              >
                {bulkPauseLoading ? (
                  <><span className="spinner-border spinner-border-sm" role="status"></span> Pausing...</>
                ) : (
                  <><i className="fas fa-pause-circle"></i> Pause All ({activeUnpausedRunningSessions.length})</>
                )}
              </button>
            </div>
          )}

          {/* Stop All button */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            {!canStopAll && stopDisabledReason && (
              <span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                ℹ️ {stopDisabledReason}
              </span>
            )}
            <button
              onClick={canStopAll ? handleBulkStopAll : undefined}
              disabled={!canStopAll || bulkStopLoading || bulkStartLoading}
              title={canStopAll ? `Stop all running sessions (${runningSessions.length})` : stopDisabledReason}
              style={{
                background: canStopAll
                  ? (bulkStopLoading ? "#374151" : "linear-gradient(135deg, #b91c1c, #ef4444)")
                  : "#1e293b",
                color: canStopAll ? "#fff" : "#475569",
                border: `1px solid ${canStopAll ? "transparent" : "#334155"}`,
                borderRadius: "20px",
                padding: "6px 16px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: canStopAll && !bulkStopLoading && !bulkStartLoading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                boxShadow: canStopAll ? "0 2px 8px rgba(239,68,68,0.3)" : "none",
                transition: "all 0.3s",
                opacity: canStopAll ? 1 : 0.5
              }}
            >
              {bulkStopLoading ? (
                <><span className="spinner-border spinner-border-sm" role="status"></span> Stopping...</>
              ) : (
                <><i className="fas fa-stop-circle"></i> Stop All ({runningSessions.length})</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };


  // ── If we have a job card loaded, show the job card view ──────

  if (jobCardData) {
    return (
      <>
        <MinimizedSessionsBar />
        <div style={{ paddingBottom: scannedSessions.length > 0 ? "70px" : "0" }}>
          <ScannedJobCardView
            jobCard={activeSession ? activeSession.jobCardData : jobCardData}
            parsedIds={parsedIds}
            machineList={machineList}
            selectedMachineId={activeSession ? activeSession.selectedMachineId : selectedMachineId}
            onMachineSelect={activeSession
              ? (machineId) => handleMachineSelectForSession(activeSession.id, machineId)
              : handleMachineSelect
            }
            machineData={activeSession ? activeSession.machineData : machineData}
            onStartMachine={handleStartMachine}
            onStopMachine={handleStopMachine}
            actionLoading={actionLoading}
            onRescan={handleRescan}
            skipMachineIds={skipMachineIds}
            onMinimize={activeSessionId ? () => handleMinimizeAndScanAnother(activeSessionId) : null}
            sessionCount={scannedSessions.length}
            onOpenSwapModal={handleOpenSwapModal}
            onOpenLogsModal={handleOpenLogsModal}
            onOpenBypassModal={handleOpenBypassModal}
            onPauseMachine={handleOpenPauseModal}
            onResumeMachine={handleResumeMachine}
          />
        </div>

        <MachineSwapModal
          isOpen={isSwapModalOpen}
          onClose={handleCloseSwapModal}
          currentMachine={swapTargetMachine}
          jobCard={jobCardData || activeSession?.jobCardData}
          availableMachines={allAvailableMachines.length > 0 ? allAvailableMachines : (machineList && machineList.length > 0 ? machineList : (activeSession?.machineList || []))}
          loadingMachines={swapMachinesLoading}
          onSubmitSwap={handleSubmitMachineSwap}
          submitLoading={swapSubmitLoading}
        />

        <MachineBypassModal
          isOpen={isBypassModalOpen}
          onClose={handleCloseBypassModal}
          targetMachine={bypassTargetMachine}
          jobCard={jobCardData || activeSession?.jobCardData}
          precedingMachines={bypassPrecedingMachines}
          onSubmitBypass={handleSubmitMachineBypass}
          submitLoading={bypassSubmitLoading}
        />

        <MachinePauseModal
          isOpen={isPauseModalOpen}
          onClose={handleClosePauseModal}
          targetMachine={pauseTargetMachine}
          jobCard={jobCardData || activeSession?.jobCardData}
          onConfirmPause={handleConfirmPauseMachine}
          submitLoading={pauseSubmitLoading}
        />

        <MachineLogsModal
          isOpen={isLogsModalOpen}
          onClose={handleCloseLogsModal}
          jobCard={logsJobCard}
          logsList={machineLogsList}
          loading={logsLoading}
        />
      </>
    );
  }

  // ── Default: Camera Scanner View ─────────────────────────────────────────────
  return (
    <>
      <MinimizedSessionsBar />
      <div className="container-fluid" style={{ fontFamily: "Poppins, sans-serif", paddingBottom: scannedSessions.length > 0 ? "70px" : "0" }}>

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
              {fetchError && (
                <div className="alert alert-danger w-100 mb-3 alert-dismissible fade show" role="alert" style={{ fontSize: "13px", borderRadius: "8px", textAlign: "left" }}>
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <strong>Error:</strong> {fetchError}
                  <button type="button" className="btn-close" style={{ float: "right", background: "none", border: "none", color: "#721c24", fontWeight: "bold", fontSize: "16px", cursor: "pointer", padding: "0 5px" }} onClick={() => setFetchError(null)} aria-label="Close">
                    &times;
                  </button>
                </div>
              )}

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

              {/* Camera Facing Selector (Front / Back) — visible in Live Camera mode */}
              {scanMode === "camera" && (
                <div 
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    maxWidth: "400px",
                    marginBottom: "14px",
                    background: "#f8fafc",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                    <i className="fas fa-video mr-1.5" style={{ color: "#065f46" }}></i>
                    Camera: <span style={{ color: "#065f46" }}>{cameraFacingMode === "user" ? "Front (Selfie)" : "Back (Rear)"}</span>
                  </span>

                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => handleSwitchFacingMode("user")}
                      disabled={isTransitioning}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: cameraFacingMode === "user" ? "#065f46" : "#e2e8f0",
                        color: cameraFacingMode === "user" ? "#ffffff" : "#475569",
                        cursor: isTransitioning ? "not-allowed" : "pointer",
                        transition: "all 0.2s"
                      }}
                      title="Select Front Camera"
                    >
                      <i className="fas fa-user mr-1"></i> Front
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchFacingMode("environment")}
                      disabled={isTransitioning}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: cameraFacingMode === "environment" ? "#065f46" : "#e2e8f0",
                        color: cameraFacingMode === "environment" ? "#ffffff" : "#475569",
                        cursor: isTransitioning ? "not-allowed" : "pointer",
                        transition: "all 0.2s"
                      }}
                      title="Select Back Camera"
                    >
                      <i className="fas fa-camera mr-1"></i> Back
                    </button>
                  </div>
                </div>
              )}

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
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn py-2.5 font-w700 fs-14 shadow-sm"
                      style={{
                        flex: 1,
                        borderRadius: "6px",
                        border: "1px solid #065f46",
                        color: "#065f46",
                        backgroundColor: "#f0fdf4"
                      }}
                      onClick={() => handleSwitchFacingMode()}
                      disabled={isTransitioning}
                      title={`Switch to ${cameraFacingMode === "user" ? "Back" : "Front"} Camera`}
                    >
                      {isTransitioning ? (
                        <>
                          <span className="spinner-border spinner-border-sm mr-1.5" role="status" aria-hidden="true"></span>
                          Switching...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sync-alt mr-1.5"></i>
                          {cameraFacingMode === "user" ? "Switch to Back" : "Switch to Front"}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger py-2.5 font-w700 fs-14 shadow-sm"
                      style={{ flex: 1, borderRadius: "6px" }}
                      onClick={stopCamera}
                      disabled={isTransitioning}
                    >
                      {isTransitioning ? (
                        <>
                          <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                          Stopping...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-stop mr-2"></i> TURN OFF
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <MachineSwapModal
        isOpen={isSwapModalOpen}
        onClose={handleCloseSwapModal}
        currentMachine={swapTargetMachine}
        jobCard={jobCardData || activeSession?.jobCardData}
        availableMachines={allAvailableMachines.length > 0 ? allAvailableMachines : (machineList && machineList.length > 0 ? machineList : (activeSession?.machineList || []))}
        loadingMachines={swapMachinesLoading}
        onSubmitSwap={handleSubmitMachineSwap}
        submitLoading={swapSubmitLoading}
        isBulk={isBulkSwap}
        sessionsList={scannedSessions}
      />

      <MachineBypassModal
        isOpen={isBypassModalOpen}
        onClose={handleCloseBypassModal}
        targetMachine={bypassTargetMachine}
        jobCard={jobCardData || activeSession?.jobCardData}
        precedingMachines={bypassPrecedingMachines}
        onSubmitBypass={handleSubmitMachineBypass}
        submitLoading={bypassSubmitLoading}
      />

      <MachinePauseModal
        isOpen={isPauseModalOpen}
        onClose={handleClosePauseModal}
        targetMachine={pauseTargetMachine}
        jobCard={jobCardData || activeSession?.jobCardData}
        onConfirmPause={handleConfirmPauseMachine}
        submitLoading={pauseSubmitLoading}
      />

      <MachineLogsModal
        isOpen={isLogsModalOpen}
        onClose={handleCloseLogsModal}
        jobCard={logsJobCard}
        logsList={machineLogsList}
        loading={logsLoading}
      />
    </>
  );
};

export default QRScanner;
