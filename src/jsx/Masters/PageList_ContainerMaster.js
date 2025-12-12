import React,{ useEffect, useMemo, useState, useRef } from 'react';
import PageTitle from "../layouts/PageTitle";
import { useTable, useGlobalFilter, useFilters, usePagination } from 'react-table';
import MOCK_DATA from '../components/table/FilteringTable/MOCK_DATA_2.json';
import { Row, Col, Button, FormControl, Table, Spinner, Modal } from "react-bootstrap";
import { GlobalFilter } from '../components/table/FilteringTable/GlobalFilter'; 
//import './table.css';
import '../components/table/FilteringTable/filtering.css';
import {ColumnFilter } from '../components/table/FilteringTable/ColumnFilter';
import {DateFilter } from '../components/table/FilteringTable/DateFilter';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { API_WEB_URLS } from '../../constants/constAPI';
import { Fn_FillListData, Fn_AddEditData } from '../../store/Functions';
import * as XLSX from "xlsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


export const PageList_ContainerMaster = () => {
	const [State, setState] = useState({
		id: 0,
		FillArray: [],
		FillArray: [],
		formData: {},
		OtherDataScore: [],
		isProgress: true,
	  })
	const [gridData, setGridData] = useState([]);
	const [loading, setLoading] = useState(true);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const API_URL = API_WEB_URLS.MASTER + "/0/token/Container";
	const API_URL_UpdateQuantity = API_WEB_URLS.MASTER + "/0/token/UpdateQuantityContainer";
	const API_URL_UpdateInspectionDate = API_WEB_URLS.MASTER + "/0/token/UpdateDateContainer";
	const API_URL_BREAK = API_WEB_URLS.MASTER + "/0/token/ContainerMaster";
	const rtPage_Add = "/AddContainer";
	const rtPage_Edit = "/AddContainer";
	 const [excelData, setExcelData] = useState(null);
	const [F_ItemMaster, setItemMaster] = useState(0);
	const API_URL_SAVE = "ContainerMaster/0/token";
	const API_URL_SAVE_BREAK = "BreakContainerMaster/0/token";
	const [uploadedRowCount, setUploadedRowCount] = useState(0);
	const [isSaving, setIsSaving] = useState(false);
	const [selRow, setSelRow] = useState(0);
	const [showModal, setShowModal] = useState(false);
	const [breakUpArray, setBreakUpArray] = useState([]);
	const fileInputRef = useRef(null);

	
	useEffect(() => {
		const fetchData = async () => {
		  setLoading(true);
		   Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
		   Fn_FillListData(dispatch, setState, "FillArray", API_URL_BREAK + "/Id/0");
		  setLoading(false);
		};
	
		fetchData();
	  }, [dispatch, API_URL]);
	
	  const btnAddOnClick = () => {
		
		 navigate(rtPage_Add, { state: { Id: 0 } });
	  };
	
	  const btnEditOnClick = (Id) => {
		navigate(rtPage_Edit, { state: { Id } });
	  };

	  const btnBreakOnClick = (rowData) => {
		setSelRow(rowData);
		// Initialize breakUpArray with one row having default values
		setBreakUpArray([{
			id: 1,
			ContainerNumber: rowData.ContainerNumber,
			ItemName: rowData.ItemName,
			ContractNo: rowData.ContractNo,
			ItemCode: rowData.ItemCode,
			Quantity: rowData.Quantity,
			InspectionDate: rowData.InspectionDate ? rowData.InspectionDate.split('T')[0] : '',
			JobCardInitial: rowData.JobCardInitial
		}]);
		setShowModal(true);
		console.log('Break button clicked for row:', rowData);

		
		// You can send the row values to an API or perform other actions here
		// Example: sendToAPI(selRow);
	  };

	  const handleCloseModal = () => {
		setShowModal(false);
		setBreakUpArray([]);
	  };

	  const addBreakUpRow = () => {
		const newRow = {
			id: breakUpArray.length + 1,
			ContainerNumber: selRow.ContainerNumber,
			ItemName: selRow.ItemName,
			ContractNo: selRow.ContractNo,
			ItemCode: selRow.ItemCode,
			Quantity: 0,
			InspectionDate: selRow.InspectionDate ? selRow.InspectionDate.split('T')[0] : '',
			JobCardInitial: selRow.JobCardInitial
		};
		setBreakUpArray([...breakUpArray, newRow]);
	  };

	  const removeBreakUpRow = (index) => {
		if (breakUpArray.length > 1) {
			const updatedArray = breakUpArray.filter((_, i) => i !== index);
			setBreakUpArray(updatedArray);
		}
	  };

	  const updateBreakUpRow = (index, field, value) => {
		const updatedArray = [...breakUpArray];
		updatedArray[index][field] = value;
		setBreakUpArray(updatedArray);
	  };

	  const getTotalQuantity = () => {
		return breakUpArray.reduce((sum, row) => sum + parseInt(row.Quantity || 0), 0);
	  };

	  const isQuantityValid = () => {
		return getTotalQuantity() <= parseInt(selRow.Quantity || 0);
	  };

	  const isQuantityExact = () => {
		return getTotalQuantity() === parseInt(selRow.Quantity || 0);
	  };

	  // Get available container numbers for a specific row index (excluding already selected ones in other rows)
	  const getAvailableContainers = (currentIndex) => {
		if (!State.FillArray || State.FillArray.length === 0) return [];
		
		// Get all currently selected container numbers except the current row
		const selectedContainers = breakUpArray
		  .map((row, idx) => idx !== currentIndex ? row.ContainerNumber : null)
		  .filter(container => container && container.trim() !== '');
		
		// Filter out already selected containers
		return State.FillArray.filter(item => {
		  // Always include the currently selected container for this row
		  if (breakUpArray[currentIndex] && item.Name === breakUpArray[currentIndex].ContainerNumber) {
			return true;
		  }
		  // Exclude containers that are selected in other rows
		  return !selectedContainers.includes(item.Name);
		});
	  };

	  const handleSubmit = async () => {
		if (!isQuantityExact()) {
			alert("Please correct the quantity first. Total quantity must exactly match the original quantity.");
			return;
		}

		// Filter out rows with 0 quantity and no container number
		const filteredBreakUpArray = breakUpArray.filter(row => {
			const hasValidQuantity = row.Quantity && parseInt(row.Quantity) > 0;
			const hasValidContainerNumber = row.ContainerNumber && row.ContainerNumber.trim() !== '';
			return hasValidQuantity && hasValidContainerNumber;
		});

		// Check if we have any valid rows after filtering
		if (filteredBreakUpArray.length === 0) {
			alert("No valid rows found. Please ensure at least one row has both quantity greater than 0 and a container number.");
			return;
		}

		// Process the filtered break-up data here
		console.log('Filtered break-up data submitted:', filteredBreakUpArray);
		// alert(`Break-up data submitted successfully! ${filteredBreakUpArray.length} valid rows processed.`);
		const vformData = new FormData();
		vformData.append("UserId", 1);
		vformData.append("OldContainerId", selRow.F_ContainerMaster);
		vformData.append("OldContainerLId", selRow.F_ContainerMasterL);
		vformData.append("Data", JSON.stringify(filteredBreakUpArray));
	

		const res = await Fn_AddEditData(
			dispatch,
			setState,
			{ arguList: { id: 0, formData: vformData } },
			API_URL_SAVE_BREAK,
			true,
			"memberid",
			navigate,
			"/ContainerMaster"
		  );
		// Close modal after successful submission
		handleCloseModal();
	  };

	  // Validation function to check if Quantity sum matches ShipmentQty for each ContractNo
	  const validateQuantityByContract = (data) => {
		const contractGroups = {};
		const errors = [];

		// Group data by ContractNo
		data.forEach((row) => {
			if (row.ContractNo && row.ShipmentQty && row.Quantity) {
				const contractNo = row.ContractNo.toString().trim();
				if (!contractGroups[contractNo]) {
					contractGroups[contractNo] = {
						shipmentQty: parseFloat(row.ShipmentQty) || 0,
						totalQuantity: 0,
						containers: []
					};
				}
				const quantity = parseFloat(row.Quantity) || 0;
				contractGroups[contractNo].totalQuantity += quantity;
				contractGroups[contractNo].containers.push({
					containerName: row.ContainerNumber || 'N/A',
					quantity: quantity
				});
			}
		});

		// Check if sum matches ShipmentQty
		Object.keys(contractGroups).forEach((contractNo) => {
			const group = contractGroups[contractNo];
			if (Math.abs(group.totalQuantity - group.shipmentQty) > 0.01) { // Allow small floating point differences
				const containerNames = group.containers.map(c => c.containerName).join(', ');
				errors.push({
					contractNo: contractNo,
					shipmentQty: group.shipmentQty,
					totalQuantity: group.totalQuantity,
					containers: containerNames,
					containerList: group.containers
				});
			}
		});

		return errors;
	  };

	  const handleFileUpload = (event) => {
		const file = event.target.files[0];
	  
		if (file) {
		  const reader = new FileReader();
	  
		  reader.onload = (e) => {
			const binaryStr = e.target.result;
			const workbook = XLSX.read(binaryStr, {
			  type: "binary",
			  bookVBA: true,
			  cellFormula: true,
			  cellNF: true,
			  cellStyles: true,
			});
	  
			const sheetNames = workbook.SheetNames;
			const firstSheet = workbook.Sheets[sheetNames[0]];
			const sheetData = XLSX.utils.sheet_to_json(firstSheet, {
			  header: 1,
			  raw: false,
			  dateNF: "yyyy-mm-dd",
			});
	  
			let columns = sheetData[0];
			const data = sheetData.slice(1);
	  
			const transformedData = data.map((row) => {
			  const rowData = {};
			  columns.forEach((column, index) => {
				rowData[column] = row[index];
			  });
			  return rowData;
			});
	  
			// Function to format and clean dates
			const formatDate = (dateStr) => {
				if (!dateStr) return null;
			  
				// Check if the date contains a range like "23/24-04-2025"
				const match = dateStr.match(/(\d{1,2})\/(\d{1,2})-(\d{2,4})/);
				if (match) {
				  let [, day1, day2, year] = match;
			  
				  // Convert year to four digits dynamically
				  if (year.length === 2) {
					const currentYear = new Date().getFullYear();
					const century = Math.floor(currentYear / 100) * 100;
					year = century + parseInt(year, 10);
				  }
			  
				  const maxDay = Math.max(parseInt(day1, 10), parseInt(day2, 10));
				  return `${year}-04-${String(maxDay).padStart(2, "0")}`; // Assuming April (04) from format
				}
			  
				// Try parsing normal date formats
				const parsedDate = new Date(dateStr);
				if (!isNaN(parsedDate.getTime())) {
				  return parsedDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
				}
			  
				return null; // If it's not a valid date
			  };
			  
			  console.log("transformedData",transformedData);
			const filteredData = transformedData
			  .filter(
				(obj) =>
				  obj["ITEM DESCRIPTION"] &&
				  obj["CONT NO."] !== "CONT NO." // Skip unwanted rows
			  )
			  .map((obj) => ({
				InspectionDate: formatDate(obj["INSPECTION DATE"]),
				ItemName: obj["ITEM DESCRIPTION"],
				ContractNo: obj["CONTRACT NO."],
				ContainerNumber: obj["CONT \r\nNO."] || obj["CONT NO."],
				ItemCode: obj["ITEM NO."],
				ShipmentQty: obj["ShipmentQty"],
				Quantity: obj["ITEM \r\nQTY"] || obj["ITEM QTY"],
				JobCardInitial: obj["JOB CARD CODE"],
			  }));
	  
			// Remove objects where all values are undefined, null, or empty strings
			const finalFilteredData = filteredData.filter(
			  (obj) =>
				obj.ItemName !== undefined &&
				obj.ContainerNumber !== undefined &&
				obj.ItemCode !== undefined &&
				obj.Quantity !== undefined 

			);
	  
			// Validate Quantity sum matches ShipmentQty for each ContractNo
			const validationErrors = validateQuantityByContract(finalFilteredData);
			if (validationErrors.length > 0) {
				let errorMessage = "Quantity validation failed:\n\n";
				validationErrors.forEach((error, index) => {
					errorMessage += `${index + 1}. Contract No: ${error.contractNo}\n`;
					errorMessage += `   ShipmentQty: ${error.shipmentQty}\n`;
					errorMessage += `   Total Quantity: ${error.totalQuantity}\n`;
					errorMessage += `   Difference: ${Math.abs(error.shipmentQty - error.totalQuantity)}\n`;
					errorMessage += `   Container(s): ${error.containers}\n`;
					errorMessage += `   Details:\n`;
					error.containerList.forEach((container, idx) => {
						errorMessage += `      - ${container.containerName}: Quantity ${container.quantity}\n`;
					});
					errorMessage += "\n";
				});
				alert(errorMessage);
				setExcelData(null);
				setUploadedRowCount(0);
				// Clear file input
				if (fileInputRef.current) {
					fileInputRef.current.value = '';
				}
				return;
			}
	  
			console.log(finalFilteredData);
			setExcelData(finalFilteredData);
			setUploadedRowCount(finalFilteredData.length);
		  };
	  
		  reader.readAsBinaryString(file);
		}
	  };
	  


		   const handleSaveFile = async (event) => {
			 event.preventDefault();
			 
			 if (!excelData || excelData.length === 0) {
			   alert("Please upload and process an Excel file first.");
			   return;
			 }

			 // Validate Quantity sum matches ShipmentQty for each ContractNo before saving
			 const validationErrors = validateQuantityByContract(excelData);
			if (validationErrors.length > 0) {
				let errorMessage = "Cannot save! Quantity validation failed:\n\n";
				validationErrors.forEach((error, index) => {
					errorMessage += `${index + 1}. Contract No: ${error.contractNo}\n`;
					errorMessage += `   ShipmentQty: ${error.shipmentQty}\n`;
					errorMessage += `   Total Quantity: ${error.totalQuantity}\n`;
					errorMessage += `   Difference: ${Math.abs(error.shipmentQty - error.totalQuantity)}\n`;
					errorMessage += `   Container(s): ${error.containers}\n`;
					errorMessage += `   Details:\n`;
					error.containerList.forEach((container, idx) => {
						errorMessage += `      - ${container.containerName}: Quantity ${container.quantity}\n`;
					});
					errorMessage += "\n";
				});
				alert(errorMessage);
				return;
			}
		
			 setIsSaving(true);
			 
			 try {
			   const formData = new FormData();
		 
			   formData.append("UserId", 1);
			   formData.append("F_ItemMaster", F_ItemMaster);
			   formData.append("Data", JSON.stringify(excelData));
				// console.log(JSON.stringify(excelData));
			  const res = await Fn_AddEditData(
				 dispatch,
				 setState,
				 { arguList: { id: State.id, formData } },
				 API_URL_SAVE,
				 true,
				 "memberid",
				 navigate,
				 "/ContainerMaster"
			   );
			   console.log(res.id);
			   if(res.id > 0){
				alert("Data saved successfully");
				window.location.reload();
			   }else{
				alert("Data not saved");
			   }
			//    window.location.reload();
			 } catch (error) {
			   console.error("Error submitting form:", error);
			   alert("An error occurred while submitting the form. Please try again.");
			 } finally {
			   setIsSaving(false);
			 }
		   };



	
	const COLUMNS = [
		{
			Header : 'Sno',
			Footer : 'Id',
			accessor: 'RowNum',
			Filter: ColumnFilter,
			//disableFilters: true,
		},
        	{
			Header: 'InspectionDate',
			Footer: 'InspectionDate',
			accessor: 'InspectionDate',
			Cell: ({ row }) => {
				const { ParentIds } = row.original;
				const handleDateChange = async (e, rowData) => {
					const inspectionDateValue = e.target.value; // Already in YYYY-MM-DD format (SQL Server format)
					console.log('Row data on change:', rowData);
					console.log('InspectionDate value:', inspectionDateValue);

					if (inspectionDateValue) {
						await Fn_FillListData(dispatch, setState, "no", API_URL_UpdateInspectionDate + "/"+inspectionDateValue+"/"+rowData.F_ContainerMasterL);
						toast.success("Updated", {
							position: "top-right",
							autoClose: 3000,
							hideProgressBar: false,
							closeOnClick: true,
							pauseOnHover: true,
							draggable: true,
						});
					}
				};

				// Format date for input (YYYY-MM-DD) - avoid timezone issues
				const formatDateForInput = (dateValue) => {
					if (!dateValue) return '';
					// If already in YYYY-MM-DD format, return as is
					if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
						return dateValue.split('T')[0]; // Remove time part if present
					}
					// Parse date and format without timezone conversion
					const date = new Date(dateValue);
					if (isNaN(date.getTime())) return '';
					// Use UTC methods to avoid timezone shift
					const year = date.getUTCFullYear();
					const month = String(date.getUTCMonth() + 1).padStart(2, '0');
					const day = String(date.getUTCDate()).padStart(2, '0');
					return `${year}-${month}-${day}`;
				};

				// Format date for display (dd/mm/yyyy)
				const formatDateForDisplay = (dateValue) => {
					if (!dateValue) return '';
					// If already in YYYY-MM-DD format, parse it directly
					if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
						const [year, month, day] = dateValue.split('T')[0].split('-');
						return `${day}/${month}/${year}`;
					}
					const date = new Date(dateValue);
					if (isNaN(date.getTime())) return '';
					return date.toLocaleDateString('en-GB');
				};

				if (ParentIds === null || ParentIds === undefined || ParentIds === '') {
					return (
						<FormControl
							type="date"
							defaultValue={formatDateForInput(row.original.InspectionDate)}
							onChange={(e) => handleDateChange(e, row.original)}
							style={{ width: '150px' }}
						/>
					);
				} else {
					return <span>{formatDateForDisplay(row.original.InspectionDate)}</span>;
				}
			},
			Filter: DateFilter,
			filter: (rows, id, filterValue) => {
			  const [startDate, endDate] = filterValue;
			  return rows.filter(row => {
				const rowDate = new Date(row.values[id]);
				return (
				  (!startDate || rowDate >= new Date(startDate)) &&
				  (!endDate || rowDate <= new Date(endDate))
				);
			  });
			},
		  },
		{
			Header : 'ContainerNumber',
			Footer : 'ContainerNumber',
			accessor: 'ContainerNumber',
			Filter: ColumnFilter,
		},
		{
			Header : 'ContractNo',
			Footer : 'ContractNo',
			accessor: 'ContractNo',
			Filter: ColumnFilter,
		},
		{
			Header : 'ItemCode',
			Footer : 'ItemCode',
			accessor: 'ItemCode',
			Filter: ColumnFilter,
		},
		{
			Header : 'ItemName',
			Footer : 'ItemName',
			accessor: 'ItemName',
			Filter: ColumnFilter,
		},
		{
			Header : 'Quantity',
			Footer : 'Quantity',
			accessor: 'Quantity',
			Filter: ColumnFilter,
			Cell: ({ row }) => {
				const { ParentIds } = row.original;
				const handleEnterKeyPress = async (e, rowData) => {
					if (e.key === 'Enter') {
						const quantityValue = e.target.value;
						console.log('Row data on Enter:', rowData);
						console.log('Quantity value:', quantityValue);

						
						await Fn_FillListData(dispatch, setState, "no", API_URL_UpdateQuantity + "/"+quantityValue+"/"+rowData.F_ContainerMasterL);
						toast.success("Updated", {
							position: "top-right",
							autoClose: 3000,
							hideProgressBar: false,
							closeOnClick: true,
							pauseOnHover: true,
							draggable: true,
						});
						// You can call your function here
						// handleQuantityEnter(rowData, quantityValue);
					}
				};

				if (ParentIds === null || ParentIds === undefined || ParentIds === '') {
					return (
						<FormControl
							type="number"
							defaultValue={row.original.Quantity || ''}
							onKeyDown={(e) => handleEnterKeyPress(e, row.original)}
							style={{ width: '100px' }}
						/>
					);
				} else {
					return <span>{row.original.Quantity}</span>;
				}
			},
		},

		{
			Header : 'JobCardInitial',
			Footer : 'JobCardInitial',
			accessor: 'JobCardInitial',
			Filter: ColumnFilter,
		},

		{
			Header: "Break",
			Cell: ({ row }) => (
			  <Button
				variant="danger"
				size="sm"
				onClick={() => btnBreakOnClick(row.original)}
			  >
				Break
			  </Button>
			),
		},

		//   {
		// 	Header: "Edit",
		// 	Cell: ({ row }) => (
		// 	  <Button
		// 		variant="warning"
		// 		size="sm"
		// 		onClick={() => btnEditOnClick(row.original.ID)}
		// 	  >
		// 		Edit
		// 	  </Button>
		// 	),
		//   }, 

	]
	const columns = useMemo( () => COLUMNS, [] )
	const data = useMemo( () => gridData, [gridData] )
	const tableInstance = useTable({
		columns,
		data,	
		initialState : {pageIndex : 0}
	}, useFilters, useGlobalFilter, usePagination)
	
	const { 
		getTableProps, 
		getTableBodyProps, 
		headerGroups, 
		prepareRow,
		state,
		page,
		gotoPage,
		pageCount,
		pageOptions,
		nextPage,
		previousPage,
		canNextPage,
		canPreviousPage,
		setGlobalFilter,
	} = tableInstance
	
	
	const {globalFilter, pageIndex} = state
	
	
	return(
		<>
			<style jsx>{`
				.custom-modal .modal-content {
					font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
					font-size: 14px;
					color: #2c3e50;
				}
				.custom-modal .modal-title {
					font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
					font-weight: 600;
					color: #1a252f;
					font-size: 1.25rem;
				}
				.custom-modal .modal-header {
					background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
					color: white;
					border-bottom: none;
				}
				.custom-modal .modal-header .modal-title {
					color: white;
					font-weight: 700;
				}
				.custom-modal .modal-header .btn-close {
					filter: brightness(0) invert(1);
				}
			.header-info {
				font-family: 'Poppins', sans-serif;
				font-weight: 600;
				font-size: 1.1rem;
			}
			.section-title {
				font-family: 'Poppins', sans-serif;
				font-weight: 600;
				font-size: 1rem;
				margin-bottom: 1rem;
			}
			.custom-table {
				font-family: 'Poppins', sans-serif;
				font-size: 13px;
			}
			.custom-table thead th {
				font-weight: 600;
				font-size: 14px;
				text-align: center;
				vertical-align: middle;
			}
			.custom-table tbody td {
				font-weight: 500;
				vertical-align: middle;
			}
			.custom-table .form-control {
				font-family: 'Poppins', sans-serif;
				font-size: 13px;
				font-weight: 500;
			}
			.custom-table .form-control:read-only {
				font-weight: 500;
				opacity: 0.7;
			}
			.quantity-badge {
				font-family: 'Poppins', sans-serif;
				font-weight: 600;
				font-size: 14px;
			}
			.alert-custom {
				font-family: 'Poppins', sans-serif;
				font-weight: 500;
			}
			.main-table {
				font-family: 'Poppins', sans-serif;
				font-size: 14px;
			}
			.main-table thead th {
				font-weight: 600;
			}
			.main-table tbody td {
				font-weight: 500;
			}
			.page-title-custom {
				font-family: 'Poppins', sans-serif;
				font-weight: 700;
			}
			.card-title-custom {
				font-family: 'Poppins', sans-serif;
				font-weight: 600;
			}
			.pagination-text {
				font-family: 'Poppins', sans-serif;
				font-weight: 500;
			}
			`}</style>
			{isSaving && (
				<div 
					className="position-fixed w-100 h-100 d-flex justify-content-center align-items-center"
					style={{
						top: 0,
						left: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.5)',
						zIndex: 9999
					}}
				>
					<div className="text-center text-white">
						<Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem' }}>
							<span className="visually-hidden">Loading...</span>
						</Spinner>
						<div className="mt-3">
							<h5 style={{fontFamily: 'Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif', fontWeight: '600'}}>Saving data, please wait...</h5>
						</div>
					</div>
				</div>
			)}
		<PageTitle activeMenu="Filtering" motherMenu="Table" />
		
		<Row className="mb-3 align-items-center">
			<Col md="2">
				<h4 className="page-title mb-0" style={{fontFamily:'Poppins'}}>ContainerMaster</h4>
			</Col>
			<Col md="2">
				<GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
			</Col>

			<Col md="4">
				<div>
					<label htmlFor="fileInput" className="form-label mb-1 small">
						Upload Excel of Container (shipment)
						<a 
							href={`${process.env.PUBLIC_URL}/Container_Sheet.xlsx`}
							download="Container_Sheet.xlsx"
							className="badge bg-info text-decoration-none ms-2"
							style={{ fontSize: '0.7rem', cursor: 'pointer' }}
						>
							📥 Template
						</a>
					</label>
					<div className="d-flex align-items-center">
						<FormControl
							ref={fileInputRef}
							type="file"
							accept=".xlsx, .xlsm"
							onChange={handleFileUpload}
							size="sm"
							className="me-2"
						/>
						{uploadedRowCount > 0 && (
							<span className="badge bg-success">
								{uploadedRowCount} rows
							</span>
						)}
					</div>
				</div>
			</Col>
	
			<Col md="2">
				<Button
					type="button"
					onClick={handleSaveFile}
					variant="primary"
					size="sm"
					disabled={isSaving || !excelData || excelData.length === 0}
					style={{marginTop: '20px'}}
				>
						{isSaving ? (
							<>
								<Spinner
									as="span"
									animation="border"
									size="sm"
									role="status"
									aria-hidden="true"
									className="me-2"
								/>
								Saving...
							</>
						) : (
							'Save'
						)}
					</Button>
				</Col>
			<Col md="2">
				<Button
					type="button"
					onClick={btnAddOnClick}
					variant="success"
					size="sm"
					style={{marginTop: '20px'}}
				>
					Add New
				</Button>
			</Col>
			</Row>
		<div className="card">
			
			<div className="card-header">
				<h4 className="card-title">Table Filtering</h4>
            </div>
			<div className="card-body">
				<div className="table-responsive">
					
					<table {...getTableProps()} className="table dataTable display table-striped">
							<thead>
							   {headerGroups.map(headerGroup => (
									<tr {...headerGroup.getHeaderGroupProps()}>
										{headerGroup.headers.map(column => (
											<th {...column.getHeaderProps()}>
												{column.render('Header')}
												{column.canFilter ? column.render('Filter') : null}
											</th>
										))}
									</tr>
							   ))}
							</thead> 
							<tbody {...getTableBodyProps()} className="" >
							
								{page.map((row) => {
									prepareRow(row)
									return(
										<tr {...row.getRowProps()}>
											{row.cells.map((cell) => {
												const { key, ...cellProps } = cell.getCellProps();
												return <td key={key} {...cellProps}> {cell.render('Cell')} </td>
											})}
										</tr>
									)
								})}
							</tbody>
						</table>
						<div className="d-flex justify-content-between pagination-text">
							<span>
								Page{' '}
								<strong>
									{pageIndex + 1} of {pageOptions.length}
								</strong>{''}
							</span>
							<span className="table-index">
							Go to page : {' '}
							<input type="number" 
								className="ml-2 form-control-sm"
								defaultValue={pageIndex + 1} 
								onChange = {e => { 
									const pageNumber = e.target.value ? Number(e.target.value) - 1 : 0 
									gotoPage(pageNumber)
								} }
							/>
							</span>
						</div>
						<div className="text-center">	
							<div className="filter-pagination  mt-3">
							<button className=" previous-button" onClick={() => gotoPage(0)} disabled={!canPreviousPage}>{'<<'}</button>
							
							<button className="previous-button" onClick={() => previousPage()} disabled={!canPreviousPage}>
								Previous
							</button>
							<button className="next-button" onClick={() => nextPage()} disabled={!canNextPage}>
								Next
							</button>
							<button className=" next-button" onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>{'>>'}</button>
							</div>
						</div>
					</div>
				</div>
			</div>
			{showModal && (
				<Modal show={showModal} onHide={handleCloseModal} size="fullscreen" className="custom-modal">
					<Modal.Header closeButton>
						<Modal.Title>Container Break Details</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						{/* Header line with key details */}
						<div className="mb-4 p-3 bg-light rounded">
							<h5 className="mb-0 header-info">
								{selRow.ContainerNumber} | {selRow.ContractNo} | {selRow.ItemName} | {new Date(selRow.InspectionDate).toLocaleDateString('en-GB')}
							</h5>
						</div>
						
						{/* Quantity validation message */}
						<div className="mb-3">
							<div className="d-flex justify-content-between align-items-center">
								<h6 className="section-title">Break Up Details</h6>
								<div>
									<span className={`badge quantity-badge ${isQuantityValid() ? 'bg-success' : 'bg-danger'}`}>
										Total: {getTotalQuantity()} / {selRow.Quantity}
									</span>
								</div>
							</div>
							{!isQuantityValid() && (
								<div className="alert alert-danger mt-2 alert-custom">
									Total quantity ({getTotalQuantity()}) cannot exceed original quantity ({selRow.Quantity})
								</div>
							)}
							{isQuantityValid() && !isQuantityExact() && (
								<div className="alert alert-warning mt-2 alert-custom">
									Total quantity ({getTotalQuantity()}) must exactly match original quantity ({selRow.Quantity})
								</div>
							)}
						</div>

						{/* Break Up Grid */}
						<div className="table-responsive">
							<table className="table table-bordered custom-table">
								<thead className="table-light">
									<tr>
										<th>Container Number</th>
										<th>Item Name</th>
										<th>Contract No</th>
										<th>Item Code</th>
										<th>Quantity</th>
										{/* <th>Inspection Date</th> */}
										{/* <th>Job Card Initial</th> */}
										<th width="120">Actions</th>
									</tr>
								</thead>
								<tbody>
									{breakUpArray.map((row, index) => (
										<tr key={row.id}>
											<td>
												<FormControl
													as="select"
													value={row.ContainerNumber}
													onChange={(e) => updateBreakUpRow(index, 'ContainerNumber', e.target.value)}
												>
													{getAvailableContainers(index).map((item) => (
														<option key={item.Id} value={item.Name}>
															{item.Name}
														</option>
													))}
												</FormControl>
											</td>
											<td>
												<FormControl
													type="text"
													value={row.ItemName}
													readOnly
													className="bg-light"
												/>
											</td>
											<td>
												<FormControl
													type="text"
													value={row.ContractNo}
													readOnly
													className="bg-light"
												/>
											</td>
											<td>
												<FormControl
													type="text"
													value={row.ItemCode}
													readOnly
													className="bg-light"
												/>
											</td>
											<td>
												<FormControl
													type="number"
													value={row.Quantity}
													onChange={(e) => updateBreakUpRow(index, 'Quantity', e.target.value)}
													min="0"
													max={selRow.Quantity}
												/>
											</td>
											{/* <td>
												<FormControl
													type="date"
													value={row.InspectionDate}
													onChange={(e) => updateBreakUpRow(index, 'InspectionDate', e.target.value)}
												/>
											</td> */}
											{/* <td>
												<FormControl
													type="text"
													value={row.JobCardInitial}
													onChange={(e) => updateBreakUpRow(index, 'JobCardInitial', e.target.value)}
												/>
											</td> */}
											<td>
												<div className="d-flex gap-1">
													<Button
														variant="success"
														size="sm"
														onClick={addBreakUpRow}
														title="Add New Row"
													>
														+
													</Button>
													<Button
														variant="danger"
														size="sm"
														onClick={() => removeBreakUpRow(index)}
														disabled={breakUpArray.length === 1}
														title="Delete Row"
													>
														🗑️
													</Button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						
					</Modal.Body>
					<Modal.Footer>
					<Button variant="secondary" onClick={handleCloseModal} size="sm">
						Close
					</Button>
					{isQuantityExact() && (
						<Button variant="primary" onClick={handleSubmit} size="sm">
							OK
						</Button>
						)}
					</Modal.Footer>
				</Modal>
			)}
			<ToastContainer position="top-right" autoClose={3000} />
		</>
	)
	
}
export default PageList_ContainerMaster;