import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Play a physical scanner sound using the Web Audio API
const playBeepSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // Standard high pitch scanner beep
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);

    oscillator.start();
    // Beep for 80ms, then fade out
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (error) {
    console.warn("Audio Context beep error:", error);
  }
};

const QRScanner = () => {
  const [scannedCodes, setScannedCodes] = useState([]);
  const [lastScanned, setLastScanned] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const qrCodeRef = useRef(null);

  // Initialize the Html5Qrcode scanner instance once on component mount
  useEffect(() => {
    qrCodeRef.current = new Html5Qrcode("reader");

    // Clean up: make sure the camera is stopped if the user navigates away
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

  // Handler for successful scans
  const handleScanSuccess = useCallback(async (decodedText) => {
    playBeepSound();
    const now = Date.now();
    setLastScanned(decodedText);
    setScannedCodes((prev) => [{ code: decodedText, time: now }, ...prev]);

    // Shut down the camera completely upon successful scan
    if (qrCodeRef.current) {
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
  }, []);

  // Start the camera
  const startCamera = async () => {
    if (!qrCodeRef.current || isTransitioning) return;
    setIsTransitioning(true);

    try {
      // Measure the actual visible width of the reader container in the DOM
      const readerEl = document.getElementById("reader");
      const elementWidth = readerEl ? readerEl.clientWidth : 300;
      // Set scanner square to 70% of the visible container width (min 250px)
      const qrboxSize = Math.max(250, Math.floor(elementWidth * 0.7));

      await qrCodeRef.current.start(
        { facingMode: "environment" }, // Default to rear camera
        {
          fps: 15,
          videoConstraints: {
            facingMode: "environment",
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 }
          },
          qrbox: { width: qrboxSize, height: qrboxSize }
        },
        handleScanSuccess,
        (errorMessage) => {
          // Silent failure callback (ignores non-matching frames)
        }
      );
      setIsCameraActive(true);
    } catch (err) {
      console.error("Failed to start camera:", err);
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

  const handleClearHistory = () => {
    setScannedCodes([]);
    setLastScanned(null);
  };

  return (
    <div className="container-fluid">
      {/* Viewfinder laser animation and styling */}
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

      <div className="row">
        {/* Left Column: Camera Scanner Control */}
        <div className="col-12 col-lg-6 mb-4">
          <div className="card shadow-lg" style={{ border: "1px solid #065f46", borderRadius: "12px", overflow: "hidden" }}>
            <div className="card-header" style={{ backgroundColor: "#065f46", padding: "18px 20px" }}>
              <div className="d-flex justify-content-between align-items-center w-100">
                <h4 className="card-title text-white mb-0 font-w700">
                  <i className="fas fa-qrcode mr-2"></i> QR Code Scanner
                </h4>
                <span className={`badge px-3 py-1.5 fs-12 font-w600 ${isCameraActive ? "badge-success" : "badge-light"}`} style={isCameraActive ? { backgroundColor: "#34d399", color: "#065f46" } : {}}>
                  {isCameraActive ? "● SCANNING ACTIVE" : "● OFFLINE"}
                </span>
              </div>
            </div>
            <div className="card-body text-center d-flex flex-column justify-content-between align-items-center" style={{ minHeight: "480px", padding: "30px 20px" }}>
              <div 
                style={{ 
                  position: "relative", 
                  width: "100%", 
                  maxWidth: "440px", 
                  margin: "0 auto",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                }}
              >
                {/* Viewfinder Target Overlays (Only active when scanning) */}
                {isCameraActive && (
                  <>
                    <div className="laser-line"></div>
                    <div className="viewfinder-corner corner-tl"></div>
                    <div className="viewfinder-corner corner-tr"></div>
                    <div className="viewfinder-corner corner-bl"></div>
                    <div className="viewfinder-corner corner-br"></div>
                  </>
                )}

                {/* 
                  Camera target container: React sees this as an empty div and never modifies its children.
                  This completely prevents React 'removeChild' errors when html5-qrcode injects the video stream.
                */}
                <div 
                  id="reader" 
                  style={{ 
                    width: "100%", 
                    border: isCameraActive ? "2px solid #065f46" : "none", 
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "#000000"
                  }}
                ></div>

                {/* Sibling placeholder managed purely by React */}
                {!isCameraActive && (
                  <div style={{ 
                    width: "100%",
                    height: "320px",
                    border: "2px dashed #065f46", 
                    borderRadius: "12px",
                    backgroundColor: "#f8f9fa",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "20px"
                  }}>
                    <div className="mb-3 d-flex justify-content-center align-items-center" style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#e6f4ea" }}>
                      <i className="fas fa-camera" style={{ fontSize: "2.2rem", color: "#065f46" }}></i>
                    </div>
                    <h5 className="font-w700 text-dark mb-1">Camera is Offline</h5>
                    <p className="text-muted fs-13 text-center mb-0" style={{ maxWidth: "280px" }}>
                      Tap the button below to turn on the camera and scan a QR Code.
                    </p>
                  </div>
                )}
              </div>

              <div className="w-100 mt-4" style={{ maxWidth: "440px" }}>
                {!isCameraActive ? (
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

        {/* Right Column: Scan History */}
        <div className="col-12 col-lg-6 mb-4">
          <div className="card shadow-lg" style={{ border: "1px solid #065f46", borderRadius: "12px", overflow: "hidden", height: "100%" }}>
            <div className="card-header" style={{ backgroundColor: "#065f46", padding: "18px 20px" }}>
              <h4 className="card-title text-white mb-0 font-w700">
                <i className="fas fa-clipboard-list mr-2"></i> Scan Results
              </h4>
            </div>
            <div className="card-body d-flex flex-column" style={{ minHeight: "480px", padding: "30px 20px" }}>
              {/* Highlight Box for Latest Scanned Code */}
              {lastScanned ? (
                <div 
                  className="p-3 mb-4 shadow-sm" 
                  style={{ 
                    backgroundColor: "#e6f4ea", 
                    borderLeft: "5px solid #065f46", 
                    borderRadius: "8px"
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="fs-12 font-w700 text-uppercase tracking-wider" style={{ color: "#065f46" }}>
                      <i className="fas fa-check-circle mr-1"></i> Scan Successful
                    </span>
                    <button 
                      className="btn btn-link p-0 text-success font-w600 fs-12"
                      onClick={() => handleCopy(lastScanned, 'latest')}
                      style={{ textDecoration: "none" }}
                    >
                      {copiedId === 'latest' ? (
                        <span className="text-success"><i className="fas fa-check mr-1"></i> Copied</span>
                      ) : (
                        <span><i className="fas fa-copy mr-1"></i> Copy</span>
                      )}
                    </button>
                  </div>
                  <h3 className="mb-0 font-w700 text-danger" style={{ wordBreak: "break-all" }}>
                    {lastScanned}
                  </h3>
                </div>
              ) : (
                <div 
                  className="py-4 px-3 mb-4 text-center" 
                  style={{ 
                    border: "2px dashed #cccccc", 
                    borderRadius: "8px", 
                    backgroundColor: "#fafafa" 
                  }}
                >
                  <i className="fas fa-barcode mb-2 text-muted" style={{ fontSize: "2rem" }}></i>
                  <p className="mb-0 text-muted fs-14 font-w500">
                    No active scan. Click 'Turn On Camera' to read a code.
                  </p>
                </div>
              )}

              {/* Scanned Items Log */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="font-w700 text-dark mb-0">Scan History ({scannedCodes.length})</h5>
                {scannedCodes.length > 0 && (
                  <button 
                    className="btn btn-link p-0 text-danger font-w600 fs-12"
                    style={{ textDecoration: "none" }}
                    onClick={handleClearHistory}
                  >
                    <i className="fas fa-trash-alt mr-1"></i> Clear All
                  </button>
                )}
              </div>
              <div style={{ flex: 1, overflowY: "auto", maxHeight: "260px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#fcfcfc", padding: "10px" }}>
                {scannedCodes.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0 fs-14">History is empty.</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {scannedCodes.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="list-group-item d-flex justify-content-between align-items-center py-2.5 px-2"
                        style={{ backgroundColor: "transparent", borderBottom: "1px solid #f1f5f9" }}
                      >
                        <div style={{ maxWidth: "70%" }}>
                          <span className="font-w700 text-dark fs-14" style={{ wordBreak: "break-all" }}>
                            {item.code}
                          </span>
                          <div className="text-muted fs-11 mt-0.5">
                            {new Date(item.time).toLocaleTimeString()}
                          </div>
                        </div>
                        <button 
                          className="btn btn-outline-success btn-xs px-2.5 py-1"
                          onClick={() => handleCopy(item.code, idx)}
                          style={{ borderRadius: "4px" }}
                        >
                          {copiedId === idx ? (
                            <><i className="fas fa-check"></i> Copied</>
                          ) : (
                            <><i className="fas fa-copy"></i> Copy</>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
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
