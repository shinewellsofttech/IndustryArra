import React, { useState } from "react";
import { Modal, Button, Form, Row, Col, Badge } from "react-bootstrap";
import { FaCalculator, FaMagic, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const PRESET_FORMULAS = [
  {
    name: "Wood Cutting Wastage %",
    desc: "((IssuedCFT - ConsumedCFT) / IssuedCFT) * 100",
    expr: "(([IssuedCFT] - [ConsumedCFT]) / NULLIF([IssuedCFT], 0)) * 100"
  },
  {
    name: "Machine Downtime Ratio %",
    desc: "(TotalPauseTime / TotalTimeTaken) * 100",
    expr: "([TotalPauseTime] / NULLIF([TotalTimeTaken], 0)) * 100"
  },
  {
    name: "Pending Container Packaging Qty",
    desc: "Quantity - ISNULL(ReportQty, 0)",
    expr: "[Quantity] - ISNULL([ReportQty], 0)"
  },
  {
    name: "QC Rejection Defect Rate %",
    desc: "(RejectedQty / TotalInspectedQty) * 100",
    expr: "([RejectedQty] / NULLIF([TotalInspectedQty], 0)) * 100"
  }
];

const FormulaBuilderModal = ({ show, onHide, onSaveFormula, availableColumns }) => {
  const [formulaLabel, setFormulaLabel] = useState("");
  const [expression, setExpression] = useState("");
  const [error, setError] = useState("");

  const handleKeyClick = (val) => {
    setExpression((prev) => prev + " " + val + " ");
    setError("");
  };

  const handleColumnInsert = (col) => {
    if (!col) return;
    const token = `[${col.physicalColumn}]`;
    setExpression((prev) => prev + token);
    setError("");
  };

  const applyPreset = (preset) => {
    setFormulaLabel(preset.name);
    setExpression(preset.expr);
    setError("");
  };

  const validateAndSave = () => {
    if (!formulaLabel.trim()) {
      setError("Please enter a Formula Name / Column Label.");
      return;
    }
    if (!expression.trim()) {
      setError("Formula Expression cannot be empty.");
      return;
    }

    // Check parenthesis balance
    let openCount = 0;
    for (let char of expression) {
      if (char === "(") openCount++;
      if (char === ")") openCount--;
      if (openCount < 0) {
        setError("Invalid syntax: Unmatched closing parenthesis ')'.");
        return;
      }
    }
    if (openCount !== 0) {
      setError("Invalid syntax: Unmatched opening parenthesis '('.");
      return;
    }

    onSaveFormula({
      formulaId: "f_" + Date.now(),
      label: formulaLabel.trim(),
      expression: expression.trim(),
      dataType: "Number",
      sortOrder: 99
    });

    setFormulaLabel("");
    setExpression("");
    setError("");
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: "#0f172a", color: "#ffffff" }}>
        <Modal.Title style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
          <FaCalculator color="#38bdf8" /> Visual Cross-Entity Formula & Calculation Builder
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ background: "#f8fafc", padding: "20px" }}>
        {/* Preset Presets Shelf */}
        <div className="mb-3">
          <small className="text-muted fw-bold text-uppercase d-flex align-items-center gap-1 mb-2">
            <FaMagic color="#8b5cf6" /> Pre-loaded Factory Presets:
          </small>
          <div className="d-flex flex-wrap gap-2">
            {PRESET_FORMULAS.map((p, idx) => (
              <Button
                key={idx}
                variant="outline-secondary"
                size="sm"
                style={{ fontSize: "0.75rem", borderRadius: "16px", background: "#ffffff" }}
                onClick={() => applyPreset(p)}
              >
                ⭐ {p.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Formula Name */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold" style={{ fontSize: "0.85rem", color: "#334155" }}>
            Calculated Column Display Name
          </Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g. Wastage CFT, Net Run Hours, Defect Rate %"
            value={formulaLabel}
            onChange={(e) => setFormulaLabel(e.target.value)}
            style={{ fontSize: "0.9rem" }}
          />
        </Form.Group>

        {/* Expression Box */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold d-flex justify-content-between" style={{ fontSize: "0.85rem", color: "#334155" }}>
            <span>Arithmetic Expression</span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Division-by-zero is protected via NULLIF</span>
          </Form.Label>
          <div className="rb-formula-display">{expression || "// Expression preview..."}</div>
        </Form.Group>

        {/* Column Token Inserter */}
        <Row className="mb-3">
          <Col md={8}>
            <Form.Label className="fw-bold" style={{ fontSize: "0.82rem", color: "#475569" }}>
              Insert Field from Selected Columns:
            </Form.Label>
            <div className="d-flex flex-wrap gap-1" style={{ maxHeight: "100px", overflowY: "auto" }}>
              {availableColumns.length === 0 ? (
                <small className="text-muted">No columns selected yet. Add columns in workbench first.</small>
              ) : (
                availableColumns.map((c, i) => (
                  <Badge
                    key={i}
                    bg="light"
                    text="dark"
                    style={{ border: "1px solid #cbd5e1", cursor: "pointer", fontSize: "0.75rem", padding: "5px 8px" }}
                    onClick={() => handleColumnInsert(c)}
                  >
                    + [{c.displayLabel || c.physicalColumn}]
                  </Badge>
                ))
              )}
            </div>
          </Col>

          {/* Keypad */}
          <Col md={4}>
            <Form.Label className="fw-bold" style={{ fontSize: "0.82rem", color: "#475569" }}>
              Operators:
            </Form.Label>
            <div className="rb-calc-keypad" style={{ marginTop: 0 }}>
              {["+", "-", "*", "/", "(", ")", "100", "ISNULL"].map((k) => (
                <button key={k} type="button" className="rb-calc-btn" onClick={() => handleKeyClick(k)} style={{ padding: "6px" }}>
                  {k}
                </button>
              ))}
            </div>
          </Col>
        </Row>

        {error && (
          <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2" style={{ fontSize: "0.82rem" }}>
            <FaExclamationTriangle /> {error}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
        <Button variant="outline-secondary" size="sm" onClick={() => setExpression("")}>
          Clear Expression
        </Button>
        <Button variant="secondary" size="sm" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={validateAndSave} style={{ background: "#2563eb", fontWeight: 600 }}>
          <FaCheckCircle /> Insert Calculated Column
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FormulaBuilderModal;
