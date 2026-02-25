import React,{ useEffect, useMemo, useState, useContext } from 'react';
import PageTitle from "../layouts/PageTitle";
import { useTable, useGlobalFilter, useFilters, usePagination } from 'react-table';
import MOCK_DATA from '../components/table/FilteringTable/MOCK_DATA_2.json';
import { Row, Col, Button, FormControl, Form, Table, Spinner, Modal } from "react-bootstrap";
import { GlobalFilter } from '../components/table/FilteringTable/GlobalFilter'; 
//import './table.css';
import '../components/table/FilteringTable/filtering.css';
import {ColumnFilter } from '../components/table/FilteringTable/ColumnFilter';
import {DateFilter } from '../components/table/FilteringTable/DateFilter';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { API_WEB_URLS } from '../../constants/constAPI';
import { Fn_FillListData, Fn_AddEditData, Fn_DeleteData } from '../../store/Functions';
import JSZip from 'jszip';
import { Container } from 'reactstrap';
import { ThemeContext } from '../../context/ThemeContext';

export const PageList_ComponentMaster = ({ filterItemCode, filterIsActive, isModalView = false }) => {
	const [State, setState] = useState({
		id: 0,
		FillArray: [],
		MachineComponentMap: [],
		MachineMaster: [],
		formData: {},
		OtherDataScore: [],
		isProgress: true,
		ItemCode: '',
	  })
	const [gridData, setGridData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState(null);
	const [imageArray, setImageArray] = useState([]);
	const [isSaving, setIsSaving] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [modalData, setModalData] = useState([]);
	const [componentInfo, setComponentInfo] = useState(null);
	const [draggedIndex, setDraggedIndex] = useState(null);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { background } = useContext(ThemeContext);
	const isDarkMode = background?.value === 'dark';
	const tableTextColor = isDarkMode ? '#ffffff' : '#000000';
	const tableBorderColor = isDarkMode ? '#ffffff' : '#000000';
	const tableBgColor = isDarkMode ? '#1a1a1a' : '#ffffff';
	const tableHeaderBgColor = isDarkMode ? '#2d2d2d' : '#f8f9fa';
	const API_URL = API_WEB_URLS.MASTER + "/0/token/Components";
	const API_URL_IsActive = API_WEB_URLS.MASTER + "/0/token/ComponentsUpdateIsActive";
	const API_URL1 = API_WEB_URLS.MASTER + "/0/token/MachineComponentMap";
	const API_URL2 = API_WEB_URLS.MASTER + "/0/token/MachineMaster";
	const rtPage_Add = "/AddMultipleComponent";
	const rtPage_Edit = "/AddComponent";
	const API_URL_SAVE = "AddComponentPhoto/0/token";
	const API_URL_Update = "UpdateComponentPhotoStatus/0/token";
	const API_URL_UpdateN = "AddComponentPhoto/0/token";
	const API_URL_DELETE = API_WEB_URLS.MASTER + "/0/token/DeleteComponent";
	const API_URL_SAVE_MACHINE_SEQUENCE = "ManualMachineComponentMap/0/token";


	
	useEffect(() => {
		const fetchData = async () => {
		  setLoading(true);
		   Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
		   
		   
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

	  const btnDeleteOnClick = async (Id) => {
		if (window.confirm('Are you sure you want to delete this component?')) {
			Fn_FillListData(dispatch, setGridData, "gridData", API_URL_DELETE + "/Id/" + Id);
		}
	  };

	  const btnMachineSequenceOnClick = async (rowData) => {
		// Handle Machine Sequence button click
		console.log('Machine Sequence clicked - Row Data:', rowData);
		const MachineTypeId = rowData.F_CategoryMaster == 4 ? 2 : 1;
		Fn_FillListData(dispatch, setState, "MachineMaster", API_URL2 + "/TBL.F_MachineTypeMaster/" + MachineTypeId);
		console.log('Machine Master:', State.MachineMaster);
		try {
			const data = await Fn_FillListData(dispatch, setState, "MachineComponentMap", API_URL1 + "/TBL.F_ComponentMaster/" + rowData.Id);
			setModalData(data || []);
			setComponentInfo(rowData);
			setShowModal(true);
		} catch (error) {
			console.error('Error fetching machine component map:', error);
			setModalData([]);
			setComponentInfo(rowData);
			setShowModal(true);
		}
	  };

	  const handleIsActiveChange = async (componentId, newValue) => {
		Fn_FillListData(dispatch, setGridData, "gridData", API_URL_IsActive + "/Id/" + componentId);
	  };

	  // Drag and Drop handlers for Machine Sequence
  const updateSeriesNumbers = (items) => items.map((item, idx) => ({
    ...item,
    Series: idx + 1,
  }));

  const createEmptyMachineRow = (componentId) => ({
    F_MachineMaster: '',
    MachineName: '',
    F_ComponentMaster: componentId ?? componentInfo?.Id ?? 0,
    Id: 0,
    Series: 0,
  });

  const handleAddMachineRow = (index) => {
    setModalData((prev) => {
      const newItems = [...prev];
      const referenceItem = index >= 0 ? newItems[index] : null;
      const componentIdToUse =
        referenceItem?.F_ComponentMaster ??
        componentInfo?.Id ??
        0;
      newItems.splice(index + 1, 0, createEmptyMachineRow(componentIdToUse));
      return updateSeriesNumbers(newItems);
    });
  };

  const handleRemoveMachineRow = (index) => {
    setModalData((prev) => {
      if (prev.length <= 1) return prev;
      const newItems = prev.filter((_, idx) => idx !== index);
      return updateSeriesNumbers(newItems);
    });
  };

  const handleSaveMachineSequence = async() => {
    console.log('Machine sequence array:', modalData);
	const formData = new FormData();
	const componentId =
	  componentInfo?.Id ??
	  (modalData.length > 0 ? modalData[0].F_ComponentMaster : 0);
	const sequenceString = modalData
	  .filter(item => item.F_MachineMaster)
	  .map(item => `${item.F_MachineMaster}~${item.Series ?? 0}`)
	  .join("#");

	formData.append("F_ComponentMaster", componentId || 0);
	formData.append("ManualMachineComponentMapStr", sequenceString);

	await Fn_AddEditData(
		dispatch,
		setState,
		{ arguList: { id: 0, formData: formData } },
		API_URL_SAVE_MACHINE_SEQUENCE,
		true,
		"memberid",
		navigate,
		"#"
	);
  };

  const handleDragStart = (e, index) => {
		setDraggedIndex(index);
		e.dataTransfer.effectAllowed = 'move';
	};

	  const handleDragOver = (e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
	};

	  const handleDrop = (e, dropIndex) => {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === dropIndex) {
			setDraggedIndex(null);
			return;
		}

    const items = [...modalData];
		const draggedItem = items[draggedIndex];
		items.splice(draggedIndex, 1);
		items.splice(dropIndex, 0, draggedItem);
		
    // Update Series numbers
    setModalData(updateSeriesNumbers(items));
		setDraggedIndex(null);
	};

	  const handleDragEnd = () => {
		setDraggedIndex(null);
	};

	  // Custom dropdown filter for IsActive
	  const IsActiveDropdownFilter = ({ column }) => {
		const { filterValue, setFilter } = column;
		
		return (
			<div>
				<FormControl
					as="select"
					className="form-control input-search"
					value={filterValue || ''}
					onChange={(e) => setFilter(e.target.value || undefined)}
				>
					<option value="">All</option>
					<option value="true">Active</option>
					<option value="false">Inactive</option>
				</FormControl>
			</div>
		);
	  };

	  // Custom dropdown filter for Photo Status
	  const PhotoStatusDropdownFilter = ({ column }) => {
		const { filterValue, setFilter } = column;
		
		return (
			<div>
				<FormControl
					as="select"
					className="form-control input-search"
					value={filterValue || ''}
					onChange={(e) => setFilter(e.target.value || undefined)}
				>
					<option value="">All</option>
					<option value="Uploaded">Uploaded</option>
					<option value="Pending">Pending</option>
				</FormControl>
			</div>
		);
	  };
	
	const COLUMNS = [
		{
			Header : 'Id',
			Footer : 'Id',
			accessor: 'RowNum',
			Filter: ColumnFilter,
			//disableFilters: true,
		},
		{
			Header : 'ItemName',
			Footer : 'ItemName',
			accessor: row => `${row.ItemName} - ${row.ItemCode}`,
			Filter: ColumnFilter,
		},
		{
			Header : 'Name',
			Footer : 'Name',
			accessor: 'Name',
			Filter: ColumnFilter,
		},
		{
			Header : 'Category',
			Footer : 'Category',
			accessor: 'CategoryName',
			Filter: ColumnFilter,
		},
		{
			Header : 'L1',
			Footer : 'L1',
			accessor: 'L1',
			Filter: ColumnFilter,
			Cell: ({ value }) => value || '-',
		},
		{
			Header : 'W1',
			Footer : 'W1',
			accessor: 'W1',
			Filter: ColumnFilter,
			Cell: ({ value }) => value || '-',
		},
		{
			Header : 'T1',
			Footer : 'T1',
			accessor: 'T1',
			Filter: ColumnFilter,
			Cell: ({ value }) => value || '-',
		},
		{
			Header : 'Qty1',
			Footer : 'Qty1',
			accessor: 'Qty1',
			Filter: ColumnFilter,
			Cell: ({ value }) => value || '-',
		},
	
		{
			Header : 'Is Active',
			Footer : 'Is Active',
			accessor: 'IsActive',
			Filter: IsActiveDropdownFilter,
			filter: (rows, id, filterValue) => {
				if (!filterValue || filterValue === '') return rows;
				const boolValue = filterValue === 'true';
				return rows.filter(row => {
					const rowValue = row.values[id];
					// Handle boolean comparison, including null/undefined as false
					return Boolean(rowValue) === boolValue;
				});
			},
			Cell: ({ row }) => (
				<Form.Check
					type="switch"
					id={`isActive-switch-${row.original.Id}`}
					checked={row.original.IsActive || false}
					onChange={(e) => {
						handleIsActiveChange(row.original.Id, e.target.checked);
					}}
				/>
			),
		},
		{
			Header : 'Photo Status',
			Footer : 'Photo Status',
			accessor: row => row.PhotoCount > 0 ? 'Uploaded' : 'Pending',
			Filter: PhotoStatusDropdownFilter,
			filter: (rows, id, filterValue) => {
				if (!filterValue || filterValue === '') return rows;
				return rows.filter(row => {
					const rowValue = row.values[id];
					return rowValue === filterValue;
				});
			},
			Cell: ({ row }) => (
				<span className={`badge ${row.original.PhotoCount > 0 ? 'bg-success' : 'bg-warning'}`}>
					{row.original.PhotoCount > 0 ? 'Uploaded' : 'Pending'}
				</span>
			),
		},
		{
			Header: "Machine Sequence",
			Cell: ({ row }) => (
			  <Button
				variant="info"
				size="sm"
				onClick={() => btnMachineSequenceOnClick(row.original)}
			  >
				Machine Sequence
			  </Button>
			),
		},
		  {
			Header: "Edit",
			Cell: ({ row }) => (
			  <Button
				variant="warning"
				size="sm"
				onClick={() => btnEditOnClick(row.original.Id)}
			  >
				Edit
			  </Button>
			),
		  },
		  {
			Header: "Delete",
			Cell: ({ row }) => (
			  <Button
				variant="danger"
				size="sm"
				onClick={() => btnDeleteOnClick(row.original.Id)}
			  >
				Delete
			  </Button>
			),
		  }, 

	]
	const columns = useMemo( () => COLUMNS, [] )
	const data = useMemo(() => {
		let filtered = gridData;
		if (filterItemCode) {
			filtered = (Array.isArray(filtered) ? filtered : []).filter(item => item.ItemCode === filterItemCode);
		}
		if (filterIsActive !== null && filterIsActive !== undefined) {
			filtered = (Array.isArray(filtered) ? filtered : []).filter(item => item.IsActive === filterIsActive);
		}
		return filtered;
	}, [gridData, filterItemCode, filterIsActive])
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
	
	const convertToBase64 = (file) => {
	  return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result);
		reader.onerror = (error) => reject(error);
	  });
	};

	const handleZipUpload = async (e) => {
	  const file = e.target.files[0];
	  if (!file) return;
	  
	  // Check if it's a zip file
	  if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
		setUploadError('Please upload a ZIP file');
		return;
	  }
	  
	  try {
		setIsUploading(true);
		setUploadError(null);
		setImageArray([]);
		
		// Extract ItemCode from zip file name (without extension)
		const itemCode = file.name.replace(/\.zip$/i, '');
		setState(prevState => ({
		  ...prevState,
		  ItemCode: itemCode
		}));
		
		const zipEntries = await JSZip.loadAsync(file);
		const imageFiles = [];
		
		// Process each file in the ZIP
		for (const [entryPath, zipEntry] of Object.entries(zipEntries.files)) {
		  // Skip directories and non-image files
		  if (zipEntry.dir || !zipEntry.name.match(/\.(jpe?g|png|gif|bmp)$/i)) continue;
		  
		  try {
			// Get the blob/binary data
			const content = await zipEntry.async('blob');
			
			// Convert to base64
			const base64Data = await convertToBase64(content);
			
			// Extract just the filename from the path (not the full path)
			const imageName = zipEntry.name.split('/').pop();
			
			// Remove the data URL prefix
			const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
			
			// Add to our array with the ACTUAL IMAGE FILENAME (not the ZIP filename)
			imageFiles.push({
			  Name: imageName, // This is the key change - using the individual image filename
			  ImageData: cleanBase64 // Store clean base64 string without prefix
			});
			
		  } catch (err) {
			console.error(`Error processing file ${zipEntry.name}:`, err);
		  }
		}
		
		if (imageFiles.length === 0) {
		  throw new Error('No valid image files found in the ZIP');
		}
		
		setImageArray(imageFiles);
		console.log('Processed Images:', imageFiles);
		
	  } catch (error) {
		setUploadError(`Error processing ZIP: ${error.message}`);
	  } finally {
		setIsUploading(false);
	  }
	};

	const handleSubmitZip = async () => {
	  if (!imageArray.length) {
		setUploadError('No images to submit');
		return;
	  }

	  setIsSaving(true);
	  setUploadError(null);
	  
	  // Progress tracking for individual images
	  let processedImages = 0;
	  let failedImages = [];
	  
	  // Process function to handle a single image
	  const processImage = async (image, imageIndex) => {
		const formData = new FormData();
		
		// Convert base64 back to binary blob
		const binaryString = atob(image.ImageData);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
		  bytes[i] = binaryString.charCodeAt(i);
		}
		const blob = new Blob([bytes], { type: 'image/jpeg' });
		
		// Append image as binary file for IFormFile
		formData.append("ImageData", blob, image.Name);
		formData.append("Name", image.Name);
		formData.append("ItemCode", State.ItemCode);
		formData.append("UserId", 1);
		formData.append("Count", imageArray.length);
		formData.append("Id", 0);
		await Fn_AddEditData(
			dispatch,
			setState,
			{ arguList: { id: 0, formData } },
			API_URL_Update,
			true,
			"memberid"
		  );
		try {
		  // First call with Id = 0
		 
		  await Fn_AddEditData(
			dispatch,
			setState,
			{ arguList: { id: 0, formData } },
			API_URL_SAVE,
			true,
			"memberid"
		  );

		  // Second call with Id = 1
		  formData.set("Id", 1);
		  await Fn_AddEditData(
			dispatch,
			setState,
			{ arguList: { id: 0, formData } },
			API_URL_Update,
			true,
			"memberid"
		  );
		  
		  // Update processed count on success
		  processedImages++;
		  return true;
		} catch (error) {
		  console.error(`Error saving image ${imageIndex + 1} (${image.Name}):`, error);
		  return false;
		}
	  };
	  
	  try {
		// Process each image individually
		for (let i = 0; i < imageArray.length; i++) {
		  const image = imageArray[i];
		  
		  const success = await processImage(image, i);
		  if (!success) {
			failedImages.push({ index: i, image: image });
		  }
		  
		  // Update progress state for individual image processing
		  setState({
			saveProgress: {
			  current: i + 1,
			  total: imageArray.length,
			  processed: processedImages,
			  totalImages: imageArray.length,
			  percentComplete: Math.round(((i + 1) / imageArray.length) * 100),
			  currentImageName: image.Name,
			  retrying: false
			}
		  });
		}
		
		// Retry pass: attempt to process failed images
		if (failedImages.length > 0) {
		  setState({
			saveProgress: {
			  current: imageArray.length,
			  total: imageArray.length,
			  processed: processedImages,
			  totalImages: imageArray.length,
			  percentComplete: 100,
			  retrying: true,
			  retriesTotal: failedImages.length,
			  retriesCurrent: 0
			}
		  });
		  
		  const originalFailedCount = failedImages.length;
		  const retryImages = [...failedImages];
		  failedImages = [];
		  
		  for (let i = 0; i < retryImages.length; i++) {
			const { index, image } = retryImages[i];
			
			// Update retry progress
			setState({
			  saveProgress: {
				current: imageArray.length,
				total: imageArray.length,
				processed: processedImages,
				totalImages: imageArray.length,
				percentComplete: 100,
				retrying: true,
				retriesCurrent: i + 1,
				retriesTotal: originalFailedCount,
				retryPercentComplete: Math.round(((i + 1) / originalFailedCount) * 100),
				currentImageName: image.Name
			  }
			});
			
			const success = await processImage(image, index);
			if (!success) {
			  failedImages.push({ index, image });
			}
		  }
		}
		
		// Final status message
		const finalFailedCount = failedImages.length;
		let successMessage;
		
		if (finalFailedCount === 0) {
		  successMessage = `Successfully saved all ${imageArray.length} images`;
		} else {
		  successMessage = `Saved ${processedImages} out of ${imageArray.length} images. ${finalFailedCount} image(s) could not be saved after retry.`;
		}
		
		alert(successMessage);
		setImageArray([]);
		
		// Clear the file input
		const fileInput = document.querySelector('input[type="file"]');
		if (fileInput) {
		  fileInput.value = '';
		}
		
		// Refresh grid data
		await Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
		
	  } catch (error) {
		setUploadError('Error in image processing: ' + error.message);
	  } finally {
		setIsSaving(false);
		// Reset progress
		setState({
		  saveProgress: null
		});
	  }
	};
	
		return(
		<Container fluid className={`page-content ${isModalView ? 'p-0' : ''}`}>
			{!isModalView && (
				<Row className="mb-3 align-items-center">
					<Col md="2">
						<h4 className="page-title mb-0" style={{fontFamily:'Poppins'}}>Component Master</h4>
					</Col>
					<Col md="2">
						<label htmlFor="fileInput" className="form-label mb-0 small">Upload Images Zip</label>
					</Col>
					<Col md="3">
						<div className="d-flex align-items-center">
							<FormControl
								type="file"
								accept=".zip"
								onChange={handleZipUpload}
								className="me-2"
								size="sm"
								disabled={isUploading || isSaving}
							/>
							{isUploading && (
								<div className="spinner-border spinner-border-sm text-primary" role="status">
									<span className="visually-hidden">Loading...</span>
								</div>
							)}
						</div>
					</Col>
					<Col md="2">
						{imageArray.length > 0 && (
							<Button
								variant="primary"
								size="sm"
								onClick={handleSubmitZip}
								disabled={isSaving || isUploading}
								className="w-100"
							>
								{isSaving ? (
									<>
										<span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
										Saving...
									</>
								) : (
									'Submit Images'
								)}
							</Button>
						)}
					</Col>
					<Col md="2">
						<Button
							type="button"
							onClick={btnAddOnClick}
							variant="success"
							size="sm"
							className="w-100"
						>
							<i className="fas fa-plus me-1"></i>Add New
						</Button>
					</Col>
				</Row>
			)}
			
			{imageArray.length > 0 && (
				<Row className="mb-2">
					<Col md="12">
						<span className="badge bg-success">
							{imageArray.length} images processed
						</span>
					</Col>
				</Row>
			)}
			
			{uploadError && (
				<Row className="mb-2">
					<Col md="12">
						<div className="alert alert-danger p-2 small">
							{uploadError}
						</div>
					</Col>
				</Row>
			)}
			
			<Row className="mb-2">
				<Col md="12">
					<GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
				</Col>
			</Row>
			<div className="card">
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
			{/* Progress Indicator */}
			{isSaving && state.saveProgress && (
			  <div className="mt-3">
				{state.saveProgress.retrying ? (
				  <>
					<div className="d-flex justify-content-between mb-1">
					  <span className="text-warning">
						<i className="fa fa-exclamation-triangle mr-1"></i>
						Retrying failed image: {state.saveProgress.currentImageName}
					  </span>
					  <span>{state.saveProgress.retryPercentComplete}% Complete</span>
					</div>
					<div className="progress">
					  <div 
						className="progress-bar progress-bar-striped progress-bar-animated bg-warning" 
						role="progressbar" 
						style={{ width: `${state.saveProgress.retryPercentComplete}%` }}
						aria-valuenow={state.saveProgress.retryPercentComplete} 
						aria-valuemin="0" 
						aria-valuemax="100"
					  ></div>
					</div>
					<div className="text-center mt-1 small">
					  Retrying {state.saveProgress.retriesCurrent} of {state.saveProgress.retriesTotal} failed images
					</div>
				  </>
				) : (
				  <>
					<div className="d-flex justify-content-between mb-1">
					  <span>Uploading image: {state.saveProgress.currentImageName}</span>
					  <span>{state.saveProgress.percentComplete}% Complete</span>
					</div>
					<div className="progress">
					  <div 
						className="progress-bar progress-bar-striped progress-bar-animated" 
						role="progressbar" 
						style={{ width: `${state.saveProgress.percentComplete}%` }}
						aria-valuenow={state.saveProgress.percentComplete} 
						aria-valuemin="0" 
						aria-valuemax="100"
					  ></div>
					</div>
					<div className="text-center mt-1 small">
					  Processed {state.saveProgress.current} of {state.saveProgress.total} images
					</div>
				  </>
				)}
			  </div>
			)}

			{/* Machine Sequence Modal */}
			<Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Machine Sequence</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{componentInfo && (
						<div className="mb-3">
							<p className="mb-1"><strong>Component Name:</strong> {componentInfo.Name}</p>
							<p className="mb-0"><strong>Item:</strong> {componentInfo.ItemName} - {componentInfo.ItemCode}</p>
						</div>
					)}
					<div>
						{modalData.length === 0 && (
							<div 
								className="text-center mb-3 p-4 border rounded"
								style={{
									borderColor: tableBorderColor,
									color: tableTextColor,
									backgroundColor: tableBgColor
								}}
							>
								<p className="mb-3">No machine sequence found.</p>
								<Button
									variant="primary"
									size="sm"
									onClick={() => handleAddMachineRow(-1)}
								>
									+ Add Machine
								</Button>
							</div>
						)}
						{modalData.length > 0 && (
							modalData.map((item, index) => (
								<div 
									key={index} 
									className="mb-3" 
									draggable
									onDragStart={(e) => handleDragStart(e, index)}
									onDragOver={handleDragOver}
									onDrop={(e) => handleDrop(e, index)}
									onDragEnd={handleDragEnd}
									style={{
										padding: '10px',
										borderBottom: `1px solid ${tableBorderColor}`,
										color: tableTextColor,
										cursor: 'move',
										opacity: draggedIndex === index ? 0.5 : 1
									}}
								>
									<div className="d-flex align-items-center">
										<span className="me-3" style={{ minWidth: '50px', fontWeight: 'bold' }}>
											{item.Series}.
										</span>
										<FormControl
											as="select"
											value={item.F_MachineMaster || ''}
											onChange={(e) => {
												const value = e.target.value;
												setModalData((prev) => {
													const updatedData = [...prev];
													updatedData[index] = {
														...updatedData[index],
														F_MachineMaster: value ? parseInt(value, 10) : '',
													};
													return updatedData;
												});
											}}
											style={{
												backgroundColor: tableBgColor,
												color: tableTextColor,
												borderColor: tableBorderColor,
												flex: 1
											}}
										>
											<option value="">Select Machine</option>
											{State.MachineMaster && State.MachineMaster.map((machine) => (
												<option key={machine.Id} value={machine.Id}>
													{machine.Name}
												</option>
											))}
										</FormControl>
										<div className="ms-3 d-flex gap-2">
											<Button
												variant="outline-danger"
												size="m"
												onClick={() => handleRemoveMachineRow(index)}
												disabled={modalData.length <= 1}
											>
												&times;
											</Button>
											<Button
												variant="outline-primary"
												size="m"
												onClick={() => handleAddMachineRow(index)}
											>
												+
											</Button>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</Modal.Body>
				<Modal.Footer>
					<Button 
						variant="primary" 
						onClick={handleSaveMachineSequence}
					>
						Save
					</Button>
					<Button variant="secondary" onClick={() => setShowModal(false)}>
						Close
					</Button>
				</Modal.Footer>
			</Modal>
		</Container>
	)
}

export default PageList_ComponentMaster;