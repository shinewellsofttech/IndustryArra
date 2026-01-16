import React,{ useEffect, useMemo, useState, useCallback } from 'react';
import PageTitle from "../layouts/PageTitle";
import { useTable, useGlobalFilter, useFilters, usePagination } from 'react-table';
import MOCK_DATA from '../components/table/FilteringTable/MOCK_DATA_2.json';
import { Row, Col, Button, FormControl, Table, Spinner, Badge } from "react-bootstrap";
import { GlobalFilter } from '../components/table/FilteringTable/GlobalFilter'; 
//import './table.css';
import '../components/table/FilteringTable/filtering.css';
import {ColumnFilter } from '../components/table/FilteringTable/ColumnFilter';
import {DateFilter } from '../components/table/FilteringTable/DateFilter';
import {DropdownFilter } from '../components/table/FilteringTable/DropdownFilter';
import {StatusDropdownFilter } from '../components/table/FilteringTable/StatusDropdownFilter';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { API_WEB_URLS } from '../../constants/constAPI';
import { Fn_AddEditData, Fn_FillListData } from '../../store/Functions';
import XLSX from 'xlsx';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


export const PageList_ItemMaster = () => {
	const [State, setState] = useState({
		id: 0,
		FillArray: [],
		FillArray2: [],
		FillArray3: [],
		FillArray4: [],
		formData: {},
		OtherDataScore: [],
		isProgress: true,
	  })
	const [gridData, setGridData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedIds, setSelectedIds] = useState([]);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const API_URL = API_WEB_URLS.MASTER + "/0/token/ItemMaster";
	const API_URL_UPDATE = API_WEB_URLS.MASTER + "/0/token/UpdateItemMaster";
	const API_URL_DELETE = API_WEB_URLS.MASTER + "/0/token/DeleteItemMaster";
	const rtPage_Add = "/AddItem";
	const rtPage_Edit = "/AddItem";
	const [isUploading, setIsUploading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [uploadedData, setUploadedData] = useState(null);
	const [uploadedRowCount, setUploadedRowCount] = useState(0);
	const [uploadError, setUploadError] = useState(null);
	const [itemIdForUpload, setItemIdForUpload] = useState(null);
	const [isItemUploading, setIsItemUploading] = useState(false);
	const [componentData, setComponentData] = useState([]);
	const [machineData, setMachineData] = useState([]);
	const [componentRowCount, setComponentRowCount] = useState(0);
	const [machineRowCount, setMachineRowCount] = useState(0);
	const [itemUploadError, setItemUploadError] = useState(null);
	const [isSavingItemDetails, setIsSavingItemDetails] = useState(false);
	const API_URL_SAVE = "ProductMasterExcel/0/token";

	// Calculate counts based on IsDataUploaded status
	const { uploadedCount, pendingCount } = useMemo(() => {
		let uploaded = 0;
		let pending = 0;
		gridData.forEach(item => {
		if (item.IsDataUploaded === 1) {
			uploaded++;
		} else if (item.IsDataUploaded === 0) {
			pending++;
		}
		});
		return { uploadedCount: uploaded, pendingCount: pending };
	}, [gridData]); // Recalculate only when gridData changes


	useEffect(() => {
		const fetchData = async () => {
		  console.log('useEffect running');
		  setLoading(true);
		   Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
		  setLoading(false);
		};
	
		fetchData();
	  }, [dispatch, API_URL]);
	
	  const btnAddOnClick = useCallback(() => {
		
		 navigate(rtPage_Add, { state: { Id: 0 } });
	  }, [navigate, rtPage_Add]);
	
	  const btnEditOnClick = useCallback((Id) => {
		navigate(rtPage_Edit, { state: { Id } });
	  }, [navigate, rtPage_Edit]);
	

	const btnDelete = useCallback(async (id) => {
	const res = await Fn_FillListData(dispatch, setState, "nothing", API_URL_DELETE + "/Id/" + id);
	console.log("Delete Response:", res);
	if(res && res.length > 0 && res[0].Id > 0 && res[0].Id == id){
		toast.success("Item deleted successfully");
		Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
	}else{
		toast.error("Data is used can not delete it");
	}
}, [dispatch, API_URL_DELETE, API_URL]);

	const btnMarkAsUploaded = useCallback(async (rowData) => {
		console.log("Row Data:", rowData);

		const res = await		Fn_FillListData(dispatch, setState, "nothing", API_URL_UPDATE + "/Id/" + rowData.Id);
		console.log("Update Response:", res);
		if(res && res.length > 0 && res[0].Id > 0 ){
			toast.success("Item marked as uploaded successfully");
			Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
		}else{
			toast.error("Failed to mark item as uploaded");
		}
		// Function to update upload status without actual upload
		// You can add API call here later to update IsDataUploaded status
	}, []);

	const toggleSelectAll = useCallback((checked, currentPageRows) => {
		if (checked) {
			const ids = currentPageRows.map(r => r.original.Id);
			setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
		} else {
			const ids = new Set(currentPageRows.map(r => r.original.Id));
			setSelectedIds(prev => prev.filter(id => !ids.has(id)));
		}
	}, []);

	const toggleSelectOne = useCallback((id, checked) => {
		setSelectedIds(prev => {
			if (checked) return Array.from(new Set([...prev, id]));
			return prev.filter(itemId => itemId !== id);
		});
	}, []);

	const handleBulkDelete = useCallback(async (ids) => {
		if (!ids || ids.length === 0) return;
		if (!window.confirm(`Delete ${ids.length} item(s)?`)) return;
		for (const id of ids) {
			try {
				await Fn_FillListData(dispatch, setState, "nothing", API_URL_DELETE + "/Id/" + id);
			} catch (e) {
				console.error("Bulk delete error for id", id, e);
			}
		}
		toast.success(`Deleted ${ids.length} item(s)`);
		setSelectedIds([]);
		Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
	}, [API_URL, API_URL_DELETE, dispatch]);

	// --- Define Upload functions here ---
	const btnUploadOnClick = useCallback((id) => {
		console.log("Upload clicked for ITEM ID:", id);
		// Reset states for the specific item upload process
		setItemIdForUpload(id); // Store the target item ID
		setComponentData([]);
		setMachineData([]);
		setComponentRowCount(0);
		setMachineRowCount(0);
		setIsItemUploading(true); // Start loading indicator for this specific upload
		setItemUploadError(null);

		const fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept = ".xlsx, .xls, .xlsm"; // Include .xlsm if needed

		fileInput.onchange = (event) => {
		  const file = event.target.files[0];

		  if (file) {
			const reader = new FileReader();

			reader.onload = (e) => {
			  try { // Add try...catch for parsing errors
				const binaryStr = e.target.result;
				const workbook = XLSX.read(binaryStr, {
				  type: "binary",
				  bookVBA: true,
				  cellFormula: true,
				  cellNF: true,
				  cellStyles: true,
				});

				const sheetNames = workbook.SheetNames;

				if (sheetNames.length >= 4) {
				  /** ------ SHEET 2: COMPONENT + PICTURE DATA ------ **/
				  const secondSheet = workbook.Sheets[sheetNames[1]];
				  const componentRaw = XLSX.utils.sheet_to_json(secondSheet, {
					header: 1,
					raw: false,
					dateNF: "yyyy-mm-dd",
				  });

				  let columns = componentRaw[0];
				  let columnCount = {};

				  columns = columns.map((col) => {
					if (["L", "W", "T", "QTY"].includes(col)) {
					  columnCount[col] = (columnCount[col] || 0) + 1;
					  return `${col}${columnCount[col]}`;
					}
					return col;
				  });

				  const compData = componentRaw.slice(1).map((row) => {
					const rowData = {};
					columns.forEach((col, i) => (rowData[col] = row[i]));
					return rowData;
				  });

				  const filteredCompData = compData
					.filter(
					  (obj) =>
						obj["COMPONENT NAME"] &&
						obj["CATEGORY"] !== "CATEGORY"
					)
					.map((obj) => ({
					  CATEGORY: obj.CATEGORY,
					  COMPONENTNAME: obj["COMPONENT NAME"],
					  L1: obj.L1,
					  L2: obj.L2,
					  QTY1: obj.QTY1,
					  QTY2: obj.QTY2 || obj["REQ SHEET QTY"],
					  T1: obj.T1,
					  T2: obj.T2,
					  W1: obj.W1,
					  W2: obj.W2,
					  PICTURE: obj.PICTURE,
					}));

				  // --- Update Component State ---
				  setComponentData(filteredCompData);
				  setComponentRowCount(filteredCompData.length);
				  console.log("Component Data (Item ID:", id, "):", filteredCompData);
				  // --- End Update ---

				  /** ------ SHEET 3 & 4: MACHINE SERIES DATA ------ **/
				  const processSheet = (sheet, machineType) => {
					const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
					// Add basic validation for sheet structure
					if (!sheetData || sheetData.length < 3 || !sheetData[1]) {
						console.warn(`Skipping sheet processing due to invalid structure or insufficient data (machineType: ${machineType}).`);
						return [];
					}
					const cols = sheetData[1];
					const data = sheetData.slice(2);

					return data.map((row) => {
					  const rowData = { F_MachineTypeMaster: machineType }; // Add F_MachineTypeMaster here
					  cols.forEach((col, i) => {
						// Ensure col is not null/undefined before using as key
						if (col != null) {
							rowData[col] = row[i];
						}
					  });
					  return rowData;
					}).filter(rowData => rowData["MACHINE NUMBER"] != null); // Filter out rows without MACHINE NUMBER early
				  };

				  // Call processSheet with the correct machineType
				  const machineRaw = [
					...processSheet(workbook.Sheets[sheetNames[2]], 1), // Assign 1 for the 3rd sheet
					...processSheet(workbook.Sheets[sheetNames[3]], 2)  // Assign 2 for the 4th sheet
				  ];
				 
				  const machineTransformed = [];

				  machineRaw.forEach((obj) => {
					const machineNo = obj["MACHINE NUMBER"];
					const machineType = obj.F_MachineTypeMaster; // Get the machineType we added

					Object.keys(obj).forEach((key) => {
					  if (
						obj[key] !== undefined &&
						key !== "MACHINE NAME" &&
						key !== "MACHINE NUMBER" &&
						key !== "F_MachineTypeMaster" // Exclude our temporary key
					  ) {
						machineTransformed.push({
						  Component: key,
						  MachineNo: Number(machineNo),
						  SeriesNo: Number(obj[key]),
						  F_MachineTypeMaster: machineType // Use the stored machineType
						});
					  }
					});
				  });

				  const validatedMachineData = machineTransformed
					.filter(
					  (item) =>
						!isNaN(item.SeriesNo) &&
						!isNaN(item.MachineNo) &&
						typeof item.Component === "string" &&
						item.Component.trim() !== ""
					)
					.sort((a, b) => a.Component.localeCompare(b.Component));

				  // --- Update Machine State ---
				  setMachineData(validatedMachineData);
				  setMachineRowCount(validatedMachineData.length);
				  console.log("Machine Series Data (Item ID:", id, "):", validatedMachineData);
				  // --- End Update ---

				} else {
				  setItemUploadError("The Excel file must have at least 4 sheets!");
				  alert("The Excel file must have at least 4 sheets!");
				}
			  } catch (error) {
				 console.error("Error processing Excel file:", error);
				 setItemUploadError(`Error processing file: ${error.message}`);
				 alert(`Error processing file: ${error.message}`);
			  } finally {
				 setIsItemUploading(false); // Stop loading indicator
			  }
			};

			reader.onerror = (error) => {
				console.error("Error reading file:", error);
				setItemUploadError(`Error reading file: ${error.message}`);
				setIsItemUploading(false);
				alert(`Error reading file: ${error.message}`);
			};

			reader.readAsBinaryString(file);
		  } else {
			 // No file selected, reset loading state
			 setIsItemUploading(false);
			 setItemIdForUpload(null); // Clear target ID if no file selected
		  }
		};

		// Handle cancellation of file dialog
		fileInput.addEventListener('cancel', () => {
			setIsItemUploading(false);
			setItemIdForUpload(null);
			console.log('File selection cancelled.');
		}, { once: true });


		fileInput.click(); // Trigger hidden file input
	  }, []);
	  

	// --- End function definitions ---
	const handleCombinedSubmit = async () => {
		if (!itemIdForUpload || (!componentData.length && !machineData.length)) {
			console.error("No Item ID or data to save.");
			setItemUploadError("No Item ID selected or no data processed from the file to save.");
			return;
		  }

		setIsSavingItemDetails(true);
		setItemUploadError(null);

		try {
		  // --- Submit COMPONENT + PICTURE Data (componentData) ---
		  if (componentData && componentData.length > 0) {
			  const formData1 = new FormData();
			  formData1.append("UserId", 1);
			  formData1.append("F_ItemMaster", itemIdForUpload);
			  formData1.append("Data", JSON.stringify(componentData));

			  console.log("Submitting Component Data:", componentData);
			  await Fn_AddEditData(
				dispatch,
				setState,
				{ arguList: { id: 0, formData: formData1 } },
				"MainMasterExcel/0/token",
				true,
				"memberid"
			  );
			  console.log("Component Data Submitted");
		  } else {
			  console.log("No component data to submit.");
		  }

		  // --- Submit MACHINE SERIES Data (machineData) ---
		  if (machineData && machineData.length > 0) {
			  const formData2 = new FormData();
			  formData2.append("UserId", 1);
			  formData2.append("F_ItemMaster", itemIdForUpload);
			  formData2.append("Data", JSON.stringify(machineData));

			  console.log("Submitting Machine Data:", machineData);
			  await Fn_AddEditData(
				dispatch,
				setState,
				{ arguList: { id: 0, formData: formData2 } },
				"MachineComponentMap/0/token",
				true,
				"memberid"
			  );
			  console.log("Machine Data Submitted");
		  } else {
			  console.log("No machine data to submit.");
		  }

		  alert(`Data for Item ID ${itemIdForUpload} saved successfully!`);
		  setItemIdForUpload(null);
		  setComponentData([]);
		  setMachineData([]);
		  setComponentRowCount(0);
		  setMachineRowCount(0);

		} catch (error) {
		  console.error("Error submitting item details:", error);
		  setItemUploadError(`Error saving data: ${error.message}. Please check console for details.`);
		} finally {
		  setIsSavingItemDetails(false);
		}
	  };
	  

	const COLUMNS = useMemo(() => [
		{
			id: 'select',
			Header: ({ page }) => {
				const allIds = page.map(r => r.original.Id);
				const allSelected = allIds.every(id => selectedIds.includes(id));
				return (
					<input
						type="checkbox"
						checked={allSelected}
						onChange={(e) => toggleSelectAll(e.target.checked, page)}
					/>
				);
			},
			Cell: ({ row }) => {
				const id = row.original.Id;
				const checked = selectedIds.includes(id);
				return (
					<input
						type="checkbox"
						checked={checked}
						onChange={(e) => toggleSelectOne(id, e.target.checked)}
					/>
				);
			},
			disableFilters: true,
			disableSortBy: true,
			width: 40,
		},
		{
			Header : 'Id',
			Footer : 'Id',
			accessor: 'Id',
			Filter: ColumnFilter,
			//disableFilters: true,
		},
        
		{
			Header : 'Name',
			Footer : 'Name',
			accessor: 'Name',
			Filter: ColumnFilter,
		},
		{
			Header : 'ItemCode',
			Footer : 'ItemCode',
			accessor: 'ItemCode',
			Filter: ColumnFilter,
		},
		

		  {
			Header: () => (
				<div>
					Status
					<br />
					<a 
						href={`${process.env.PUBLIC_URL}/TEMPLATE_Item_Upload.xlsm`}
						download="TEMPLATE_Item_Upload.xlsm"
						className="badge bg-info text-decoration-none mt-1"
						style={{ fontSize: '0.75rem', cursor: 'pointer' }}
					>
						📥 Download Template
					</a>
				</div>
			),
			id: 'uploadStatus',
			accessor: row => {
			  if (row.IsDataUploaded === 0) return 'Upload';
			  if (row.IsDataUploaded === 1) return 'Uploaded';
			  return '';
			},
			Filter: StatusDropdownFilter,
			filter: (rows, id, filterValue) => {
			  if (!filterValue) return rows;
			  return rows.filter(row => {
				const status = row.values[id];
				return status === filterValue;
			  });
			},
			Cell: ({ row }) => {
			  if (row.original.IsDataUploaded === 1) {
				return (
				  <Badge bg="success">
					Uploaded
				  </Badge>
				);
			  }
  
			  return (
				<div style={{ display: 'flex', gap: '5px' }}>
				  <Button
					variant="primary"
					size="sm"
					onClick={() => btnUploadOnClick(row.original.Id)}
				  >
					Upload
				  </Button>
				  <Button
					variant="success"
					size="sm"
					onClick={() => btnMarkAsUploaded(row.original)}
					title="Mark as Uploaded"
				  >
					<i className="bi bi-check"></i>
				  </Button>
				</div>
			  );
			},
		  },
		  {
			Header: "Component Photo",
			accessor: row => {
			  if (row.IsComponentPhoto === true) return 'Uploaded';
			  if (row.IsComponentPhoto === false) return 'Pending';
			  return '';
			},
			Filter: DropdownFilter,
			filter: (rows, id, filterValue) => {
			  if (!filterValue) return rows;
			  return rows.filter(row => {
				const status = row.values[id];
				return status === filterValue;
			  });
			},
			Cell: ({ row }) => {
			  const status = row.original.IsComponentPhoto === true ? 'Uploaded' : row.original.IsComponentPhoto === false ? 'Pending' : '';
			  return (
				<Badge bg={status === 'Uploaded' ? 'success' : 'warning'}>
				  {status}
				</Badge>
			  );
			},
		  },
		  {
			Header: "Action",
			id: 'action',
			disableFilters: true,
			Cell: ({ row }) => {
			  return (
				<div style={{ display: 'flex', gap: '5px' }}>
				  <Button
					variant="primary"
					size="sm"
					onClick={() => btnEditOnClick(row.original.Id)}
					title="Edit"
				  >
					Edit
				  </Button>
				  <Button
					variant="danger"
					size="sm"
					onClick={() => btnDelete(row.original.Id)}
					title="Delete"
				  >
					<i className="bi bi-trash"></i>
				  </Button>
				</div>
			  );
			},
		  }, 

	], [btnUploadOnClick, btnEditOnClick, btnDelete, btnMarkAsUploaded, selectedIds, toggleSelectAll, toggleSelectOne]);

	const data = useMemo( () => gridData, [gridData] )
	const tableInstance = useTable({
		columns: COLUMNS,
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
	
	const handleExcelUpload = useCallback((event) => {
		const file = event.target.files[0];
	  
		if (file) {
		  const reader = new FileReader();
	  
		  reader.onload = (e) => {
			setIsUploading(true);
			const binaryStr = e.target.result;
			const workbook = XLSX.read(binaryStr, { 
			  type: "binary",
			  bookVBA: true,
			  cellFormula: true,
			  cellNF: true,
			  cellStyles: true
			});
	  
			const sheetNames = workbook.SheetNames;
	  
			if (sheetNames.length >= 1) { // Ensure at least one sheet exists
			  const firstSheet = workbook.Sheets[sheetNames[0]]; // Use the first sheet
			  const sheetData = XLSX.utils.sheet_to_json(firstSheet, { 
				header: 1,
				raw: false,
				dateNF: 'yyyy-mm-dd'
			  });
	  
			  let columns = sheetData[0];
			  console.log(columns);
			  console.log(sheetData);
			  const data = sheetData.slice(1);
			  console.log(data);
			  const transformedData = data.map((row) => {
				const rowData = {};
				columns.forEach((column, index) => {
				  rowData[column] = row[index];
				});
				return rowData;
			  });
			  console.log("transformedData----------=====>>	",transformedData);
			  // Filter out rows where "ITEM NAME" is empty OR "ITEM CODE" is 'ITEM CODE'
			  // const filteredData = transformedData
			  // 	.filter(obj => 
			  // 	  obj["ITEM NAME"] && 
			  // 	  obj["ITEM CODE"] !== "ITEM CODE"
			  // 	)
			  // 	.map(obj => ({
			  // 	  Name: obj["ITEM NAME"],
			  // 	  ItemCode: obj["ITEM CODE"],
			  // 	  ItemWidth: obj["ITEM WIDTH (cm)"],
			  // 	  ItemDepth: obj["ITEM DEPTH (cm)"],
			  // 	  ItemHeight: obj["ITEM HEIGHT (cm)"],
			  // 	}));
	  
			  const productData = transformedData
				.filter(obj => obj["PRODUCT CODE"] || obj["PRODUCT NAME"])
				.map(obj => ({
				  Name: obj["PRODUCT NAME"] ?? "",
				  ItemCode: obj["PRODUCT CODE"] ?? ""
				}));

			  console.log("productData----------=====>>", productData);

			  setUploadedData(productData);
			  setUploadedRowCount(productData.length);
			  setIsUploading(false);
			} else {
			  alert("The Excel file must have at least 1 sheet!");
			}
		  };
	  
		  reader.readAsBinaryString(file);
		}
	  }, []);
	  
	 
	  
	const handleSaveExcel = useCallback(async () => {
		const userId = JSON.parse(localStorage.getItem("authUser")).id;
		console.log('handleSaveExcel started');
		if (!uploadedData || uploadedData.length === 0) {
		  setUploadError('No data to save');
		  return;
		}

		setIsSaving(true);
		setUploadError(null);

		try {
		  const formData = new FormData();
		  formData.append("Data", JSON.stringify(uploadedData));
		  formData.append("UserId", userId);

		  console.log('Calling Fn_AddEditData');
		  await Fn_AddEditData(
			dispatch,
			setState,
			{ arguList: { id: 0, formData } },
			API_URL_SAVE,
			true,
			"memberid"
		  );
		  console.log('Finished Fn_AddEditData');

		  console.log('Calling Fn_FillListData after save');
		  await Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
		  console.log('Finished Fn_FillListData after save');

		  alert(`Successfully saved ${uploadedData.length} items`);
		  
		  setUploadedData(null);
		  setUploadedRowCount(0);
		  
		} catch (error) {
		  setUploadError('Error saving data: ' + error.message);
		} finally {
		  setIsSaving(false);
		  console.log('handleSaveExcel finished');
		}
	  }, [uploadedData, dispatch, setState, setGridData, API_URL_SAVE, API_URL, setUploadError, setIsSaving, setUploadedRowCount, setUploadedData]);

	return(
		<>
			{isSaving && (
				<div 
					className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-25"
					style={{ zIndex: 2000 }}
				>
					<Spinner animation="border" variant="primary" />
				</div>
			)}
			<PageTitle activeMenu="Filtering" motherMenu="Table" />
			
			<Row className="mb-3 align-items-center">
				<Col md="2">
					<h4 className="page-title mb-0" style={{fontFamily:'Poppins'}}>ItemMaster</h4>
				</Col>
				<Col md="2">
					<div>
						<span className="badge bg-secondary me-1">{gridData.length}</span>
						<span className="badge bg-info me-1">{uploadedCount}</span>
						<span className="badge bg-warning">{pendingCount}</span>
					</div>
				</Col>
				<Col md="2">
					<GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
				</Col>
				<Col md="3">
					<div>
						<label htmlFor="fileInput" className="form-label mb-1 small">
							Upload Excel
							<a 
								href={`${process.env.PUBLIC_URL}/ITEM_LIST.xlsx`}
								download="ITEM_LIST.xlsx"
								className="badge bg-info text-decoration-none ms-2"
								style={{ fontSize: '0.7rem', cursor: 'pointer' }}
							>
								📥 Template
							</a>
						</label>
						<FormControl
							type="file"
							accept=".xlsx, .xlsm"
							onChange={handleExcelUpload}
							size="sm"
							disabled={isUploading || isSaving}
						/>
						{isUploading && (
							<div className="spinner-border spinner-border-sm text-primary mt-1" role="status">
								<span className="visually-hidden">Loading...</span>
							</div>
						)}
						{uploadedData && uploadedData.length > 0 && !isUploading && (
							<span className="badge bg-success mt-1">
								{uploadedData.length} rows
							</span>
						)}
					</div>
				</Col>
				<Col md="2">
					{uploadedData && uploadedData.length > 0 && !isUploading && (
						<Button
							variant="primary"
							size="sm"
							onClick={handleSaveExcel}
							disabled={isSaving}
							className="w-100"
						>
							{isSaving ? (
								<>
									<span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
									Saving...
								</>
							) : (
								'Save'
							)}
						</Button>
					)}
				</Col>
				<Col md="1">
					<Button
						type="button"
						onClick={btnAddOnClick}
						variant="success"
						size="sm"
					>
						Add New
					</Button>
				</Col>
			</Row>
			{selectedIds.length > 0 && (
				<Row className="mb-2">
					<Col md="12">
						<Button
							variant="danger"
							size="sm"
							onClick={() => handleBulkDelete(selectedIds)}
						>
							Delete Selected ({selectedIds.length})
						</Button>
					</Col>
				</Row>
			)}

			{/* --- Display Area for Item-Specific Upload Status --- */}
			{itemIdForUpload !== null && ( // Only show if an item upload was initiated
				<Row className="mb-3">
					<Col>
						<div className="border p-3 rounded bg-light">
							<h5>Upload Status for Item ID: {itemIdForUpload}</h5>
							{isItemUploading && (
								<div className="d-flex align-items-center">
									<Spinner animation="border" size="sm" className="me-2" />
									<span>Processing uploaded file...</span>
								</div>
							)}
							{!isItemUploading && (componentRowCount > 0 || machineRowCount > 0) && (
								<div>
									<span className="badge bg-success me-2">
										Components Processed: {componentRowCount}
									</span>
									<span className="badge bg-info me-2">
										Machine Series Processed: {machineRowCount}
									</span>
									<Button
										variant="success"
										size="sm"
										onClick={handleCombinedSubmit}
										disabled={isSavingItemDetails || (!componentData.length && !machineData.length)}
										className="ms-2"
									>
										{isSavingItemDetails ? (
											<>
												<Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1"/>
												Saving...
											</>
										) : (
											'Save Item Details'
										)}
									</Button>
								</div>
							)}
							 {!isItemUploading && itemUploadError && (
								<div className="alert alert-danger mt-2 p-2 small">
									Error: {itemUploadError}
								</div>
							)}
							{!isItemUploading && componentRowCount === 0 && machineRowCount === 0 && !itemUploadError && (
								 <p className="text-muted mb-0">File processed. No component or machine data found matching criteria, or upload cancelled/failed.</p>
							)}
						</div>
					</Col>
				</Row>
			)}
			{/* --- End Display Area --- */}

			<div className="card">
				
				<div className="card-header">
					<h4 className="card-title">Table Filtering</h4>
                </div>
				<div className="card-body">
					<div className="table-responsive">
						
						<table {...getTableProps()} className="table dataTable display">
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
												return <td {...cell.getCellProps()}> {cell.render('Cell')} </td>
											})}
										</tr>
									)
								})}
							</tbody>
						</table>
						<div className="d-flex justify-content-between">
							<span>
								Page{' '}
								<strong>
									{pageIndex + 1} of {pageOptions.length}
								</strong>{''}
							</span>
							<span className="table-index">
								Go to page : {' '}
								<input type="number" 
									className="ml-2"
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
		</>
	)
	
}
export default PageList_ItemMaster;