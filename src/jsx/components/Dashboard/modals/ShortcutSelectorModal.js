import React, { useState } from "react";
import { Modal, Button, Form, Badge } from "react-bootstrap";
import { FaStar, FaSearch, FaCheck, FaThLarge, FaBookmark } from "react-icons/fa";
import { getAllUniqueMenuItems } from "../../../layouts/nav/Menu";

const COLOR_PALETTE = ["#4e73df", "#1cc88a", "#f6c23e", "#36b9cc", "#e74a3b", "#6f42c1", "#20c997", "#fd7e14"];

const ShortcutSelectorModal = ({ show, onHide, shortcuts = [], onSaveShortcuts }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoutes, setSelectedRoutes] = useState(shortcuts.map((s) => s.route || s.id));

  const allMenuItems = getAllUniqueMenuItems().filter((item) => item.to && item.to !== "dashboard");

  const filteredItems = allMenuItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    return item.title.toLowerCase().includes(term) || item.to.toLowerCase().includes(term);
  });

  const handleToggle = (route) => {
    if (selectedRoutes.includes(route)) {
      setSelectedRoutes(selectedRoutes.filter((r) => r !== route));
    } else {
      setSelectedRoutes([...selectedRoutes, route]);
    }
  };

  const handleSave = () => {
    const updated = selectedRoutes.map((route, idx) => {
      const existing = shortcuts.find((s) => (s.route || s.id) === route);
      if (existing) return existing;

      const menuItem = allMenuItems.find((m) => m.to === route);
      const title = menuItem ? menuItem.title : route;
      const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];

      return {
        id: route,
        title: title,
        route: route,
        icon: "FaThLarge",
        color: color
      };
    });

    onSaveShortcuts(updated);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5 fw-bold d-flex align-items-center">
          <FaBookmark className="text-primary me-2" />
          Customize Quick Navigation Shortcuts
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <p className="text-muted small mb-3">
          Select the pages and modules you frequently use. Selected items will be pinned as fast 1-click tiles at the top of your dashboard.
        </p>

        {/* Search */}
        <div className="input-group mb-3">
          <span className="input-group-text bg-white border-end-0">
            <FaSearch className="text-muted" />
          </span>
          <input
            type="text"
            className="form-control border-start-0 ps-0"
            placeholder="Search pages (e.g., Job Card, Wood, Machine, QR)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="small text-muted">
            Selected: <strong className="text-primary">{selectedRoutes.length}</strong> pages pinned
          </span>
          {selectedRoutes.length > 0 && (
            <button 
              className="btn btn-link btn-sm text-danger text-decoration-none p-0"
              onClick={() => setSelectedRoutes([])}
            >
              Clear All
            </button>
          )}
        </div>

        <div className="row g-2">
          {filteredItems.map((item) => {
            const isSelected = selectedRoutes.includes(item.to);
            return (
              <div key={item.to} className="col-12 col-sm-6">
                <div
                  className="p-3 rounded-3 d-flex align-items-center justify-content-between border"
                  style={{
                    background: isSelected ? "#eef3ff" : "#ffffff",
                    borderColor: isSelected ? "#4e73df" : "#e9ecef",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onClick={() => handleToggle(item.to)}
                >
                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                    <span 
                      className="p-2 rounded-circle text-white d-flex align-items-center justify-content-center"
                      style={{ 
                        background: isSelected ? "#4e73df" : "#adb5bd", 
                        width: "28px", 
                        height: "28px" 
                      }}
                    >
                      <FaThLarge size={12} />
                    </span>
                    <div className="text-truncate">
                      <div className="fw-bold text-dark small text-truncate">{item.title}</div>
                      <div className="text-muted" style={{ fontSize: "0.7rem" }}>/{item.to}</div>
                    </div>
                  </div>

                  <Form.Check 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // handled by parent div
                    className="ms-2"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} className="px-4">
          Save Shortcuts ({selectedRoutes.length})
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ShortcutSelectorModal;
