import React,{ useEffect, useMemo, useState } from 'react';
import PageTitle from "../layouts/PageTitle";
import { useTable, useGlobalFilter, useFilters, usePagination } from 'react-table';
import MOCK_DATA from '../components/table/FilteringTable/MOCK_DATA_2.json';
import { Row, Col, Button, FormControl, Table, Spinner } from "react-bootstrap";
import { GlobalFilter } from '../components/table/FilteringTable/GlobalFilter';
import Select from 'react-select'; 
//import './table.css';
import '../components/table/FilteringTable/filtering.css';
import {ColumnFilter } from '../components/table/FilteringTable/ColumnFilter';
import {DateFilter } from '../components/table/FilteringTable/DateFilter';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { API_WEB_URLS } from '../../constants/constAPI';
import { Fn_FillListData, Fn_GetReport } from '../../store/Functions';

export const PageList_ComponentMachineReport = () => {
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
	const API_URL = `${API_WEB_URLS.MASTER}/0/token/Items`;
	const API_URLReport = 'MachineComponentReport/0/token';
	const rtPage_Add = "/AddComponent";
	const rtPage_Edit = "/AddComponent";
	const [F_ItemMaster , setItemMaster]  =  useState(0);

	const generateColumns = (data) => {
		if (!data || data.length === 0) return [];
		
		const obj =  Object.keys(data[0]).map((key) => ({
		  Header: key,
		  Footer: key,
		  accessor: key,
		  Filter: ColumnFilter, // Add your filter function here if needed
		}));
		console.log(data,obj);
		
		
		return obj
	  };

	
	useEffect(() => {
		const fetchData = async () => {
		  setLoading(true);
		  Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
		  setLoading(false);
		};
	
		fetchData();
	  }, [dispatch, API_URL]);
	
	  const btnAddOnClick = async() => {

		let vformData = new FormData();
    	vformData.append("Id", F_ItemMaster);
	
		
    await Fn_GetReport(dispatch,setGridData,"tenderData", API_URLReport, { arguList: { id: 0, formData: vformData } }  , true);

		//  navigate(rtPage_Add, { state: { Id: 0 } });
	  };
	
	  const btnEditOnClick = (Id) => {
		navigate(rtPage_Edit, { state: { Id } });
	  };

	
  const handleChange = (selectedOption) => {
    setItemMaster(selectedOption ? selectedOption.value : 0);
  }

	// Transform FillArray to react-select options format
	const itemOptions = useMemo(() => {
		return State.FillArray.length > 0 
			? State.FillArray.map((option) => ({
				value: option.Id,
				label: option.ItemCode ? `${option.Name} - ${option.ItemCode}` : option.Name
			}))
			: [];
	}, [State.FillArray]);

	// Find selected option based on F_ItemMaster
	const selectedItem = useMemo(() => {
		if (!F_ItemMaster || State.FillArray.length === 0) return null;
		const found = State.FillArray.find(opt => opt.Id === F_ItemMaster);
		return found ? { 
			value: found.Id, 
			label: found.ItemCode ? `${found.Name} - ${found.ItemCode}` : found.Name 
		} : null;
	}, [F_ItemMaster, State.FillArray]);
	
	  const COLUMNS = generateColumns(gridData|| []);

	  const columns = useMemo(() => generateColumns(gridData || []), [gridData]);

	const data = useMemo( () => gridData, [gridData] )
	const tableInstance = useTable(
		{
		  columns,
		  data,
		  initialState: { pageIndex: 0 }
		},
		useFilters,
		useGlobalFilter,
		usePagination
	  );
	  
	
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
		<PageTitle activeMenu="Filtering" motherMenu="Table" />
		
		<Row className="mb-3 align-items-center">
			<Col md="2">
				<h4 className="page-title mb-0" style={{fontFamily:'Poppins'}}>Component Report</h4>
			</Col>
			<Col md="3">
				<div>
					<label className="form-label mb-1 small">Item</label>
					<Select
						isSearchable
						name="F_ItemMaster"
						options={itemOptions}
						value={selectedItem}
						onChange={handleChange}
						placeholder="Select Item"
						styles={{
							control: (base) => ({
								...base,
								minHeight: 31,
								fontSize: '14px',
							}),
							menu: (base) => ({
								...base,
								zIndex: 9999,
							}),
						}}
						classNamePrefix="react-select"
					/>
				</div>
			</Col>
			<Col md="2">
				<GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
			</Col>
			<Col md="1">
				<Button
					type="button"
					onClick={btnAddOnClick}
					variant="success"
					size="sm"
				>
					View
				</Button>
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
		</>
	)
	
}
export default PageList_ComponentMachineReport;