import React,{ useEffect, useMemo, useState } from 'react';
import { useTable, useGlobalFilter, useFilters, usePagination } from 'react-table';
import { Row, Col, Button } from "react-bootstrap";
import { GlobalFilter } from '../components/table/FilteringTable/GlobalFilter'; 
//import './table.css';
import '../components/table/FilteringTable/filtering.css';
import { ColumnFilter, SelectColumnFilter } from '../components/table/FilteringTable/ColumnFilter';
import { useNavigate } from 'react-router-dom';
import { Container } from 'reactstrap';
import { useDispatch } from 'react-redux';
import { Fn_FillListData } from '../../store/Functions';
import { API_WEB_URLS } from '../../constants/constAPI';

export const PageList_MachineMaster = () => {
	const [gridData, setGridData] = useState([]);
	const navigate = useNavigate();
	const rtPage_Add = "/AddMachine";
	const rtPage_Edit = "/AddMachine";
    const API_URL = API_WEB_URLS.MASTER + "/0/token/MachineMaster";
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    useEffect(() => {
		const fetchData = async () => {
		  console.log('useEffect running');
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
			Header : 'MachineNo',
			Footer : 'MachineNo',
			accessor: 'MachineNo',
			Filter: ColumnFilter,
		},
		{
			Header : 'Name',
			Footer : 'Name',
			accessor: 'Name',
			Filter: ColumnFilter,
		},
		{
			Header : 'Machine Type',
			Footer : 'Machine Type',
			accessor: 'MachineType',
			Filter: SelectColumnFilter,
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
			
			<Row className="mb-3 align-items-center">
				<Col md="6">
					<h4 className="page-title mb-0" style={{fontFamily:'Poppins'}}>Machine Master</h4>
				</Col>
				<Col md="3" className="ms-auto">
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
		</Container>
	)
}

export default PageList_MachineMaster;