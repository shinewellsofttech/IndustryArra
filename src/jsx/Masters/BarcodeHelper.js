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
    return qr.createSvgTag(1.5, 0);
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


export const getBarcodeValue = (jobCard, F_ContainerMasterL, F_ItemMaster) => {
  const container = jobCard.F_ContainerMasterL || F_ContainerMasterL || '';
  const item = jobCard.F_ItemMaster || F_ItemMaster || '';
  const component = jobCard.F_ComponentsMaster || '';
  return `${container}${item}${component}`;
};
