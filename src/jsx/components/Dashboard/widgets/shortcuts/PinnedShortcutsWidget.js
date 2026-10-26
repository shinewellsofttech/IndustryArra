import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaFileAlt, 
  FaQrcode, 
  FaBoxes, 
  FaCogs, 
  FaPlus, 
  FaExternalLinkAlt, 
  FaTimes,
  FaIndustry,
  FaChartBar,
  FaThLarge
} from "react-icons/fa";

// Map of icon names to React icon components
const ICON_MAP = {
  FaFileAlt: FaFileAlt,
  FaQrcode: FaQrcode,
  FaBoxes: FaBoxes,
  FaCogs: FaCogs,
  FaIndustry: FaIndustry,
  FaChartBar: FaChartBar,
  FaThLarge: FaThLarge
};

const PinnedShortcutsWidget = ({ shortcuts = [], onOpenShortcutModal, onRemoveShortcut, isEditMode = false }) => {
  const navigate = useNavigate();

  const handleNavigate = (route) => {
    if (!isEditMode && route) {
      navigate(`/${route}`);
    }
  };

  return (
    <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: "12px", background: "#ffffff" }}>
      <div className="card-body py-3 px-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center">
            <span 
              className="badge bg-primary-subtle text-primary me-2 p-2 rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: "32px", height: "32px", background: "rgba(13, 110, 253, 0.1)" }}
            >
              ⭐
            </span>
            <h6 className="mb-0 fw-bold text-dark" style={{ letterSpacing: "0.3px" }}>
              Quick Navigation Shortcuts
            </h6>
          </div>
          {onOpenShortcutModal && (
            <button 
              type="button" 
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 py-1 px-3"
              style={{ borderRadius: "20px", fontSize: "0.8rem", fontWeight: "600" }}
              onClick={onOpenShortcutModal}
            >
              <FaPlus size={10} /> Customize Shortcuts
            </button>
          )}
        </div>

        {shortcuts.length === 0 ? (
          <div className="text-center py-3 text-muted" style={{ fontSize: "0.88rem" }}>
            <span>No shortcuts pinned yet. Click </span>
            <button 
              className="btn btn-link p-0 text-primary fw-semibold" 
              onClick={onOpenShortcutModal}
              style={{ fontSize: "0.88rem" }}
            >
              Customize Shortcuts
            </button>
            <span> to add quick links to your favorite forms and reports.</span>
          </div>
        ) : (
          <div className="row g-3 pt-1">
            {shortcuts.map((sc, idx) => {
              const IconComp = ICON_MAP[sc.icon] || FaThLarge;
              const bgGradient = sc.color || "#4e73df";

              return (
                <div key={sc.id || idx} className="col-6 col-sm-4 col-md-3 col-lg-2">
                  <div 
                    className="p-3 position-relative d-flex flex-column align-items-center justify-content-center text-center h-100"
                    style={{
                      background: "#f8f9fa",
                      border: "1px solid #e9ecef",
                      borderRadius: "10px",
                      cursor: isEditMode ? "default" : "pointer",
                      transition: "all 0.2s ease-in-out"
                    }}
                    onMouseEnter={(e) => {
                      if (!isEditMode) {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.08)";
                        e.currentTarget.style.borderColor = bgGradient;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isEditMode) {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor = "#e9ecef";
                      }
                    }}
                    onClick={() => handleNavigate(sc.route)}
                  >
                    {isEditMode && onRemoveShortcut && (
                      <button 
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 p-0 rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: "20px", height: "20px", fontSize: "10px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveShortcut(sc.id || sc.route);
                        }}
                        title="Remove shortcut"
                      >
                        <FaTimes size={10} />
                      </button>
                    )}

                    <div 
                      className="rounded-3 p-2 mb-2 d-flex align-items-center justify-content-center text-white"
                      style={{ 
                        background: bgGradient, 
                        width: "42px", 
                        height: "42px",
                        boxShadow: `0 4px 10px ${bgGradient}40`
                      }}
                    >
                      <IconComp size={20} />
                    </div>
                    <span 
                      className="fw-bold text-dark text-truncate w-100" 
                      style={{ fontSize: "0.78rem" }}
                      title={sc.title}
                    >
                      {sc.title}
                    </span>
                    <span className="text-muted small" style={{ fontSize: "0.68rem" }}>
                      Tap to open <FaExternalLinkAlt size={8} className="ms-1" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PinnedShortcutsWidget);
