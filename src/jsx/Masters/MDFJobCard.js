import React, { useEffect, useState } from "react";
import { Row, Col, Button } from "react-bootstrap";
import { Fn_AddEditData, Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ComponentDrawing from "./ComponentDrawing";

const MDFJobCard = ({F_ItemMaster, F_CategoryMaster, F_ContainerMaster, F_ContainerMasterL}) => {
  const [State, setState] = useState({
    id: 0,
    FillArray: [],
    FillArray1: [],
    formData: {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
const [jobCardArray, setJobCardArray] = useState([]);
const [machineArray, setMachineArray] = useState([]);
const API_URL = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`;
const API_URL_SAVE = "GetJobCard/0/token";
const API_URL_SAVE1 = "GetJobCardL/0/token";
const dispatch = useDispatch();
const navigate = useNavigate();
const [isPdfGenerating, setIsPdfGenerating] = useState(false);
const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
const [selectedJobCardIds, setSelectedJobCardIds] = useState([]);
const [drawingsData, setDrawingsData] = useState({});
const [drawingsLoading, setDrawingsLoading] = useState({});

// Replace the dummyJobCards array with the real data


// Add dummy machine details for each job card


useEffect(() => {
  fetchData();
}, [dispatch, F_ContainerMaster, F_CategoryMaster, F_ItemMaster, F_ContainerMasterL]);

// Fetch drawings for all job cards
useEffect(() => {
  const fetchDrawingsForJobCards = async () => {
    if (jobCardArray.length === 0) return;

    const API_URL_DRAWINGS = `${API_WEB_URLS.MASTER}/0/token/ComponentPhoto`;
    
    for (const jobCard of jobCardArray) {
      if (jobCard.F_ComponentsMaster && !drawingsData[jobCard.F_ComponentsMaster]) {
        setDrawingsLoading(prev => ({ ...prev, [jobCard.F_ComponentsMaster]: true }));
        
        try {
          const result = await Fn_FillListData(dispatch, setState, "FillArray5", `${API_URL_DRAWINGS}/Id/${jobCard.F_ComponentsMaster}`);
          
          setDrawingsData(prev => ({
            ...prev,
            [jobCard.F_ComponentsMaster]: Array.isArray(result) && result.length > 0 ? result : []
          }));
        } catch (error) {
          console.error(`Error fetching drawings for component ${jobCard.F_ComponentsMaster}:`, error);
          setDrawingsData(prev => ({
            ...prev,
            [jobCard.F_ComponentsMaster]: []
          }));
        } finally {
          setDrawingsLoading(prev => ({ ...prev, [jobCard.F_ComponentsMaster]: false }));
        }
      }
    }
  };

  fetchDrawingsForJobCards();
}, [jobCardArray, dispatch]);

const fetchData = async () => {
  setLoading(true);
  try {
    await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
    setLoading(true);
    try {
      let vformData = new FormData();
      vformData.append("F_ContainerMasterL", F_ContainerMasterL);
      vformData.append("Categories", F_CategoryMaster);
      vformData.append("F_ItemMaster", F_ItemMaster);

      // Fetch job cards and machines for selected container
      await Fn_GetReport(
        dispatch,
        setJobCardArray,
        "tenderData",
        API_URL_SAVE,
        { arguList: { id: 0, formData: vformData } },
        true
      );
      
      await Fn_GetReport(
        dispatch,
        setMachineArray,
        "tenderData",
        API_URL_SAVE1,
        { arguList: { id: 0, formData: vformData } },
        true
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    setGridData([]);
  } finally {
    setLoading(false);
  }
};

  const handleChange = (machineId, event) => {
    const { name, value } = event.target;
    const updatedMachineArray = machineArray.map(machine => 
      machine.ID === machineId ? { ...machine, [name]: value } : machine
    );
    setMachineArray(updatedMachineArray);
  };

  // Function to find machine details for a specific job card
  const getMachineDetails = (jobCardId) => {
    return machineArray.filter(machine => machine.F_JobCardMaster === jobCardId);
  };

  // Handler for individual job card selection
  const handleJobCardSelect = (jobCardId) => {
    setSelectedJobCardIds((prev) =>
      prev.includes(jobCardId)
        ? prev.filter((id) => id !== jobCardId)
        : [...prev, jobCardId]
    );
  };

  // Handler for "Select All" checkbox
  const handleSelectAllJobCards = (e) => {
    if (e.target.checked) {
      setSelectedJobCardIds(jobCardArray.map((card) => card.ID));
    } else {
      setSelectedJobCardIds([]);
    }
  };

  const handlePrintPDF = async () => {
    try {
      setIsPdfGenerating(true);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const jobCards = document.getElementsByClassName('job-card');

      // Only include selected job cards
      const selectedCards = Array.from(jobCards).filter((el, idx) =>
        selectedJobCardIds.includes(jobCardArray[idx].ID)
      );

      // A4 dimensions in mm
      const pageWidth = 210; // Proper A4 width
      const pageHeight = 297;
      // Set proper margins
      const margin = 10; // Increased margin to ensure borders are visible
      const usableWidth = pageWidth - (margin * 2);

      setPdfProgress({ current: 0, total: selectedCards.length });

      for (let i = 0; i < selectedCards.length; i++) {
        setPdfProgress(prev => ({ ...prev, current: i + 1 }));

        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(selectedCards[i], {
          scale: 2,
          useCORS: true,
          logging: true,
          backgroundColor: '#ffffff',
          width: selectedCards[i].offsetWidth,
          height: selectedCards[i].offsetHeight,
          onclone: (document) => {
            const element = document.getElementsByClassName('job-card')[i];
            if (element) {
              // Ensure proper width with border consideration
              element.style.width = 'calc(100% - 20px)'; // Account for borders and padding
              element.style.maxWidth = 'calc(100% - 20px)';
              element.style.margin = '10px';
              element.style.padding = '15px';
              element.style.boxSizing = 'border-box';

              // Ensure borders are preserved
              element.style.border = '1px solid #000000';
              element.style.borderRadius = '0px';

              // Adjust table width with border consideration
              const tables = element.getElementsByTagName('table');
              for (let table of tables) {
                table.style.width = '100%';
                table.style.maxWidth = '100%';
                table.style.tableLayout = 'fixed';
                table.style.border = '2px solid #000000';
                table.style.borderCollapse = 'collapse';
                table.style.boxSizing = 'border-box';
              }

              // Adjust all columns and rows
              const cols = element.getElementsByClassName('col');
              for (let col of cols) {
                col.style.padding = '8px';
                col.style.boxSizing = 'border-box';
                // Ensure borders are maintained
                if (col.style.borderRight) {
                  col.style.borderRight = col.style.borderRight;
                }
                if (col.style.borderBottom) {
                  col.style.borderBottom = col.style.borderBottom;
                }
              }

              // Adjust row spacing
              const rows = element.getElementsByClassName('row');
              for (let row of rows) {
                row.style.marginLeft = '0';
                row.style.marginRight = '0';
                row.style.boxSizing = 'border-box';
              }

              // Ensure all table cells maintain their borders
              const tableCells = element.querySelectorAll('td, th');
              for (let cell of tableCells) {
                cell.style.border = '2px solid #000000';
                cell.style.boxSizing = 'border-box';
              }

              // Let height be determined by content
              element.style.height = 'auto';
              element.style.minHeight = 'auto';
              element.style.maxHeight = 'none';
            }
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        if (i > 0) {
          pdf.addPage();
        }

        const imgRatio = canvas.height / canvas.width;
        const imgWidth = usableWidth;
        const imgHeight = imgWidth * imgRatio;

        const xPos = margin;
        const yPos = margin;

        pdf.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight, undefined, 'FAST');
      }

      pdf.save(`JobCards_Container_${F_ContainerMaster}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsPdfGenerating(false);
      setPdfProgress({ current: 0, total: 0 });
    }
  };
  
  const handleBatchCodeChange = async (e, jobCardId) => {
    try {
      const newBatchCode = e.target.value;
      const updatedJobCards = jobCardArray.map(card => 
        card.ID === jobCardId ? { ...card, BatchCode: newBatchCode } : card
      );
      setJobCardArray(updatedJobCards);
    } catch (error) {
      console.error('Error updating batch code:', error);
    }
  };

  const handleBulkBatchCodeChange = (e) => {
    const newBatchCode = e.target.value;
    const updatedJobCards = jobCardArray.map(card => ({
      ...card,
      BatchCode: newBatchCode
    }));
    setJobCardArray(updatedJobCards);
  };

  const handleBatchCodeSubmit = async (batchCodesArray) => {
    try {
      const userData = JSON.parse(localStorage.getItem("authUser"));
      let vformData = new FormData();
      // Convert array to JSON string containing only ID and BatchCode
      const batchCodeData = batchCodesArray.map(item => ({
        Id: item.Id,
        BatchCode: item.BatchCode || ''
      }));
      
      vformData.append("Data", JSON.stringify(batchCodeData));


      // Make API call to update batch codes
    await Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: 0, formData : vformData } },
        'UpdateBatchCode/0/token',
        true,
        "memberid",
        navigate,
        "/JobCardForm"
      );
    } catch (error) {
      console.error('Error submitting batch codes:', error);
      alert('Error updating batch codes. Please try again.');
    }
  };

  const handleBulkBatchCodeSubmit = async () => {
    try {
      // Filter and create array of only job cards with non-empty batch codes
      const batchCodesArray = jobCardArray
        .filter(card => card.BatchCode && card.BatchCode.trim() !== '')
        .map(card => ({
          Id: card.ID,
          BatchCode: card.BatchCode
        }));

      // Only proceed with API call if there are batch codes to update
      if (batchCodesArray.length > 0) {
        await handleBatchCodeSubmit(batchCodesArray);
      } else {
        alert('No batch codes to update. Please enter at least one batch code.');
      }
      
    } catch (error) {
      console.error('Error submitting bulk batch codes:', error);
    }
  };

  const generatePrintHTML = (selectedJobCards) => {
    const jobCards = jobCardArray.filter(card => selectedJobCards.includes(card.ID));
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .job-card {
              width: 190mm;
              height: 277mm;
              padding: 5mm;
              box-sizing: border-box;
              margin: 0 auto;
              font-family: Arial, sans-serif;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              position: relative;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }

            .header {
              height: 10mm;
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2mm;
              color: #000000;
            }

            .top-info {
              height: 45mm;
              margin-bottom: 2mm;
            }

            .dimensions-section {
              height: 40mm;
              margin-bottom: 2mm;
            }

            .drawing-section {
              height: 120mm;
              margin: 2mm 0;
              border: 1px solid #000;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .job-card[data-machine-rows="6"] .drawing-section { height: 110mm; }
            .job-card[data-machine-rows="7"] .drawing-section { height: 100mm; }
            .job-card[data-machine-rows="8"] .drawing-section { height: 90mm; }
            .job-card[data-machine-rows="9"] .drawing-section { height: 80mm; }
            .job-card[data-machine-rows="10"] .drawing-section { height: 70mm; }

            .drawing-section .label {
              height: 5mm;
              font-size: 11px;
              margin-bottom: 1mm;
              font-weight: bold;
            }

            .drawing-container {
              flex: 1;
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              overflow: hidden;
            }

            .drawing-image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }

            .small-drawings {
              height: 25%;
              width: 100%;
              display: flex;
              justify-content: center;
              gap: 2mm;
              margin-top: 1mm;
            }

            .small-drawing {
              max-width: 30%;
              height: 100%;
              object-fit: contain;
            }

            .machine-table-section {
              height: 35mm;
              margin: 2mm 0;
            }

            .job-card[data-machine-rows="6"] .machine-table-section { height: 40mm; }
            .job-card[data-machine-rows="7"] .machine-table-section { height: 45mm; }
            .job-card[data-machine-rows="8"] .machine-table-section { height: 50mm; }
            .job-card[data-machine-rows="9"] .machine-table-section { height: 55mm; }
            .job-card[data-machine-rows="10"] .machine-table-section { height: 60mm; }

            .machine-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            .machine-table th:first-child,
            .machine-table td:first-child {
              width: 10px;
              min-width: 10px;
              max-width: 10px;
            }

            .machine-table th:nth-child(2),
            .machine-table td:nth-child(2) {
              width: 20px;
              min-width: 20px;
              max-width: 20px;
            }

            .machine-table th:nth-child(3),
            .machine-table td:nth-child(3) {
              width: auto;
              white-space: normal;
              word-break: break-word;
              text-align: left;
              padding: 0.5mm 1mm;
            }

            .machine-table th:nth-child(4),
            .machine-table td:nth-child(4),
            .machine-table th:nth-child(5),
            .machine-table td:nth-child(5),
            .machine-table th:nth-child(6),
            .machine-table td:nth-child(6),
            .machine-table th:nth-child(7),
            .machine-table td:nth-child(7),
            .machine-table th:nth-child(8),
            .machine-table td:nth-child(8),
            .machine-table th:nth-child(9),
            .machine-table td:nth-child(9) {
              width: 15px;
              min-width: 15px;
              max-width: 15px;
            }

            .machine-table td:nth-child(3) {
              text-align: left;
              padding: 0.5mm 1mm;
              font-size: 10px;
              font-weight: 500;
              white-space: normal;
              word-break: break-word;
            }

            .machine-table th {
              padding: 0.5mm;
              font-size: 8px;
              text-align: center;
              line-height: 1;
              background-color: #f0f0f0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .machine-table td {
              padding: 0.5mm;
              font-size: 8px;
              text-align: center;
              line-height: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .machine-table td:first-child {
              font-size: 11px !important;
              font-weight: 600 !important;
              padding: 0.5mm;
              text-align: center;
            }

            .notes-section {
              height: 15mm;
              margin-top: 2mm;
              border: 1px solid #000;
              padding: 2mm;
              overflow: hidden;
            }

            .notes-section .label {
              font-size: 11px;
              margin-bottom: 1mm;
              font-weight: bold;
            }

            .notes-content {
              font-size: 10px;
              line-height: 1.2;
              height: calc(100% - 5mm);
              overflow: hidden;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 1mm;
            }

            th, td {
              border: 1px solid #000;
              padding: 1mm;
              text-align: left;
              font-size: 10px;
              line-height: 1.5;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
          }
        </style>
      </head>
      <body>
        ${jobCards.map(jobCard => {
          const machineDetails = getMachineDetails(jobCard.ID);
          return `
            <div class="job-card" data-machine-rows="${machineDetails.length}">
              <div class="header">MDF JOB CARD</div>
              
              <table>
                <tr class="info-row">
                  <td class="label" style="width: 40%">CONTAINER NUMBER</td>
                  <td style="width: 40%">${jobCard.ContainerNumber || 'N/A'}</td>
                  <td class="label" style="width: 10%">JOB CARD NUMBER</td>
                  <td style="width: 10%">${jobCard.JobCardNo || 'N/A'}</td>
                </tr>
                <tr class="info-row">
                  <td class="label">INSPECTION DATE</td>
                  <td colspan="3">${jobCard.InspectionDate || ''}</td>
                </tr>
              </table>

              <table>
                <tr class="info-row">
                  <td class="label" style="width: 15%">ITEM CODE</td>
                  <td style="width: 15%">${jobCard.ProductCode || 'N/A'}</td>
                  <td class="label" style="width: 15%">ITEM NAME</td>
                  <td style="width: 55%">${jobCard.ItemName || 'N/A'}</td>
                </tr>
                <tr class="info-row">
                  <td class="label">ORDER QUANTITY</td>
                  <td>${jobCard.OrderQty || 'N/A'}</td>
                  <td class="label">BATCH CODE</td>
                  <td>${jobCard.BatchCode || ''}</td>
                </tr>
                <tr class="info-row">
                  <td class="label">COMPONENT NAME</td>
                  <td>${jobCard.ComponentsName || 'N/A'}</td>
                  <td class="label">COMPONENT QTY</td>
                  <td>${jobCard.ComponentQty || '0'}</td>
                </tr>
              </table>

              <table class="dimensions-table">
                <tr>
                  <th colspan="4" class="label">MDF SHEET SIZE</th>
                </tr>
                <tr>
                  <td class="label" style="width: 25%">L (ft)</td>
                  <td class="label" style="width: 25%">W (ft)</td>
                  <td class="label" style="width: 25%">Thk. (mm)</td>
                  <td class="label" style="width: 25%">Required Sheet Qty</td>
                </tr>
                <tr>
                  <td>${jobCard.W1 ? (jobCard.W1 % 1 === 0 ? Math.round(jobCard.W1) : jobCard.W1.toFixed(2)) : '0'}</td>
                  <td>${jobCard.W2 ? (jobCard.W2 % 1 === 0 ? Math.round(jobCard.W2) : jobCard.W2.toFixed(2)) : '0'}</td>
                  <td>${jobCard.W3 ? (jobCard.W3 % 1 === 0 ? Math.round(jobCard.W3) : jobCard.W3.toFixed(2)) : '0'}</td>
                  <td>${jobCard.Qty2 || 'N/A'}</td>
                </tr>
              </table>

              <table class="dimensions-table">
                <tr>
                  <th colspan="3" class="label">Final Component Dimension (mm)</th>
                </tr>
                <tr>
                  <td class="label" style="width: 33%">Length</td>
                  <td class="label" style="width: 33%">Width</td>
                  <td class="label" style="width: 34%">Thickness</td>
                </tr>
                <tr>
                  <td>${jobCard.F1 ? (jobCard.F1 % 1 === 0 ? Math.round(jobCard.F1) : jobCard.F1.toFixed(2)) : 'N/A'}</td>
                  <td>${jobCard.F2 ? (jobCard.F2 % 1 === 0 ? Math.round(jobCard.F2) : jobCard.F2.toFixed(2)) : 'N/A'}</td>
                  <td>${jobCard.F3 ? (jobCard.F3 % 1 === 0 ? Math.round(jobCard.F3) : jobCard.F3.toFixed(2)) : 'N/A'}</td>
                </tr>
              </table>

              <div class="drawing-section">
                <div class="label">COMPONENT DRAWING</div>
                ${drawingsData[jobCard.F_ComponentsMaster] && drawingsData[jobCard.F_ComponentsMaster].length > 0 ? `
                  <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 2mm; width: 100%;">
                    ${drawingsData[jobCard.F_ComponentsMaster].map((drawing, index) => {
                      const imageCount = drawingsData[jobCard.F_ComponentsMaster].length;
                      let imageSize, containerSize;
                      
                      if (imageCount === 1) {
                        imageSize = "max-width: 150mm; max-height: 100mm;";
                        containerSize = "max-width: 160mm; min-width: 120mm; width: 100%;";
                      } else if (imageCount === 2) {
                        imageSize = "max-width: 80mm; max-height: 60mm;";
                        containerSize = "max-width: 90mm; min-width: 70mm; width: 48%;";
                      } else if (imageCount === 3) {
                        imageSize = "max-width: 60mm; max-height: 45mm;";
                        containerSize = "max-width: 70mm; min-width: 50mm; width: 32%;";
                      } else if (imageCount === 4) {
                        imageSize = "max-width: 50mm; max-height: 38mm;";
                        containerSize = "max-width: 60mm; min-width: 40mm; width: 24%;";
                      } else {
                        imageSize = "max-width: 40mm; max-height: 30mm;";
                        containerSize = "max-width: 50mm; min-width: 30mm; width: 20%;";
                      }
                      
                      return `
                        <div style="text-align: center; border: 1px solid #e2e8f0; padding: 1mm; border-radius: 2mm; background-color: #f8f9fa; ${containerSize}; flex: 1;">
                          <img src="${API_WEB_URLS.IMAGEURL}/${drawing.ImageDataNew}" style="width: 100%; ${imageSize} height: auto; object-fit: contain; border-radius: 1mm;" />
                        </div>
                      `;
                    }).join('')}
                  </div>
                ` : '<div style="height: 60mm; display: flex; align-items: center; justify-content: center; color: #666;">No drawings available</div>'}
              </div>

              <table class="machine-table" data-rows="${machineDetails.length}">
                <tr>
                  <th colspan="9" class="label">MACHINE DETAILS</th>
                </tr>
                <tr>
                  <th>M/C NO</th>
                  <th>DATE</th>
                  <th>M/C NAME</th>
                  <th>QTY</th>
                  <th>REJ</th>
                  <th>START</th>
                  <th>END</th>
                  <th>ALLOC</th>
                  <th>USER</th>
                </tr>
                ${machineDetails.map(machine => `
                  <tr>
                    <td>${machine.MachineNo || ''}</td>
                    <td>${machine.Date || ''}</td>
                    <td>${machine.MachineName || ''}</td>
                    <td>${machine.Quantity || ''}</td>
                    <td>${machine.Rejection || ''}</td>
                    <td>${machine.StartTime || ''}</td>
                    <td>${machine.EndTime || ''}</td>
                    <td>${machine.AllocatedTime || ''}</td>
                    <td>${machine.UserName || ''}</td>
                  </tr>
                `).join('')}
              </table>

              <div class="notes-section">
                <div class="label">NOTES</div>
                <div class="notes-content">${jobCard.Notes || ''}</div>
              </div>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;
  };

  const handlePrintJobCards = () => {
    if (selectedJobCardIds.length === 0) {
      alert('Please select at least one job card to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(generatePrintHTML(selectedJobCardIds));
    printWindow.document.close();

    // Wait for images to load before printing
    printWindow.onload = () => {
      printWindow.print();
      // Close the window after print dialog is closed (optional)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  return (
   <div className="print-safe-page">
    {isPdfGenerating && (
      <div className="no-print" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div style={{
            marginTop: '10px',
            color: '#000000',
            fontWeight: '500'
          }}>
            Generating PDF...
            <br />
            Processing Job Card {pdfProgress.current} out of {pdfProgress.total}
            <br />
            <div style={{
              marginTop: '10px',
              height: '4px',
              backgroundColor: '#e2e8f0',
              borderRadius: '2px'
            }}>
              <div style={{
                width: `${(pdfProgress.current / pdfProgress.total) * 100}%`,
                height: '100%',
                backgroundColor: '#000000',
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>
      </div>
    )}

    <div style={{ padding: "20px" }}>
      <Row className="mb-3">
        <Col>
          <Button 
            onClick={handlePrintPDF}
            style={{
              backgroundColor: "#065f46",
              border: "none",
              padding: "10px 20px",
              marginRight: "10px"
            }}
            disabled={selectedJobCardIds.length === 0}
          >
            Download PDF
          </Button>
          <Button 
            onClick={handlePrintJobCards}
            style={{
              backgroundColor: "#1d4ed8",
              border: "none",
              padding: "10px 20px",
              marginRight: "10px"
            }}
            disabled={selectedJobCardIds.length === 0}
          >
            Print
          </Button>
          <Button 
            onClick={handleBulkBatchCodeSubmit}
            style={{
              backgroundColor: "#065f46",
              border: "none",
              padding: "10px 20px",
              marginLeft: "10px"
            }}
          >
            Save All Batch Codes
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col xs={12} md={6} lg={4}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderRadius: '4px',
            border: '1px solid #000000'
          }}>
            <input
              type="checkbox"
              id="selectAllJobCards"
              checked={selectedJobCardIds.length === jobCardArray.length && jobCardArray.length > 0}
              onChange={handleSelectAllJobCards}
            />
            <label 
              htmlFor="selectAllJobCards" 
              style={{
                fontWeight: '700',
                marginBottom: '0',
                whiteSpace: 'nowrap'
              }}
            >
              Select All Job Cards
            </label>
            <label 
              htmlFor="bulkBatchCode" 
              style={{
                fontWeight: '700',
                marginBottom: '0',
                whiteSpace: 'nowrap'
              }}
            >
              Bulk Batch Code:
            </label>
            <input
              id="bulkBatchCode"
              type="text"
              onChange={handleBulkBatchCodeChange}
              style={{
                padding: '0.5rem',
                border: '1px solid #000000',
                borderRadius: '4px',
                color: '#000000',
                width: '100%'
              }}
              placeholder="Enter batch code for all job cards"
            />
          </div>
        </Col>
      </Row>
    </div>

   
<div 
  id="jobCardsContainer"
  style={{ 
    padding: "30px", 
    border: "8px solid #1a1a1a", 
    margin: "20px", 
    backgroundColor: "#fff",
    boxShadow: "0 0 20px rgba(0,0,0,0.1)",
    width: 'auto',
    minHeight: '100%',
    position: 'relative',
    overflow: 'visible'
  }}
>
    

      {jobCardArray.map((jobCard) => (
        <div 
          key={jobCard.ID} 
          className="job-card"
          style={{
            border: "1px solid #000000",
            marginBottom: "30px",
            backgroundColor: "#fff",
            borderRadius: "0px",
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
            width: '100%',
            maxWidth: '100%',
            padding: '0px',
            margin: '0'
          }}
        >
          {/* Checkbox for this job card */}
          <div style={{ padding: '10px', borderBottom: '1px solid #000000', background: '#f8f9fa' }}>
            <input
              type="checkbox"
              checked={selectedJobCardIds.includes(jobCard.ID)}
              onChange={() => handleJobCardSelect(jobCard.ID)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontWeight: 600 }}>Select this Job Card</span>
          </div>
          {/* Header - MDF JOB CARD */}
          <Row className="g-0">
            <Col xs={8} style={{
              borderRight: "1px solid #000000",
              borderBottom: "1px solid #000000",
              padding: "10px",
              textAlign: "center"
            }}>
              <span style={{
                fontWeight: "700",
                fontSize: "1.25rem"
              }}>MDF JOB CARD</span>
            </Col>
            <Col xs={4} style={{
              borderBottom: "1px solid #000000",
              padding: "0"
            }}>
              <Row className="g-0">
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  padding: "10px",
                  textAlign: "center",
                  fontWeight: "700"
                }}>JOB CARD NUMBER</Col>
                <Col xs={6} style={{
                  padding: "10px",
                  textAlign: "center"
                }}>{jobCard.JobCardNo || "N/A"}</Col>
              </Row>
            </Col>
          </Row>

          {/* Container Number Row */}
          <Row className="g-0">
            <Col xs={2} style={{
              borderRight: "1px solid #000000",
              borderBottom: "1px solid #000000",
              padding: "10px"
            }}>
              <span style={{
                fontWeight: "700"
              }}>CONTAINER NUMBER</span>
            </Col>
            <Col xs={6} style={{
              borderRight: "1px solid #000000",
              borderBottom: "1px solid #000000",
              padding: "10px"
            }}>{jobCard.ContainerNumber || "N/A"}</Col>
            <Col xs={2} style={{
              borderRight: "1px solid #000000",
              borderBottom: "1px solid #000000",
              padding: "10px",
              textAlign: "center",
              fontWeight: "700"
            }}>INSPECTION DATE</Col>
            <Col xs={2} style={{
              borderBottom: "1px solid #000000",
              padding: "10px",
              textAlign: "center"
            }}>{jobCard.InspectionDate || ""}</Col>
          </Row>

          {/* Item Code and Name Row */}
          <Row className="g-0">
            <Col xs={2} style={{
              borderRight: "1px solid #000000",
              borderBottom: "1px solid #000000",
              padding: "15px",
              height: "60px",
              display: "flex",
              alignItems: "center"
            }}>
              <span style={{
                fontWeight: "700"
              }}>ITEM CODE</span>
            </Col>
            <Col xs={2} style={{
              borderRight: "1px solid #000000",
              borderBottom: "1px solid #000000",
              padding: "15px",
              height: "60px",
              display: "flex",
              alignItems: "center"
            }}>{jobCard.ProductCode || "N/A"}</Col>
            <Col xs={2} style={{
              borderRight: "1px solid #000000",
              borderBottom: "1px solid #000000",
              padding: "15px",
              height: "60px",
              display: "flex",
              alignItems: "center"
            }}>
              <span style={{
                fontWeight: "700"
              }}>ITEM NAME</span>
            </Col>
            <Col xs={6} style={{
              borderBottom: "1px solid #000000",
              padding: "15px",
              height: "60px",
              display: "flex",
              alignItems: "center"
            }}>{jobCard.ItemName || "N/A"}</Col>
          </Row>

          {/* Split into Two Columns from Order Quantity to Final Component Dimension */}
          <Row className="g-0">
            {/* Left Column (6) - All form fields */}
            <Col xs={6}>
              {/* Order Quantity Row */}
              <Row className="g-0">
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <span style={{ fontWeight: "700" }}>ORDER QUANTITY</span>
                </Col>
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center"
                }}>{jobCard.OrderQty || "N/A"}</Col>
              </Row>

              {/* Batch Code Row */}
              <Row className="g-0">
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <span style={{ fontWeight: "700" }}>BATCH CODE</span>
                </Col>
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center"
                }}>
                  <input
                    type="text"
                    value={jobCard.BatchCode || ""}
                    onChange={(e) => handleBatchCodeChange(e, jobCard.ID)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #000000",
                      borderRadius: "4px",
                      color: "#000000"
                    }}
                    placeholder="Enter batch code"
                  />
                </Col>
              </Row>

              {/* Component Name Row */}
              <Row className="g-0">
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <span style={{ fontWeight: "700" }}>COMPONENT NAME</span>
                </Col>
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center"
                }}>{jobCard.ComponentsName || "N/A"}</Col>
              </Row>

              {/* Component Quantity Row */}
              <Row className="g-0">
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <span style={{ fontWeight: "700" }}>COMPONENT QUANTITY</span>
                </Col>
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center"
                }}>{jobCard.ComponentQty || "0"}</Col>
              </Row>

              {/* MDF Sheet Size Row */}
              <Row className="g-0">
                <Col xs={3} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "120px",
                  display: "flex",
                  alignItems: "center"
                }}>
                  <span style={{ fontWeight: "700" }}>MDF SHEET SIZE</span>
                </Col>
                <Col xs={9} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                }}>
                  <Row className="g-0" style={{ height: "120px" }}>
                    <Col xs={4} style={{
                      borderRight: "1px solid #000000",
                      textAlign: "center"
                    }}>
                      <div style={{
                        borderBottom: "1px solid #000000",
                        padding: "15px",
                        fontWeight: "700"
                      }}>L (ft)</div>
                      <div style={{
                        padding: "15px",
                        height: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>{jobCard.W1 ? (jobCard.W1 % 1 === 0 ? Math.round(jobCard.W1) : jobCard.W1.toFixed(2)) : "0"}</div>
                    </Col>
                    <Col xs={4} style={{
                      borderRight: "1px solid #000000",
                      textAlign: "center"
                    }}>
                      <div style={{
                        borderBottom: "1px solid #000000",
                        padding: "15px",
                        fontWeight: "700"
                      }}>W (ft)</div>
                      <div style={{
                        padding: "15px",
                        height: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>{jobCard.W2 ? (jobCard.W2 % 1 === 0 ? Math.round(jobCard.W2) : jobCard.W2.toFixed(2)) : "0"}</div>
                    </Col>
                    <Col xs={4} style={{
                      textAlign: "center"
                    }}>
                      <div style={{
                        borderBottom: "1px solid #000000",
                        padding: "15px",
                        fontWeight: "700"
                      }}>Thk. (mm)</div>
                      <div style={{
                        padding: "15px",
                        height: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>{jobCard.W3 ? (jobCard.W3 % 1 === 0 ? Math.round(jobCard.W3) : jobCard.W3.toFixed(2)) : "0"}</div>
                    </Col>
                  </Row>
                </Col>
              </Row>

              {/* Required Sheet Quantity Row */}
              <Row className="g-0">
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <span style={{ fontWeight: "700" }}>REQUIRED SHEET QUANTITY</span>
                </Col>
                <Col xs={6} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center"
                }}>{jobCard.Qty2}</Col>
              </Row>

              {/* Final Component Dimension Row */}
              <Row className="g-0">
                <Col xs={3} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                  padding: "15px",
                  height: "120px",
                  display: "flex",
                  alignItems: "center"
                }}>
                  <span style={{ fontWeight: "700" }}>Final Component Dimension (mm)</span>
                </Col>
                <Col xs={9} style={{
                  borderRight: "1px solid #000000",
                  borderBottom: "1px solid #000000",
                }}>
                  <Row className="g-0" style={{ height: "120px" }}>
                    <Col xs={4} style={{
                      borderRight: "1px solid #000000",
                      textAlign: "center"
                    }}>
                      <div style={{
                        borderBottom: "1px solid #000000",
                        padding: "15px",
                        fontWeight: "700"
                      }}>Length</div>
                      <div style={{
                        padding: "15px",
                        height: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>{jobCard.F1 ? (jobCard.F1 % 1 === 0 ? Math.round(jobCard.F1) : jobCard.F1.toFixed(2)) : "N/A"}</div>
                    </Col>
                    <Col xs={4} style={{
                      borderRight: "1px solid #000000",
                      textAlign: "center"
                    }}>
                      <div style={{
                        borderBottom: "1px solid #000000",
                        padding: "15px",
                        fontWeight: "700"
                      }}>Width</div>
                      <div style={{
                        padding: "15px",
                        height: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>{jobCard.F2 ? (jobCard.F2 % 1 === 0 ? Math.round(jobCard.F2) : jobCard.F2.toFixed(2)) : "N/A"}</div>
                    </Col>
                    <Col xs={4} style={{
                      textAlign: "center"
                    }}>
                      <div style={{
                        borderBottom: "1px solid #000000",
                        padding: "15px",
                        fontWeight: "700"
                      }}>Thickness</div>
                      <div style={{
                        padding: "15px",
                        height: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>{jobCard.F3 ? (jobCard.F3 % 1 === 0 ? Math.round(jobCard.F3) : jobCard.F3.toFixed(2)) : "N/A"}</div>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Col>

            {/* Right Column (6) - For CFT value / Component Drawing */}
            <Col xs={6} style={{
              borderBottom: "1px solid #000000",
              height: "480px", // Combined height of all rows on the left
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "15px"
            }}>
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                border: "1px dashed #000000"
              }}>
                <span style={{ 
                  fontWeight: "700", 
                  fontSize: "1.25rem",
                  marginBottom: "15px" 
                }}>
                  COMPONENT DRAWING
                </span>
                <div style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #cbd5e0",
                  borderRadius: "4px",
                  overflowX: "auto"
                }}>
                  {drawingsLoading[jobCard.F_ComponentsMaster] ? (
                    <div style={{ textAlign: "center", padding: "1rem" }}>Loading...</div>
                  ) : !drawingsData[jobCard.F_ComponentsMaster] || drawingsData[jobCard.F_ComponentsMaster].length === 0 ? (
                    <div style={{ textAlign: "center", padding: "1rem" }}>No drawings available.</div>
                  ) : (
                    <div style={{ 
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: "1rem",
                      width: "100%"
                    }}>
                      {drawingsData[jobCard.F_ComponentsMaster].map((drawing, index) => {
                        const imageCount = drawingsData[jobCard.F_ComponentsMaster].length;
                        let imageSize, containerSize;
                        
                        if (imageCount === 1) {
                          imageSize = { maxWidth: "800px", maxHeight: "600px" };
                          containerSize = { maxWidth: "850px", minWidth: "600px", width: "100%" };
                        } else if (imageCount === 2) {
                          imageSize = { maxWidth: "500px", maxHeight: "400px" };
                          containerSize = { maxWidth: "550px", minWidth: "400px", width: "48%" };
                        } else if (imageCount === 3) {
                          imageSize = { maxWidth: "350px", maxHeight: "300px" };
                          containerSize = { maxWidth: "400px", minWidth: "300px", width: "32%" };
                        } else if (imageCount === 4) {
                          imageSize = { maxWidth: "280px", maxHeight: "250px" };
                          containerSize = { maxWidth: "320px", minWidth: "250px", width: "24%" };
                        } else {
                          imageSize = { maxWidth: "220px", maxHeight: "200px" };
                          containerSize = { maxWidth: "260px", minWidth: "200px", width: "20%" };
                        }
                        
                        return (
                          <div 
                            key={drawing.Id}
                            style={{ 
                              textAlign: "center",
                              border: "2px solid #e2e8f0", 
                              padding: "0.75rem", 
                              borderRadius: "12px",
                              backgroundColor: "#f8f9fa",
                              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
                              ...containerSize,
                              flex: "1",
                              transition: "transform 0.2s ease, box-shadow 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "scale(1.02)";
                              e.currentTarget.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
                            }}
                          >
                            <img
                              src={`${API_WEB_URLS.IMAGEURL}/${drawing.ImageDataNew}`}
                              alt={drawing.Name || `Drawing ${index + 1}`}
                              style={{
                                width: "100%",
                                ...imageSize,
                                height: "auto",
                                objectFit: "contain",
                                borderRadius: "8px",
                                cursor: "pointer"
                              }}
                              onClick={() => {
                                const newWindow = window.open();
                                newWindow.document.write(`
                                  <html>
                                    <head>
                                      <title>${drawing.Name || `Drawing ${index + 1}`}</title>
                                      <style>
                                        body { 
                                          margin: 0; 
                                          padding: 20px; 
                                          background: #f5f5f5; 
                                          display: flex; 
                                          justify-content: center; 
                                          align-items: center; 
                                          min-height: 100vh; 
                                        }
                                        img { 
                                          max-width: 90vw; 
                                          max-height: 90vh; 
                                          object-fit: contain; 
                                          border-radius: 8px; 
                                          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                                        }
                                      </style>
                                    </head>
                                    <body>
                                      <img src="${API_WEB_URLS.IMAGEURL}/${drawing.ImageDataNew}" alt="${drawing.Name || `Drawing ${index + 1}`}" />
                                    </body>
                                  </html>
                                `);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>

          <div style={{
            marginTop: "1.5rem",
            padding: "1rem",
            border: "2px solid #000000",
            borderRadius: "4px"
          }}>
            <p style={{
              fontWeight: "700",
              marginBottom: "0.5rem"
            }}>Machine Details</p>
            <div style={{ 
              width: '100%',
              margin: '0',
              padding: '0'
            }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "0.5rem",
                border: "2px solid #000000",
                tableLayout: 'fixed'
              }}>
                <thead>
                  <tr>
                    <th style={{
                      border: "2px solid #000000",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      color: "#065f46",
                      fontWeight: "700",
                      width: "80px"
                    }}>MACHINE NO</th>
                    <th style={{
                      border: "2px solid #000000",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      color: "#065f46",
                      fontWeight: "700"
                    }}>DATE</th>
                    <th style={{
                      border: "2px solid #000000",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      color: "#065f46",
                      fontWeight: "700"
                    }}>MACHINE NAME</th>
             
                    <th style={{
                      border: "2px solid #000000",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      color: "#065f46",
                      fontWeight: "700"
                    }}>QUANTITY</th>
                    <th style={{
                      border: "2px solid #000000",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      color: "#065f46",
                      fontWeight: "700"
                    }}>REJECTION</th>
                    <th style={{
                      border: "2px solid #000000",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      color: "#065f46",
                      fontWeight: "700"
                    }}>START TIME</th>
                    <th style={{
                      border: "2px solid #000000",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      color: "#065f46",
                      fontWeight: "700"
                    }}>END TIME</th>
                    <th style={{
                      border: "2px solid #000000",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      color: "#065f46",
                      fontWeight: "700"
                    }}>ALLOCATED TIME</th>
                    <th style={{
                      border: "2px solid #000000",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      color: "#065f46",
                      fontWeight: "700",
                      width: "200px"
                    }}>USER NAME</th>
                  </tr>
                </thead>
                <tbody>
                  {getMachineDetails(jobCard.ID).map((machine) => (
                    <tr key={machine.ID}>
                      <td style={{
                        border: "2px solid #000000",
                        padding: "0.75rem",
                        color: "#000000"
                      }}>{machine.MachineNo}</td>
                      <td style={{
                        border: "2px solid #000000",
                        padding: "0.75rem",
                        color: "#000000"
                      }}>{machine.Date}</td>
                      <td style={{
                        border: "2px solid #000000",
                        padding: "0.75rem",
                        color: "#000000"
                      }}>{machine.MachineName}</td>
    
                      <td style={{
                        border: "2px solid #000000",
                        padding: "0.75rem"
                      }}>
                        <input
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #000000",
                            borderRadius: "4px",
                            color: "#000000"
                          }}
                          name="Quantity"
                          value={machine.Quantity || ""}
                          onChange={(e) => handleChange(machine.ID, e)}
                        />
                      </td>
                      <td style={{
                        border: "2px solid #000000",
                        padding: "0.75rem"
                      }}>
                        <input
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #000000",
                            borderRadius: "4px",
                            color: "#000000"
                          }}
                          name="Rejection"
                          value={machine.Rejection || ""}
                          onChange={(e) => handleChange(machine.ID, e)}
                        />
                      </td>
                      <td style={{
                        border: "2px solid #000000",
                        padding: "0.75rem"
                      }}>
                        <input
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #000000",
                            borderRadius: "4px",
                            color: "#000000"
                          }}
                          name="StartTime"
                          value={machine.StartTime || ""}
                          onChange={(e) => handleChange(machine.ID, e)}
                        />
                      </td>
                      <td style={{
                        border: "2px solid #000000",
                        padding: "0.75rem"
                      }}>
                        <input
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #000000",
                            borderRadius: "4px",
                            color: "#000000"
                          }}
                          name="EndTime"
                          value={machine.EndTime || ""}
                          onChange={(e) => handleChange(machine.ID, e)}
                        />
                      </td>
                      <td style={{
                        border: "2px solid #000000",
                        padding: "0.75rem"
                      }}>
                        <input
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #000000",
                            borderRadius: "4px",
                            color: "#000000"
                          }}
                          name="AllocatedTime"
                          value={machine.AllocatedTime || ""}
                          onChange={(e) => handleChange(machine.ID, e)}
                        />
                      </td>
                      <td style={{
                        border: "2px solid #000000",
                        padding: "0.75rem"
                      }}>
                        <input
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #000000",
                            borderRadius: "4px",
                            color: "#000000"
                          }}
                          name="UserName"
                          value={machine.UserName || ""}
                          onChange={(e) => handleChange(machine.ID, e)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{
            marginTop: "1.5rem",
            padding: "1rem",
            border: "2px solid #000000",
            borderRadius: "4px"
          }}>
            <p style={{
              fontWeight: "700",
              marginBottom: "0.5rem"
            }}>NOTES</p>
            <div style={{
              padding: "0.5rem",
              border: "1px solid #000000",
              borderRadius: "4px"
            }}>{jobCard.Notes || ""}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
};

export default MDFJobCard;
