import React, { useEffect, useRef, useState } from "react";
import { Row, Col, Button } from "react-bootstrap";
import { Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import Select from "react-select";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import MetalJobCard from "./MetalJobCard";
import MDFJobCard from "./MDFJobCard";
import WoodJobCard from "./WoodJobCard";

// Custom Multi-Select Component
const CustomMultiSelect = ({
  options,
  selectedValues,
  onChange,
  disabled,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Define selection rules
  const getSelectionRules = (optionId, currentSelection) => {
    const id = optionId.toString();
    const current = currentSelection.map((v) => v.toString());

    // Rule 1: Categories 1,2,3,15 can be selected together
    const woodCategories = ["1", "2", "3", "15"];
    // Rule 2: Category 4 can only be with 16
    const metalCategories = ["4", "16"];
    // Rule 3: Category 5 can only be alone
    const mdfCategory = ["5"];

    // If trying to select category 5
    if (id === "5") {
      // Can only select if nothing else is selected, or only 5 is selected
      return (
        current.length === 0 || (current.length === 1 && current.includes("5"))
      );
    }

    // If trying to select category 4
    if (id === "4") {
      // Can only select if no other categories except 16 are selected
      const hasOtherCategories = current.some(

        (cat) => !metalCategories.includes(cat)
        
      );
      return !hasOtherCategories;
    }

    // If trying to select category 16
    if (id === "16") {
      // Can only select if no other categories except 4 are selected
      const hasOtherCategories = current.some(
        (cat) => !metalCategories.includes(cat)
      );
      return !hasOtherCategories;
    }

    // If trying to select wood categories (1,2,3,15)
    if (woodCategories.includes(id)) {
      // Can only select if no metal (4,16) or MDF (5) categories are selected
      const hasMetalOrMDF = current.some(
        (cat) => metalCategories.includes(cat) || mdfCategory.includes(cat)
      );
      return !hasMetalOrMDF;
    }

    // For any other category, check if it conflicts with existing selection
    return true;
  };

  const isOptionDisabled = (optionId) => {
    const id = optionId.toString();
    const current = selectedValues.map((v) => v.toString());

    // If this option is already selected, it's not disabled (can be deselected)
    if (current.includes(id)) {
      return false;
    }

    // Check if this option can be selected based on current selection
    return !getSelectionRules(id, current);
  };

  const getDisabledReason = (optionId) => {
    const id = optionId.toString();
    const current = selectedValues.map((v) => v.toString());

    if (id === "5" && current.length > 0 && !current.includes("5")) {
      return "Category 5 can only be selected alone";
    }
    if (
      (id === "4" || id === "16") &&
      current.some((cat) => !["4", "16"].includes(cat))
    ) {
      return "Categories 4 & 16 can only be selected together";
    }
    if (
      ["1", "2", "3", "15"].includes(id) &&
      current.some((cat) => ["4", "5", "16"].includes(cat))
    ) {
      return "Wood categories (1,2,3,15) cannot be mixed with Metal or MDF categories";
    }
    if (current.includes("5")) {
      return "Cannot select other categories when Category 5 is selected";
    }

    return "";
  };

  const toggleOption = (optionId) => {
    const id = optionId.toString();
    const current = selectedValues.map((v) => v.toString());

    // If option is currently selected, remove it
    if (current.includes(id)) {
      const newSelection = current.filter((selectedId) => selectedId !== id);
      onChange(newSelection);
      return;
    }

    // If option is not selected, check if it can be added
    if (getSelectionRules(id, current)) {
      const newSelection = [...current, id];
      onChange(newSelection);
    }
  };

  const removeTag = (optionId, e) => {
    e.stopPropagation();
    const newSelection = selectedValues.filter((id) => id !== optionId);
    onChange(newSelection);
  };

  const getSelectedNames = () => {
    return selectedValues
      .map((id) => {
        const option = options.find((opt) => opt.Id.toString() === id);
        return option ? option.Name : "";
      })
      .filter((name) => name);
  };

  return (
    <div className="custom-multiselect" style={{ position: "relative" }}>
      <div
        className="multiselect-input"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          border: "1px solid #ced4da",
          borderRadius: "8px",
          padding: "8px 12px",
          minHeight: "42px",
          backgroundColor: disabled ? "#f8f9fa" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s ease",
          boxShadow: isOpen ? "0 0 0 2px rgba(0,123,255,0.25)" : "none",
          borderColor: isOpen ? "#007bff" : "#ced4da",
        }}
      >
        {selectedValues.length === 0 ? (
          <span style={{ color: "#6c757d", fontSize: "14px" }}>
            {placeholder}
          </span>
        ) : (
          getSelectedNames().map((name, index) => (
            <span
              key={index}
              style={{
                backgroundColor: "#e3f2fd",
                color: "#1976d2",
                padding: "4px 8px",
                borderRadius: "16px",
                fontSize: "12px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                border: "1px solid #bbdefb",
              }}
            >
              {name}
              <span
                onClick={(e) => removeTag(selectedValues[index], e)}
                style={{
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#1976d2",
                  fontWeight: "bold",
                  marginLeft: "2px",
                }}
              >
                ×
              </span>
            </span>
          ))
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "#6c757d",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && !disabled && (
        <div
          className="multiselect-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            border: "1px solid #ced4da",
            borderRadius: "8px",
            marginTop: "4px",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.Id.toString());
            const isDisabled = isOptionDisabled(option.Id);
            const disabledReason = getDisabledReason(option.Id);

            return (
              <div
                key={option.Id}
                onClick={() =>
                  !isDisabled && toggleOption(option.Id.toString())
                }
                title={isDisabled ? disabledReason : ""}
                style={{
                  padding: "10px 12px",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderBottom: "1px solid #f8f9fa",
                  transition: "background-color 0.2s ease",
                  backgroundColor: isSelected
                    ? "#f0f8ff"
                    : isDisabled
                    ? "#f8f9fa"
                    : "transparent",
                  opacity: isDisabled ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !isDisabled) {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !isDisabled) {
                    e.target.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    border: `2px solid ${isDisabled ? "#ccc" : "#007bff"}`,
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSelected
                      ? isDisabled
                        ? "#ccc"
                        : "#007bff"
                      : "transparent",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                >
                  {isSelected && "✓"}
                </div>
                <span
                  style={{
                    fontSize: "14px",
                    color: isDisabled ? "#999" : "#333",
                  }}
                >
                  {option.Name}
                </span>
                {isDisabled && !isSelected && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#dc3545",
                      marginLeft: "auto",
                      fontStyle: "italic",
                    }}
                  >
                    🚫
                  </span>
                )}
              </div>
            );
          })}
          {options.length === 0 && (
            <div
              style={{
                padding: "12px",
                textAlign: "center",
                color: "#6c757d",
                fontSize: "14px",
              }}
            >
              No options available
            </div>
          )}
        </div>
      )}

      {/* Selection Rules Info */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            padding: "8px 12px",
            fontSize: "11px",
            color: "#6c757d",
            zIndex: 1000,
            marginTop: "200px",
          }}
        >
          <strong>Selection Rules:</strong>
          <br />
          • W,J,SSA,SA can be selected together
          <br />
          • M can only be with SM <br />• MDF can only be selected alone
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

const JobCardForm = () => {
  const [State, setState] = useState({
    id: 0,
    FillArray: [],
    FillArray1: [],
    FillArray2: [],
    formData: {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/JobCardContainers`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/JobCardItems`;
  const API_URL_SAVE = "GetJobCard/0/token";
  const API_URL_SAVE1 = "GetJobCardL/0/token";

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const prefillDataRef = useRef({
    containerId: location.state?.prefillContainerId || "",
    itemId: location.state?.prefillItemId || "",
  });

  const [F_ContainerMaster, setContainerMaster] = useState(
    prefillDataRef.current.containerId || ""
  );
  const [F_CategoryMaster, setCategoryMaster] = useState([]);
  const [F_ItemMaster, setItemMaster] = useState("");
  const [F_ContainerMasterL, setContainerMasterL] = useState([]);
  const [isSampleItem, setIsSampleItem] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dispatch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
      await Fn_FillListData(
        dispatch,
        setState,
        "FillArray2",
        `${API_URL2}/Id/0`
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadItemsForContainer = async (containerId) => {
    setContainerMaster(containerId);
    setCategoryMaster([]);
    setItemMaster("");
    setContainerMasterL("");
    setIsSampleItem(false);
    setState((prevState) => ({ ...prevState, FillArray1: [] }));

    if (!containerId) {
      return [];
    }

    try {
      const items = await Fn_FillListData(
        dispatch,
        setState,
        "FillArray1",
        `${API_URL3}/Id/${containerId}`
      );
      return items || [];
    } catch (error) {
      console.error("Error fetching items:", error);
      return [];
    }
  };

  const handleContainerChange = async (e) => {
    const value = e.target.value;
    await loadItemsForContainer(value);
  };

  const handleCategoryChange = (selectedCategories) => {
    setCategoryMaster(selectedCategories);
  };

  const handleItemChange = (selectedOption) => {
    const value = selectedOption ? selectedOption.value : "";
    setItemMaster(value);
    const obj = State.FillArray1.find((x) => x.Id == value);
    
    if (obj) {
      setContainerMasterL(obj.F_ContainerMasterL || "");
      
      // Check if item is a sample
      if (obj.IsSample === true) {
        setIsSampleItem(true);
        setContainerMaster("0");
      } else {
        setIsSampleItem(false);
      }
    } else {
      setContainerMasterL("");
      setIsSampleItem(false);
    }
  };

  // Helper function to get comma-separated category values
  const getCategoryString = () => {
    return F_CategoryMaster.join(",");
  };

  const itemOptions = State.FillArray1.map((option) => ({
    value: option.Id,
    label: `${option.Name} - ${option.ItemCode}`,
  }));

  useEffect(() => {
    const { containerId, itemId } = prefillDataRef.current;
    if (containerId) {
      (async () => {
        const items = await loadItemsForContainer(containerId);
        if (itemId) {
          const matchedItem = items.find((item) => item.Id == itemId);
          if (matchedItem) {
            setItemMaster(itemId);
            setContainerMasterL(matchedItem.F_ContainerMasterL || "");
            
            // Check if item is a sample
            if (matchedItem.IsSample === true) {
              setIsSampleItem(true);
              setContainerMaster("0");
            } else {
              setIsSampleItem(false);
            }
          }
        }
      })();
    }
  }, []);

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <Row className="mb-3 align-items-center">
        <Col md={2}>
          <h4 className="page-title mb-0" style={{ fontFamily: "Poppins" }}>
            Job Card
          </h4>
        </Col>
        <Col md={3}>
          <div>
            <label className="form-label mb-1 small" style={{ fontFamily: 'Poppins' }}>Container</label>
            <select
              className="form-control form-control-sm"
              name="F_ContainerMaster"
              onChange={(e) => handleContainerChange(e)}
              value={F_ContainerMaster}
              disabled={loading}
              style={{ fontFamily: 'Poppins' }}
            >
              <option value="">Select Container</option>
              {State.FillArray.length > 0 &&
                State.FillArray.map((option) => (
                  <option key={option.Id} value={option.Id}>
                    {option.Name}
                  </option>
                ))}
            </select>
          </div>
        </Col>
        <Col md={3}>
          <div>
            <label className="form-label mb-1 small" style={{ fontFamily: 'Poppins' }}>Item</label>
            <Select
              name="F_ItemMaster"
              value={
                itemOptions.length > 0
                  ? itemOptions.find((opt) => opt.value == F_ItemMaster) || null
                  : null
              }
              onChange={handleItemChange}
              options={itemOptions}
              placeholder="Select Item"
              isClearable
              isSearchable
              classNamePrefix="job-card-item-select"
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  minHeight: "31px",
                  borderRadius: "0.25rem",
                  borderColor: state.isFocused ? "#007bff" : "#ced4da",
                  boxShadow: state.isFocused
                    ? "0 0 0 1px rgba(0,123,255,0.25)"
                    : "none",
                  fontFamily: "Poppins",
                  fontSize: "0.875rem",
                }),
                placeholder: (provided) => ({
                  ...provided,
                  fontSize: "0.875rem",
                  color: "#6c757d",
                  fontFamily: "Poppins",
                }),
                input: (provided) => ({
                  ...provided,
                  fontFamily: "Poppins",
                }),
                singleValue: (provided) => ({
                  ...provided,
                  fontFamily: "Poppins",
                  fontSize: "0.875rem",
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 5,
                  fontFamily: "Poppins",
                  fontSize: "0.875rem",
                }),
              }}
            />
          </div>
        </Col>
        <Col md={4}>
          <div>
            <label
              className="form-label mb-1 small"
              style={{
                display: "block",
                fontWeight: "500",
                color: "#333",
                fontFamily: "Poppins",
              }}
            >
              Categories
              {F_CategoryMaster.length > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#28a745",
                    marginLeft: "8px",
                    backgroundColor: "#d4edda",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    border: "1px solid #c3e6cb",
                  }}
                >
                  {F_CategoryMaster.length} selected
                </span>
              )}
            </label>
            <CustomMultiSelect
              options={State.FillArray2}
              selectedValues={F_CategoryMaster}
              onChange={handleCategoryChange}
              disabled={loading}
              placeholder="Choose categories..."
            />
          </div>
        </Col>
      </Row>
      <Row className="mb-3">
        {F_ContainerMaster &&
          F_ItemMaster &&
          (F_CategoryMaster.length > 0 || isSampleItem) && (
            <>
              {/* If item is sample, always use WoodJobCard */}
              {isSampleItem ? (
                <WoodJobCard
                  key={`wood-sample-${F_ContainerMaster}-${F_ItemMaster}-${getCategoryString()}`}
                  F_ItemMaster={F_ItemMaster}
                  F_ContainerMasterL={F_ContainerMasterL}
                  F_CategoryMaster={getCategoryString()}
                  F_ContainerMaster={F_ContainerMaster}
                />
              ) : (
                <>
                  {/* Metal Categories */}
                  {F_CategoryMaster.some(cat => ["4", "16"].includes(cat)) && (
                    <MetalJobCard
                      key={`metal-${F_ContainerMaster}-${F_ItemMaster}-${getCategoryString()}`}
                      F_ItemMaster={F_ItemMaster}
                      F_ContainerMasterL={F_ContainerMasterL}
                      F_CategoryMaster={getCategoryString()}
                      F_ContainerMaster={F_ContainerMaster}
                    />
                  )}

                  {/* MDF Category */}
                  {F_CategoryMaster.includes("5") && (
                    <MDFJobCard
                      key={`mdf-${F_ContainerMaster}-${F_ItemMaster}-${getCategoryString()}`}
                      F_ItemMaster={F_ItemMaster}
                      F_ContainerMasterL={F_ContainerMasterL}
                      F_CategoryMaster={getCategoryString()}
                      F_ContainerMaster={F_ContainerMaster}
                    />
                  )}

                  {/* Wood Categories */}
                  {F_CategoryMaster.some(cat => ["1", "2", "3", "15"].includes(cat)) && (
                    <WoodJobCard
                      key={`wood-${F_ContainerMaster}-${F_ItemMaster}-${getCategoryString()}`}
                      F_ItemMaster={F_ItemMaster}
                      F_ContainerMasterL={F_ContainerMasterL}
                      F_CategoryMaster={getCategoryString()}
                      F_ContainerMaster={F_ContainerMaster}
                    />
                  )}
                </>
              )}
            </>
          )}
      </Row>
    </div>
  );
};

export default JobCardForm;
