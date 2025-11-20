import React,{ useEffect, useMemo, useState } from 'react';
import PageTitle from "../layouts/PageTitle";
import { useTable, useGlobalFilter, useFilters, usePagination } from 'react-table';
import MOCK_DATA from '../components/table/FilteringTable/MOCK_DATA_2.json';
import { Row, Col, Button, FormControl, Table, Spinner } from "react-bootstrap";
import { GlobalFilter } from '../components/table/FilteringTable/GlobalFilter'; 
//import './table.css';
import '../components/table/FilteringTable/filtering.css';
import {ColumnFilter } from '../components/table/FilteringTable/ColumnFilter';
import {DateFilter } from '../components/table/FilteringTable/DateFilter';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { API_WEB_URLS } from '../../constants/constAPI';
import { Fn_FillListData, Fn_AddEditData } from '../../store/Functions';
import JSZip from 'jszip';
import { Container } from 'reactstrap';

export const PageList_RejectionStore = () => {
	const [State, setState] = useState({
		id: 0,
		FillArray: [],
		formData: {},
		OtherDataScore: [],
		isProgress: true,
	  })
	const [gridData, setGridData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState(null);
	const [imageArray, setImageArray] = useState([]);
	const [isSaving, setIsSaving] = useState(false);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const API_URL = API_WEB_URLS.MASTER + "/0/token/VirtualWoodStoreh";
	const rtPage_Add = "/AddRejectionStore";
	const rtPage_Edit = "/AddRejectionStore";
	const API_URL_SAVE = "RejectionStore/0/token";


	
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
	
	const COLUMNS = [
		{
			Header : 'Sn',
			Footer : 'Sn',
			accessor: 'RowNum',
			Filter: ColumnFilter,
			//disableFilters: true,
		},
		{
			Header : 'Length',
			Footer : 'Length',
			accessor: 'Length',
			Filter: ColumnFilter,
		},
		{
			Header : 'Width',
			Footer : 'Width',
			accessor: 'Width',
			Filter: ColumnFilter,
		},
            {
                Header : 'Thick',
                Footer : 'Thick',
                accessor: 'Thick',
                Filter: ColumnFilter,
            },
            {
                Header : 'Quantity',
                Footer : 'Quantity',
                accessor: 'Quantity',
                Filter: ColumnFilter,
            },
            {
                Header : 'CFT_PerPiece',
                Footer : 'CFT_PerPiece',
                accessor: 'CFT_PerPiece',
                Filter: ColumnFilter,
            },
            {
                Header : 'Total_CFT',
                Footer : 'Total_CFT',
                accessor: 'Total_CFT',
                Filter: ColumnFilter,
            },

		//   {
		// 	Header: "Edit",
		// 	Cell: ({ row }) => (
		// 	  <Button
		// 		variant="warning"
		// 		size="sm"
		// 		onClick={() => btnEditOnClick(row.original.Id)}
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
		<Container fluid className="page-content">
			<PageTitle activeMenu="Filtering" motherMenu="Table" />
			
			<Row className="mb-3 align-items-center">
				<Col md="2">
					<h4 className="page-title mb-0" style={{fontFamily:'Poppins'}}>Rejection Store</h4>
				</Col>
			</Row>
		
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
			{/* Progress Indicator */}
			{isSaving && state.saveProgress && (
			  <div className="mt-3">
				{state.saveProgress.retrying ? (
				  <>
					<div className="d-flex justify-content-between mb-1">
					  <span className="text-warning">
						<i className="fa fa-exclamation-triangle mr-1"></i>
						Retrying failed batches...
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
					  Retrying {state.saveProgress.retriesCurrent} of {state.saveProgress.retriesTotal} failed batches
					</div>
				  </>
				) : (
				  <>
					<div className="d-flex justify-content-between mb-1">
					  <span>Saving images in batches...</span>
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
					  Processed {state.saveProgress.current} of {state.saveProgress.total} batches 
					  ({state.saveProgress.processed} of {state.saveProgress.totalImages} images)
					</div>
				  </>
				)}
			  </div>
			)}
		</Container>
	)
}

export default PageList_RejectionStore;