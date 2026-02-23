import React, { useEffect, useState } from "react";
import { Row, Col, Button, ProgressBar } from "react-bootstrap";
import { Fn_AddEditData, Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import MetalJobCard from "./MetalJobCard";
import MDFJobCard from "./MDFJobCard";
import WoodJobCard from "./WoodJobCard";

const ALSlip = () => {
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
  const [ALSlipArray, setALSlipArray] = useState([]);
  const API_URL = `${API_WEB_URLS.MASTER}/0/token/ALSlipContainers`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/Category`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/ALSlipItems`;
  const API_URL_SAVE = "GetALSlip/0/token";

  
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

  useEffect(() => {
    fetchData();
  }, [dispatch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
      await Fn_FillListData(dispatch, setState, "FillArray2", `${API_URL2}/Id/0`);
    } catch (error) {
      console.error("Error fetching data:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContainerChange = async (e) => {
    const value = e.target.value;
    const name = e.target.name;
    const obj = State.FillArray.find(x=>x.Id == value);
    setContainerMaster(value);
    setCategoryMaster(""); // Reset category selection
    setItemMaster(""); // Reset item selection
    setState(prevState => ({ ...prevState, FillArray1: [] })); // Clear item list
    
    if (value) {
      try {
        await Fn_FillListData(dispatch, setState, "FillArray1", `${API_URL3}/Id/${value}`);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    }
  };
  
  const handleCategoryChange = (value) => {
    setCategoryMaster(value);
  };
  
  const handleItemChange = async (value) => {
    setItemMaster(value);
    const obj = State.FillArray1.find(x=>x.Id == value);
    console.log(obj);
    let vformData = new FormData();
    vformData.append("F_ContainerMasterL", obj.F_ContainerMasterL);
    vformData.append("F_CategoryMaster", 0);
    vformData.append("F_ItemMaster", value);

    // Fetch job cards and machines for selected container
    await Fn_GetReport(
      dispatch,
      setALSlipArray,
      "tenderData",
      API_URL_SAVE,
      { arguList: { id: 0, formData: vformData } },
      true
    );
    
  };

  const handlePrintPDF = async () => {
    setIsPdfGenerating(true);
    setPdfProgress(0);
    setProcessedSlips(0);
    
    try {
      const slips = document.querySelectorAll('.al-slip-container');
      setTotalSlips(slips.length);
      const pdf = new jsPDF('p', 'mm', 'a4'); // A4 size: 210mm x 297mm
      const slipsArray = Array.from(slips);
      
      // Calculate how many pages we need (3 slips per page)
      const slipsPerPage = 3;
      const totalPages = Math.ceil(slipsArray.length / slipsPerPage);
      
      // Define positions for slips (top, middle, bottom) with more space
      const positions = [
        { y: 5 },      // Top position 
        { y: 100 },    // Middle position
        { y: 195 }     // Bottom position
      ];

      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        // Get slips for current page
        const pageSlips = slipsArray.slice(pageNum * slipsPerPage, (pageNum + 1) * slipsPerPage);
        
        for (let [index, slip] of pageSlips.entries()) {
          const canvas = await html2canvas(slip, {
            scale: 2.5,
            useCORS: true,
            logging: false,
            windowWidth: 1000,
            // Maintain aspect ratio by not forcing height
            allowTaint: true,
            // Prevent vertical stretching
            letterRendering: true
          });

          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          // Calculate aspect ratio to prevent stretching
          const aspectRatio = canvas.width / canvas.height;
          const slipWidth = 200;  // Increased width for larger slips
          const slipHeight = slipWidth / aspectRatio; // Maintain aspect ratio
          
          // Add image to PDF at the specified position
          const xPosition = (210 - slipWidth) / 2; // Center horizontally
          pdf.addImage(
            imgData, 
            'JPEG', 
            xPosition,
            positions[index].y,
            slipWidth,
            slipHeight,
            undefined,
            'FAST'
          );

          // Update progress
          const processedCount = pageNum * slipsPerPage + index + 1;
          setProcessedSlips(processedCount);
          setPdfProgress(Math.round((processedCount / slips.length) * 100));
        }
      }

      pdf.save('AL_Slips.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsPdfGenerating(false);
      setPdfProgress(0);
      setProcessedSlips(0);
      setTotalSlips(0);
    }
  };

  const handleAlNumberChange = (id, value) => {
    setAlNumbers(prev => ({
      ...prev,
      [id]: value
    }));

    // Update ALSlipArray with new AL value
    setALSlipArray(prevArray => 
      prevArray.map(item => 
        item.Id === id ? { ...item, AL: value } : item
      )
    );
  };

  const handleCommonALChange = (value) => {
    setCommonAL(value);
    // Update all slips with the common AL value

    
    setALSlipArray(prevArray => 
      prevArray.map(item => ({ ...item, AL: value }))
    );
  };

  const handleSaveALNumber =async () => {
    if (commonAL.trim() === "") {
      alert("Please enter an AL Number before saving.");
      return;
    }
    const newArray = ALSlipArray.map(
      item => ({ Id: item.Id, ALCode: item.AL })
    )
    console.log(newArray);

    const vFormData = new FormData();
    vFormData.append("Data", JSON.stringify(newArray));
    await Fn_AddEditData(
      dispatch,
      setState,
      { arguList: { id: 0, formData: vFormData } },
      'UpdateALCode/0/token',
      true,
      "memberid",
      navigate,
      "#"
    );
    // setALSlipArray(newArray);
    // Here you can add the API call to save the AL number
    // For now, we'll just show a success message
    alert(`AL Number "${commonAL}" has been saved successfully!`);
    

    // You can add additional logic here like:
    // - API call to save to database
    // - Update local storage
    // - Reset the form
    // - etc.
  };

  return (
    <div className="print-safe-page" style={{ fontFamily: 'Times New Roman' }}>
      <h4 className="card-title mb-3 no-print" style={{ fontFamily: 'Times New Roman' }}>AL Slip</h4>
      <Row className="mb-3 no-print">
        <Col md={4}>
          <label className="form-label" style={{ fontFamily: 'Times New Roman' }}>Select Container</label>
          <select
            className="form-control"
            name="F_ContainerMaster"
            onChange={(e) => handleContainerChange(e)}
            value={F_ContainerMaster}
            disabled={loading}
            style={{ fontFamily: 'Times New Roman' }}
          >
            <option value="">Select Container</option>
            {State.FillArray.length > 0 &&
              State.FillArray.map((option) => (
                <option key={option.Id} value={option.Id}>
                  {option.Name}
                </option>
              ))}
          </select>
        </Col>
        <Col md={4}>
          <label className="form-label" style={{ fontFamily: 'Times New Roman' }}>Select Item</label>
          <select
            className="form-control"
            name="F_ItemMaster"
            onChange={(e) => handleItemChange(e.target.value)}
            value={F_ItemMaster}
            style={{ fontFamily: 'Times New Roman' }}
          >
            <option value="">Select Item</option>
            {State.FillArray1.length > 0 &&
              State.FillArray1.map((option) => (
                <option key={option.Id} value={option.Id}>
                  {option.Name}
                </option>
              ))}
          </select>
        </Col>
        {ALSlipArray.length > 0 && (
          <>
            <Col md={2}>
              <label className="form-label" style={{ fontFamily: 'Times New Roman' }}>Common AL Number</label>
              <div className="d-flex">
                <input
                  type="text"
                  className="form-control"
                  value={commonAL}
                  onChange={(e) => handleCommonALChange(e.target.value)}
                  placeholder = "Enter AL Number"
                  style={{ fontFamily: 'Times New Roman' }}
                />
                <Button 
                  variant="success" 
                  size="sm"
                  onClick={handleSaveALNumber}
                  style={{ 
                    marginLeft: '5px', 
                    fontFamily: 'Times New Roman',
                    minWidth: '60px'
                  }}
                >
                  Save
                </Button>
              </div>
            </Col>
            <Col md={2} className="d-flex flex-column align-items-end">
              <Button 
                variant="primary" 
                onClick={handlePrintPDF}
                disabled={isPdfGenerating}
                style={{ marginBottom: '8px', fontFamily: 'Times New Roman' }}
              >
                {isPdfGenerating ? 'Generating PDF...' : 'Download All Slips as PDF'}
              </Button>
              {isPdfGenerating && (
                <div style={{ width: '100%' }}>
                  <ProgressBar 
                    now={pdfProgress}
                    label={`${pdfProgress}%`} 
                    animated
                    style={{ marginBottom: '4px' }}
                  />
                  <div className="text-center" style={{ fontSize: '12px' }}>
                    Processing slip {processedSlips} of {totalSlips}
                  </div>
                </div>
              )}
            </Col>
          </>
        )}
      </Row>

      {ALSlipArray.length > 0 && ALSlipArray.map((item, index) => (
        <div key={index} className="al-slip-container" style={{ margin: '20px', border: '1px solid black', width: '800px', maxWidth: '100%', fontFamily: 'Times New Roman' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: 'Times New Roman', fontSize: '14px' }}>
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '35%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 'bold', fontSize: '14px' }}>
                  AL
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', textAlign: 'center', fontSize: '14px' }}>
                  {item.AL || ''}
                </td>
                <td colSpan="2" style={{ border: '1px solid black', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                  AARA FURNITURE DESIGN LLP
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 'bold', fontSize: '14px' }}>
                  CONTRACT NO.
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontSize: '14px' }}>
                  {item.ContractNo || ''}
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 'bold', fontSize: '14px' }}>
                  BATCH CODE
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontSize: '14px' }}>
                  {item.BatchCode}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 'bold', fontSize: '14px' }}>
                  JOB CARD NUMBER
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontSize: '14px' }}>
                  {item.JobCardNo || ''}
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 'bold', fontSize: '14px' }}>
                  DATE
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontSize: '14px' }}>
                  {/* {item.Date} */}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 'bold', fontSize: '14px' }}>
                  PRODUCT NAME
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontSize: '14px' }}>
                  {item.ItemName}
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 'bold', textAlign: 'left', fontSize: '14px' }}>
                  COMPONENT NAME
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontSize: '14px' }}>
                  {item.ComponentName}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 'bold', fontSize: '14px' }}>
                  QUANTITY
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontSize: '14px' }}>
                  {item.Quantity}
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontWeight: 'bold', fontSize: '14px' }}>
                  CONTAINER NO
                </td>
                <td style={{ border: '1px solid black', padding: '8px 6px', fontSize: '14px' }}>
                  {item.ContainerNo}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default ALSlip;
