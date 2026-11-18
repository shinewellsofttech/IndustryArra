import React, { useEffect, useRef, useState, useCallback, useContext } from "react";
import { Row, Col, Card, Table, Button, Modal, Form, Badge, Spinner } from "react-bootstrap";
import { Html5Qrcode } from "html5-qrcode";
import axios from "axios";
import Swal from "sweetalert2";
import { API_WEB_URLS } from "../../constants/constAPI";
import { parseBarcodeValue } from "./BarcodeHelper";
import { ThemeContext } from "../../context/ThemeContext";
import usePagePermissions from "../../helpers/usePagePermissions";
import {
  FaLock,
  FaQrcode,
  FaCamera,
  FaUpload,
  FaSearch,
  FaRedo,
  FaPlay,
  FaStop,
  FaSyncAlt,
  FaExclamationTriangle,
  FaCheck,
  FaRegCircle,
  FaPrint,
  FaPlusCircle,
  FaHistory,
  FaSave
} from "react-icons/fa";

// Play a physical scanner sound using the Web Audio API
const playBeepSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1400, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.12);
    oscillator.stop(audioCtx.currentTime + 0.12);
  } catch (error) {
    console.warn("Audio Context beep error:", error);
  }
};

const formatNumber = (value, decimals = 1) => {
  const num = Number(value);
  if (isNaN(num)) return "0";
  const formatted = num.toFixed(decimals);
  return formatted.replace(/\.0+$/, "");
};

const WoodIssueScanner = () => {
  const { background } = useContext(ThemeContext);
  const isDarkMode = background?.value === "dark";

  // Page permissions
  const { canView, canAdd, canEdit } = usePagePermissions("WoodIssueScanner");

  // Scanner states
  const [scanMode, setScanMode] = useState("camera"); // "camera" | "file" | "search"
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("environment");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Data states
  const [sheetHeader, setSheetHeader] = useState(null);
  const [sheetComponents, setSheetComponents] = useState([]);
  const [sheetSummary, setSheetSummary] = useState([]);
  const [highlightComponentId, setHighlightComponentId] = useState(null);

  // Manual search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Extra Issue Modal states
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [selectedCompForExtra, setSelectedCompForExtra] = useState(null);
  const [extraForm, setExtraForm] = useState({
    issueLength: 0,
    issueWidth: 0,
    issueThk: 0,
    extraQty: 1,
    extraCFT: 0,
    reason: "Knot in wood",
    customReason: ""
  });
  const [extraLogs, setExtraLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [savingExtra, setSavingExtra] = useState(false);

  // Refs for scanner
  const qrCodeRef = useRef(null);
  const isScanningRef = useRef(true);
  const isCameraActiveRef = useRef(false);

  // Auth User & Token
  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const userId = authUser?.id || authUser?.UserId || 0;
  const userToken = "token";
  const authToken = localStorage.getItem("token") || authUser?.token || "";

  // Base API URL (prevent duplicate /api/V1/)
  const baseRoot = (API_WEB_URLS.BASE || "").endsWith("/") ? API_WEB_URLS.BASE : `${API_WEB_URLS.BASE}/`;
  const BASE_API = `${baseRoot}WoodIssueScanner/${userId}/${userToken}`;

  const getHeaders = () => ({
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
  });

  // ─── Initialize Html5Qrcode Instance on Mount ──────────────────────────────
  useEffect(() => {
    try {
      qrCodeRef.current = new Html5Qrcode("wood-issue-qr-reader", {
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false
      });
    } catch (e) {
      console.warn("Html5Qrcode init error:", e);
    }

    return () => {
      if (qrCodeRef.current) {
        try {
          if (qrCodeRef.current.isScanning) {
            qrCodeRef.current.stop().catch(() => {});
          }
        } catch (_) {}
      }
    };
  }, []);

  // ─── Camera Controls ───────────────────────────────────────────────────────
  const startCamera = async (targetFacingMode = null) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setFetchError(null);

    const mode = targetFacingMode || cameraFacingMode || "environment";
    setCameraFacingMode(mode);

    try {
      if (qrCodeRef.current && qrCodeRef.current.isScanning) {
        await qrCodeRef.current.stop();
      }
    } catch (e) {
      console.warn("Stop active scan error:", e);
    }

    setIsCameraActive(true);
    isCameraActiveRef.current = true;
    isScanningRef.current = true;

    await new Promise((resolve) => setTimeout(resolve, 200));

    const getQrConfig = (includeHdConstraints) => {
      const cfg = {
        fps: 25,
        qrbox: (w, h) => {
          const edge = Math.min(w, h);
          const size = Math.min(edge, Math.max(50, Math.floor(edge * 0.82)));
          return { width: size, height: size };
        }
      };
      if (includeHdConstraints) {
        cfg.videoConstraints = {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        };
      }
      return cfg;
    };

    const resetScannerInstance = () => {
      try {
        const readerEl = document.getElementById("wood-issue-qr-reader");
        if (readerEl) readerEl.innerHTML = "";
        qrCodeRef.current = new Html5Qrcode("wood-issue-qr-reader", {
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          verbose: false
        });
      } catch (e) {
        console.warn("Could not recreate Html5Qrcode instance:", e);
      }
    };

    try {
      if (!qrCodeRef.current || (typeof qrCodeRef.current.getState === "function" && qrCodeRef.current.getState() !== 1)) {
        resetScannerInstance();
      }

      let started = false;
      let lastError = null;

      // Attempt 1: facingMode + ideal HD videoConstraints (passed properly inside 2nd arg)
      try {
        await qrCodeRef.current.start({ facingMode: mode }, getQrConfig(true), handleScanSuccess, () => {});
        started = true;
      } catch (hdErr) {
        console.warn("WoodIssueScanner Attempt 1 (HD) failed:", hdErr);
        lastError = hdErr;
      }

      // Attempt 2: Fresh instance with plain facingMode
      if (!started) {
        try {
          resetScannerInstance();
          await qrCodeRef.current.start({ facingMode: mode }, getQrConfig(false), handleScanSuccess, () => {});
          started = true;
        } catch (basicErr) {
          console.warn("WoodIssueScanner Attempt 2 (basic) failed:", basicErr);
          lastError = basicErr;
        }
      }

      // Attempt 3: Enumerate cameras and start by deviceId
      if (!started) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const preferredCam = mode === "environment"
              ? cameras.find((c) => /back|rear|environment/i.test(c.label || "")) || cameras[cameras.length - 1]
              : cameras.find((c) => /front|user|selfie/i.test(c.label || "")) || cameras[0];

            resetScannerInstance();
            await qrCodeRef.current.start(preferredCam.id, getQrConfig(false), handleScanSuccess, () => {});
            started = true;
          }
        } catch (enumErr) {
          console.warn("WoodIssueScanner Attempt 3 (enumeration) failed:", enumErr);
          lastError = enumErr;
        }
      }

      if (!started) {
        throw lastError || new Error("Unable to initialize camera.");
      }

      // Softly enable continuous autofocus if supported
      try {
        const capabilities = qrCodeRef.current.getRunningTrackCapabilities?.();
        if (capabilities?.focusMode && capabilities.focusMode.includes("continuous")) {
          await qrCodeRef.current.applyVideoConstraints({
            advanced: [{ focusMode: "continuous" }]
          });
        }
      } catch (_) {}
    } catch (err) {
      console.error("Camera start failed:", err);
      setIsCameraActive(false);
      isCameraActiveRef.current = false;
      isScanningRef.current = false;
      const errMsg = typeof err === "string" ? err : (err?.message || String(err));
      if (/NotAllowedError|Permission denied|denied/i.test(errMsg)) {
        setFetchError("Camera permission denied. Please allow camera access in browser/app settings.");
      } else if (/NotReadableError|TrackStartError|in use/i.test(errMsg)) {
        setFetchError("Camera is currently in use by another app or tab.");
      } else {
        setFetchError(`Could not access camera: ${errMsg}`);
      }
    } finally {
      setIsTransitioning(false);
    }
  };

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
      console.error("Camera stop failed:", err);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSwitchCamera = async () => {
    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    await stopCamera();
    await new Promise((r) => setTimeout(r, 200));
    await startCamera(nextMode);
  };

  // ─── File Upload Scan ──────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFetchError(null);
    if (e.target) e.target.value = "";

    try {
      const tempId = "wood-qr-file-temp";
      let tempEl = document.getElementById(tempId);
      if (!tempEl) {
        tempEl = document.createElement("div");
        tempEl.id = tempId;
        tempEl.style.display = "none";
        document.body.appendChild(tempEl);
      }

      const fileScanner = new Html5Qrcode(tempId, {
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false
      });
      isScanningRef.current = true;
      const decodedText = await fileScanner.scanFile(file, false);
      try { await fileScanner.clear(); } catch (_) {}

      await handleScanSuccess(decodedText);
    } catch (err) {
      console.error("File scan failed:", err);
      setFetchError("Could not find a valid QR Code in the uploaded image.");
    }
  };

  // ─── Scan Success Handler ──────────────────────────────────────────────────
  const handleScanSuccess = useCallback(async (decodedText) => {
    if (!isScanningRef.current) return;
    isScanningRef.current = false;

    console.log("Wood Issue Scanned QR Code:", decodedText);
    playBeepSound();
    await stopCamera();

    // Check if it's a Wood Issue sheet code: WI-{WoodIssueId}-{ContainerL}-{Item}
    if (decodedText.startsWith("WI-")) {
      const parts = decodedText.split("-");
      const woodIssueId = parts[1];
      if (woodIssueId) {
        loadSheetDetails(woodIssueId);
        return;
      }
    }

    // Check if it's a standard JobCard barcode (Container-Item-Component-Category)
    const parsed = parseBarcodeValue(decodedText);
    if (parsed && parsed.F_ContainerMasterL && parsed.F_ItemMaster) {
      loadSheetByContainerItem(parsed.F_ContainerMasterL, parsed.F_ItemMaster, parsed.F_ComponentsMaster);
      return;
    }

    // Try treating decoded text directly as WoodIssue ID if numeric
    if (!isNaN(decodedText) && Number(decodedText) > 0) {
      loadSheetDetails(decodedText);
      return;
    }

    setFetchError(`Scanned value "${decodedText}" is not a recognized Wood Issue or Job Card QR Code.`);
  }, []);

  // ─── Fetch Sheet Details by WoodIssueId ────────────────────────────────────
  const loadSheetDetails = async (woodIssueId) => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get(`${BASE_API}/GetDetails/${woodIssueId}`, getHeaders());
      if (res.data?.success && res.data.data) {
        setSheetHeader(res.data.data.header);
        setSheetComponents(res.data.data.components || []);
        setSheetSummary(res.data.data.summary || []);
      } else {
        setFetchError("Wood Issue sheet not found.");
      }
    } catch (err) {
      console.error("Error loading wood issue:", err);
      setFetchError(err.response?.data?.message || "Failed to load Wood Issue details.");
    } finally {
      setFetchLoading(false);
    }
  };

  // ─── Fetch Sheet Details by Container & Item ───────────────────────────────
  const loadSheetByContainerItem = async (containerLId, itemId, targetCompId = null) => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get(`${BASE_API}/GetDetailsByContainerItem/${containerLId}/${itemId}`, getHeaders());
      if (res.data?.success && res.data.data) {
        setSheetHeader(res.data.data.header);
        const comps = res.data.data.components || [];
        setSheetComponents(comps);
        setSheetSummary(res.data.data.summary || []);

        // Highlight matching component
        if (targetCompId) {
          const match = comps.find(c => String(c.F_ComponentMaster) === String(targetCompId) || String(c.Id) === String(targetCompId));
          if (match) {
            setHighlightComponentId(match.Id);
            setTimeout(() => {
              const el = document.getElementById(`comp-row-${match.Id}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
          }
        }
      } else {
        setFetchError("No Wood Issue found for this Container / Item.");
      }
    } catch (err) {
      console.error("Error loading wood issue by container/item:", err);
      setFetchError(err.response?.data?.message || "Failed to load Wood Issue details.");
    } finally {
      setFetchLoading(false);
    }
  };

  // ─── Search Active Sheets for Manual Select ────────────────────────────────
  const handleSearchSheets = async (query = "") => {
    setSearchLoading(true);
    try {
      const res = await axios.get(`${BASE_API}/SearchActiveSheets?query=${encodeURIComponent(query)}`, getHeaders());
      if (res.data?.success) {
        setSearchResults(res.data.data || []);
      }
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setSearchLoading(false);
    }
  };

  // ─── Toggle Issued Checkmark (✔) ───────────────────────────────────────────
  const handleToggleIssued = async (comp) => {
    const nextIssued = !comp.IsIssued;
    try {
      const res = await axios.post(`${BASE_API}/ToggleIssued`, {
        woodIssueComponentId: comp.Id,
        isIssued: nextIssued,
        userId: userId
      }, getHeaders());

      if (res.data?.success) {
        playBeepSound();
        setSheetComponents(prev => prev.map(c => c.Id === comp.Id ? { ...c, IsIssued: nextIssued } : c));
      }
    } catch (err) {
      console.error("Error toggling issued:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.response?.data?.message || "Could not update issued status."
      });
    }
  };

  // ─── Open Extra Issue Modal ────────────────────────────────────────────────
  const handleOpenExtraModal = async (comp) => {
    setSelectedCompForExtra(comp);
    
    // Default dimensions from component's issue size
    const length = Number(comp.L2 || comp.L3 || 0);
    const width = Number(comp.W2 || comp.W3 || 0);
    const thk = Number(comp.T2 || comp.T3 || 0);
    const qty = 1;
    const calcCFT = (length > 0 && width > 0 && thk > 0) ? (length * width * thk * qty) / 1728.0 : 0;

    setExtraForm({
      issueLength: length,
      issueWidth: width,
      issueThk: thk,
      extraQty: qty,
      extraCFT: Number(calcCFT.toFixed(2)),
      reason: "Knot in wood",
      customReason: ""
    });

    setShowExtraModal(true);

    // Fetch previous extra logs
    setLogsLoading(true);
    try {
      const res = await axios.get(`${BASE_API}/GetExtraLogs/${comp.Id}`, getHeaders());
      if (res.data?.success) {
        setExtraLogs(res.data.data || []);
      }
    } catch (e) {
      console.error("Error fetching extra logs:", e);
    } finally {
      setLogsLoading(false);
    }
  };

  // Live recalculate CFT when extra qty/dimensions change
  const handleExtraDimensionChange = (field, val) => {
    const updated = { ...extraForm, [field]: Number(val) };
    if (updated.issueLength > 0 && updated.issueWidth > 0 && updated.issueThk > 0 && updated.extraQty > 0) {
      const cft = (updated.issueLength * updated.issueWidth * updated.issueThk * updated.extraQty) / 1728.0;
      updated.extraCFT = Number(cft.toFixed(2));
    }
    setExtraForm(updated);
  };

  // ─── Save Extra Issue ──────────────────────────────────────────────────────
  const handleSaveExtraIssue = async () => {
    if (!selectedCompForExtra) return;
    if (Number(extraForm.extraQty) <= 0 && Number(extraForm.extraCFT) <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid Input", text: "Please enter extra quantity or CFT." });
      return;
    }

    setSavingExtra(true);
    const finalReason = extraForm.reason === "Other" 
      ? (extraForm.customReason || "Extra Requirement") 
      : (extraForm.customReason ? `${extraForm.reason} - ${extraForm.customReason}` : extraForm.reason);

    try {
      const res = await axios.post(`${BASE_API}/AddExtraIssue`, {
        woodIssueComponentId: selectedCompForExtra.Id,
        issueLength: extraForm.issueLength,
        issueThk: extraForm.issueThk,
        issueWidth: extraForm.issueWidth,
        extraQty: extraForm.extraQty,
        extraCFT: extraForm.extraCFT,
        reason: finalReason,
        userId: userId
      }, getHeaders());

      if (res.data?.success && res.data.data) {
        playBeepSound();
        const updatedComp = res.data.data.component;
        const updatedHeader = res.data.data.header;
        const updatedSummary = res.data.data.summary;

        // Update local component state
        setSheetComponents(prev => prev.map(c => {
          if (c.Id === selectedCompForExtra.Id) {
            return {
              ...c,
              ExcessIssueCFT: updatedComp.ExcessIssueCFT,
              ExtraLogCount: updatedComp.TotalExtraCount
            };
          }
          return c;
        }));

        if (updatedHeader) setSheetHeader(updatedHeader);
        if (updatedSummary) setSheetSummary(updatedSummary);

        setShowExtraModal(false);

        Swal.fire({
          icon: "success",
          title: "Extra Wood Issued!",
          text: `Added ${extraForm.extraCFT} CFT for ${selectedCompForExtra.Description}`,
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error("Save extra issue error:", err);
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: err.response?.data?.message || "Could not save extra wood issue."
      });
    } finally {
      setSavingExtra(false);
    }
  };

  // Flatten and group components
  const nonJComponents = sheetComponents.filter(c => c.CategoryName !== "J");
  const jComponents = sheetComponents.filter(c => c.CategoryName === "J");

  // Grand totals
  const totalFinalCft = sheetComponents.reduce((sum, c) => sum + Number(c.FinalCFT || 0), 0);
  const totalActualIssueCft = sheetComponents.reduce((sum, c) => sum + Number(c.IssueCFT || 0) + Number(c.IssueCFT3 || 0), 0);
  const totalExcessCft = sheetComponents.reduce((sum, c) => sum + Number(c.ExcessIssueCFT || 0), 0);

  // Summary totals
  const summaryActualTotal = sheetSummary.reduce((sum, s) => sum + Number(s.ActualIssue || 0), 0);
  const summaryExcessTotal = sheetSummary.reduce((sum, s) => sum + Number(s.ExcessIssue || 0), 0);
  const summaryGrandTotal = sheetSummary.reduce((sum, s) => sum + Number(s.TotalCft || 0), 0);

  // Theme styling tokens
  const textColor = isDarkMode ? "#ffffff" : "#1e293b";
  const bgColor = isDarkMode ? "#0f172a" : "#ffffff";
  const cardBg = isDarkMode ? "#1e293b" : "#ffffff";
  const headerBgColor = isDarkMode ? "#334155" : "#f1f5f9";
  const borderColor = isDarkMode ? "#475569" : "#cbd5e1";

  if (!canView) {
    return (
      <div className="container-fluid py-5 text-center">
        <Card className="p-4 mx-auto border-0 shadow-sm" style={{ maxWidth: 500, backgroundColor: cardBg }}>
          <h4 className="text-danger mb-3">
            <FaLock className="me-2" /> Access Denied
          </h4>
          <p className="text-muted mb-0">
            You do not have permission to view the Wood Issue Scanner module. Please contact your system administrator.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-fluid p-2 p-md-4">
      {/* ─── Top Control & Navigation Bar ───────────────────────────────── */}
      <Card className="shadow-sm mb-3 border-0" style={{ backgroundColor: cardBg }}>
        <Card.Body className="p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h4 className="fw-bold mb-1" style={{ color: "#2563eb" }}>
                <FaQrcode className="me-2" /> WOOD ISSUE SCANNER
              </h4>
              <p className="text-muted small mb-0">
                Scan Wood Issue Sheet QR Code or JobCard Barcode to report wood issues and record extra issues.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <Button
                variant={scanMode === "camera" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => {
                  setScanMode("camera");
                  startCamera();
                }}
              >
                <FaCamera className="me-1" /> Live Camera
              </Button>

              <label className={`btn btn-sm ${scanMode === "file" ? "btn-primary" : "btn-outline-primary"} mb-0`}>
                <FaUpload className="me-1" /> Upload QR
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    setScanMode("file");
                    stopCamera();
                    handleFileUpload(e);
                  }}
                />
              </label>

              <Button
                variant={scanMode === "search" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => {
                  setScanMode("search");
                  stopCamera();
                  handleSearchSheets();
                }}
              >
                <FaSearch className="me-1" /> Manual Search
              </Button>

              {sheetHeader && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setSheetHeader(null);
                    setSheetComponents([]);
                    setSheetSummary([]);
                    setHighlightComponentId(null);
                    setScanMode("camera");
                    startCamera();
                  }}
                >
                  <FaRedo className="me-1" /> Scan Another
                </Button>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ─── Scanner Viewports ─────────────────────────────────────────── */}
      {!sheetHeader && (
        <Row className="justify-content-center mb-4">
          <Col md={8} lg={6}>
            <Card className="shadow-sm border-0" style={{ backgroundColor: cardBg }}>
              <Card.Body className="p-4 text-center">
                {scanMode === "camera" && (
                  <div>
                    <div
                      id="wood-issue-qr-reader"
                      style={{
                        width: "100%",
                        minHeight: "320px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: "#000"
                      }}
                    ></div>

                    <div className="d-flex justify-content-center gap-2 mt-3">
                      {!isCameraActive ? (
                        <Button variant="success" size="sm" onClick={() => startCamera()}>
                          <FaPlay className="me-1" /> Start Camera
                        </Button>
                      ) : (
                        <>
                          <Button variant="danger" size="sm" onClick={stopCamera}>
                            <FaStop className="me-1" /> Stop Camera
                          </Button>
                          <Button variant="secondary" size="sm" onClick={handleSwitchCamera}>
                            <FaSyncAlt className="me-1" /> Switch Camera
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {scanMode === "search" && (
                  <div>
                    <h6 className="fw-bold mb-3 text-start">Search Recent Wood Issue Sheets:</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type Container No, Item Code, or JobCard initial..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleSearchSheets(e.target.value);
                        }}
                      />
                      <Button variant="primary" onClick={() => handleSearchSheets(searchQuery)}>
                        <FaSearch />
                      </Button>
                    </div>

                    {searchLoading ? (
                      <Spinner animation="border" size="sm" className="my-3" />
                    ) : (
                      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        <Table hover responsive size="sm" className="text-start">
                          <thead>
                            <tr style={{ backgroundColor: headerBgColor }}>
                              <th>ID</th>
                              <th>Container</th>
                              <th>Item Code & Name</th>
                              <th>Job Card</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {searchResults.map((item) => (
                              <tr key={item.Id}>
                                <td>{item.Id}</td>
                                <td><strong>{item.ContainerNumber}</strong></td>
                                <td>
                                  <div>{item.ItemCode}</div>
                                  <small className="text-muted">{item.ProductName}</small>
                                </td>
                                <td>{item.JobCardInitial || "-"}</td>
                                <td>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => loadSheetDetails(item.Id)}
                                  >
                                    Load Sheet
                                  </Button>
                                </td>
                              </tr>
                            ))}
                            {searchResults.length === 0 && (
                              <tr>
                                <td colSpan="5" className="text-center text-muted py-3">
                                  No matching Wood Issue sheets found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {fetchLoading && (
                  <div className="mt-3">
                    <Spinner animation="border" variant="primary" className="me-2" />
                    <span>Loading Wood Issue Sheet Details...</span>
                  </div>
                )}

                {fetchError && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    <FaExclamationTriangle className="me-2" /> {fetchError}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* ─── Photo-Styled Wood Issue Bill of Material Reporting View ──── */}
      {sheetHeader && (
        <div className="mb-4">
          <Card className="shadow border" style={{ borderColor: borderColor, backgroundColor: bgColor, color: textColor }}>
            {/* Header Specifications Block */}
            <div style={{ borderBottom: `2px solid ${borderColor}`, padding: "0" }}>
              <Table bordered className="mb-0 text-center" style={{ borderCollapse: "collapse", borderColor: borderColor }}>
                <tbody>
                  <tr>
                    <td colSpan="4" style={{ backgroundColor: headerBgColor, padding: "8px", fontWeight: "bold", fontSize: "16px", color: textColor }}>
                      WOOD ISSUE BILL OF MATERIAL
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "18%", fontWeight: "bold", backgroundColor: headerBgColor }}>PRODUCT NAME</td>
                    <td style={{ width: "32%", textAlign: "left", paddingLeft: "12px" }}>{sheetHeader.ProductName}</td>
                    <td style={{ width: "18%", fontWeight: "bold", backgroundColor: headerBgColor }}>JOB CARD CODE</td>
                    <td style={{ width: "32%", fontWeight: "bold", color: "#2563eb" }}>{sheetHeader.JobCardInitial || sheetHeader.ALCode || "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", backgroundColor: headerBgColor }}>CONTAINER NO</td>
                    <td style={{ textAlign: "left", paddingLeft: "12px", color: "#16a34a", fontWeight: "bold" }}>{sheetHeader.ContainerNumber || "-"}</td>
                    <td style={{ fontWeight: "bold", backgroundColor: headerBgColor }}>INSPECTION DATE</td>
                    <td style={{ color: "#dc2626", fontWeight: "bold" }}>{sheetHeader.InspectionDate}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", backgroundColor: headerBgColor }}>BATCH NO</td>
                    <td style={{ textAlign: "left", paddingLeft: "12px" }}>{sheetHeader.BatchNo || "-"}</td>
                    <td style={{ fontWeight: "bold", backgroundColor: headerBgColor }}>QUANTITY</td>
                    <td style={{ color: "#dc2626", fontWeight: "bold" }}>{formatNumber(sheetHeader.Quantity, 0)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", backgroundColor: headerBgColor }} rowSpan="2">
                      DIMENSIONS [Cm]<br />
                      <div className="d-flex justify-content-around mt-1 small">
                        <span>W: {formatNumber(sheetHeader.W)}</span>
                        <span>D: {formatNumber(sheetHeader.D)}</span>
                        <span>H: {formatNumber(sheetHeader.H)}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "left", paddingLeft: "12px" }}>
                      <span className="text-muted small">Article Code:</span> <strong>{sheetHeader.ItemCode}</strong>
                    </td>
                    <td style={{ fontWeight: "bold", color: "#6b21a8", backgroundColor: headerBgColor }}>WOOD CFT (Issue)</td>
                    <td style={{ fontWeight: "bold", fontSize: "15px" }}>{formatNumber(sheetHeader.TotalIssueCFT)}</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: "left", paddingLeft: "12px" }}>
                      <span className="text-muted small">Excess Wood Issued:</span>{" "}
                      <Badge bg={sheetHeader.TotalExcessCFT > 0 ? "warning" : "secondary"}>
                        {formatNumber(sheetHeader.TotalExcessCFT)} CFT
                      </Badge>
                    </td>
                    <td style={{ fontWeight: "bold", color: "#6b21a8", backgroundColor: headerBgColor }}>WOOD CFT (Final)</td>
                    <td style={{ fontWeight: "bold", fontSize: "15px" }}>{formatNumber(sheetHeader.TotalFinalCFT)}</td>
                  </tr>
                </tbody>
              </Table>
            </div>

            {/* Main Components Table */}
            <div className="table-responsive">
              <Table bordered hover className="mb-0" style={{ borderColor: borderColor, fontSize: "12px" }}>
                <thead>
                  <tr style={{ backgroundColor: headerBgColor, textAlign: "center" }}>
                    <th rowSpan="2" style={{ width: "45px", verticalAlign: "middle" }}>S. No.</th>
                    <th rowSpan="2" style={{ minWidth: "220px", verticalAlign: "middle" }}>Descriptions</th>
                    <th colSpan="3">FINAL SIZE IN CENTIMETERS</th>
                    <th rowSpan="2" style={{ width: "70px", verticalAlign: "middle" }}>Batch Qty.</th>
                    <th rowSpan="2" style={{ width: "75px", verticalAlign: "middle" }}>FINAL CFT</th>
                    <th colSpan="3">ISSUE SIZE IN INCH</th>
                    <th rowSpan="2" style={{ width: "70px", verticalAlign: "middle" }}>Batch Qty.</th>
                    <th rowSpan="2" style={{ width: "75px", verticalAlign: "middle" }}>Issue cft</th>
                    <th rowSpan="2" style={{ width: "85px", verticalAlign: "middle", backgroundColor: "#e2e8f0" }}>ISSUED</th>
                    <th rowSpan="2" style={{ width: "140px", verticalAlign: "middle", backgroundColor: "#fef3c7" }}>EXCESS ISSUE cft</th>
                  </tr>
                  <tr style={{ backgroundColor: headerBgColor, textAlign: "center", fontSize: "10px" }}>
                    <th style={{ width: "50px" }}>L</th>
                    <th style={{ width: "50px" }}>W</th>
                    <th style={{ width: "50px" }}>T</th>
                    <th style={{ width: "50px" }}>L</th>
                    <th style={{ width: "50px" }}>W</th>
                    <th style={{ width: "50px" }}>T</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Non-Jointing Components */}
                  {nonJComponents.map((comp, idx) => {
                    const isHighlighted = highlightComponentId === comp.Id;
                    return (
                      <tr
                        key={comp.Id}
                        id={`comp-row-${comp.Id}`}
                        style={{
                          backgroundColor: isHighlighted ? (isDarkMode ? "#374151" : "#fef9c3") : "transparent",
                          transition: "background-color 0.4s"
                        }}
                      >
                        <td className="text-center">{comp.SNo || idx + 1}</td>
                        <td className="fw-semibold">{comp.Description}</td>

                        {/* Final Size CM */}
                        <td className="text-center">{formatNumber(comp.L1)}</td>
                        <td className="text-center">{formatNumber(comp.W1)}</td>
                        <td className="text-center">{formatNumber(comp.T1)}</td>
                        <td className="text-center">{formatNumber(comp.BatchQty, 0)}</td>
                        <td className="text-center">{formatNumber(comp.FinalCFT)}</td>

                        {/* Issue Size Inch */}
                        <td className="text-center">{formatNumber(comp.L2)}</td>
                        <td className="text-center">{formatNumber(comp.W2)}</td>
                        <td className="text-center">{formatNumber(comp.T2)}</td>
                        <td className="text-center">{formatNumber(comp.BatchQtyIssue, 0)}</td>
                        <td className="text-center">{formatNumber(comp.IssueCFT)}</td>

                        {/* ISSUED Status Toggle */}
                        <td className="text-center" style={{ verticalAlign: "middle" }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${comp.IsIssued ? "btn-success" : "btn-outline-secondary"} px-2 py-1`}
                            style={{ minWidth: "34px", borderRadius: "4px" }}
                            onClick={() => handleToggleIssued(comp)}
                            disabled={!canEdit}
                            title={!canEdit ? "Permission Denied: Cannot edit issued status" : (comp.IsIssued ? `Issued on ${comp.IssuedDate || "today"}` : "Click to mark Issued")}
                          >
                            {comp.IsIssued ? <FaCheck className="fw-bold" /> : <FaRegCircle />}
                          </button>
                        </td>

                        {/* EXCESS ISSUE Column */}
                        <td className="text-center" style={{ verticalAlign: "middle" }}>
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <span className="fw-bold" style={{ minWidth: "35px" }}>
                              {comp.ExcessIssueCFT > 0 ? formatNumber(comp.ExcessIssueCFT) : "-"}
                            </span>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="px-1 py-0"
                              style={{ fontSize: "11px", lineHeight: "1.4" }}
                              onClick={() => handleOpenExtraModal(comp)}
                              disabled={!canAdd}
                              title={!canAdd ? "Permission Denied: Cannot issue extra wood" : "Add Extra Wood Issue"}
                            >
                              + Extra
                            </Button>
                            {comp.ExtraLogCount > 0 && (
                              <Badge
                                bg="info"
                                pill
                                style={{ cursor: "pointer", fontSize: "9px" }}
                                onClick={() => handleOpenExtraModal(comp)}
                                title={`${comp.ExtraLogCount} extra issue logs`}
                              >
                                {comp.ExtraLogCount}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* JOINTING Heading Row */}
                  {jComponents.length > 0 && (
                    <tr style={{ backgroundColor: headerBgColor, fontWeight: "bold" }}>
                      <td colSpan="14" className="text-center py-2" style={{ letterSpacing: "1px" }}>
                        JOINTING
                      </td>
                    </tr>
                  )}

                  {/* Jointing Components */}
                  {jComponents.map((comp, idx) => {
                    const isHighlighted = highlightComponentId === comp.Id;
                    return (
                      <tr
                        key={comp.Id}
                        id={`comp-row-${comp.Id}`}
                        style={{
                          backgroundColor: isHighlighted ? (isDarkMode ? "#374151" : "#fef9c3") : "transparent",
                          transition: "background-color 0.4s"
                        }}
                      >
                        <td className="text-center">{idx + 1}</td>
                        <td className="fw-semibold">{comp.Description}</td>

                        {/* Final Size CM */}
                        <td className="text-center">{formatNumber(comp.L1)}</td>
                        <td className="text-center">{formatNumber(comp.W1)}</td>
                        <td className="text-center">{formatNumber(comp.T1)}</td>
                        <td className="text-center">{formatNumber(comp.BatchQty, 0)}</td>
                        <td className="text-center">{formatNumber(comp.FinalCFT)}</td>

                        {/* Issue Size Inch */}
                        <td className="text-center">{formatNumber(comp.L2)}</td>
                        <td className="text-center">{formatNumber(comp.W2)}</td>
                        <td className="text-center">{formatNumber(comp.T2)}</td>
                        <td className="text-center">{formatNumber(comp.BatchQtyIssue, 0)}</td>
                        <td className="text-center">{formatNumber(comp.IssueCFT)}</td>

                        {/* ISSUED Status Toggle */}
                        <td className="text-center" style={{ verticalAlign: "middle" }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${comp.IsIssued ? "btn-success" : "btn-outline-secondary"} px-2 py-1`}
                            style={{ minWidth: "34px", borderRadius: "4px" }}
                            onClick={() => handleToggleIssued(comp)}
                            disabled={!canEdit}
                            title={!canEdit ? "Permission Denied: Cannot edit issued status" : (comp.IsIssued ? `Issued on ${comp.IssuedDate || "today"}` : "Click to mark Issued")}
                          >
                            {comp.IsIssued ? <FaCheck className="fw-bold" /> : <FaRegCircle />}
                          </button>
                        </td>

                        {/* EXCESS ISSUE Column */}
                        <td className="text-center" style={{ verticalAlign: "middle" }}>
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <span className="fw-bold" style={{ minWidth: "35px" }}>
                              {comp.ExcessIssueCFT > 0 ? formatNumber(comp.ExcessIssueCFT) : "-"}
                            </span>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="px-1 py-0"
                              style={{ fontSize: "11px", lineHeight: "1.4" }}
                              onClick={() => handleOpenExtraModal(comp)}
                              disabled={!canAdd}
                              title={!canAdd ? "Permission Denied: Cannot issue extra wood" : "Add Extra Wood Issue"}
                            >
                              + Extra
                            </Button>
                            {comp.ExtraLogCount > 0 && (
                              <Badge
                                bg="info"
                                pill
                                style={{ cursor: "pointer", fontSize: "9px" }}
                                onClick={() => handleOpenExtraModal(comp)}
                                title={`${comp.ExtraLogCount} extra issue logs`}
                              >
                                {comp.ExtraLogCount}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Grand Totals Row */}
                  <tr style={{ backgroundColor: headerBgColor, fontWeight: "bold", borderTop: `2px solid ${borderColor}` }}>
                    <td></td>
                    <td className="text-uppercase">TOTAL cft</td>
                    <td colSpan="4"></td>
                    <td className="text-center">{formatNumber(totalFinalCft)}</td>
                    <td colSpan="4"></td>
                    <td className="text-center">{formatNumber(totalActualIssueCft)}</td>
                    <td></td>
                    <td className="text-center text-warning" style={{ fontSize: "13px" }}>
                      {formatNumber(totalExcessCft)}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </div>

            {/* Bottom Section: WOOD ISSUE SUMMARY Table */}
            <div style={{ borderTop: `2px solid ${borderColor}`, padding: "16px", backgroundColor: cardBg }}>
              <Row>
                <Col md={7} lg={6}>
                  <h6 className="fw-bold text-center mb-2" style={{ letterSpacing: "1px" }}>
                    WOOD ISSUE SUMMARY
                  </h6>
                  <Table bordered size="sm" className="mb-0 text-center" style={{ borderColor: borderColor }}>
                    <thead>
                      <tr style={{ backgroundColor: headerBgColor, fontSize: "11px" }}>
                        <th style={{ width: "70px" }}>L (in)</th>
                        <th style={{ width: "70px" }}>Thk (in)</th>
                        <th>Actual Issue</th>
                        <th style={{ backgroundColor: "#fef3c7" }}>Excess Issue</th>
                        <th style={{ backgroundColor: "#e2e8f0" }}>TOTAL Cft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheetSummary.map((item, idx) => (
                        <tr key={item.Id || idx}>
                          <td>{formatNumber(item.Length)}</td>
                          <td>{formatNumber(item.Thk)}</td>
                          <td>{formatNumber(item.ActualIssue)}</td>
                          <td style={{ color: item.ExcessIssue > 0 ? "#b45309" : "inherit", fontWeight: item.ExcessIssue > 0 ? "bold" : "normal" }}>
                            {item.ExcessIssue > 0 ? formatNumber(item.ExcessIssue) : ""}
                          </td>
                          <td className="fw-bold">{formatNumber(item.TotalCft)}</td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: headerBgColor, fontWeight: "bold" }}>
                        <td colSpan="2">TOTAL</td>
                        <td>{formatNumber(summaryActualTotal)}</td>
                        <td style={{ color: "#b45309" }}>{formatNumber(summaryExcessTotal)}</td>
                        <td style={{ color: "#2563eb", fontSize: "13px" }}>{formatNumber(summaryGrandTotal)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>

                <Col md={5} lg={6} className="d-flex flex-column justify-content-between pt-3 pt-md-0">
                  <div className="p-3 rounded border" style={{ backgroundColor: headerBgColor, borderColor: borderColor }}>
                    <h6 className="fw-bold mb-2">Wood Issue Quick Actions & Stats</h6>
                    <div className="small mb-2">
                      <strong>Total Components:</strong> {sheetComponents.length}
                    </div>
                    <div className="small mb-2">
                      <strong>Components Issued:</strong>{" "}
                      <Badge bg="success">
                        {sheetComponents.filter(c => c.IsIssued).length} / {sheetComponents.length}
                      </Badge>
                    </div>
                    <div className="small mb-3">
                      <strong>Overall Wood Ratio:</strong>{" "}
                      {totalFinalCft > 0 ? ((totalActualIssueCft + totalExcessCft) / totalFinalCft).toFixed(2) : "0"} x Final
                    </div>

                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => window.print()}
                      >
                        <FaPrint className="me-1" /> Print BOM
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => loadSheetDetails(sheetHeader.Id)}
                      >
                        <FaSyncAlt className="me-1" /> Refresh Data
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Extra Issue Modal with Multiple Issues History ────────────── */}
      <Modal show={showExtraModal} onHide={() => setShowExtraModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{ backgroundColor: headerBgColor }}>
          <Modal.Title className="h6 fw-bold">
            <FaPlusCircle className="text-warning me-2" />
            Issue Extra Wood - {selectedCompForExtra?.Description}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCompForExtra && (
            <>
              {/* Component Info Strip */}
              <div className="p-2 mb-3 rounded border d-flex flex-wrap justify-content-between small" style={{ backgroundColor: headerBgColor }}>
                <div><strong>Standard Final:</strong> {selectedCompForExtra.L1} × {selectedCompForExtra.W1} × {selectedCompForExtra.T1} cm</div>
                <div><strong>Standard Issue:</strong> {selectedCompForExtra.L2} × {selectedCompForExtra.W2} × {selectedCompForExtra.T2} in</div>
                <div><strong>Batch Qty:</strong> {selectedCompForExtra.BatchQty} pcs</div>
                <div><strong>Current Excess:</strong> <Badge bg="warning">{formatNumber(selectedCompForExtra.ExcessIssueCFT)} CFT</Badge></div>
              </div>

              {/* Form Input */}
              <Form>
                <Row className="g-2 mb-3">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Log Length (in)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.5"
                        size="sm"
                        value={extraForm.issueLength}
                        onChange={(e) => handleExtraDimensionChange("issueLength", e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Log Width (in)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.5"
                        size="sm"
                        value={extraForm.issueWidth}
                        onChange={(e) => handleExtraDimensionChange("issueWidth", e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Log Thk (in)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.1"
                        size="sm"
                        value={extraForm.issueThk}
                        onChange={(e) => handleExtraDimensionChange("issueThk", e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Extra Qty (Pcs)</Form.Label>
                      <Form.Control
                        type="number"
                        step="1"
                        min="1"
                        size="sm"
                        value={extraForm.extraQty}
                        onChange={(e) => handleExtraDimensionChange("extraQty", e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Calculated Extra CFT</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        size="sm"
                        value={extraForm.extraCFT}
                        onChange={(e) => setExtraForm({ ...extraForm, extraCFT: Number(e.target.value) })}
                      />
                      <Form.Text className="text-muted" style={{ fontSize: "10px" }}>
                        Formula: (L × W × T × Qty) / 1728
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Reason for Extra Wood</Form.Label>
                      <Form.Select
                        size="sm"
                        value={extraForm.reason}
                        onChange={(e) => setExtraForm({ ...extraForm, reason: e.target.value })}
                      >
                        <option value="Knot in wood">Knot in wood</option>
                        <option value="Crack / Split">Crack / Split</option>
                        <option value="Cutting / Operator Error">Cutting / Operator Error</option>
                        <option value="Thickness Variation">Thickness Variation</option>
                        <option value="Quality Rejection">Quality Rejection</option>
                        <option value="Scrap / Wastage">Scrap / Wastage</option>
                        <option value="Other">Other Reason...</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Remarks / Notes</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder="Additional details..."
                        value={extraForm.customReason}
                        onChange={(e) => setExtraForm({ ...extraForm, customReason: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>

              {/* History of Previous Extra Issues for This Component */}
              <div className="mt-4">
                <h6 className="fw-bold small mb-2">
                  <FaHistory className="me-1" /> Previous Extra Issues History ({extraLogs.length})
                </h6>
                {logsLoading ? (
                  <div className="text-center py-2"><Spinner animation="border" size="sm" /></div>
                ) : extraLogs.length > 0 ? (
                  <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                    <Table bordered hover size="sm" className="small mb-0 text-center">
                      <thead>
                        <tr style={{ backgroundColor: headerBgColor }}>
                          <th>#</th>
                          <th>Date & Time</th>
                          <th>Size (L×W×T)</th>
                          <th>Qty</th>
                          <th>Extra CFT</th>
                          <th>Reason</th>
                          <th>By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extraLogs.map((log, i) => (
                          <tr key={log.Id || i}>
                            <td>{extraLogs.length - i}</td>
                            <td>{log.CreatedDateFormatted}</td>
                            <td>{log.IssueLength} × {log.IssueWidth || 0} × {log.IssueThk} in</td>
                            <td>{log.ExtraQty} pcs</td>
                            <td className="fw-bold text-warning">{formatNumber(log.ExtraCFT)}</td>
                            <td className="text-start">{log.Reason || "-"}</td>
                            <td>{log.CreatedByName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-muted small text-center py-2 border rounded">
                    No previous extra issues recorded for this component yet.
                  </div>
                )}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowExtraModal(false)}>
            Close
          </Button>
          <Button
            variant="warning"
            size="sm"
            className="fw-bold"
            disabled={savingExtra}
            onClick={handleSaveExtraIssue}
          >
            {savingExtra ? <Spinner animation="border" size="sm" className="me-1" /> : <FaSave className="me-1" />}
            Save Extra Issue
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default WoodIssueScanner;
