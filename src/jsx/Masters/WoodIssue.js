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
import { generateQRCodeSVG } from './BarcodeHelper';

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
  
  // Native A4 print handler
  const printPDFWithCanvas = () => {
    handlePrintA4();
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
      ['SHIPMENT NO', woodIssueData?.ContainerNumber || '', 'INSPECTION DATE', formatDate(woodIssueData?.InspectionDate)],
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

  // Calculate totals with null checks (Issue cft includes IssueCFT + IssueCFT3)
  const calculateTotals = (components) => {
    if (!Array.isArray(components)) return { finalCft: 0, issueCft: 0 };
    
    return components.reduce((acc, component) => ({
      finalCft: acc.finalCft + Number(component?.FinalCFT || 0),
      issueCft: acc.issueCft + Number(component?.IssueCFT || 0) + Number(component?.IssueCFT3 || 0)
    }), { finalCft: 0, issueCft: 0 });
  };

  // Calculate grand totals
  const grandTotals = calculateTotals(filteredComponents);

  // Check if component has L3/W3/T3 (re-issue row)
  const hasIssue3 = (c) => c != null && c.L3 != null && c.W3 != null && c.T3 != null;

  // Format date safely
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) {
        return dateString;
      }
      return d.toLocaleDateString();
    } 
    catch (error) {
      return dateString || '';
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

  // Generate clean, resolution-independent A4 print HTML covering 100% of printable A4 width (198mm)
  const generateWoodIssuePrintHTML = () => {
    const allNonJComponents = Object.entries(groupedComponents)
      .filter(([category]) => category !== 'J')
      .flatMap(([category, comps]) => comps)
      .sort((a, b) => (Number(a?.SNo) || 0) - (Number(b?.SNo) || 0));

    const jComponents = groupedComponents['J'] || [];

    const qrSvg = woodIssueData?.Id 
      ? generateQRCodeSVG(`WI-${woodIssueData.Id}-${woodIssueData.F_ContainerMasterL || ''}-${woodIssueData.F_ItemMaster || ''}`)
      : '';

    const totalSummaryCft = (woodSummary || []).reduce((sum, item) => sum + Number(item?.Cft || 0), 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Wood Issue - ${woodIssueData?.ItemCode || 'Report'}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
            color: #000000;
          }
          .wood-issue-container {
            width: 198mm !important;
            max-width: 198mm !important;
            margin: 0 auto;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 2.5px 3.5px !important;
            font-size: 9.5px !important;
            line-height: 1.25 !important;
            color: #000000 !important;
          }
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          .header-table td {
            font-size: 10px !important;
            padding: 3.5px 5px !important;
          }
          .header-label {
            font-weight: bold !important;
            font-size: 10px !important;
            background-color: #fafafa !important;
          }
          .title-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 64px;
            padding: 2px 6px;
          }
          .title-text {
            font-size: 15px;
            font-weight: bold;
            letter-spacing: 0.5px;
            text-align: center;
          }
          .qr-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #fff;
            padding: 2px 4px;
            border: 1px solid #000000;
            border-radius: 3px;
          }
          .qr-label {
            font-size: 8.5px;
            font-weight: bold;
            margin-top: 1px;
            line-height: 1;
            letter-spacing: 0.3px;
          }
          .flex-row {
            display: flex;
            width: 100%;
          }
          .summary-box {
            display: flex;
            width: 100%;
            page-break-inside: avoid !important;
          }
          .stock-box {
            width: 140px;
            border-left: 1px solid #000;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            display: flex;
            flex-direction: column;
          }
          .stock-box-header {
            padding: 4px;
            text-align: center;
            font-weight: bold;
            background-color: #f0f0f0;
            border-bottom: 1px solid #000;
            font-size: 9.5px;
          }
          .stock-box-content {
            flex: 1;
            min-height: 50px;
            padding: 4px;
            font-size: 9.5px;
          }
        </style>
      </head>
      <body>
        <div class="wood-issue-container">
          <!-- Top Metadata Table -->
          <table class="header-table" style="margin-bottom: 0;">
            <tbody>
              <tr>
                <td colspan="4" style="background-color: #f0f0f0; padding: 3px 8px;">
                  <div class="title-bar">
                    <div style="width: 80px; visibility: hidden;"></div>
                    <div class="title-text">WOOD ISSUE BILL OF MATERIAL</div>
                    <div style="width: 80px; display: flex; justify-content: flex-end;">
                      ${woodIssueData?.Id ? `
                        <div class="qr-box">
                          ${qrSvg}
                          <span class="qr-label">WI-${woodIssueData.Id}</span>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="width: 15%;" class="header-label">PRODUCT NAME</td>
                <td style="width: 35%;">${woodIssueData?.ProductName || ''}</td>
                <td style="width: 15%;" class="header-label">PRODUCT CODE</td>
                <td style="width: 35%;">${woodIssueData?.ItemCode || ''}</td>
              </tr>
              <tr>
                <td class="header-label">SHIPMENT NO</td>
                <td>${woodIssueData?.ContainerNumber || ''}</td>
                <td class="header-label">INSPECTION DATE</td>
                <td>${formatDate(woodIssueData?.InspectionDate)}</td>
              </tr>
              <tr>
                <td class="header-label">BATCH NO</td>
                <td>${batchNo || woodIssueData?.BatchNo || ''}</td>
                <td class="header-label">QUANTITY</td>
                <td>${formatNumber(woodIssueData?.Quantity)}</td>
              </tr>
              <tr>
                <td class="header-label">DIMENSIONS (Cm)</td>
                <td style="padding: 1px 4px;">
                  <table style="width: 100%; border: none;">
                    <tr>
                      <th style="width: 33.3%; text-align: center; font-size: 8.5px; border: none; border-right: 1px solid #000;">W</th>
                      <th style="width: 33.3%; text-align: center; font-size: 8.5px; border: none; border-right: 1px solid #000;">D</th>
                      <th style="width: 33.3%; text-align: center; font-size: 8.5px; border: none;">H</th>
                    </tr>
                    <tr>
                      <td style="text-align: center; font-size: 9.5px; border: none; border-top: 1px solid #000; border-right: 1px solid #000;">${formatNumber(woodIssueData?.W)}</td>
                      <td style="text-align: center; font-size: 9.5px; border: none; border-top: 1px solid #000; border-right: 1px solid #000;">${formatNumber(woodIssueData?.D)}</td>
                      <td style="text-align: center; font-size: 9.5px; border: none; border-top: 1px solid #000;">${formatNumber(woodIssueData?.H)}</td>
                    </tr>
                  </table>
                </td>
                <td class="header-label">WOOD CFT (Issue)</td>
                <td>${formatNumber(woodIssueData?.TotalIssueCFT)}</td>
              </tr>
              <tr>
                <td class="header-label">JobCard Code</td>
                <td>${woodIssueData?.JobCardInitial || ''}</td>
                <td class="header-label">WOOD CFT (Final)</td>
                <td>${formatNumber(woodIssueData?.TotalFinalCFT)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Component BOM Table (198mm exact width) -->
          <table style="border-top: none;">
            <thead>
              <tr>
                <th rowspan="2" style="width: 10mm; text-align: center; border-top: none;">S. No.</th>
                <th rowspan="2" style="width: 48mm; text-align: center; border-top: none;">Descriptions</th>
                <th colspan="3" style="width: 36mm; text-align: center; border-top: none;">FINAL SIZE IN CENTIMETERS</th>
                <th rowspan="2" style="width: 15mm; text-align: center; border-top: none;">Batch Qty.</th>
                <th rowspan="2" style="width: 16mm; text-align: center; border-top: none;">FINAL CFT</th>
                <th colspan="3" style="width: 39mm; text-align: center; border-top: none;">ISSUE SIZE IN INCH</th>
                <th rowspan="2" style="width: 16mm; text-align: center; border-top: none;">Batch Qty.</th>
                <th rowspan="2" style="width: 18mm; text-align: center; border-top: none;">Issue cft</th>
              </tr>
              <tr>
                <th style="width: 12mm; text-align: center;">L</th>
                <th style="width: 12mm; text-align: center;">W</th>
                <th style="width: 12mm; text-align: center;">T</th>
                <th style="width: 13mm; text-align: center;">L</th>
                <th style="width: 13mm; text-align: center;">W</th>
                <th style="width: 13mm; text-align: center;">T</th>
              </tr>
            </thead>
            <tbody>
              ${allNonJComponents.map((comp) => `
                <tr>
                  <td style="text-align: center;">${comp?.SNo || ''}</td>
                  <td>${comp?.Description || ''}</td>
                  <td style="text-align: center;">${formatNumber(comp?.L1)}</td>
                  <td style="text-align: center;">${formatNumber(comp?.W1)}</td>
                  <td style="text-align: center;">${formatNumber(comp?.T1)}</td>
                  <td style="text-align: center;">${formatNumber(comp?.BatchQty)}</td>
                  <td style="text-align: center;">${formatNumber(comp?.FinalCFT)}</td>
                  <td style="text-align: center;">${formatNumber(comp?.L2)}</td>
                  <td style="text-align: center;">${formatNumber(comp?.W2)}</td>
                  <td style="text-align: center;">${formatNumber(comp?.T2)}</td>
                  <td style="text-align: center;">${formatNumber(comp?.BatchQtyIssue || comp?.BatchQty)}</td>
                  <td style="text-align: center;">${formatNumber(comp?.IssueCFT)}</td>
                </tr>
                ${hasIssue3(comp) ? `
                  <tr>
                    <td style="text-align: center;">${comp?.SNo != null ? comp.SNo + '.1' : ''}</td>
                    <td>${comp?.Description || ''}</td>
                    <td style="text-align: center;"></td>
                    <td style="text-align: center;"></td>
                    <td style="text-align: center;"></td>
                    <td style="text-align: center;"></td>
                    <td style="text-align: center;"></td>
                    <td style="text-align: center;">${formatNumber(comp?.L3)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.W3)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.T3)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.BatchQtyIssue3)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.IssueCFT3)}</td>
                  </tr>
                ` : ''}
              `).join('')}

              ${jComponents.length > 0 ? `
                <tr>
                  <td colspan="12" style="text-align: center; font-weight: bold; background-color: #f0f0f0; padding: 4px;">
                    JOINTING
                  </td>
                </tr>
                ${jComponents.map((comp, idx) => `
                  <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td>${comp?.Description || ''}</td>
                    <td style="text-align: center;">${formatNumber(comp?.L1)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.W1)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.T1)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.BatchQty)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.FinalCFT)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.L2)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.W2)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.T2)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.BatchQtyIssue || comp?.BatchQty)}</td>
                    <td style="text-align: center;">${formatNumber(comp?.IssueCFT)}</td>
                  </tr>
                  ${hasIssue3(comp) ? `
                    <tr>
                      <td style="text-align: center;">${(idx + 1) + '.1'}</td>
                      <td>${comp?.Description || ''}</td>
                      <td style="text-align: center;"></td>
                      <td style="text-align: center;"></td>
                      <td style="text-align: center;"></td>
                      <td style="text-align: center;"></td>
                      <td style="text-align: center;"></td>
                      <td style="text-align: center;">${formatNumber(comp?.L3)}</td>
                      <td style="text-align: center;">${formatNumber(comp?.W3)}</td>
                      <td style="text-align: center;">${formatNumber(comp?.T3)}</td>
                      <td style="text-align: center;">${formatNumber(comp?.BatchQtyIssue3)}</td>
                      <td style="text-align: center;">${formatNumber(comp?.IssueCFT3)}</td>
                    </tr>
                  ` : ''}
                `).join('')}
              ` : ''}

              <!-- Grand Total Row -->
              <tr style="font-weight: bold; background-color: #f0f0f0;">
                <td style="text-align: center;"></td>
                <td style="font-weight: bold;">TOTAL cft</td>
                <td colspan="4"></td>
                <td style="text-align: center; font-weight: bold;">${formatNumber(grandTotals.finalCft)}</td>
                <td colspan="4"></td>
                <td style="text-align: center; font-weight: bold;">${formatNumber(grandTotals.issueCft)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Wood Issue Summary Section & Side Boxes -->
          <div class="summary-box" style="margin-top: 0;">
            <div style="flex: 1;">
              <table style="border-top: none;">
                <thead>
                  <tr>
                    <th colspan="3" style="text-align: center; font-size: 10px; padding: 3px; border-top: none;">
                      WOOD ISSUE SUMMARY
                    </th>
                  </tr>
                  <tr>
                    <th style="width: 33.3%; text-align: center;">L (in)</th>
                    <th style="width: 33.3%; text-align: center;">THK (in)</th>
                    <th style="width: 33.4%; text-align: center;">CFT</th>
                  </tr>
                </thead>
                <tbody>
                  ${(woodSummary || []).map((item) => `
                    <tr>
                      <td style="text-align: center;">${formatNumber(item?.Length)}</td>
                      <td style="text-align: center;">${formatNumber(item?.Thk)}</td>
                      <td style="text-align: center;">${formatNumber(item?.Cft)}</td>
                    </tr>
                  `).join('')}
                  <tr style="font-weight: bold; background-color: #f9f9f9;">
                    <td colspan="2" style="text-align: center;">TOTAL</td>
                    <td style="text-align: center;">${formatNumber(totalSummaryCft)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Issued Stock -->
            <div class="stock-box">
              <div class="stock-box-header">ISSUED STOCK</div>
              <div class="stock-box-content"></div>
            </div>

            <!-- Re-Issued Stock -->
            <div class="stock-box">
              <div class="stock-box-header">RE-ISSUED STOCK</div>
              <div class="stock-box-content"></div>
            </div>

            <!-- Remarks -->
            <div class="stock-box" style="border-right: 1px solid #000;">
              <div class="stock-box-header">REMARKS</div>
              <div class="stock-box-content" style="white-space: pre-wrap;">${commonRemarks || ''}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Dedicated A4 Print Function: opens clean window with exact 198mm layout and triggers print
  const handlePrintA4 = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print this document.');
      return;
    }
    const htmlContent = generateWoodIssuePrintHTML();
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    const triggerPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      } catch (err) {
        console.error('Error triggering print:', err);
      }
    };

    if (printWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 250);
    } else {
      printWindow.onload = () => {
        setTimeout(triggerPrint, 250);
      };
    }
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .nav-header, .deznav, .header, .footer, .btn, button, .no-print {
              display: none !important;
            }
            .wood-issue-container {
              width: 198mm !important;
              max-width: 198mm !important;
              margin: 0 auto !important;
              border: 1px solid #000000 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              border: 1px solid #000000 !important;
              padding: 2.5px 4px !important;
              font-size: 9.5px !important;
              color: #000000 !important;
              background-color: transparent !important;
            }
            th {
              background-color: #f0f0f0 !important;
              font-weight: bold !important;
            }
            thead {
              display: table-header-group !important;
            }
            tr {
              page-break-inside: avoid !important;
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
          onClick={handlePrintA4}
          style={{ fontWeight: 'bold' }}
        >
          <i className="fa fa-print me-2"></i> Print Sheet (A4)
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
              <td colSpan="4" style={{ 
                padding: '6px 14px', 
                backgroundColor: headerBgColor, 
                border: `1px solid ${borderColor}`, 
                color: textColor 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  minHeight: '74px'
                }}>
                  {/* Left spacer for perfect centering */}
                  <div style={{ width: '85px', visibility: 'hidden' }} />

                  {/* Center Title */}
                  <div style={{ textAlign: 'center' }}>
                    <h5 style={{ 
                      margin: 0, 
                      color: textColor, 
                      fontWeight: 'bold', 
                      fontSize: '17px', 
                      letterSpacing: '0.5px' 
                    }}>
                      WOOD ISSUE BILL OF MATERIAL
                    </h5>
                  </div>

                  {/* Top-Right QR Code Box */}
                  <div style={{ width: '85px', display: 'flex', justifyContent: 'flex-end' }}>
                    {woodIssueData?.Id && (
                      <div 
                        style={{ 
                          backgroundColor: '#ffffff', 
                          padding: '3px 4px', 
                          border: '1px solid #333333', 
                          borderRadius: '4px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                        title={`Wood Issue QR: WI-${woodIssueData.Id}`}
                      >
                        <div dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(`WI-${woodIssueData.Id}-${woodIssueData.F_ContainerMasterL || ''}-${woodIssueData.F_ItemMaster || ''}`) }} />
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          color: '#000000', 
                          marginTop: '2px', 
                          letterSpacing: '0.3px', 
                          lineHeight: 1 
                        }}>
                          WI-{woodIssueData.Id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
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
              <td style={{ padding: '8px 10px', color: textColor, fontWeight: 'bold', fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>SHIPMENT NO</td>
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
                          <React.Fragment key={`nonJ-${component?.SNo || index}-${index}`}>
                          <tr>
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
                          {hasIssue3(component) && (
                            <tr>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{component?.SNo != null ? `${component.SNo}.1` : ''}</td>
                              <td style={{ padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{component?.Description || ''}</td>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                              <td className="final-cft-column" style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.L3)}</td>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.W3)}</td>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.T3)}</td>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.BatchQtyIssue3)}</td>
                              <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.IssueCFT3)}</td>
                            </tr>
                          )}
                          </React.Fragment>
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
                  <React.Fragment key={`J-${index}`}>
                  <tr>
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
                  {hasIssue3(component) && (
                    <tr>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{`${index + 1}.1`}</td>
                      <td style={{ padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{component?.Description || ''}</td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                      <td className="final-cft-column" style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}></td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.L3)}</td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.W3)}</td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.T3)}</td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.BatchQtyIssue3)}</td>
                      <td style={{ textAlign: 'center', padding: '4px 6px', color: textColor, fontSize: '12px', border: `1px solid ${borderColor}`, backgroundColor: bgColor }}>{formatNumber(component?.IssueCFT3)}</td>
                    </tr>
                  )}
                  </React.Fragment>
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