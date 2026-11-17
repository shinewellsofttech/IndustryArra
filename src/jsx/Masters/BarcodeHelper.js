import JsBarcode from "jsbarcode";
import qrcode from "qrcode-generator";

export const generateQRCodeSVG = (text) => {
  if (!text) return "";
  try {
    // 0 = automatic type selection (auto-fit based on string length)
    // 'L' = Low error correction (7% recovery) yields the lowest module count (Version 1, 21x21 dots),
    // which makes individual modules ~40% thicker and bolder for effortless scanning at 18mm x 18mm.
    const qr = qrcode(0, "L");
    qr.addData(text);
    qr.make();
    
    // createSvgTag parameters: (cellSize = 2, margin = 1)
    // margin = 1 provides a built-in quiet zone so the QR code never blends into adjacent print borders
    let svgTag = qr.createSvgTag(2, 1);
    
    // Set QR code size strictly to 18mm x 18mm - compact size maintained
    // Inject crispEdges and pure white background for maximum optical contrast
    svgTag = svgTag
      .replace(/width="[^"]*"/i, 'width="18mm"')
      .replace(/height="[^"]*"/i, 'height="18mm"')
      .replace(/<svg\b/i, '<svg style="shape-rendering: crispEdges; background: #ffffff; display: block;"');
      
    return svgTag;
  } catch (error) {
    console.error("Error generating QR code SVG:", error);
    return "";
  }
};

export const generateCode128SVG = (text) => {
  if (!text) return "";
  try {
    const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    
    JsBarcode(svgNode, text, {
      format: "CODE128",
      lineColor: "#000000",
      width: 1.0,        // Narrow element width for compact barcode
      height: 25,        // Compact vertical height
      displayValue: true,
      fontSize: 10,
      font: "monospace",
      margin: 0
    });
    
    svgNode.setAttribute("style", "image-rendering: pixelated; display: block; max-width: 100%;");
    
    const xmlSerializer = new XMLSerializer();
    return xmlSerializer.serializeToString(svgNode);
  } catch (error) {
    console.error("Error generating Code 128 SVG:", error);
    return "";
  }
};


/**
 * Encodes all 4 core IDs into the QR barcode value using - separator (excluding machine ID).
 * @param {object} jobCard - The job card object
 * @param {string|number} F_ContainerMasterL
 * @param {string|number} F_ItemMaster
 * @param {string|number} F_CategoryMaster
 */
export const getBarcodeValue = (jobCard, F_ContainerMasterL, F_ItemMaster, F_CategoryMaster) => {
  const container = jobCard?.F_ContainerMasterL || F_ContainerMasterL || '';
  const item = jobCard?.F_ItemMaster || F_ItemMaster || '';
  const component = jobCard?.F_ComponentsMaster || '';
  
  // Prefer the specific job card's own category ID; fallback to the first ID if comma-separated
  let category = jobCard?.F_CategoryMaster;
  if (!category && F_CategoryMaster) {
    category = typeof F_CategoryMaster === 'string' && F_CategoryMaster.includes(',')
      ? F_CategoryMaster.split(',')[0].trim()
      : F_CategoryMaster;
  }
  category = category || '';
  
  const val = `${container}-${item}-${component}-${category}`;
  console.log("getBarcodeValue generated:", val);
  return val;
};

/**
 * Parses a QR scanned value back into its component IDs.
 * Supports both new format (- separated) and previous format (| separated).
 * Supports 4-part, 5-part, Wood Issue (WI-...), and direct JobCardNo values.
 * @param {string} barcodeValue
 * @returns {{ F_ContainerMasterL, F_ItemMaster, F_ComponentsMaster, F_CategoryMaster, F_MachineMaster, JobCardNo }}
 */
export const parseBarcodeValue = (barcodeValue) => {
  if (!barcodeValue) return null;
  const cleanVal = String(barcodeValue).trim();
  if (!cleanVal) return null;

  console.log("parseBarcodeValue parsing:", cleanVal);
  
  // Check for Wood Issue format (e.g. WI-12-45 or WI-12)
  if (cleanVal.toUpperCase().startsWith("WI-")) {
    const wiParts = cleanVal.split("-");
    const parsed = {
      F_ContainerMasterL: wiParts[1] || "",
      F_ItemMaster: wiParts[2] || "",
      F_ComponentsMaster: "",
      F_CategoryMaster: "",
      F_MachineMaster: "",
      JobCardNo: cleanVal
    };
    console.log("parseBarcodeValue parsed WI format:", parsed);
    return parsed;
  }

  // Try splitting by '-' first
  let parts = cleanVal.split('-');
  if (parts.length >= 4) {
    const parsed = {
      F_ContainerMasterL: parts[0] || '',
      F_ItemMaster: parts[1] || '',
      F_ComponentsMaster: parts[2] || '',
      F_CategoryMaster: parts[3] || '',
      F_MachineMaster: parts[4] || '',
      JobCardNo: parts[5] || '',
    };
    console.log("parseBarcodeValue successfully parsed using '-' separator:", parsed);
    return parsed;
  }
  
  // Fallback to '|' separator
  parts = cleanVal.split('|');
  if (parts.length >= 4) {
    const parsed = {
      F_ContainerMasterL: parts[0] || '',
      F_ItemMaster: parts[1] || '',
      F_ComponentsMaster: parts[2] || '',
      F_CategoryMaster: parts[3] || '',
      F_MachineMaster: parts[4] || '',
      JobCardNo: parts[5] || '',
    };
    console.log("parseBarcodeValue successfully parsed using '|' separator:", parsed);
    return parsed;
  }
  
  // If value is a direct JobCardNo (e.g. A740/W1)
  if (cleanVal.length >= 2) {
    const parsed = {
      JobCardNo: cleanVal,
      F_ContainerMasterL: '',
      F_ItemMaster: '',
      F_ComponentsMaster: '',
      F_CategoryMaster: '',
      F_MachineMaster: '',
    };
    console.log("parseBarcodeValue parsed as direct JobCardNo:", parsed);
    return parsed;
  }

  console.warn("parseBarcodeValue: Failed to parse barcodeValue:", cleanVal);
  return null;
};
