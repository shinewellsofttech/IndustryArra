import React, { useState, useEffect, useRef, useContext } from 'react';
import { Row, Col, Table, Button } from 'react-bootstrap';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Fn_FillListData } from '../../store/Functions';
import { useDispatch } from 'react-redux';
import { API_WEB_URLS } from '../../constants/constAPI';
import { ThemeContext } from '../../context/ThemeContext';

function WoodIssue({woodIssueData = {}, components = [], woodSummary = []}) {
  const woodIssueRef = useRef(null);
  const dispatch = useDispatch();
  const { background } = useContext(ThemeContext);
  const API_URL = API_WEB_URLS.MASTER + "/0/token/UpdateBatchCode";
  const [gridData, setGridData] = useState([]);
  const [pdfFontSize, setPdfFontSize] = useState(false);
  
  // Theme-based colors
  const isDarkMode = background?.value === 'dark';
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const bgColor = isDarkMode ? '#000000' : '#ffffff';
  const headerBgColor = isDarkMode ? '#1a1a1a' : '#f8f9fa';
  const borderColor = isDarkMode ? '#444444' : '#000000';
  const tableHeaderBg = isDarkMode ? '#2a2a2a' : '#f8f9fa';
  const tableHeaderText = isDarkMode ? '#ffffff' : '#000000';

  // Method 1: using html2pdf.js


  // Add states for editable fields
  const [batchNo, setBatchNo] = useState(woodIssueData?.BatchNo || '');
  const [isEditing, setIsEditing] = useState(false);
  
  // Add new state for common remarks
  const [commonRemarks, setCommonRemarks] = useState('');
  const generatePDFWithHtml2PDF = () => {
    const element = woodIssueRef.current;
    
    // Create a temporary container for the PDF content
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    document.body.appendChild(tempContainer);
    
    // Clone the element and add it to the temporary container
    const elementClone = element.cloneNode(true);
    tempContainer.appendChild(elementClone);
    
    // Hide Final CFT columns in the clone
    const finalCftCells = elementClone.querySelectorAll('th, td');
    finalCftCells.forEach(cell => {
      // Check if the cell contains "FINAL CFT" text
      if (cell.textContent.trim() === 'FINAL CFT') {
        // Hide the cell and its corresponding cells in the same column
        const cellIndex = Array.from(cell.parentNode.children).indexOf(cell);
        const table = cell.closest('table');
        
        // Hide all cells in this column
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          if (row.children[cellIndex]) {
            row.children[cellIndex].style.display = 'none';
          }
        });
      }
    });
    
    const opt = {
      margin: 0.5,
      filename: `WoodIssue-${woodIssueData?.ItemCode || 'report'}-html2pdf.pdf`,
      image: { type: 'jpeg', quality: 0.8 },
      html2canvas: {
        scale: 1,         // reduces canvas scale
        scrollY: 0        // helps if scrolling causes issues
      },
      jsPDF: {
        unit: 'mm',
        format: [297, 210],  // landscape A4: width x height in mm
        orientation: 'landscape'
      },
      pagebreak: { mode: ['avoid-all'] }
    };
  
    // Generate PDF from the temporary container
    html2pdf().set(opt).from(elementClone).toPdf().get('pdf').then((pdf) => {
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8); // shrink text size if needed
      }
    }).save().then(() => {
      // Clean up: remove the temporary container
      document.body.removeChild(tempContainer);
    });
  };
  
  // Method 2: using html2canvas + jsPDF
  const generatePDFWithCanvas = () => {
    setPdfFontSize(true);
    setTimeout(() => {
      const input = woodIssueRef.current;
  
      // Hide FINAL CFT columns before PDF generation
      const finalCftElements = input.querySelectorAll('.final-cft-column');
      finalCftElements.forEach(el => {
        el.style.display = 'none';
      });
  
      html2canvas(input, {
        scale: 2,
        logging: false,
        useCORS: true,
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
  
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;
  
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save(`WoodIssue-${woodIssueData?.ItemCode || 'report'}-canvas.pdf`);
  
        // Show FINAL CFT columns again after PDF is generated
        finalCftElements.forEach(el => {
          el.style.display = '';
        });

        setPdfFontSize(false);
      });
    }, 100);
  };
  
  // Method 3: using html2canvas + jsPDF for Print
  const printPDFWithCanvas = () => {
    setPdfFontSize(true);
    setTimeout(() => {
      const input = woodIssueRef.current;
  
      // Hide FINAL CFT columns before PDF generation
      const finalCftElements = input.querySelectorAll('.final-cft-column');
      finalCftElements.forEach(el => {
        el.style.display = 'none';
      });
  
      html2canvas(input, {
        scale: 2,
        logging: false,
        useCORS: true,
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        // Use portrait orientation
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Calculate ratio to fit perfectly on page with no margins
        const marginX = 0; // No margin on left and right
        const marginY = 0; // No margin on top and bottom
        const availableWidth = pdfWidth - (2 * marginX);
        const availableHeight = pdfHeight - (2 * marginY);
        
        const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;
        
        // Center the image if there's any remaining space
        const imgX = marginX + (availableWidth - scaledWidth) / 2;
        const imgY = marginY + (availableHeight - scaledHeight) / 2;

        pdf.addImage(imgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight);
  
        // Open print dialog
        window.open(pdf.output('bloburl'), '_blank').print();
  
        // Show FINAL CFT columns again after PDF is generated
        finalCftElements.forEach(el => {
          el.style.display = '';
        });
  
        setPdfFontSize(false);
      });
    }, 100);
  };
  
  // Export to Excel
  const exportToExcel = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Create header data
    const headerData = [
      ['WOOD ISSUE BILL OF MATERIAL'],
      [''],
      ['PRODUCT NAME', woodIssueData?.ProductName || '', 'PRODUCT CODE', woodIssueData?.ItemCode || ''],
      ['CONTAINER NO', woodIssueData?.ContainerNumber || '', 'INSPECTION DATE', formatDate(woodIssueData?.InspectionDate)],
      ['BATCH NO', woodIssueData?.BatchNo || '', 'QUANTITY', formatNumber(woodIssueData?.Quantity)],
      ['DIMENSIONS (Cm)', '', '', ''],
      ['', 'W', 'D', 'H'],
      ['', formatNumber(woodIssueData?.W), formatNumber(woodIssueData?.D), formatNumber(woodIssueData?.H)],
      ['', '', 'WOOD CFT (Issue)', formatNumber(woodIssueData?.TotalIssueCFT)],
      ['', '', 'WOOD CFT (Final)', formatNumber(woodIssueData?.TotalFinalCFT)],
      ['']
    ];
    
    // Create components data
    let componentsData = [];
    
    // Add component rows
    Object.entries(groupedComponents).forEach(([category, components]) => {
      // Add category header
      componentsData.push([category]);
      
      // Add header row for components
      componentsData.push([
        'S. No.', 'Descriptions', 
        'L', 'W', 'T', 'Batch Qty.', 'FINAL CFT',
        'L', 'W', 'T', 'Batch Qty.', 'Issue cft'
      ]);
      
      // Add component rows
      components.forEach(component => {
        componentsData.push([
          component?.SNo || '',
          component?.Description || '',
          formatNumber(component?.L1),
          formatNumber(component?.W1),
          formatNumber(component?.T1),
          formatNumber(component?.BatchQty),
          formatNumber(component?.FinalCFT),
          formatNumber(component?.L2),
          formatNumber(component?.W2),
          formatNumber(component?.T2),
          formatNumber(component?.BatchQtyIssue),
          formatNumber(component?.IssueCFT)
        ]);
      });
      
      // Add category total
      const categoryTotals = calculateTotals(components);
      componentsData.push([
        '', 'TOTAL cft', '', '', '', '', 
        formatNumber(categoryTotals.finalCft),
        '', '', '', '', 
        formatNumber(categoryTotals.issueCft)
      ]);
      
      // Add empty row for spacing
      componentsData.push(['']);
    });
    
    // Add grand total
    componentsData.push([
      '', 'TOTAL cft', '', '', '', '', 
      formatNumber(grandTotals.finalCft),
      '', '', '', '', 
      formatNumber(grandTotals.issueCft)
    ]);
    
    // Add wood summary data
    componentsData.push(['']);
    componentsData.push(['WOOD ISSUE SUMMARY']);
    componentsData.push(['L (in)', 'THK (in)', 'CFT']);
    
    // Add wood summary rows
    (woodSummary || []).forEach(item => {
      componentsData.push([
        formatNumber(item?.Length),
        formatNumber(item?.Thk),
        formatNumber(item?.Cft)
      ]);
    });
    
    // Add wood summary total
    componentsData.push([
      'TOTAL',
      '',
      formatNumber((woodSummary || []).reduce((sum, item) => sum + Number(item?.Cft || 0), 0))
    ]);
    
    // Create worksheet from data
    const ws = XLSX.utils.aoa_to_sheet([...headerData, ...componentsData]);
    
    // Set column widths to match visual layout
    const colWidths = [
      { wch: 10 }, // S. No.
      { wch: 30 }, // Descriptions
      { wch: 10 }, // L
      { wch: 10 }, // W
      { wch: 10 }, // T
      { wch: 12 }, // Batch Qty.
      { wch: 12 }, // FINAL CFT
      { wch: 10 }, // L
      { wch: 10 }, // W
      { wch: 10 }, // T
      { wch: 12 }, // Batch Qty.
      { wch: 12 }  // Issue cft
    ];
    ws['!cols'] = colWidths;
    
    // Add some basic styling
    // Note: XLSX doesn't support full styling, but we can set some basic properties
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Wood Issue');
    
    // Save the workbook
    XLSX.writeFile(wb, `WoodIssue-${woodIssueData?.ItemCode || 'report'}.xlsx`);
  };
  // Handle batch no change
  const handleBatchNoChange = (e) => {
    const newBatchNo = e.target.value;
    setBatchNo(newBatchNo);
    setIsEditing(true); // Set editing flag when user types
  };

  // Function to save the batch number
  const saveBatchNo = () => {
    // API call would go here
    const Id = woodIssueData?.Id;
    Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/"+batchNo+"/"+Id);
    console.log('Batch No updated to:', batchNo);
    setIsEditing(false);
    
    window.location.reload();
  };

  // Safely filter components
  const filteredComponents = Array.isArray(components) ? 
    components.filter(component => 
      component?.F_WoodIssueMasterH == woodIssueData?.Id
    ) : [];

  // Group components by category with null checks
  const groupedComponents = filteredComponents.reduce((acc, component) => {
    const category = component?.CategoryName || component?.Category || 'W';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(component);
    return acc;
  }, {});

  // Calculate totals with null checks
  const calculateTotals = (components) => {
    if (!Array.isArray(components)) return { finalCft: 0, issueCft: 0 };
    
    return components.reduce((acc, component) => ({
      finalCft: acc.finalCft + Number(component?.FinalCFT || 0),
      issueCft: acc.issueCft + Number(component?.IssueCFT || 0)
    }), { finalCft: 0, issueCft: 0 });
  };

  // Calculate grand totals
  const grandTotals = calculateTotals(filteredComponents);

  // Format date safely
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString();
    } 
    catch (error) {
      return '';
    }
  };

  // Format number safely
  const formatNumber = (number, decimals = 1) => {
    const num = Number(number);
    if (isNaN(num)) return '0';
    
    // Format with fixed decimals
    const formatted = num.toFixed(decimals);
    
    // Remove trailing zeros after decimal point
    return formatted.replace(/\.0+$/, '');
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              margin: 0mm !important;
              padding: 0mm !important;
              size: A4 portrait;
            }
            * {
              margin-left: 0 !important;
              margin-right: 0 !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              overflow: visible !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              margin: 0 !important;
            }
            body > *:first-child {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
            .container, .container-fluid, .row, .col {
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-safe-page {
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            .wood-issue-container {
              margin: 0 !important;
              padding: 0 !important;
              border: 1px solid #000000 !important;
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
            }
            .wood-issue-container > div {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            .no-print {
              display: none !important;
            }
            table {
              margin: 0 !important;
              padding: 0 !important;
              page-break-inside: avoid;
              width: 100% !important;
              max-width: 100% !important;
              table-layout: auto !important;
            }
            table:first-child {
              margin-top: 0 !important;
            }
            table tr:first-child td:first-child,
            table tr:first-child th:first-child {
              padding-top: 0 !important;
            }
            td, th {
              padding-top: 0 !important;
            }
            .mb-0, .mb-1, .mb-2, .mb-3, .mb-4, .mb-5 {
              margin-bottom: 0 !important;
            }
            .mt-0, .mt-1, .mt-2, .mt-3, .mt-4, .mt-5 {
              margin-top: 0 !important;
            }
            .flex-container {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .flex-container > div:first-child {
              flex: 1 !important;
              min-width: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .flex-container table {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
          .dimensions-table {
            border: none !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
          }
          .dimensions-table tr {
            border: none !important;
          }
          .dimensions-table thead {
            border: none !important;
          }
          .dimensions-table tbody {
            border: none !important;
          }
          .dimensions-table th {
            border-right: 1px solid rgb(0, 0, 0) !important;
            border-bottom: 1px solid rgb(0, 0, 0) !important;
            border-top: none !important;
            border-left: none !important;
            border-color: rgb(0, 0, 0) !important;
            -webkit-border-right-color: rgb(0, 0, 0) !important;
            -webkit-border-bottom-color: rgb(0, 0, 0) !important;
          }
          .dimensions-table th:first-child {
            border-left: none !important;
            border-top: none !important;
          }
          .dimensions-table th:last-child {
            border-right: none !important;
            -webkit-border-right-color: transparent !important;
          }
          .dimensions-table thead th {
            border-right-color: rgb(0, 0, 0) !important;
            border-bottom-color: rgb(0, 0, 0) !important;
          }
          .dimensions-table thead th:first-child,
          .dimensions-table thead th:nth-child(2) {
            border-right: 1px solid rgb(0, 0, 0) !important;
            border-bottom: 1px solid rgb(0, 0, 0) !important;
          }
          .dimensions-table thead th:last-child {
            border-right: none !important;
            border-bottom: 1px solid rgb(0, 0, 0) !important;
          }
          .dimensions-table td {
            border-top: none !important;
            border-left: none !important;
            border-bottom: none !important;
          }
          .dimensions-table td:last-child {
            border-right: none !important;
          }
          .wood-summary-table thead th {
            border: 1px solid rgb(0, 0, 0) !important;
            border-color: rgb(0, 0, 0) !important;
            -webkit-border-color: rgb(0, 0, 0) !important;
          }
          .wood-issue-container table:not(.dimensions-table) th,
          .wood-issue-container table:not(.dimensions-table) td {
            border-color: rgb(0, 0, 0) !important;
            -webkit-border-color: rgb(0, 0, 0) !important;
          }
          .wood-issue-container table:not(.dimensions-table) th {
            border: 1px solid rgb(0, 0, 0) !important;
          }
          .wood-issue-container table:not(.dimensions-table) td {
            border: 1px solid rgb(0, 0, 0) !important;
          }
          .wood-issue-container > div {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .wood-issue-container .flex-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .wood-issue-container .flex-container > div:first-child {
            flex: 1 !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .wood-issue-container .flex-container table {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `}
      </style>
      <div className="print-safe-page" style={{ backgroundColor: bgColor, color: textColor }}>
        <div className="text-end mb-3 no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        {/* <Button 
          variant="primary" 
          onClick={generatePDFWithHtml2PDF}
        >
          Download PDF (Method 1)
        </Button> */}
        {/* <Button 
          variant="secondary" 
          onClick={generatePDFWithCanvas}
        >
          Download PDF
        </Button> */}
        <Button 
          variant="info" 
          onClick={printPDFWithCanvas}
        >
          Print PDF
        </Button>
        {isEditing && (
          <Button 
            variant="primary" 
            onClick={saveBatchNo}
          >
            Save Batch No
          </Button>
        )}
        {/* <Button 
          variant="success" 
          onClick={exportToExcel}
        >
          Export to Excel
        </Button> */}
      </div>
      <div className="wood-issue-container"  style={{
    fontSize: pdfFontSize ? '8px' : undefined,
    border: `1px solid ${borderColor}`,
    backgroundColor: bgColor,
    color: textColor,
    margin: 0,
    padding: 0
  }} ref={woodIssueRef}>
      <div style={{ border: `1px solid ${borderColor}`, backgroundColor: bgColor, margin: 0, padding: 0 }}>
        <Table 
          bordered 
          className="mb-0"
          style={{
            border: `1px solid ${borderColor}`,
            borderCollapse: 'collapse',
            backgroundColor: bgColor,
            color: textColor
          }}
        >
          <tbody>

            <tr>
              <td colSpan="4" className="text-center" style={{ padding: '8px', backgroundColor: headerBgColor, border: `1px solid ${borderColor}`, color: textColor }}>
                <h5 style={{ margin: 0, color: textColor, fontWeight: 'bold', fontSize: '16px' }}>WOOD ISSUE BILL OF MATERIAL </h5>
              </td>
            </tr>

            <tr>
              <td style={{ width: '15%', padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>PRODUCT NAME</td>
              <td style={{ width: '35%', padding: '8px 10px', color: textColor, fontSize: '13px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{woodIssueData?.ProductName || ''}</td>
              <td style={{ width: '15%', padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>PRODUCT CODE</td>
              <td style={{ width: '35%', padding: '8px 10px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: textColor, fontSize: '13px' }}>
                  <span>{woodIssueData?.ItemCode || ''}</span>
                </div>
              </td>
            </tr>

            <tr>
              <td style={{ padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>CONTAINER NO</td>
              <td style={{ padding: '8px 10px', color: textColor, fontSize: '13px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{woodIssueData?.ContainerNumber || ''}</td>
              <td style={{ padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>INSPECTION DATE</td>
              <td style={{ padding: '8px 10px', color: textColor, fontSize: '13px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                {(woodIssueData?.InspectionDate)}
              </td>
            </tr>

            <tr>
              <td style={{ padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor, verticalAlign: 'middle' }}>BATCH NO</td>
              <td style={{ padding: '8px 10px', color: textColor, border: `1px solid ${borderColor}`, backgroundColor: bgColor, verticalAlign: 'middle' }}>
                <input 
                  type="text"
                  value={woodIssueData?.BatchNo}
                  onChange={handleBatchNoChange}
                  style={{
                    width: '100%',
                    border: 'none',
                    padding: '4px',
                    backgroundColor: 'transparent',
                    color: textColor,
                    fontSize: '13px'
                  }}
                />
              </td>
              <td style={{ padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>QUANTITY</td>
              <td style={{ padding: '8px 10px', color: textColor, fontSize: '13px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(woodIssueData?.Quantity)}</td>
            </tr>

            <tr>
              <td style={{ padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor, verticalAlign: 'middle' }}>DIMENSIONS (Cm)</td>
              <td style={{ border: `1px solid ${borderColor}`, padding: '4px', backgroundColor: bgColor, verticalAlign: 'middle' }}>
                <table className="dimensions-table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0, border: 'none', backgroundColor: bgColor }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', padding: '2px 4px', color: textColor, fontWeight: 'bold', fontSize: '10px', backgroundColor: bgColor }}>W</th>
                      <th style={{ textAlign: 'center', padding: '2px 4px', color: textColor, fontWeight: 'bold', fontSize: '10px', backgroundColor: bgColor }}>D</th>
                      <th style={{ textAlign: 'center', padding: '2px 4px', color: textColor, fontWeight: 'bold', fontSize: '10px', backgroundColor: bgColor }}>H</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'center', padding: '2px 4px', color: textColor, fontSize: '12px', borderTop: 'none', borderLeft: 'none', borderRight: `1px solid ${borderColor}`, borderBottom: 'none', backgroundColor: bgColor }}>{formatNumber(woodIssueData?.W)}</td>
                      <td style={{ textAlign: 'center', padding: '2px 4px', color: textColor, fontSize: '12px', borderTop: 'none', borderLeft: 'none', borderRight: `1px solid ${borderColor}`, borderBottom: 'none', backgroundColor: bgColor }}>{formatNumber(woodIssueData?.D)}</td>
                      <td style={{ textAlign: 'center', padding: '2px 4px', color: textColor, fontSize: '12px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', backgroundColor: bgColor }}>{formatNumber(woodIssueData?.H)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style={{ padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>WOOD CFT (Issue)</td>
              <td style={{ padding: '8px 10px', color: textColor, fontSize: '13px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                {formatNumber(woodIssueData?.TotalIssueCFT)}
              </td>
            </tr>

            <tr>
              <td style={{ padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>JobCard Code</td>
              <td style={{ padding: '8px 10px', color: textColor, fontSize: '13px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{woodIssueData?.JobCardInitial || ''}</td>
              <td style={{ padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>WOOD CFT (Final)</td>
              <td style={{ padding: '8px 10px', color: textColor, fontSize: '13px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                {formatNumber(woodIssueData?.TotalFinalCFT)}
              </td>
            </tr>
          </tbody>
        </Table>

        <div className="flex-container" style={{ display: 'flex', width: '100%', margin: 0, padding: 0 }}>
          <div style={{ flex: '1', minWidth: 0, margin: 0, padding: 0 }}>
            <Table 
              bordered 
              className="mb-0"
              style={{
                border: `1px solid ${borderColor}`,
                borderCollapse: 'collapse',
                width: '100%',
                margin: 0,
                padding: 0,
                tableLayout: 'auto',
                backgroundColor: bgColor,
                color: textColor
              }}
            >
              <thead style={{ border: `1px solid ${borderColor}` }}>
                {/* Combined headers row */}
                <tr>
                  <th style={{ textAlign: 'center', padding: '6px', width: '50px', color: tableHeaderText, fontWeight: 'bold', fontSize: '11px', backgroundColor: tableHeaderBg, border: `1px solid ${borderColor}` }}>S. No.</th>
                  <th style={{ textAlign: 'center', padding: '6px', width: '250px', color: tableHeaderText, fontWeight: 'bold', fontSize: '11px', backgroundColor: tableHeaderBg, border: `1px solid ${borderColor}` }}>Descriptions</th>
                  <th colSpan="3" style={{ 
                    textAlign: 'center', 
                    padding: '6px', 
                    fontWeight: 'bold', 
                    fontSize: '11px',
                    backgroundColor: tableHeaderBg,
                    color: tableHeaderText,
                    border: `1px solid ${borderColor}`
                  }}>
                    FINAL SIZE IN CENTIMETERS
                  </th>
                  <th style={{ textAlign: 'center', padding: '6px', width: '80px', color: tableHeaderText, fontWeight: 'bold', fontSize: '11px', backgroundColor: tableHeaderBg, border: `1px solid ${borderColor}` }}>Batch Qty.</th>
                  <th className="final-cft-column" style={{ textAlign: 'center', padding: '6px', width: '80px', color: tableHeaderText, fontWeight: 'bold', fontSize: '11px', backgroundColor: tableHeaderBg, border: `1px solid ${borderColor}` }}>FINAL CFT</th>
                  <th colSpan="3" style={{ 
                    textAlign: 'center', 
                    padding: '6px', 
                    fontWeight: 'bold', 
                    fontSize: '11px',
                    backgroundColor: tableHeaderBg,
                    color: tableHeaderText,
                    border: `1px solid ${borderColor}`
                  }}>
                    ISSUE SIZE IN INCH
                  </th>
                  <th style={{ textAlign: 'center', padding: '6px', width: '80px', color: tableHeaderText, fontWeight: 'bold', fontSize: '11px', backgroundColor: tableHeaderBg, border: `1px solid ${borderColor}` }}>Batch Qty.</th>
                  <th style={{ textAlign: 'center', padding: '6px', width: '80px', color: tableHeaderText, fontWeight: 'bold', fontSize: '11px', backgroundColor: tableHeaderBg, border: `1px solid ${borderColor}` }}>Issue cft</th>
                </tr>
                {/* Column headers row for L, W, T */}
                <tr>
                  <th style={{ border: `1px solid ${borderColor}`, borderTop: 'none', padding: '0', backgroundColor: tableHeaderBg }}></th>
                  <th style={{ border: `1px solid ${borderColor}`, borderTop: 'none', padding: '0', backgroundColor: tableHeaderBg }}></th>
                  <th style={{ textAlign: 'center', padding: '4px', width: '60px', color: tableHeaderText, fontWeight: 'bold', fontSize: '10px', border: `1px solid ${borderColor}`, borderTop: 'none', backgroundColor: tableHeaderBg }}>L</th>
                  <th style={{ textAlign: 'center', padding: '4px', width: '60px', color: tableHeaderText, fontWeight: 'bold', fontSize: '10px', border: `1px solid ${borderColor}`, borderTop: 'none', backgroundColor: tableHeaderBg }}>W</th>
                  <th style={{ textAlign: 'center', padding: '4px', width: '60px', color: tableHeaderText, fontWeight: 'bold', fontSize: '10px', border: `1px solid ${borderColor}`, borderTop: 'none', backgroundColor: tableHeaderBg }}>T</th>
                  <th style={{ border: `1px solid ${borderColor}`, borderTop: 'none', padding: '0', backgroundColor: tableHeaderBg }}></th>
                  <th className="final-cft-column" style={{ border: `1px solid ${borderColor}`, borderTop: 'none', padding: '0', backgroundColor: tableHeaderBg }}></th>
                  <th style={{ textAlign: 'center', padding: '4px', width: '60px', color: tableHeaderText, fontWeight: 'bold', fontSize: '10px', border: `1px solid ${borderColor}`, borderTop: 'none', backgroundColor: tableHeaderBg }}>L</th>
                  <th style={{ textAlign: 'center', padding: '4px', width: '60px', color: tableHeaderText, fontWeight: 'bold', fontSize: '10px', border: `1px solid ${borderColor}`, borderTop: 'none', backgroundColor: tableHeaderBg }}>W</th>
                  <th style={{ textAlign: 'center', padding: '4px', width: '60px', color: tableHeaderText, fontWeight: 'bold', fontSize: '10px', border: `1px solid ${borderColor}`, borderTop: 'none', backgroundColor: tableHeaderBg }}>T</th>
                  <th style={{ border: `1px solid ${borderColor}`, borderTop: 'none', padding: '0', backgroundColor: tableHeaderBg }}></th>
                  <th style={{ border: `1px solid ${borderColor}`, borderTop: 'none', padding: '0', backgroundColor: tableHeaderBg }}></th>
                </tr>
              </thead>
              <tbody>
                {/* First, show all non-J categories together, sorted by S.No */}
                {(() => {
                  // Flatten all non-J components and sort by S.No
                  const allNonJComponents = Object.entries(groupedComponents)
                    .filter(([category]) => category !== 'J')
                    .flatMap(([category, components]) => components);
                  
                  // Sort all components by S.No
                  const sortedNonJComponents = allNonJComponents.sort((a, b) => {
                    const snoA = Number(a?.SNo) || 0;
                    const snoB = Number(b?.SNo) || 0;
                    return snoA - snoB;
                  });
                  
                  return sortedNonJComponents.map((component, index) => (
                          <tr key={`nonJ-${component?.SNo || index}-${index}`}>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {component?.SNo || ''}
                            </td>
                            <td style={{
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {component?.Description || ''}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.L1)}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.W1)}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.T1)}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.BatchQty)}
                            </td>
                            <td className="final-cft-column" style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.FinalCFT)}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.L2)}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.W2)}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.T2)}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.BatchQtyIssue)}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              padding: '4px 6px',
                              color: textColor,
                              fontSize: '12px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor
                            }}>
                              {formatNumber(component?.IssueCFT)}
                            </td>
                          </tr>
                        ));
                })()}
                
                {/* Then show JOINTING heading if J category exists */}
                {groupedComponents['J'] && groupedComponents['J'].length > 0 && (
                  <tr>
                    <td colSpan="11" style={{ 
                      textAlign: 'center', 
                      padding: '8px', 
                      color: textColor, 
                      fontSize: '13px', 
                      fontWeight: 'bold',
                      backgroundColor: headerBgColor,
                      border: `1px solid ${borderColor}`
                    }}>
                      JOINTING
                    </td>
                  </tr>
                )}
                
                {/* Finally, show J category with restarting S.No */}
                {groupedComponents['J'] && groupedComponents['J'].map((component, index) => (
                  <tr key={`J-${index}`}>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {index + 1}
                    </td>
                    <td style={{
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {component?.Description || ''}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.L1)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.W1)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.T1)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.BatchQty)}
                    </td>
                    <td className="final-cft-column" style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.FinalCFT)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.L2)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.W2)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.T2)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.BatchQtyIssue)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '4px 6px',
                      color: textColor,
                      fontSize: '12px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgColor
                    }}>
                      {formatNumber(component?.IssueCFT)}
                    </td>
                  </tr>
                ))}
                
                {/* Grand Total */}
                <tr style={{ borderTop: `1px solid ${borderColor}` }}>
                  <td style={{ border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                  <td style={{ padding: '8px 6px', color: textColor, fontSize: '12px', fontWeight: 'bold', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>TOTAL cft</td>
                  <td colSpan="4" style={{ border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                  <td className="final-cft-column" style={{ textAlign: 'center', padding: '8px 6px', color: textColor, fontSize: '12px', fontWeight: 'bold', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                    {formatNumber(grandTotals.finalCft)}
                  </td>
                  <td colSpan="4" style={{ border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                  <td style={{ textAlign: 'center', padding: '8px 6px', color: textColor, fontSize: '12px', fontWeight: 'bold', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                    {formatNumber(grandTotals.issueCft)}
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>

          <div style={{ 
            width: '200px', 
            borderLeft: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: bgColor
          }}>
            <div style={{ 
              padding: '6px',
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: headerBgColor,
              borderBottom: `1px solid ${borderColor}`,
              height: '65px', // Match the height of the header rows
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textColor,
              fontSize: '12px'
            }}>
              REMARKS
            </div>
            <textarea
              value={commonRemarks}
              onChange={(e) => setCommonRemarks(e.target.value)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                padding: '8px',
                resize: 'none',
                color: textColor,
                backgroundColor: bgColor,
                fontSize: '12px'
              }}
                disabled
            />
          </div>
        </div>
      </div>


      {/* Wood Issue Summary Section */}
      <div style={{ marginTop: '0px', backgroundColor: bgColor }}>
        <div style={{ display: 'flex', border: `1px solid ${borderColor}` }}>
          <div style={{ flex: '1' }}>
            <Table bordered className="mb-0 wood-summary-table" style={{ border: `1px solid ${borderColor}`, borderCollapse: 'collapse', backgroundColor: bgColor, color: textColor }}>
              <thead style={{ border: `1px solid ${borderColor}` }}>
                <tr>
                  <th colSpan="3" style={{ 
                    textAlign: 'center', 
                    padding: '6px', 
                    backgroundColor: tableHeaderBg,
                    color: tableHeaderText,
                    fontWeight: 'bold',
                    fontSize: '12px',
                    border: `1px solid ${borderColor}`
                  }}>
                    WOOD ISSUE SUMMARY
                  </th>
                </tr>
                <tr>
                  <th style={{ 
                    textAlign: 'center', 
                    padding: '4px', 
                    color: tableHeaderText,
                    fontWeight: 'bold',
                    fontSize: '10px',
                    width: '100px',
                    backgroundColor: tableHeaderBg,
                    border: `1px solid ${borderColor}`
                  }}>
                    L (in)
                  </th>
                  <th style={{ 
                    textAlign: 'center', 
                    padding: '4px', 
                    color: tableHeaderText,
                    fontWeight: 'bold',
                    fontSize: '10px',
                    width: '100px',
                    backgroundColor: tableHeaderBg,
                    border: `1px solid ${borderColor}`
                  }}>
                    THK (in)
                  </th>
                  <th style={{ 
                    textAlign: 'center', 
                    padding: '4px', 
                    color: tableHeaderText,
                    fontWeight: 'bold',
                    fontSize: '10px',
                    width: '100px',
                    backgroundColor: tableHeaderBg,
                    border: `1px solid ${borderColor}`
                  }}>
                    CFT
                  </th>
                </tr>
              </thead>
              <tbody>
                {(woodSummary || []).map((item, index) => (
                  <tr key={item?.ID || index}>
                    <td style={{ textAlign: 'center', padding: '8px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                      {formatNumber(item?.Length)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                      {formatNumber(item?.Thk)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                      {formatNumber(item?.Cft)}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ textAlign: 'center', padding: '8px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>
                    TOTAL
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor  }}>
                    {formatNumber(
                      (woodSummary || []).reduce((sum, item) => sum + Number(item?.Cft || 0), 0)
                    )}
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>

          {/* ISSUED STOCK Section */}
          <div style={{ 
            width: '300px', 
            borderLeft: `1px solid ${borderColor}`,
            borderTop: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: bgColor
          }}>
            <div style={{ 
              padding: '6px',
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: headerBgColor,
              borderBottom: `1px solid ${borderColor}`,
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textColor,
              fontSize: '12px'
            }}>
              ISSUED STOCK
            </div>
            <textarea
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                padding: '8px',
                resize: 'none',
                color: textColor,
                backgroundColor: bgColor,
                fontSize: '12px'
              }}
                disabled
            />
          </div>

          {/* RE-ISSUED STOCK Section */}
          <div style={{ 
            width: '300px', 
            borderLeft: `1px solid ${borderColor}`,
            borderTop: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: bgColor
          }}>
            <div style={{ 
              padding: '6px',
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: headerBgColor,
              borderBottom: `1px solid ${borderColor}`,
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textColor,
              fontSize: '12px'
            }}>
              RE-ISSUED STOCK
            </div>
            <textarea
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                padding: '8px',
                resize: 'none',
                color: textColor,
                backgroundColor: bgColor,
                fontSize: '12px'
              }}
                disabled
            />
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default WoodIssue;