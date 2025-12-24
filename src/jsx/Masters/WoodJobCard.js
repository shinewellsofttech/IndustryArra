import React, { useEffect, useState } from "react";
import { Row, Col, Button } from "react-bootstrap";
import {
  Fn_AddEditData,
  Fn_FillListData,
  Fn_GetReport,
} from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import ComponentDrawing from "./ComponentDrawing";

const WoodJobCard = ({
  F_ItemMaster,
  F_CategoryMaster,
  F_ContainerMaster,
  F_ContainerMasterL,
}) => {
  const [State, setState] = useState({
    id: 0,
    FillArray: [],
    FillArray1: [],
    FillArray5: [],
    formData: {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobCardArray, setJobCardArray] = useState([]);
  const [machineArray, setMachineArray] = useState([]);
  const [drawings, setDrawings] = useState({});  // Store drawings for each job card
  const [loadingDrawings, setLoadingDrawings] = useState({});  // Track loading state for each job card
  const [selectedJobCardIds, setSelectedJobCardIds] = useState([]);
  
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`;
  const API_URL1 = `${API_WEB_URLS.MASTER}/0/token/ComponentPhoto`;
  const API_URL_SAVE = "GetJobCard/0/token";
  const API_URL_SAVE1 = "GetJobCardL/0/token";
  const API_URL_SAVE2 = "UpdateBatchCode/0/token";
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [dispatch, F_ContainerMaster, F_CategoryMaster, F_ItemMaster]);

  // Fetch data from the API
  const fetchData = async () => {
    setLoading(true);
    try {
      await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
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

      // await Fn_GetReport(dispatch,setJobCardArray,"tenderData", API_URL_SAVE, { arguList: { id: 0, formData: vformData } }  , true);
      // await Fn_GetReport(dispatch,setMachineArray,"tenderData", API_URL_SAVE1, { arguList: { id: 0, formData: vformData } }  , true);
    } catch (error) {
      console.error("Error fetching data:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const [rows, setRows] = useState([
    {
      id: 1,
      machine: "",
      quantity: "",
      rejection: "",
      allocatedTime: "",
      time: "",
      name: "",
    },
  ]);

  const handleChange = (machineId, event) => {
    const { name, value } = event.target;
    const updatedMachineArray = machineArray.map((machine) =>
      machine.ID === machineId ? { ...machine, [name]: value } : machine
    );
    setMachineArray(updatedMachineArray);
  };

  // Function to find MACHINE SEQUENCING for a specific job card
  const getMachineDetails = (jobCardId) => {
    return (
      machineArray.filter((machine) => machine.F_JobCardMaster === jobCardId) ||
      []
    );
  };

  // Handle individual checkbox
  const handleJobCardCheckbox = (jobCardId) => {
    setSelectedJobCardIds((prev) =>
      prev.includes(jobCardId)
        ? prev.filter((id) => id !== jobCardId)
        : [...prev, jobCardId]
    );
  };

  // Handle select all checkbox
  const handleSelectAllCheckbox = () => {
    if (selectedJobCardIds.length === jobCardArray.length) {
      setSelectedJobCardIds([]);
    } else {
      setSelectedJobCardIds(jobCardArray.map((card) => card.ID));
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
              width: 190mm; /* A4 width (210mm) - margins (20mm) */
              height: 277mm; /* A4 height (297mm) - margins (20mm) */
              padding: 5mm;
              box-sizing: border-box;
              margin: 0 auto;
              font-family: Arial, sans-serif;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              position: relative;
              display: flex;
              flex-direction: column;
              overflow: hidden; /* Prevent content overflow */
            }

            .page-break-before {
              page-break-before: always !important;
              break-before: page !important;
            }

            /* Header section - fixed height */
            .header {
              height: 10mm;
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2mm;
              color: #065f46;
            }

            /* Top info section - fixed height */
            .top-info {
              height: 45mm;
              margin-bottom: 2mm;
            }

            /* Dimensions section - fixed height */
            .dimensions-section {
              height: 40mm;
              margin-bottom: 2mm;
            }

            /* Drawing section - maximize space for images */
            .drawing-section {
              height: 180mm; /* Increased height for larger images */
              margin: 2mm 0;
              border: 1px solid #000;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            /* Adjust drawing section when machine table has more rows */
            .job-card[data-machine-rows="6"] .drawing-section { height: 108mm; }
            .job-card[data-machine-rows="7"] .drawing-section { height: 101mm; }
            .job-card[data-machine-rows="8"] .drawing-section { height: 94mm; }
            .job-card[data-machine-rows="9"] .drawing-section { height: 87mm; }
            .job-card[data-machine-rows="10"] .drawing-section { height: 80mm; }

            .drawing-section .label {
              height: 5mm;
              font-size: 11px;
              margin-bottom: 1mm;
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

            /* Machine table section - fixed height based on rows */
            .machine-table-section {
              height: 45mm; /* Base height for 5 rows with increased row height */
              margin: 2mm 0;
            }

            /* Adjust table section height based on number of rows */
            .job-card[data-machine-rows="6"] .machine-table-section { height: 52mm; }
            .job-card[data-machine-rows="7"] .machine-table-section { height: 59mm; }
            .job-card[data-machine-rows="8"] .machine-table-section { height: 66mm; }
            .job-card[data-machine-rows="9"] .machine-table-section { height: 73mm; }
            .job-card[data-machine-rows="10"] .machine-table-section { height: 80mm; }

            .machine-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            /* Column width adjustments for print */
            .machine-table col:nth-child(1) {
              width: 12mm; /* M/C NO - reduced for 3 characters */
            }

            .machine-table col:nth-child(2) {
              width: 18mm; /* DATE */
            }

            .machine-table col:nth-child(3) {
              width: auto; /* M/C NAME - takes remaining space */
            }

            .machine-table col:nth-child(4) {
              width: 15mm; /* PROCESS */
            }

            .machine-table col:nth-child(5) {
              width: 12mm; /* QTY */
            }

            .machine-table col:nth-child(6) {
              width: 12mm; /* REJ */
            }

            .machine-table col:nth-child(7) {
              width: 24mm; /* START TIME - increased */
            }

            .machine-table col:nth-child(8) {
              width: 24mm; /* END TIME - increased */
            }

            .machine-table col:nth-child(9) {
              width: 20mm; /* ALLOCATED TIME */
            }

            .machine-table col:nth-child(10) {
              width: 22mm; /* OPERATOR NAME */
            }


            .machine-table th {
              padding: 1.5mm 1mm;
              font-size: 9px;
              text-align: center;
              line-height: 1.4;
              background-color: #f0f0f0;
              white-space: normal;
              word-wrap: break-word;
              vertical-align: middle;
              font-weight: 700;
              height: 8mm;
            }

            .machine-table td {
              padding: 1.5mm 1mm;
              font-size: 9px;
              text-align: center;
              line-height: 1.3;
              vertical-align: middle;
              height: 9mm;
            }

            /* Machine number - compact but visible */
            .machine-table td:first-child {
              font-size: 11px !important;
              font-weight: 600 !important;
            }
            
            /* Machine name - left align and wrap */
            .machine-table td:nth-child(3) {
              text-align: left !important;
              padding-left: 2mm !important;
              padding-right: 2mm !important;
              font-size: 10px !important;
              white-space: normal !important;
              word-wrap: break-word !important;
            }

            /* Notes section - fixed height */
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
            }

            .notes-content {
              font-size: 10px;
              line-height: 1.2;
              height: calc(100% - 5mm);
              overflow: hidden;
            }

            /* General table styles */
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
        <script>
          window.addEventListener('load', function() {
            const machineNameCells = document.querySelectorAll('.machine-table td:nth-child(3)');
            machineNameCells.forEach(cell => {
              const content = cell.textContent;
              if (content.length > 25) {
                cell.setAttribute('data-length', 'long');
              }
              if (content.length > 35) {
                cell.setAttribute('data-length', 'very-long');
              }
            });
          });
        </script>
      </head>
      <body>
        ${jobCards.map(jobCard => {
          const machineDetails = getMachineDetails(jobCard.ID);
          return `
            <!-- Page 1 -->
            <div class="job-card" data-machine-rows="${machineDetails.length}">
              <div class="space-calculator"></div>
              <div class="header" style={{fontFamily: 'Copperplate Gothic Light'}}>AARA DESIGN</div>
              
              <table>
                <tr class="info-row">
                  <td class="label" style="width: 33%">WOOD MACHINE CENTRE</td>
                  <td class="label" style="width: 34%">JOB CARD NUMBER: ${jobCard.JobCardNo || 'N/A'}</td>
                  <td class="label" style="width: 33%">ORDER QTY: ${jobCard.OrderQty || 'N/A'}</td>
                </tr>
              </table>

              <table>
                <tr class="info-row">
                  <td class="label" style="width: 20%">CONTAINER NUMBER</td>
                  <td style="width: 30%">${jobCard.ContainerNumber || 'N/A'}</td>
                  <td class="label" style="width: 20%">INSPECTION DATE</td>
                  <td style="width: 30%">${jobCard.InspectionDate || 'N/A'}</td>
                </tr>
                <tr class="info-row">
                  <td class="label">PRODUCT CODE</td>
                  <td>${jobCard.ProductCode || 'N/A'}</td>
                  <td class="label">ITEM</td>
                  <td>${jobCard.ItemName || 'N/A'}</td>
                </tr>
                <tr class="info-row">
                  <td class="label">BATCH CODE</td>
                  <td colspan="3">${jobCard.BatchCode || ''}</td>
                </tr>
                <tr class="info-row">
                  <td class="label">COMPONENT</td>
                  <td>${jobCard.ComponentsName || 'N/A'}</td>
                  <td class="label">COMPONENT QTY</td>
                  <td>${jobCard.ComponentQty || 'N/A'}</td>
                </tr>
              </table>

              <table class="dimensions-table">
                <tr>
                  <th colspan="4" class="label">WOOD ISSUE SIZE (inch)</th>
                </tr>
                <tr>
                  <td class="label" style="width: 25%">Length</td>
                  <td class="label" style="width: 25%">Width</td>
                  <td class="label" style="width: 25%">Thickness</td>
                  <td class="label" style="width: 25%">CFT</td>
                </tr>
                <tr>
                  <td>${jobCard.W1 ? (jobCard.W1 % 1 === 0 ? Math.round(jobCard.W1) : jobCard.W1.toFixed(2)) : 'N/A'}</td>
                  <td>${jobCard.W2 ? (jobCard.W2 % 1 === 0 ? Math.round(jobCard.W2) : jobCard.W2.toFixed(2)) : 'N/A'}</td>
                  <td>${jobCard.W3 ? (jobCard.W3 % 1 === 0 ? Math.round(jobCard.W3) : jobCard.W3.toFixed(2)) : 'N/A'}</td>
                  <td>${jobCard.CFT ? (jobCard.CFT % 1 === 0 ? Math.round(jobCard.CFT) : jobCard.CFT.toFixed(2)) : 'N/A'}</td>
                </tr>
                ${jobCard.W_1 || jobCard.W_2 || jobCard.W_3 || jobCard.Qty3 ? `
                <tr>
                  <td>${jobCard.W_1 ? (jobCard.W_1 % 1 === 0 ? Math.round(jobCard.W_1) : jobCard.W_1.toFixed(2)) : 'N/A'}</td>
                  <td>${jobCard.W_2 ? (jobCard.W_2 % 1 === 0 ? Math.round(jobCard.W_2) : jobCard.W_2.toFixed(2)) : 'N/A'}</td>
                  <td>${jobCard.W_3 ? (jobCard.W_3 % 1 === 0 ? Math.round(jobCard.W_3) : jobCard.W_3.toFixed(2)) : 'N/A'}</td>
                  <td>${jobCard.CFT2 ? (jobCard.CFT2 % 1 === 0 ? Math.round(jobCard.CFT2) : jobCard.CFT2.toFixed(2)) : 'N/A'}</td>
                </tr>
                ` : ''}
              </table>

              <table class="dimensions-table">
                <tr>
                  <th colspan="3" class="label">FINAL DIMENSION (mm)</th>
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

              <table class="machine-table" data-rows="${machineDetails.length}">
                <colgroup>
                  <col style="width: 12mm">
                  <col style="width: 18mm">
                  <col>
                  <col style="width: 15mm">
                  <col style="width: 12mm">
                  <col style="width: 12mm">
                  <col style="width: 24mm">
                  <col style="width: 24mm">
                  <col style="width: 20mm">
                  <col style="width: 22mm">
                </colgroup>
                <tr>
                  <th colspan="10" class="label">MACHINE SEQUENCING</th>
                </tr>
                <tr>
                  <th>M/C NO</th>
                  <th>DATE</th>
                  <th>M/C NAME</th>
                  <th>PROCESS</th>
                  <th>QTY</th>
                  <th>REJ</th>
                  <th>START TIME</th>
                  <th>END TIME</th>
                  <th>ALLOCATED TIME</th>
                  <th>OPERATOR NAME</th>
                </tr>
                ${machineDetails.map(machine => `
                  <tr>
                    <td style="height: 9mm; padding: 1.5mm 1mm; vertical-align: middle; text-align: center; font-size: 11px; font-weight: 600;">${machine.MachineNo || ''}</td>
                    <td style="height: 9mm; padding: 1.5mm 1mm; vertical-align: middle; text-align: center; font-size: 9px;">${machine.Date || ''}</td>
                    <td style="height: 9mm; padding: 1.5mm 2mm; vertical-align: middle; text-align: left; font-size: 10px; font-weight: 500;">${machine.MachineName || ''}</td>
                    <td style="height: 9mm; padding: 1.5mm 1mm; vertical-align: middle; text-align: center; font-size: 9px;">${machine.Process || ''}</td>
                    <td style="height: 9mm; padding: 1.5mm 1mm; vertical-align: middle; text-align: center; font-size: 9px;">${machine.Quantity || ''}</td>
                    <td style="height: 9mm; padding: 1.5mm 1mm; vertical-align: middle; text-align: center; font-size: 9px;">${machine.Rejection || ''}</td>
                    <td style="height: 9mm; padding: 1.5mm 1mm; vertical-align: middle; text-align: center; font-size: 9px;">${machine.StartTime || ''}</td>
                    <td style="height: 9mm; padding: 1.5mm 1mm; vertical-align: middle; text-align: center; font-size: 9px;">${machine.EndTime || ''}</td>
                    <td style="height: 9mm; padding: 1.5mm 1mm; vertical-align: middle; text-align: center; font-size: 9px;">${machine.AllocatedTime || ''}</td>
                    <td style="height: 9mm; padding: 1.5mm 1mm; vertical-align: middle; text-align: center; font-size: 9px;">${machine.UserName || ''}</td>
                  </tr>
                `).join('')}
              </table>

              <div class="notes-section">
                <div class="label">NOTES</div>
                <div class="notes-content">${jobCard.Notes || ''}</div>
              </div>
            </div>

            <!-- Page 2 -->
            <div class="job-card page-break-before">
              <div class="header" style={{fontFamily: 'Copperplate Gothic Light'}}>AARA DESIGN</div>
              
              <!-- Component Name - Centered Sub-header -->
              <table>
                <tr>
                  <td style="text-align: center; padding: 0.75rem; border-bottom: 1px solid #000000; font-weight: 700; font-size: 0.9rem;">
                    ${jobCard.ComponentsName || 'N/A'}
                  </td>
                </tr>
              </table>

              <!-- Dimensions Table -->
              <table class="dimensions-table">
                <tr>
                  <th style="border: 1px solid #000000; padding: 0.75rem; text-align: center; background-color: #f8f9fa; color: #065f46; font-weight: 700;">W (in mm)</th>
                  <th style="border: 1px solid #000000; padding: 0.75rem; text-align: center; background-color: #f8f9fa; color: #065f46; font-weight: 700;">D (in mm)</th>
                  <th style="border: 1px solid #000000; padding: 0.75rem; text-align: center; background-color: #f8f9fa; color: #065f46; font-weight: 700;">THK. (in mm)</th>
                </tr>
                <tr>
                  <td style="border: 1px solid #000000; padding: 0.75rem; text-align: center; font-weight: 600;">${jobCard.F1 ? (jobCard.F1 % 1 === 0 ? Math.round(jobCard.F1) : jobCard.F1.toFixed(2)) : 'N/A'}</td>
                  <td style="border: 1px solid #000000; padding: 0.75rem; text-align: center; font-weight: 600;">${jobCard.F2 ? (jobCard.F2 % 1 === 0 ? Math.round(jobCard.F2) : jobCard.F2.toFixed(2)) : 'N/A'}</td>
                  <td style="border: 1px solid #000000; padding: 0.75rem; text-align: center; font-weight: 600;">${jobCard.F3 ? (jobCard.F3 % 1 === 0 ? Math.round(jobCard.F3) : jobCard.F3.toFixed(2)) : 'N/A'}</td>
                </tr>
              </table>

              <div class="drawing-section" style="flex: 1; min-height: 400px; display: flex; flex-direction: column;">
                <div class="label">COMPONENT DRAWING</div>
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  ${drawings[jobCard.F_ComponentsMaster] && drawings[jobCard.F_ComponentsMaster].length > 0 ? `
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 2mm; width: 100%;">
                      ${drawings[jobCard.F_ComponentsMaster].map((drawing, index) => {
                        const imageCount = drawings[jobCard.F_ComponentsMaster].length;
                        let imageSize, containerSize;
                        
                        // Maximize sizing for print to use full section space
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

  // Add this new function to handle batch code submission

  // Update the existing handleBatchCodeChange function
  const handleBatchCodeChange = async (e, jobCardId) => {
    try {
      const newBatchCode = e.target.value;
      // Update local state
      const updatedJobCards = jobCardArray.map((card) =>
        card.ID === jobCardId ? { ...card, BatchCode: newBatchCode } : card
      );
      setJobCardArray(updatedJobCards);
    } catch (error) {
      console.error("Error updating batch code:", error);
    }
  };

  // Update the existing handleBulkBatchCodeChange function to include submission
  const handleBulkBatchCodeChange = async (e) => {
    const newBatchCode = e.target.value;
    // Update all job cards with the new batch code
    const updatedJobCards = jobCardArray.map((card) => ({
      ...card,
      BatchCode: newBatchCode,
    }));
    setJobCardArray(updatedJobCards);
  };

  // Update the handleBatchCodeSubmit function to handle array of batch codes
  const handleBatchCodeSubmit = async (batchCodesArray) => {
    try {
      const userData = JSON.parse(localStorage.getItem("authUser"));

      let vformData = new FormData();
      // Convert array to JSON string containing only ID and BatchCode
      const batchCodeData = batchCodesArray.map((item) => ({
        Id: item.Id,
        BatchCode: item.BatchCode || "",
      }));

      vformData.append("Data", JSON.stringify(batchCodeData));

      // Make API call to update batch codes
      Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: 0, formData: vformData } },
        API_URL_SAVE2,
        true,
        "memberid",
        navigate,
        "/JobCardForm"
      );
    } catch (error) {
      console.error("Error submitting batch codes:", error);
    }
  };

  // Update the bulk submit function to send all batch codes at once
  const handleBulkBatchCodeSubmit = async () => {
    try {
      // Filter and create array of only job cards with non-empty batch codes
      const batchCodesArray = jobCardArray
        .filter((card) => card.BatchCode && card.BatchCode.trim() !== "")
        .map((card) => ({
          Id: card.ID,
          BatchCode: card.BatchCode,
        }));

      // Only proceed with API call if there are batch codes to update
      if (batchCodesArray.length > 0) {
        await handleBatchCodeSubmit(batchCodesArray);
        // Add success feedback
        alert(`Successfully updated ${batchCodesArray.length} batch codes`);
      } else {
        // Add warning feedback
        alert(
          "No batch codes to update. Please enter at least one batch code."
        );
      }
    } catch (error) {
      console.error("Error submitting bulk batch codes:", error);
      // Add error feedback
      alert("Error updating batch codes. Please try again.");
    }
  };

  // Add new function to fetch drawings
  const fetchDrawings = async (componentMasterId) => {
    if (!componentMasterId) {
      setDrawings(prev => ({ ...prev, [componentMasterId]: [] }));
      setLoadingDrawings(prev => ({ ...prev, [componentMasterId]: false }));
      return;
    }

    setLoadingDrawings(prev => ({ ...prev, [componentMasterId]: true }));
    try {
      const result = await Fn_FillListData(
        dispatch, 
        setState, 
        "FillArray5", 
        `${API_URL1}/Id/${componentMasterId}`
      );

      if (Array.isArray(result) && result.length > 0) {
        setDrawings(prev => ({ ...prev, [componentMasterId]: result }));
      } else {
        setDrawings(prev => ({ ...prev, [componentMasterId]: [] }));
      }
    } catch (error) {
      console.error("Error fetching drawings:", error);
      setDrawings(prev => ({ ...prev, [componentMasterId]: [] }));
    } finally {
      setLoadingDrawings(prev => ({ ...prev, [componentMasterId]: false }));
    }
  };

  // Fetch drawings when job cards change
  useEffect(() => {
    jobCardArray.forEach(jobCard => {
      if (jobCard.F_ComponentsMaster && !drawings[jobCard.F_ComponentsMaster]) {
        fetchDrawings(jobCard.F_ComponentsMaster);
      }
    });
  }, [jobCardArray]);

  return (
    <div className="print-safe-page">
      <Row>
        <Col>
          <Button
            onClick={handlePrintJobCards}
            className="no-print"
            style={{
              backgroundColor: "#065f46",
              border: "none",
              padding: "10px 20px",
              marginRight: "10px",
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
              marginLeft: "10px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>Save All Batch Codes</span>
            <i className="fas fa-save"></i>
          </Button>
        </Col>
      </Row>

      <Row className="mb-2" style={{ padding: "0 20px" }}>
        <Col xs={12}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <input
              type="checkbox"
              checked={
                selectedJobCardIds.length === jobCardArray.length &&
                jobCardArray.length > 0
              }
              onChange={handleSelectAllCheckbox}
              id="selectAllJobCards"
            />
            <label
              htmlFor="selectAllJobCards"
              style={{ fontWeight: 600, color: "#065f46", marginBottom: 0 }}
            >
              Select All Job Cards
            </label>
            <span style={{ color: "#888", fontSize: "0.9rem" }}>
              ({selectedJobCardIds.length} selected)
            </span>
          </div>
        </Col>
      </Row>

      <div
        id="jobCardsContainer"
        style={{
          padding: "30px",
          border: "8px solid #1a1a1a",
          margin: "20px",
          backgroundColor: "#fff",
          boxShadow: "0 0 20px rgba(0,0,0,0.1)",
          width: "auto",
          minHeight: "100%",
          position: "relative",
          overflow: "visible",
        }}
      >
        {jobCardArray.map((jobCard, idx) => (
          <div
            key={jobCard.ID}
            className="job-card"
            style={{
              border: "3px solid #2d3748",
              marginBottom: "30px",
              backgroundColor: "#fff",
              borderRadius: "4px",
              breakInside: "avoid",
              pageBreakInside: "avoid",
              width: "100%",
              maxWidth: "100%",
              padding: "10px",
              margin: "0",
              position: "relative",
            }}
          >
            <div
              style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}
            >
              <input
                type="checkbox"
                checked={selectedJobCardIds.includes(jobCard.ID)}
                onChange={() => handleJobCardCheckbox(jobCard.ID)}
                id={`jobCardCheckbox-${jobCard.ID}`}
              />
            </div>
            <div
              style={{
                width: "100%",
                fontSize: "0.875rem",
                lineHeight: "1.25rem",
              }}
            >
              {/* Header Row */}
              <Row className="g-0">
                <Col
                  xs={12}
                  style={{
                    borderBottom: "2px solid #2d3748",
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                    }}
                  >
                    <span
                      style={{
                        color: "#065f46",
                        fontWeight: "700",
                        fontSize: "1.25rem",
                        fontFamily: "Copperplate Gothic Light",
                      }}
                    >
                      AARA DESIGN
                    </span>
                  </div>
                </Col>
              </Row>

              {/* Second Row */}
              <Row className="g-0">
                <Col
                  xs={5}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    WOOD MACHINE CENTRE
                  </span>
                </Col>
                <Col
                  xs={5}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    JOB CARD NUMBER :{" "}
                  </span>
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                      marginLeft: "0.5rem",
                    }}
                  >
                    {jobCard.JobCardNo || "N/A"}
                  </span>
                </Col>
                <Col
                  xs={2}
                  style={{
                    borderBottom: "2px solid #2d3748",
                    padding: 0,
                  }}
                >
                  <Row className="g-0">
                    <Col
                      style={{
                        textAlign: "center",
                        padding: "0.75rem",
                        borderRight: "2px solid #2d3748",
                        color: "#065f46",
                        fontWeight: "700",
                      }}
                    >
                      ORDER QTY
                    </Col>
                    <Col
                      style={{
                        textAlign: "center",
                        padding: "0.75rem",
                      }}
                    >
                      {jobCard.OrderQty || "N/A"}
                    </Col>
                  </Row>
                </Col>
              </Row>

              {/* Container Number Row */}
              <Row className="g-0">
                <Col
                  xs={3}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    CONTAINER NUMBER
                  </span>
                </Col>
                <Col
                  xs={5}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #000000",
                    padding: "0.75rem",
                    color: "#000000",
                  }}
                >
                  <span>{jobCard.ContainerNumber || "N/A"}</span>
                </Col>
                <Col
                  xs={2}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                    textAlign: "center",
                    color: "#065f46",
                    fontWeight: "700",
                  }}
                >
                  INSPECTION DATE
                </Col>
                <Col
                  xs={2}
                  style={{
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                    textAlign: "center",
                    color: "#000000",
                  }}
                >
                  {jobCard.InspectionDate || "N/A"}
                </Col>
              </Row>

              {/* Product Code and Item Row */}
              <Row className="g-0">
                <Col
                  xs={2}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    PRODUCT
                  </div>
                  <div
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    CODE
                  </div>
                </Col>
                <Col
                  xs={2}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#000000",
                    }}
                  >
                    {jobCard.ProductCode || "N/A"}
                  </span>
                </Col>
                <Col
                  xs={2}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    ITEM
                  </span>
                </Col>
                <Col
                  xs={6}
                  style={{
                    color: "#000000",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span>{jobCard.ItemName || "N/A"}</span>
                </Col>
              </Row>

              {/* Batch Code Row */}
              <Row className="g-0">
                <Col
                  xs={12}
                  style={{
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                      marginRight: "0.5rem",
                    }}
                  >
                    BATCH CODE
                  </span>
                  <input
                    type="text"
                    value={jobCard.BatchCode || ""}
                    onChange={(e) => handleBatchCodeChange(e, jobCard.ID)}
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #000000",
                      borderRadius: "4px",
                      color: "#000000",
                      width: "200px",
                    }}
                    placeholder=""
                  />
                </Col>
              </Row>

              {/* Component Row */}
              <Row className="g-0">
                <Col
                  xs={4}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    COMPONENT
                  </span>
                </Col>
                <Col
                  xs={4}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span>{jobCard.ComponentsName || "N/A"}</span>
                </Col>
                <Col
                  xs={2}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    COMPONENT QUANTITY
                  </span>
                </Col>
                <Col
                  xs={2}
                  style={{
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span>{jobCard.ComponentQty || "N/A"}</span>
                </Col>
              </Row>

              {/* Wood Issue Size Row with Labels */}
              <Row className="g-0">
                <Col
                  xs={4}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    WOOD ISSUE SIZE (inch)
                  </span>
                </Col>
                <Col
                  xs={8}
                  style={{
                    borderBottom: "2px solid #2d3748",
                  }}
                >
                  <Row className="g-0">
                    <Col
                      xs={3}
                      style={{
                        textAlign: "center",
                        borderRight: "2px solid #2d3748",
                        padding: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          borderBottom: "2px solid #2d3748",
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        Length (in inch)
                      </div>
                      <div
                        style={{
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        {jobCard.W1
                          ? jobCard.W1 % 1 === 0
                            ? Math.round(jobCard.W1)
                            : jobCard.W1.toFixed(2)
                          : "N/A"}
                      </div>
                    </Col>
                    <Col
                      xs={3}
                      style={{
                        textAlign: "center",
                        borderRight: "2px solid #2d3748",
                        padding: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          borderBottom: "2px solid #2d3748",
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        Width (in inch)
                      </div>
                      <div
                        style={{
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        {jobCard.W2
                          ? jobCard.W2 % 1 === 0
                            ? Math.round(jobCard.W2)
                            : jobCard.W2.toFixed(2)
                          : "N/A"}
                      </div>
                    </Col>
                    <Col
                      xs={3}
                      style={{
                        textAlign: "center",
                        borderRight: "2px solid #2d3748",
                        padding: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          borderBottom: "2px solid #2d3748",
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        Thickness (in inch)
                      </div>
                      <div
                        style={{
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        {jobCard.W3
                          ? jobCard.W3 % 1 === 0
                            ? Math.round(jobCard.W3)
                            : jobCard.W3.toFixed(2)
                          : "N/A"}
                      </div>
                    </Col>
                    <Col
                      xs={3}
                      style={{
                        textAlign: "center",
                        padding: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          borderBottom: "2px solid #2d3748",
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        CFT
                      </div>
                      <div
                        style={{
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        {jobCard.CFT
                          ? jobCard.CFT % 1 === 0
                            ? Math.round(jobCard.CFT)
                            : jobCard.CFT.toFixed(2)
                          : "N/A"}
                      </div>
                    </Col>
                  </Row>
                  
                  {/* Additional row for W_1, W_2, W_3, Qty3 if they exist */}
                  {(jobCard.W_1 || jobCard.W_2 || jobCard.W_3 || jobCard.Qty3) && (
                    <Row className="g-0" style={{ borderTop: "1px solid #2d3748" }}>
                      <Col
                        xs={3}
                        style={{
                          textAlign: "center",
                          borderRight: "2px solid #2d3748",
                          padding: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            padding: "0.75rem",
                            color: "#000000",
                          }}
                        >
                          {jobCard.W_1
                            ? jobCard.W_1 % 1 === 0
                              ? Math.round(jobCard.W_1)
                              : jobCard.W_1.toFixed(2)
                            : "N/A"}
                        </div>
                      </Col>
                      <Col
                        xs={3}
                        style={{
                          textAlign: "center",
                          borderRight: "2px solid #2d3748",
                          padding: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            padding: "0.75rem",
                            color: "#000000",
                          }}
                        >
                          {jobCard.W_2
                            ? jobCard.W_2 % 1 === 0
                              ? Math.round(jobCard.W_2)
                              : jobCard.W_2.toFixed(2)
                            : "N/A"}
                        </div>
                      </Col>
                      <Col
                        xs={3}
                        style={{
                          textAlign: "center",
                          borderRight: "2px solid #2d3748",
                          padding: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            padding: "0.75rem",
                            color: "#000000",
                          }}
                        >
                          {jobCard.W_3
                            ? jobCard.W_3 % 1 === 0
                              ? Math.round(jobCard.W_3)
                              : jobCard.W_3.toFixed(2)
                            : "N/A"}
                        </div>
                      </Col>
                      <Col
                        xs={3}
                        style={{
                          textAlign: "center",
                          padding: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            padding: "0.75rem",
                            color: "#000000",
                          }}
                        >
                          {jobCard.Qty3
                            ? jobCard.Qty3 % 1 === 0
                              ? Math.round(jobCard.Qty3)
                              : jobCard.Qty3.toFixed(2)
                            : "N/A"}
                        </div>
                      </Col>
                    </Row>
                  )}
                </Col>
              </Row>

              {/* Final Dimension Row with Labels */}
              <Row className="g-0">
                <Col
                  xs={4}
                  style={{
                    borderRight: "2px solid #2d3748",
                    borderBottom: "2px solid #2d3748",
                    padding: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                    }}
                  >
                    Final Dimension (mm)
                  </span>
                </Col>
                <Col
                  xs={8}
                  style={{
                    borderBottom: "2px solid #2d3748",
                  }}
                >
                  <Row className="g-0">
                    <Col
                      xs={4}
                      style={{
                        textAlign: "center",
                        borderRight: "2px solid #2d3748",
                        padding: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          borderBottom: "2px solid #2d3748",
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        Length (in mm)
                      </div>
                      <div
                        style={{
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        {jobCard.F1
                          ? jobCard.F1 % 1 === 0
                            ? Math.round(jobCard.F1)
                            : jobCard.F1.toFixed(2)
                          : "N/A"}
                      </div>
                    </Col>
                    <Col
                      xs={4}
                      style={{
                        textAlign: "center",
                        borderRight: "2px solid #2d3748",
                        padding: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          borderBottom: "2px solid #2d3748",
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        Width (in mm)
                      </div>
                      <div
                        style={{
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        {jobCard.F2
                          ? jobCard.F2 % 1 === 0
                            ? Math.round(jobCard.F2)
                            : jobCard.F2.toFixed(2)
                          : "N/A"}
                      </div>
                    </Col>
                    <Col
                      xs={4}
                      style={{
                        textAlign: "center",
                        padding: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          borderBottom: "2px solid #2d3748",
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        Thickness (in mm)
                      </div>
                      <div
                        style={{
                          padding: "0.75rem",
                          color: "#000000",
                        }}
                      >
                        {jobCard.F3
                          ? jobCard.F3 % 1 === 0
                            ? Math.round(jobCard.F3)
                            : jobCard.F3.toFixed(2)
                          : "N/A"}
                      </div>
                    </Col>
                  </Row>
                </Col>
              </Row>


              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  border: "2px solid #2d3748",
                  borderRadius: "4px",
                }}
              >
                <p
                  style={{
                    color: "#065f46",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                  }}
                >
                  MACHINE SEQUENCING
                </p>
                <div
                  style={{
                    width: "100%",
                    margin: "0",
                    padding: "0",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginTop: "0.5rem",
                      border: "2px solid #000000",
                      tableLayout: "fixed",
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                            width: "80px",
                          }}
                        >
                          MACHINE NO
                        </th>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                          }}
                        >
                          DATE
                        </th>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                          }}
                        >
                          MACHINE NAME
                        </th>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                          }}
                        >
                          PROCESS
                        </th>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                          }}
                        >
                          QUANTITY
                        </th>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                          }}
                        >
                          REJECTION
                        </th>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                          }}
                        >
                          START TIME
                        </th>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                          }}
                        >
                          END TIME
                        </th>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                          }}
                        >
                          ALLOCATED TIME
                        </th>
                        <th
                          style={{
                            border: "2px solid #000000",
                            padding: "0.75rem",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700",
                            width: "200px",
                          }}
                        >
                          OPERATOR NAME
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getMachineDetails(jobCard.ID).map((machine) => (
                        <tr key={machine.ID}>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                              color: "#000000",
                            }}
                          >
                            {machine.MachineNo}
                          </td>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                              color: "#000000",
                            }}
                          >
                            {machine.Date}
                          </td>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                              color: "#000000",
                            }}
                          >
                            {machine.MachineName}
                          </td>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                            }}
                          >
                            <input
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #000000",
                                borderRadius: "4px",
                                color: "#000000",
                              }}
                              name="Process"
                              value={machine.Process || ""}
                              onChange={(e) => handleChange(machine.ID, e)}
                            />
                          </td>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                            }}
                          >
                            <input
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #000000",
                                borderRadius: "4px",
                                color: "#000000",
                              }}
                              name="Quantity"
                              value={machine.Quantity || ""}
                              onChange={(e) => handleChange(machine.ID, e)}
                            />
                          </td>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                            }}
                          >
                            <input
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #000000",
                                borderRadius: "4px",
                                color: "#000000",
                              }}
                              name="Rejection"
                              value={machine.Rejection || ""}
                              onChange={(e) => handleChange(machine.ID, e)}
                            />
                          </td>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                            }}
                          >
                            <input
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #000000",
                                borderRadius: "4px",
                                color: "#000000",
                              }}
                              name="StartTime"
                              value={machine.StartTime || ""}
                              onChange={(e) => handleChange(machine.ID, e)}
                            />
                          </td>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                            }}
                          >
                            <input
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #000000",
                                borderRadius: "4px",
                                color: "#000000",
                              }}
                              name="EndTime"
                              value={machine.EndTime || ""}
                              onChange={(e) => handleChange(machine.ID, e)}
                            />
                          </td>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                            }}
                          >
                            <input
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #000000",
                                borderRadius: "4px",
                                color: "#000000",
                              }}
                              name="AllocatedTime"
                              value={machine.AllocatedTime || ""}
                              onChange={(e) => handleChange(machine.ID, e)}
                            />
                          </td>
                          <td
                            style={{
                              border: "2px solid #000000",
                              padding: "0.75rem",
                            }}
                          >
                            <input
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #000000",
                                borderRadius: "4px",
                                color: "#000000",
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

              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  border: "2px solid #2d3748",
                  borderRadius: "4px",
                }}
              >
                <p
                  style={{
                    color: "#065f46",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                    height: "4cm",
                  }}
                >
                  NOTES
                </p>
                <div
                  style={{
                    padding: "0.5rem",
                    border: "1px solid #cbd5e0",
                    borderRadius: "4px",
                    height: "3cm",
                    overflow: "auto",
                  }}
                >
                  {jobCard.Notes || ""}
                </div>
              </div>
            </div>

            {/* Second Page - Component Drawings */}
            <div
              className="job-card-page-2"
              style={{
                border: "3px solid #2d3748",
                marginTop: "30px",
                backgroundColor: "#fff",
                borderRadius: "4px",
                breakInside: "avoid",
                pageBreakInside: "avoid",
                width: "100%",
                maxWidth: "100%",
                padding: "10px",
                margin: "0",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "100%",
                  fontSize: "0.875rem",
                  lineHeight: "1.25rem",
                }}
              >
                {/* Header Row */}
                <Row className="g-0">
                  <Col
                    xs={12}
                    style={{
                      borderBottom: "2px solid #2d3748",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        padding: "0.75rem",
                        backgroundColor: "#f8f9fa",
                      }}
                    >
                      <span
                        style={{
                          color: "#065f46",
                          fontWeight: "700",
                          fontSize: "1.25rem",
                          fontFamily: "Copperplate Gothic Light",
                        }}
                      >
                        AARA DESIGN
                      </span>
                    </div>
                  </Col>
                </Row>

                {/* Component Name - Centered Sub-header */}
                <Row className="g-0">
                  <Col
                    xs={12}
                    style={{
                      borderBottom: "2px solid #2d3748",
                      padding: "0.75rem",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#000000",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      {jobCard.ComponentsName || "N/A"}
                    </span>
                  </Col>
                </Row>

                {/* Dimensions Table */}
                <Row className="g-0">
                  <Col
                    xs={12}
                    style={{
                      borderBottom: "2px solid #2d3748",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ 
                            border: "2px solid #2d3748", 
                            padding: "0.75rem", 
                            textAlign: "center",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700"
                          }}>
                            W (in mm)
                          </th>
                          <th style={{ 
                            border: "2px solid #2d3748", 
                            padding: "0.75rem", 
                            textAlign: "center",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700"
                          }}>
                            D (in mm)
                          </th>
                          <th style={{ 
                            border: "2px solid #2d3748", 
                            padding: "0.75rem", 
                            textAlign: "center",
                            backgroundColor: "#f8f9fa",
                            color: "#065f46",
                            fontWeight: "700"
                          }}>
                            THK. (in mm)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ 
                            border: "2px solid #2d3748", 
                            padding: "0.75rem", 
                            textAlign: "center",
                            color: "#000000",
                            fontWeight: "600"
                          }}>
                            {jobCard.F1
                              ? jobCard.F1 % 1 === 0
                                ? Math.round(jobCard.F1)
                                : jobCard.F1.toFixed(2)
                              : "N/A"}
                          </td>
                          <td style={{ 
                            border: "2px solid #2d3748", 
                            padding: "0.75rem", 
                            textAlign: "center",
                            color: "#000000",
                            fontWeight: "600"
                          }}>
                            {jobCard.F2
                              ? jobCard.F2 % 1 === 0
                                ? Math.round(jobCard.F2)
                                : jobCard.F2.toFixed(2)
                              : "N/A"}
                          </td>
                          <td style={{ 
                            border: "2px solid #2d3748", 
                            padding: "0.75rem", 
                            textAlign: "center",
                            color: "#000000",
                            fontWeight: "600"
                          }}>
                            {jobCard.F3
                              ? jobCard.F3 % 1 === 0
                                ? Math.round(jobCard.F3)
                                : jobCard.F3.toFixed(2)
                              : "N/A"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Col>
                </Row>

                {/* Component Drawing Section */}
                <div
                  style={{
                    border: "2px solid #2d3748",
                    borderRadius: "4px",
                    width: "100%",
                    padding: "1rem",
                    marginTop: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    flex: "1",
                    minHeight: "600px",
                    maxHeight: "800px",
                  }}
                >
                  <div
                    style={{
                      color: "#065f46",
                      fontWeight: "700",
                      marginBottom: "1rem",
                      textAlign: "center",
                      fontSize: "1.1rem",
                    }}
                  >
                    COMPONENT DRAWING
                  </div>
                  
                  {/* Images only format for drawings */}
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "1rem",
                      flex: "1",
                      justifyContent: "center",
                      minHeight: "500px",
                      padding: "1rem"
                    }}
                  >
                    {loadingDrawings[jobCard.F_ComponentsMaster] ? (
                      <div style={{ 
                        textAlign: "center", 
                        padding: "2rem",
                        fontSize: "1.1rem",
                        color: "#666",
                        minHeight: "200px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        Loading drawings...
                      </div>
                    ) : !drawings[jobCard.F_ComponentsMaster] || drawings[jobCard.F_ComponentsMaster].length === 0 ? (
                      <div style={{ 
                        textAlign: "center", 
                        padding: "2rem",
                        fontSize: "1.1rem",
                        color: "#666",
                        minHeight: "200px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        No drawings available.
                      </div>
                    ) : (
                      <div style={{ 
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: "1rem",
                        width: "100%"
                      }}>
                        {drawings[jobCard.F_ComponentsMaster].map((drawing, index) => {
                          const imageCount = drawings[jobCard.F_ComponentsMaster].length;
                          let imageSize, containerSize;
                          
                          // Maximize sizing to use full component drawing section space
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
                            // For 5+ images, still maximize but allow more per row
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
                                  // Open image in new tab for full size viewing
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WoodJobCard;
