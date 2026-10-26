import React, { useState } from "react";
import { Modal, Button, Form, Badge } from "react-bootstrap";
import { FaSlidersH, FaEye, FaEyeSlash, FaPlus, FaCheck, FaSearch } from "react-icons/fa";
import { WIDGET_REGISTRY } from "../WidgetRegistry";

const CustomizeDashboardDrawer = ({
  show,
  onHide,
  widgets = [],
  onToggleVisibility,
  onAddWidget
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const allRegistryKeys = Object.keys(WIDGET_REGISTRY);

  // Group widgets by category
  const activeWidgetIds = new Set(widgets.map((w) => w.type));

  const filteredKeys = allRegistryKeys.filter((key) => {
    const reg = WIDGET_REGISTRY[key];
    const term = searchTerm.toLowerCase();
    return reg.title.toLowerCase().includes(term) || reg.category.toLowerCase().includes(term) || reg.description.toLowerCase().includes(term);
  });

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="h5 fw-bold d-flex align-items-center">
          <FaSlidersH className="text-primary me-2" />
          Customize Dashboard Widgets
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <p className="text-muted small mb-3">
          Configure which widgets to display on your personal dashboard. Toggle visibility or add new cards.
        </p>

        {/* Search Bar */}
        <div className="input-group mb-4">
          <span className="input-group-text bg-white border-end-0">
            <FaSearch className="text-muted" />
          </span>
          <input
            type="text"
            className="form-control border-start-0 ps-0"
            placeholder="Search widgets by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="row g-3">
          {filteredKeys.map((key) => {
            const reg = WIDGET_REGISTRY[key];
            const activeItem = widgets.find((w) => w.type === key);
            const isInstalled = !!activeItem;
            const isVisible = activeItem?.isVisible ?? false;

            return (
              <div key={key} className="col-12 col-md-6">
                <div 
                  className="p-3 rounded-3 h-100 d-flex flex-column justify-content-between border"
                  style={{
                    background: isVisible ? "#f8f9ff" : "#fdfdfe",
                    borderColor: isVisible ? "#4e73df40" : "#e9ecef"
                  }}
                >
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="badge bg-secondary-subtle text-secondary small px-2 py-1" style={{ fontSize: "0.68rem" }}>
                        {reg.category}
                      </span>
                      {isVisible ? (
                        <Badge bg="success" className="px-2 py-1 small">
                          <FaCheck className="me-1" size={9} /> Visible
                        </Badge>
                      ) : isInstalled ? (
                        <Badge bg="warning" text="dark" className="px-2 py-1 small">
                          <FaEyeSlash className="me-1" size={9} /> Hidden
                        </Badge>
                      ) : (
                        <Badge bg="light" text="muted" className="px-2 py-1 small">
                          Not Added
                        </Badge>
                      )}
                    </div>

                    <h6 className="fw-bold text-dark mb-1">{reg.title}</h6>
                    <p className="text-muted small mb-3" style={{ fontSize: "0.78rem" }}>
                      {reg.description}
                    </p>
                  </div>

                  <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                    {isInstalled ? (
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <span className="small text-muted fw-semibold">Show on Screen:</span>
                        <Form.Check 
                          type="switch"
                          id={`switch-${key}`}
                          checked={isVisible}
                          onChange={() => onToggleVisibility(activeItem.i)}
                          label={isVisible ? "Active" : "Hidden"}
                          className="ms-2 fw-semibold"
                        />
                      </div>
                    ) : (
                      <div className="d-flex justify-content-end w-100">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="d-flex align-items-center gap-1 py-1 px-3"
                          style={{ borderRadius: "16px", fontSize: "0.75rem" }}
                          onClick={() => onAddWidget(key)}
                        >
                          <FaPlus size={10} /> Add to Dashboard
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal.Body>

      <Modal.Footer className="border-top">
        <Button variant="primary" size="sm" onClick={onHide} className="px-4">
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CustomizeDashboardDrawer;
