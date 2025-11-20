import React, { useEffect, useState } from "react";
import { Row, Col, Button, ProgressBar, InputGroup, FormControl } from "react-bootstrap";
import { Fn_FillListData, Fn_GetReport, Fn_AddEditData } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import MetalJobCard from "./MetalJobCard";
import MDFJobCard from "./MDFJobCard";
import WoodJobCard from "./WoodJobCard";

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const OtherSlips = ({otherSlipData}) => {
  const [State, setState] = useState({
    id: 0,
    FillArray:      [],
    FillArray1:     [],
    FillArray2:     [],
    formData:       {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ALSlipArray, setALSlipArray] = useState([]);
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/ItemsByContainer`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL_SAVE = "GetOtherSlip/0/token";

  console.log("otherSlipData",otherSlipData);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [F_ContainerMaster, setContainerMaster] = useState("");
  const [F_CategoryMaster, setCategoryMaster] = useState("");
  const [F_ItemMaster, setItemMaster] = useState("");
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [totalSlips, setTotalSlips] = useState(0);
  const [processedSlips, setProcessedSlips] = useState(0);
  const [alNumbers, setAlNumbers] = useState({});
  const [commonAL, setCommonAL] = useState("");
  const [batchCodes, setBatchCodes] = useState({});
  const [commonBatchCode, setCommonBatchCode] = useState("");

  useEffect(() => {
    setLoading(false); // Set loading to false since data is passed via props
    if (otherSlipData && otherSlipData.length > 0) {
      const initialBatchCodes = otherSlipData.reduce((acc, item) => {
        if (item.Id !== null && item.Id !== undefined) {
            acc[item.Id] = item.BatchCode || '';
        } else {
            console.warn("Item found without valid Id:", item);
        }
        return acc;
      }, {});
      setBatchCodes(initialBatchCodes);
      const firstBatchCode = otherSlipData[0]?.BatchCode || '';
      const allSame = otherSlipData.every(item => (item.BatchCode || '') === firstBatchCode);
      if(allSame) {
        setCommonBatchCode(firstBatchCode);
      } else {
        setCommonBatchCode("");
      }
    } else {
      setBatchCodes({});
      setCommonBatchCode("");
    }
  }, [dispatch, otherSlipData]);

  const handleBatchCodeChange = (itemId, value) => {
    setBatchCodes(prev => {
        const newBatchCodes = { ...prev, [itemId]: value };
        const allValues = Object.values(newBatchCodes);
        const firstValue = allValues[0];
        const allSame = allValues.every(val => val === firstValue);
        setCommonBatchCode(allSame ? firstValue : "");
        return newBatchCodes;
    });
  };

  const handleCommonBatchCodeChange = (e) => {
    const value = e.target.value;
    setCommonBatchCode(value);
    // Create new batch codes using item.Id from otherSlipData
    const newBatchCodes = otherSlipData.reduce((acc, item) => {
        if (item.Id) {
            acc[item.Id] = value;
        }
        return acc;
    }, {});
    setBatchCodes(newBatchCodes);
  };

  const handleSaveBatchCodes = async () => {
    try {
        const userData = JSON.parse(localStorage.getItem("authUser"));
        let vformData = new FormData();
        
        // Create array of objects with Id and BatchCode
        const batchCodeArray = otherSlipData
            .filter(item => item.Id && batchCodes[item.Id])
            .map(item => ({
                Id: item.Id,
                BatchCode: batchCodes[item.Id] || ''
            }));

        if (batchCodeArray.length === 0) {
            alert('No batch codes to update. Please enter at least one batch code.');
            return;
        }

        vformData.append("Data", JSON.stringify(batchCodeArray));


        // Make API call to update batch codes
        await Fn_AddEditData(
            dispatch,
            setState,
            { arguList: { id: 0, formData: vformData } },
            'UpdateBatchCodeOtherSlip/0/token',
            true,
            "memberid",
            navigate,
            "#"
        );
        window.location.reload();
        // window.location.reload();
        alert('Batch codes saved successfully!');
    } catch (error) {
        console.error('Error saving batch codes:', error);
        alert('Error saving batch codes. Please try again.');
    }
  };

  const handlePrintPDF = async () => {
    setIsPdfGenerating(true);
    setPdfProgress(0);
    setProcessedSlips(0);
    
    try {
      const slips = document.querySelectorAll('.al-slip-container');
      setTotalSlips(slips.length);
      const pdf = new jsPDF('p', 'mm', 'a4'); // Changed back to portrait
      const slipsArray = Array.from(slips);
      
      // Changed to 4 slips per page (2×2)
      const slipsPerPage = 4;
      const totalPages = Math.ceil(slipsArray.length / slipsPerPage);
      
      // Define positions for 4 slips (2×2 grid)
      const positions = [
        { x: 10, y: 10 },     // Top left
        { x: 105, y: 10 },    // Top right
        { x: 10, y: 150 },    // Bottom left
        { x: 105, y: 150 }    // Bottom right
      ];

      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        const pageSlips = slipsArray.slice(pageNum * slipsPerPage, (pageNum + 1) * slipsPerPage);
        
        for (let [index, slip] of pageSlips.entries()) {
          const canvas = await html2canvas(slip, {
            scale: 2.5,
            useCORS: true,
            logging: false,
            windowWidth: 1000, // Adjusted windowWidth if necessary for layout
            allowTaint: true,
            letterRendering: true
          });

          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          // Calculate aspect ratio
          const aspectRatio = canvas.width / canvas.height;
          const slipWidth = 90;   // Reduced width to fit 2 columns
          const slipHeight = slipWidth / aspectRatio;
          
          // Add image to PDF at the specified position
          pdf.addImage(
            imgData, 
            'JPEG', 
            positions[index].x,
            positions[index].y,
            slipWidth,
            slipHeight,
            undefined,
            'FAST'
          );

          const processedCount = pageNum * slipsPerPage + index + 1;
          setProcessedSlips(processedCount);
          setPdfProgress(Math.round((processedCount / slips.length) * 100));
        }
      }

      pdf.save('Other_Slips.pdf'); // Renamed PDF file
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsPdfGenerating(false);
      setPdfProgress(0);
      setProcessedSlips(0);
      setTotalSlips(0);
    }
  };

  return (
    <div>
      {/* Conditionally render Print button and Common Batch Code input if there's data */}
      {otherSlipData && otherSlipData.length > 0 && (
        <>
          <Row className="mb-3">
            <Col>
              <Button 
                variant="primary" 
                onClick={handlePrintPDF} 
                disabled={isPdfGenerating}
              >
                {isPdfGenerating ? 'Generating PDF...' : 'Print All Slips'}
              </Button>
              {isPdfGenerating && (
                <div style={{ marginTop: '10px', width: '200px' }}>
                  <ProgressBar 
                    now={pdfProgress} 
                    label={`${pdfProgress}%`} 
                    animated 
                  />
                  <small>Processing slip {processedSlips} of {totalSlips}</small>
                </div>
              )}
            </Col>
          </Row>
  
          <Row className="mb-3 align-items-center">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>Apply Batch Code to All:</InputGroup.Text>
                <FormControl
                  type="text"
                  value={commonBatchCode}
                  onChange={handleCommonBatchCodeChange}
                  aria-label="Common Batch Code"
                  style={{ color: 'black' }}
                />
              </InputGroup>
            </Col>
            <Col md="auto">
              <Button 
                variant="success" 
                onClick={handleSaveBatchCodes}
                // disabled={!onBatchCodeSave}
              >
                Save Batch Codes
              </Button>
            </Col>
          </Row>
        </>
      )}
  
      <Row>
        {otherSlipData && otherSlipData.length > 0 ? (
          otherSlipData.map((item, index) => {
            if (!item?.Id) {
              console.warn("Skipping rendering slip due to missing Id:", item);
              return null;
            }
  
            return (
              <Col md={6} key={item.Id || index}>
                <div className="al-slip-container" style={{ 
                  margin: '10px',
                  border: '2px solid black', 
                  width: '100%',
                  pageBreakInside: 'avoid'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse', 
                    tableLayout: 'fixed',
                    fontFamily: 'Arial'
                  }}>
                    <tbody>
                      {/* Company Name Row */}
                      <tr>
                        <td colSpan="2" style={{ 
                          border: '1px solid black', 
                          padding: '10px', 
                          textAlign: 'center', 
                          fontWeight: 'bold',
                          fontSize: '20px'
                        }}>
                          AARA FURNITURE DESIGN LLP
                        </td>
                      </tr>
                      
                      {/* Slip Name and Date Row */}
                      <tr>
                        <td style={{
                          border: '1px solid black',
                          padding: '10px',
                          fontWeight: 'bold',
                          fontSize: '18px',
                          width: '50%'
                        }}>
                          {item.SlipName || 'N/A'}
                        </td>
                        <td style={{ padding: '0', width: '50%' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', height: '100%' }}>
                            <tbody>
                              <tr>
                                <td style={{
                                  border: '1px solid black',
                                  padding: '10px',
                                  fontWeight: 'bold',
                                  fontSize: '18px',
                                  width: '50%',
                                  textAlign: 'center'
                                }}>
                                  DATE
                                </td>
                                <td style={{
                                  border: '1px solid black',
                                  padding: '10px',
                                  fontSize: '18px',
                                  width: '50%',
                                  textAlign: 'center'
                                }}>
                                  {/* {formatDate(item.SlipDate)} */}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
  
                      {/* Container No Row */}
                      <tr>
                        <td style={{
                          border: '1px solid black',
                          padding: '10px',
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          CONTAINER NO.
                        </td>
                        <td style={{
                          border: '1px solid black',
                          padding: '10px',
                          fontSize: '16px'
                        }}>
                          {item.ContainerNo || 'N/A'}
                        </td>
                      </tr>
  
                      {/* Quantity Row */}
                      <tr>
                        <td style={{
                          border: '1px solid black',
                          padding: '10px',
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          QUANTITY
                        </td>
                        <td style={{
                          border: '1px solid black',
                          padding: '10px',
                          fontSize: '16px'
                        }}>
                          {item.Quantity != null ? Math.round(item.Quantity) : 'N/A'}
                        </td>
                      </tr>
  
                      {/* Product Name Row */}
                      <tr>
                        <td style={{
                          border: '1px solid black',
                          padding: '10px',
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          PRODUCT NAME
                        </td>
                        <td style={{
                          border: '1px solid black',
                          padding: '10px',
                          fontSize: '16px'
                        }}>
                          {item.ItemName || 'N/A'}
                        </td>
                      </tr>
  
                      {/* Batch Codes Input Row */}
                      <tr>
                        <td style={{
                          border: '1px solid black',
                          padding: '10px',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          verticalAlign: 'top'
                        }}>
                          BATCH CODES
                        </td>
                        <td style={{
                          border: '1px solid black',
                          padding: '10px',
                          height: '60px',
                          fontSize: '16px',
                          verticalAlign: 'middle'
                        }}>
                          <InputGroup>
                            <FormControl
                              type="text"
                              value={batchCodes[item.Id] || ''}
                              onChange={(e) => handleBatchCodeChange(item.Id, e.target.value)}
                              aria-label="Batch Code"
                              style={{
                                border: 'none',
                                boxShadow: 'none',
                                padding: '0 5px',
                                color: 'black'
                              }}
                            />
                          </InputGroup>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Col>
            );
          })
        ) : (
          <Col>
            <p>No slip data available.</p>
          </Col>
        )}
      </Row>
    </div>
  );
  
};

export default OtherSlips;
