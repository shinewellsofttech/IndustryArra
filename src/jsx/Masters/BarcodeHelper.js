import JsBarcode from "jsbarcode";
import qrcode from "qrcode-generator";

export const generateQRCodeSVG = (text) => {
  if (!text) return "";
  try {
    // 0 = automatic type selection (auto-fit based on string length)
    // 'M' = medium error correction (approx 15% recovery)
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    
    // createSvgTag parameters: (cellSize, margin)
    // cellSize = 1.5 gives a highly detailed yet compact size
    // margin = 0 removes default extra whitespace
    let svgTag = qr.createSvgTag(1.5, 0);
    // Set QR code size to 25mm x 25mm (1 inch x 1 inch) for printing
    svgTag = svgTag.replace(/width="[^"]*"/i, 'width="25mm"').replace(/height="[^"]*"/i, 'height="25mm"');
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
  const container = jobCard.F_ContainerMasterL || F_ContainerMasterL || '';
  const item = jobCard.F_ItemMaster || F_ItemMaster || '';
  const component = jobCard.F_ComponentsMaster || '';
  const category = F_CategoryMaster || jobCard.F_CategoryMaster || '';
  const val = `${container}-${item}-${component}-${category}`;
  console.log("getBarcodeValue generated:", val);
  return val;
};

/**
 * Parses a QR scanned value back into its component IDs.
 * Supports both new format (- separated) and previous format (| separated).
 * Supports both 4-part and 5-part values.
 * @param {string} barcodeValue
 * @returns {{ F_ContainerMasterL, F_ItemMaster, F_ComponentsMaster, F_CategoryMaster, F_MachineMaster }}
 */
export const parseBarcodeValue = (barcodeValue) => {
  if (!barcodeValue) return null;
  console.log("parseBarcodeValue parsing:", barcodeValue);
  
  // Try splitting by '-' first
  let parts = barcodeValue.split('-');
  if (parts.length >= 4) {
    const parsed = {
      F_ContainerMasterL: parts[0] || '',
      F_ItemMaster: parts[1] || '',
      F_ComponentsMaster: parts[2] || '',
      F_CategoryMaster: parts[3] || '',
      F_MachineMaster: parts[4] || '',
    };
    console.log("parseBarcodeValue successfully parsed using '-' separator:", parsed);
    return parsed;
  }
  
  // Fallback to '|' separator
  parts = barcodeValue.split('|');
  if (parts.length >= 4) {
    const parsed = {
      F_ContainerMasterL: parts[0] || '',
      F_ItemMaster: parts[1] || '',
      F_ComponentsMaster: parts[2] || '',
      F_CategoryMaster: parts[3] || '',
      F_MachineMaster: parts[4] || '',
    };
    console.log("parseBarcodeValue successfully parsed using '|' separator:", parsed);
    return parsed;
  }
  
  console.warn("parseBarcodeValue: Failed to parse barcodeValue. Expected at least 4 parts separated by '-' or '|'. Got parts:", parts);
  return null;
};
