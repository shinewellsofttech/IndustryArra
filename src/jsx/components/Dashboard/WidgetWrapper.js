import React, { Component } from "react";
import { FaArrowsAlt, FaEyeSlash, FaTimes, FaExclamationTriangle } from "react-icons/fa";

class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Widget render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card h-100 border-danger p-3 text-center d-flex flex-column align-items-center justify-content-center">
          <FaExclamationTriangle className="text-danger mb-2" size={24} />
          <h6 className="text-danger fw-bold mb-1">Widget Failed to Render</h6>
          <p className="text-muted small mb-0">{this.state.error?.message || "An unexpected error occurred."}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const WidgetWrapper = ({
  widgetKey,
  title,
  isEditMode = false,
  onHideWidget,
  onRemoveWidget,
  children
}) => {
  return (
    <div 
      className={`h-100 position-relative d-flex flex-column ${isEditMode ? "edit-mode-active" : ""}`}
      style={{
        transition: "box-shadow 0.2s ease",
        borderRadius: "12px",
        border: isEditMode ? "2px dashed #4e73df" : "none",
        background: isEditMode ? "rgba(78, 115, 223, 0.02)" : "transparent",
        overflow: "hidden"
      }}
    >
      {isEditMode && (
        <div 
          className="widget-drag-handle dynamic-drag-handle d-flex align-items-center justify-content-between px-3 py-1 border border-primary border-bottom-0 rounded-top flex-shrink-0"
          style={{ cursor: "move", userSelect: "none" }}
        >
          <div className="d-flex align-items-center gap-2">
            <FaArrowsAlt className="text-primary" size={13} />
            <span className="fw-bold text-primary small text-truncate" style={{ fontSize: "0.78rem" }}>
              {title} (Drag to move)
            </span>
          </div>
          <div className="d-flex align-items-center gap-1">
            {onHideWidget && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary p-0 px-2 rounded"
                style={{ fontSize: "0.7rem", lineHeight: "1.6" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onHideWidget(widgetKey);
                }}
                title="Hide Widget"
              >
                <FaEyeSlash size={10} className="me-1" /> Hide
              </button>
            )}
            {onRemoveWidget && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger p-0 px-1 rounded"
                style={{ fontSize: "0.7rem", lineHeight: "1.6" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveWidget(widgetKey);
                }}
                title="Remove Widget"
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-grow-1 position-relative" style={{ minHeight: 0, overflow: "hidden" }}>
        <WidgetErrorBoundary>
          {children}
        </WidgetErrorBoundary>
      </div>
    </div>
  );
};

export default React.memo(WidgetWrapper);
