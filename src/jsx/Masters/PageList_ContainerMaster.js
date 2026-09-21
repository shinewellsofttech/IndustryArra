import React,{ useEffect, useMemo, useState } from 'react';
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
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import usePagePermissions from '../../helpers/usePagePermissions';

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken") ||
    "";
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "multipart/form-data",
  };
};

export const PageList_ContainerMaster = () => {
	const [State, setState] = useState({
		id: 0,
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
	const API_URL_UpdateJobCardInitial = API_WEB_URLS.MASTER + "/0/token/UpdateJobCardInitialContainer";
	const API_URL_BREAK = API_WEB_URLS.MASTER + "/0/token/ContainerMaster";
	const API_URL_QUANTITY_BY_CONTRACT = API_WEB_URLS.MASTER + "/0/token/QuantityByContract";
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
	const { canAdd, canEdit, canDelete } = usePagePermissions('ContainerMaster');

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			await Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
			await Fn_FillListData(dispatch, setState, "FillArray", API_URL_BREAK + "/Id/0");
			setLoading(false);
		};

		fetchData();
	}, [dispatch, API_URL, API_URL_BREAK]);

	// ── Edit Shipment State & Handlers ──────────────────────────────────────────
	const [showEditModal, setShowEditModal] = useState(false);
	const [editRowData, setEditRowData] = useState({
		F_ContainerMasterL: 0,
		ContainerNumber: "",
		ContractNo: "",
		ItemCode: "",
		ItemName: "",
		Quantity: "",
		InspectionDate: "",
		JobCardInitial: "",
		IsTikamoon: false,
	});
	const [isUpdating, setIsUpdating] = useState(false);

	// ── Delete Shipment State & Handlers ────────────────────────────────────────
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteRowData, setDeleteRowData] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const btnAddOnClick = () => {
		navigate(rtPage_Add, { state: { Id: 0 } });
	};

	const btnEditOnClick = (rowData) => {
		setEditRowData({
			F_ContainerMasterL: rowData.F_ContainerMasterL,
			ContainerNumber: rowData.ContainerNumber || "",
			ContractNo: rowData.ContractNo || "",
			ItemCode: rowData.ItemCode || "",
			ItemName: rowData.ItemName || "",
			Quantity: rowData.Quantity || "",
			InspectionDate: rowData.InspectionDate ? rowData.InspectionDate.split("T")[0] : "",
			JobCardInitial: rowData.JobCardInitial || "",
			IsTikamoon: !!rowData.IsTikamoon,
		});
		setShowEditModal(true);
	};

	const handleCloseEditModal = () => {
		setShowEditModal(false);
		setIsUpdating(false);
	};

	const handleSaveEditShipment = async (e) => {
		if (e) e.preventDefault();
		if (!editRowData.ContainerNumber || !editRowData.ContainerNumber.trim()) {
			alert("Shipment / Container Number is required.");
			return;
		}
		if (!editRowData.ItemCode || !editRowData.ItemCode.trim()) {
			alert("Item Code is required.");
			return;
		}
		if (!editRowData.Quantity || parseFloat(editRowData.Quantity) <= 0) {
			alert("Please enter a valid Quantity greater than 0.");
			return;
		}

		setIsUpdating(true);
		try {
			const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
			const userId = authUser?.id || authUser?.ID || "0";

			const vFormData = new FormData();
			vFormData.append("ContainerMasterLId", editRowData.F_ContainerMasterL);
			vFormData.append("ContainerNumber", editRowData.ContainerNumber.trim());
			vFormData.append("ContractNo", editRowData.ContractNo.trim());
			vFormData.append("ItemCode", editRowData.ItemCode.trim());
			vFormData.append("ItemName", editRowData.ItemName.trim());
			vFormData.append("Quantity", editRowData.Quantity);
			if (editRowData.InspectionDate) {
				vFormData.append("InspectionDate", editRowData.InspectionDate);
			}
			vFormData.append("JobCardInitial", editRowData.JobCardInitial.trim());
			vFormData.append("IsTikamoon", editRowData.IsTikamoon ? "true" : "false");

			const headers = getAuthHeaders();
			const res = await axios.post(
				`${API_WEB_URLS.BASE}ShipmentMaster/UpdateLine/${userId}/token`,
				vFormData,
				{ headers }
			);

			if (res?.data?.Success || res?.data?.success || res?.status === 200) {
				toast.success("✅ Shipment updated successfully!", {
					position: "top-right",
					autoClose: 3000,
				});
				setShowEditModal(false);
				// Refresh list
				await Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
				await Fn_FillListData(dispatch, setState, "FillArray", API_URL_BREAK + "/Id/0");
			} else {
				alert(res?.data?.Message || res?.data?.message || "Failed to update shipment.");
			}
		} catch (err) {
			console.error("Error updating shipment line:", err);
			const errMsg = err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Failed to update shipment.";
			alert(errMsg);
		} finally {
			setIsUpdating(false);
		}
	};

	const btnDeleteOnClick = (rowData) => {
		setDeleteRowData(rowData);
		setShowDeleteModal(true);
	};

	const handleCloseDeleteModal = () => {
		setShowDeleteModal(false);
		setDeleteRowData(null);
		setIsDeleting(false);
	};

	const handleConfirmDeleteShipment = async () => {
		if (!deleteRowData) return;
		setIsDeleting(true);
		try {
			const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
			const userId = authUser?.id || authUser?.ID || "0";

			const vFormData = new FormData();
			vFormData.append("ContainerMasterLId", deleteRowData.F_ContainerMasterL);

			const headers = getAuthHeaders();
			const res = await axios.post(
				`${API_WEB_URLS.BASE}ShipmentMaster/DeleteLine/${userId}/token`,
				vFormData,
				{ headers }
			);

			if (res?.data?.Success || res?.data?.success || res?.status === 200) {
				toast.success("✅ Shipment deleted successfully!", {
					position: "top-right",
					autoClose: 3000,
				});
				setShowDeleteModal(false);
				setDeleteRowData(null);
				// Refresh list
				await Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
				await Fn_FillListData(dispatch, setState, "FillArray", API_URL_BREAK + "/Id/0");
			} else {
				alert(res?.data?.Message || res?.data?.message || "Failed to delete shipment.");
			}
		} catch (err) {
			console.error("Error deleting shipment line:", err);
			const errMsg = err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Failed to delete shipment.";
			alert(errMsg);
		} finally {
			setIsDeleting(false);
		}
	};
	// ────────────────────────────────────────────────────────────────────────────

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
			JobCardInitial: rowData.JobCardInitial,
			IsTikamoon: rowData.IsTikamoon || false
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
			JobCardInitial: selRow.JobCardInitial,
			IsTikamoon: selRow.IsTikamoon || false
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
		
		// Reload data after successful submission
		if (res && res.id > 0) {
			await Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
			await Fn_FillListData(dispatch, setState, "FillArray", API_URL_BREAK + "/Id/0");
			toast.success("Break-up saved successfully!", {
				position: "top-right",
				autoClose: 3000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
			});
		}
		
		// Close modal after successful submission
		handleCloseModal();
	  };

	  // Validation function to check if Quantity sum matches ShipmentQty for each ContractNo
	  const validateQuantityByContract = async (data) => {
		const contractGroups = {};
		const errors = [];
		
		// First, group data by ContractNo to calculate new quantities
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

		// For each unique ContractNo, fetch OldStoredQty once and validate
		for (const contractNo of Object.keys(contractGroups)) {
			const group = contractGroups[contractNo];
			
			// Fetch OldStoredQty once per ContractNo (sum of all stored quantities in database)
			const res = await Fn_FillListData(dispatch, setState, "FillArray", API_URL_QUANTITY_BY_CONTRACT + "/" + contractNo + "/0");
			console.log("res for ContractNo", contractNo, res);
			const OldStoredQty = res && res[0] ? parseFloat(res[0].TotalQuantity) || 0 : 0;
			
			// Validate: OldStoredQty + new data quantity sum should equal ShipmentQty
			const totalSum = OldStoredQty + group.totalQuantity;
			if (Math.abs(totalSum - group.shipmentQty) > 0.01) { // Allow small floating point differences
				const containerNames = group.containers.map(c => c.containerName).join(', ');
				errors.push({
					contractNo: contractNo,
					shipmentQty: group.shipmentQty,
					oldStoredQty: OldStoredQty,
					newQuantity: group.totalQuantity,
					totalSum: totalSum,
					containers: containerNames,
					containerList: group.containers
				});
			}
		}

		return errors;
	  };

	  const handleFileUpload = (event) => {
		const file = event.target.files[0];
	  
		if (file) {
		  const reader = new FileReader();
	  
		  reader.onload = async (e) => {
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
			const validationErrors = await validateQuantityByContract(finalFilteredData);
			if (validationErrors.length > 0) {
				let errorMessage = "Quantity validation failed:\n\n";
				validationErrors.forEach((error, index) => {
					errorMessage += `${index + 1}. Contract No: ${error.contractNo}\n`;
					errorMessage += `   ShipmentQty: ${error.shipmentQty}\n`;
					errorMessage += `   Old Stored Quantity (Database): ${error.oldStoredQty}\n`;
					errorMessage += `   New Quantity (Uploaded): ${error.newQuantity}\n`;
					errorMessage += `   Total Sum (Old + New): ${error.totalSum}\n`;
					errorMessage += `   Difference: ${Math.abs(error.shipmentQty - error.totalSum)}\n`;
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
			 const validationErrors = await validateQuantityByContract(excelData);
			if (validationErrors.length > 0) {
				let errorMessage = "Cannot save! Quantity validation failed:\n\n";
				validationErrors.forEach((error, index) => {
					errorMessage += `${index + 1}. Contract No: ${error.contractNo}\n`;
					errorMessage += `   ShipmentQty: ${error.shipmentQty}\n`;
					errorMessage += `   Old Stored Quantity (Database): ${error.oldStoredQty}\n`;
					errorMessage += `   New Quantity (Uploaded): ${error.newQuantity}\n`;
					errorMessage += `   Total Sum (Old + New): ${error.totalSum}\n`;
					errorMessage += `   Difference: ${Math.abs(error.shipmentQty - error.totalSum)}\n`;
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

				
					return (
						<FormControl
							type="date"
							defaultValue={formatDateForInput(row.original.InspectionDate)}
							onChange={(e) => handleDateChange(e, row.original)}
							disabled={!canEdit}
							style={{ width: '150px' }}
						/>
					);
				
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
			Header : 'ShipmentNo',
			Footer : 'ShipmentNo',
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
							disabled={!canEdit}
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
			Cell: ({ row }) => {
				const { ParentIds } = row.original;
				const handleEnterKeyPress = async (e, rowData) => {
					if (e.key === 'Enter') {
						const jobCardInitialValue = e.target.value;
						console.log('Row data on Enter:', rowData);
						console.log('JobCardInitial value:', jobCardInitialValue);

						
						await Fn_FillListData(dispatch, setState, "no", API_URL_UpdateJobCardInitial + "/"+jobCardInitialValue+"/"+rowData.F_ContainerMasterL);
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

		
					return (
						<FormControl
							type="text"
							defaultValue={row.original.JobCardInitial || ''}
							onKeyDown={(e) => handleEnterKeyPress(e, row.original)}
							disabled={!canEdit}
							style={{ width: '150px' }}
						/>
					);
				
			},
		},

		{
			Header: "Type",
			Footer: "Type",
			accessor: "IsMergedOrBroken",
			Filter: ColumnFilter,
			Cell: ({ row }) => {
				const isMergedOrBroken = row.original.IsMergedOrBroken === 1 || !!(row.original.ParentIds && String(row.original.ParentIds).trim() !== "");
				return isMergedOrBroken ? (
					<span className="badge badge-sm" style={{ backgroundColor: "#64748b", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
						🔗 Merged/Broken
					</span>
				) : (
					<span className="badge badge-sm" style={{ backgroundColor: "#10b981", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
						Single
					</span>
				);
			}
		},

		{
			Header: "Break",
			Cell: ({ row }) => (
			  <Button
				variant="danger"
				size="sm"
				onClick={() => btnBreakOnClick(row.original)}
				disabled={canEdit === false}
			  >
				Break
			  </Button>
			),
		},

		{
			Header: "Edit",
			Cell: ({ row }) => {
				const isMergedOrBroken = row.original.IsMergedOrBroken === 1 || !!(row.original.ParentIds && String(row.original.ParentIds).trim() !== "");
				if (isMergedOrBroken) {
					return (
						<span title="Cannot edit: shipment has been merged or broken" className="text-muted font-weight-bold" style={{ fontSize: "12px" }}>
							—
						</span>
					);
				}
				return (
					<Button
						variant="warning"
						size="sm"
						onClick={() => btnEditOnClick(row.original)}
						disabled={canEdit === false}
						style={{ fontWeight: 600, padding: "4px 10px" }}
						title="Edit Shipment"
					>
						Edit
					</Button>
				);
			},
		},

		{
			Header: "Delete",
			Cell: ({ row }) => {
				const isMergedOrBroken = row.original.IsMergedOrBroken === 1 || !!(row.original.ParentIds && String(row.original.ParentIds).trim() !== "");
				if (isMergedOrBroken) {
					return (
						<span title="Cannot delete: shipment has been merged or broken" className="text-muted font-weight-bold" style={{ fontSize: "12px" }}>
							—
						</span>
					);
				}
				return (
					<Button
						variant="outline-danger"
						size="sm"
						onClick={() => btnDeleteOnClick(row.original)}
						disabled={canDelete === false}
						style={{ fontWeight: 600, padding: "4px 10px" }}
						title="Delete Shipment"
					>
						Delete
					</Button>
				);
			},
		},

	]
	const columns = useMemo( () => COLUMNS, [canEdit, canDelete] )
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
					font-family: 'Poppins', 'Segoe UI', sans-serif;
					font-size: 14px;
				}
				.custom-modal .form-label,
				.custom-modal label,
				.custom-modal .form-check-label {
					color: inherit;
				}
				[data-theme-version="dark"] .custom-modal .modal-content {
					background-color: #1e293b !important;
					color: #f1f5f9 !important;
					border: 1px solid #334155 !important;
				}
				[data-theme-version="dark"] .custom-modal .modal-body {
					background-color: #1e293b !important;
					color: #f1f5f9 !important;
				}
				[data-theme-version="dark"] .custom-modal .modal-footer {
					background-color: #0f172a !important;
					border-top: 1px solid #334155 !important;
				}
				[data-theme-version="dark"] .custom-modal .form-label,
				[data-theme-version="dark"] .custom-modal label,
				[data-theme-version="dark"] .custom-modal .form-check-label {
					color: #f1f5f9 !important;
				}
				[data-theme-version="dark"] .custom-modal .form-control {
					background-color: #0f172a !important;
					color: #f8fafc !important;
					border: 1px solid #334155 !important;
				}
				[data-theme-version="dark"] .custom-modal .form-control:focus {
					border-color: #38bdf8 !important;
					color: #ffffff !important;
					background-color: #0f172a !important;
					box-shadow: 0 0 0 0.2rem rgba(56, 189, 248, 0.25) !important;
				}
				.custom-modal .shipment-preview-box {
					background-color: #f8fafc;
					border: 1px solid #e2e8f0;
					color: #1e293b;
				}
				[data-theme-version="dark"] .custom-modal .shipment-preview-box {
					background-color: #0f172a !important;
					border: 1px solid #334155 !important;
					color: #f1f5f9 !important;
				}
				.custom-modal .modal-title {
					font-family: 'Poppins', 'Segoe UI', sans-serif;
					font-weight: 600;
					color: #fff;
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
		<PageTitle activeMenu="Shipment Master" motherMenu="Masters" />
		
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
							type="file"
							accept=".xlsx, .xlsm"
							onChange={handleFileUpload}
							size="sm"
							className="me-2"
							disabled={!canAdd && !canEdit}
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
					disabled={isSaving || !excelData || excelData.length === 0 || (!canAdd && !canEdit)}
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
				{canAdd && (
					<Button
						type="button"
						onClick={btnAddOnClick}
						variant="success"
						size="sm"
						style={{marginTop: '20px'}}
					>
						Add New
					</Button>
				)}
			</Col>
			</Row>
		<div className="card">
			
			<div className="card-header">
				<h4 className="card-title">Shipment Master</h4>
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
						<Modal.Title>Shipment Break Details</Modal.Title>
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
										<th>ShipmentNo</th>
										<th>Item Name</th>
										<th>Contract No</th>
										<th>Item Code</th>
										<th>Quantity</th>
										<th>IsTikamoon</th>
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
													disabled={!canEdit}
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
													disabled={!canEdit}
												/>
											</td>
											<td className="text-center" style={{ verticalAlign: 'middle' }}>
												<input
													type="checkbox"
													checked={row.IsTikamoon || false}
													onChange={(e) => updateBreakUpRow(index, 'IsTikamoon', e.target.checked)}
													disabled={!canEdit}
													style={{
														width: '20px',
														height: '20px',
														cursor: 'pointer',
														accentColor: '#374151'
													}}
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
														disabled={!canEdit}
														title="Add New Row"
													>
														+
													</Button>
													<Button
														variant="danger"
														size="sm"
														onClick={() => removeBreakUpRow(index)}
														disabled={!canEdit || breakUpArray.length === 1}
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
						<Button variant="primary" onClick={handleSubmit} size="sm" disabled={!canEdit}>
							OK
						</Button>
						)}
					</Modal.Footer>
				</Modal>
			)}

			{/* Edit Shipment Modal */}
			{showEditModal && (
				<Modal show={showEditModal} onHide={handleCloseEditModal} size="lg" className="custom-modal" centered>
					<Modal.Header closeButton style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "#fff" }}>
						<Modal.Title style={{ color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
							<i className="fa fa-edit" style={{ color: "#f59e0b" }}></i> Edit Shipment Line
						</Modal.Title>
					</Modal.Header>
					<Modal.Body style={{ padding: "20px" }}>
						<form onSubmit={handleSaveEditShipment}>
							<Row className="g-3">
								<Col md={6} className="mb-3">
									<label className="form-label font-weight-bold" style={{ fontSize: "13px" }}>
										Shipment / Container No <span className="text-danger">*</span>
									</label>
									<FormControl
										type="text"
										value={editRowData.ContainerNumber}
										onChange={(e) => setEditRowData({ ...editRowData, ContainerNumber: e.target.value })}
										placeholder="e.g. N474"
										required
										disabled={isUpdating}
									/>
								</Col>

								<Col md={6} className="mb-3">
									<label className="form-label font-weight-bold" style={{ fontSize: "13px" }}>
										Contract No
									</label>
									<FormControl
										type="text"
										value={editRowData.ContractNo}
										onChange={(e) => setEditRowData({ ...editRowData, ContractNo: e.target.value })}
										placeholder="e.g. LF8469656"
										disabled={isUpdating}
									/>
								</Col>

								<Col md={6} className="mb-3">
									<label className="form-label font-weight-bold" style={{ fontSize: "13px" }}>
										Item Code <span className="text-danger">*</span>
									</label>
									<FormControl
										type="text"
										value={editRowData.ItemCode}
										onChange={(e) => setEditRowData({ ...editRowData, ItemCode: e.target.value })}
										placeholder="e.g. H57907"
										required
										disabled={isUpdating}
									/>
								</Col>

								<Col md={6} className="mb-3">
									<label className="form-label font-weight-bold" style={{ fontSize: "13px" }}>
										Item Description / Name
									</label>
									<FormControl
										type="text"
										value={editRowData.ItemName}
										onChange={(e) => setEditRowData({ ...editRowData, ItemName: e.target.value })}
										placeholder="e.g. C&C CALISTO STORAGE COFFEE TABLE"
										disabled={isUpdating}
									/>
								</Col>

								<Col md={4} className="mb-3">
									<label className="form-label font-weight-bold" style={{ fontSize: "13px" }}>
										Quantity <span className="text-danger">*</span>
									</label>
									<FormControl
										type="number"
										value={editRowData.Quantity}
										onChange={(e) => setEditRowData({ ...editRowData, Quantity: e.target.value })}
										min="0.01"
										step="any"
										required
										disabled={isUpdating}
									/>
								</Col>

								<Col md={4} className="mb-3">
									<label className="form-label font-weight-bold" style={{ fontSize: "13px" }}>
										Inspection Date
									</label>
									<FormControl
										type="date"
										value={editRowData.InspectionDate}
										onChange={(e) => setEditRowData({ ...editRowData, InspectionDate: e.target.value })}
										disabled={isUpdating}
									/>
								</Col>

								<Col md={4} className="mb-3">
									<label className="form-label font-weight-bold" style={{ fontSize: "13px" }}>
										Job Card Code / Initial
									</label>
									<FormControl
										type="text"
										value={editRowData.JobCardInitial}
										onChange={(e) => setEditRowData({ ...editRowData, JobCardInitial: e.target.value })}
										placeholder="e.g. A829"
										disabled={isUpdating}
									/>
								</Col>

								<Col md={12} className="mb-2">
									<div className="form-check" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<input
											type="checkbox"
											className="form-check-input"
											id="editIsTikamoonCheck"
											checked={editRowData.IsTikamoon}
											onChange={(e) => setEditRowData({ ...editRowData, IsTikamoon: e.target.checked })}
											disabled={isUpdating}
											style={{ width: "18px", height: "18px", cursor: "pointer" }}
										/>
										<label className="form-check-label font-weight-bold" htmlFor="editIsTikamoonCheck" style={{ cursor: "pointer", fontSize: "13px" }}>
											Is Tikamoon Shipment
										</label>
									</div>
								</Col>
							</Row>
						</form>
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={handleCloseEditModal} disabled={isUpdating} size="sm">
							Cancel
						</Button>
						<Button variant="primary" onClick={handleSaveEditShipment} disabled={isUpdating} size="sm" style={{ backgroundColor: "#0284c7", borderColor: "#0284c7" }}>
							{isUpdating ? (
								<>
									<span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true"></span>
									Saving...
								</>
							) : (
								<>
									<i className="fa fa-save mr-1"></i> Save Changes
								</>
							)}
						</Button>
					</Modal.Footer>
				</Modal>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<Modal show={showDeleteModal} onHide={handleCloseDeleteModal} size="md" centered className="custom-modal">
					<Modal.Header closeButton style={{ background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)", color: "#fff" }}>
						<Modal.Title style={{ color: "#fff", display: "flex", alignItems: "center", gap: "8px", fontSize: "16px" }}>
							<i className="fa fa-exclamation-triangle" style={{ color: "#fef08a" }}></i> Confirm Shipment Deletion
						</Modal.Title>
					</Modal.Header>
					<Modal.Body style={{ padding: "20px" }}>
						<p style={{ fontSize: "14px", marginBottom: "12px" }}>
							Are you sure you want to delete this shipment line?
						</p>
						{deleteRowData && (
							<div className="shipment-preview-box" style={{ borderRadius: "8px", padding: "12px 16px", fontSize: "13px" }}>
								<div><strong>Shipment No:</strong> {deleteRowData.ContainerNumber}</div>
								<div><strong>Contract No:</strong> {deleteRowData.ContractNo || "N/A"}</div>
								<div><strong>Item:</strong> {deleteRowData.ItemCode} - {deleteRowData.ItemName}</div>
								<div><strong>Quantity:</strong> {deleteRowData.Quantity}</div>
								<div><strong>Inspection Date:</strong> {deleteRowData.InspectionDate ? new Date(deleteRowData.InspectionDate).toLocaleDateString('en-GB') : "N/A"}</div>
							</div>
						)}
						<p className="text-danger mt-3 mb-0" style={{ fontSize: "12px", fontWeight: 600 }}>
							⚠️ This action will mark the shipment inactive and remove it from active processing.
						</p>
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={handleCloseDeleteModal} disabled={isDeleting} size="sm">
							Cancel
						</Button>
						<Button variant="danger" onClick={handleConfirmDeleteShipment} disabled={isDeleting} size="sm">
							{isDeleting ? (
								<>
									<span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true"></span>
									Deleting...
								</>
							) : (
								<>
									<i className="fa fa-trash mr-1"></i> Delete Shipment
								</>
							)}
						</Button>
					</Modal.Footer>
				</Modal>
			)}
			<ToastContainer position="top-right" autoClose={3000} />
		</>
	)
	
}
export default PageList_ContainerMaster;