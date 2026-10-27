import React, { useEffect, useMemo, useState } from 'react';
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
import usePagePermissions from '../../helpers/usePagePermissions';
import axios from 'axios';
import swal from 'sweetalert';

export const PageList_MachineMaster = () => {
	const [gridData, setGridData] = useState([]);
	const [categoryList, setCategoryList] = useState([]);
	const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | INACTIVE
	const [togglingId, setTogglingId] = useState(null);
	const navigate = useNavigate();
	const rtPage_Add = "/AddMachine";
	const rtPage_Edit = "/AddMachine";
    const API_URL = API_WEB_URLS.MASTER + "/0/token/MachineMaster";
    const API_URL_Category = API_WEB_URLS.MASTER + "/0/token/Category/Id/0";
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const { canAdd, canEdit } = usePagePermissions('MachineMaster');

    useEffect(() => {
		const fetchData = async () => {
		  console.log('useEffect running');
		  setLoading(true);
		   Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
		   Fn_FillListData(dispatch, setCategoryList, "gridData", API_URL_Category);
		  setLoading(false);
		};
	
		fetchData();
	  }, [dispatch, API_URL, API_URL_Category]);

	  const btnAddOnClick = () => {
		 navigate(rtPage_Add, { state: { Id: 0 } });
	  };
	
	  const btnEditOnClick = (Id) => {
		navigate(rtPage_Edit, { state: { Id } });
	  };

	  const handleToggleStatus = async (machine) => {
		const currentIsActive = machine.IsActive !== false && machine.IsActive !== 0 && machine.IsActive !== "0";
		const newStatusText = currentIsActive ? "INACTIVE (Band)" : "ACTIVE";

		const willChange = await swal({
			title: `Mark Machine as ${newStatusText}?`,
			text: `Kya aap "${machine.Name}" ko ${newStatusText} karna chahte hain?`,
			icon: "warning",
			buttons: ["Cancel", "Yes, Update Status"],
			dangerMode: currentIsActive,
		});
		if (!willChange) return;

		setTogglingId(machine.Id);
		try {
			const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
			const userId = authUser?.id || authUser?.ID || "0";
			const token = authUser?.jwtToken || authUser?.token || authUser?.UserToken || authUser?.UserTokenNew || "token";

			const toggleUrl = `${API_WEB_URLS.BASE}MachineMaster/ToggleStatus/${userId}/${token}/${machine.Id}`;
			const response = await axios.post(toggleUrl, {}, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.data && response.data.Success) {
				setGridData(prev => {
					const list = Array.isArray(prev) ? prev : (prev?.dataList || prev?.response || []);
					return list.map(item => {
						if (item.Id === machine.Id) {
							return { ...item, IsActive: !currentIsActive };
						}
						return item;
					});
				});
				swal("Updated!", response.data.Message || `Machine status updated to ${newStatusText}`, "success");
			} else {
				alert(response.data?.Message || "Failed to update status");
			}
		} catch (err) {
			console.error("Toggle error:", err);
			alert(err?.response?.data?.Message || err.message || "Error updating machine status");
		} finally {
			setTogglingId(null);
		}
	  };

	const safeGridData = useMemo(() => {
		return Array.isArray(gridData) ? gridData : (gridData?.dataList || gridData?.response || []);
	}, [gridData]);

	const safeCategoryList = useMemo(() => {
		return Array.isArray(categoryList) ? categoryList : (categoryList?.dataList || categoryList?.response || []);
	}, [categoryList]);

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
			accessor: 'F_MachineTypeMaster',
			Filter: ColumnFilter,
			Cell: ({ row }) => {
				const cat = safeCategoryList.find(c => c.Id === row.original.F_MachineTypeMaster);
				return cat ? cat.Name : (row.original.MachineType || '-');
			},
		},
		{
			Header: 'Status',
			Footer: 'Status',
			accessor: 'IsActive',
			disableFilters: true,
			Cell: ({ row }) => {
				const isActive = row.original.IsActive !== false && row.original.IsActive !== 0 && row.original.IsActive !== "0";
				const isToggling = togglingId === row.original.Id;
				return (
					<Button
						variant={isActive ? "success" : "danger"}
						size="sm"
						className="d-inline-flex align-items-center justify-content-center px-3 py-1 text-white shadow-sm"
						style={{ 
							borderRadius: '20px', 
							fontSize: '0.8rem', 
							fontWeight: '600', 
							minWidth: '110px',
							cursor: canEdit ? 'pointer' : 'default',
							opacity: isToggling ? 0.7 : 1
						}}
						disabled={!canEdit || isToggling}
						onClick={() => canEdit && handleToggleStatus(row.original)}
						title={canEdit ? (isActive ? "Machine is ACTIVE. Click to mark INACTIVE (Band)" : "Machine is BAND. Click to mark ACTIVE") : ""}
					>
						{isToggling ? (
							<span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
						) : isActive ? (
							<>
								<i className="fas fa-check-circle me-1"></i> Active
							</>
						) : (
							<>
								<i className="fas fa-ban me-1"></i> Band / Inactive
							</>
						)}
					</Button>
				);
			}
		},
		{
			Header: "Edit",
			disableFilters: true,
			Cell: ({ row }) => (
				canEdit ? (
					<Button
						variant="warning"
						size="sm"
						onClick={() => btnEditOnClick(row.original.Id)}
					>
						Edit
					</Button>
				) : null
			),
		}, 
	];

	const columns = useMemo( () => COLUMNS, [safeCategoryList, canEdit, togglingId] );

	const activeCount = useMemo(() => 
		safeGridData.filter(m => m.IsActive !== false && m.IsActive !== 0 && m.IsActive !== "0").length, 
		[safeGridData]
	);

	const inactiveCount = useMemo(() => 
		safeGridData.filter(m => m.IsActive === false || m.IsActive === 0 || m.IsActive === "0").length, 
		[safeGridData]
	);

	const filteredData = useMemo(() => {
		if (statusFilter === "ACTIVE") {
			return safeGridData.filter(m => m.IsActive !== false && m.IsActive !== 0 && m.IsActive !== "0");
		}
		if (statusFilter === "INACTIVE") {
			return safeGridData.filter(m => m.IsActive === false || m.IsActive === 0 || m.IsActive === "0");
		}
		return safeGridData;
	}, [safeGridData, statusFilter]);

	const data = useMemo( () => filteredData, [filteredData] );

	const tableInstance = useTable({
		columns,
		data,	
		initialState : {pageIndex : 0}
	}, useFilters, useGlobalFilter, usePagination);
	
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
	} = tableInstance;
	
	const {globalFilter, pageIndex} = state;
	
	return(
		<Container fluid className="page-content">
			<Row className="mb-3 align-items-center">
				<Col md="6">
					<h4 className="page-title mb-0" style={{fontFamily:'Poppins'}}>Machine Master</h4>
					<small className="text-muted">Total: {safeGridData.length} | Active: {activeCount} | Band/Inactive: {inactiveCount}</small>
				</Col>
				<Col md="3" className="ms-auto">
					{canAdd && (
						<Button
							type="button"
							onClick={btnAddOnClick}
							variant="success"
							size="sm"
							className="w-100"
						>
							<i className="fas fa-plus me-1"></i>Add New
						</Button>
					)}
				</Col>
			</Row>

			{/* Filter Tabs / Quick Toggle */}
			<div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
				<span className="fw-bold me-1 text-dark" style={{ fontSize: '0.9rem' }}>Status Filter:</span>
				<Button
					variant={statusFilter === "ALL" ? "primary" : "outline-secondary"}
					size="sm"
					className="rounded-pill px-3"
					onClick={() => setStatusFilter("ALL")}
				>
					All ({safeGridData.length})
				</Button>
				<Button
					variant={statusFilter === "ACTIVE" ? "success" : "outline-success"}
					size="sm"
					className="rounded-pill px-3"
					onClick={() => setStatusFilter("ACTIVE")}
				>
					<i className="fas fa-check-circle me-1"></i> Active Only ({activeCount})
				</Button>
				<Button
					variant={statusFilter === "INACTIVE" ? "danger" : "outline-danger"}
					size="sm"
					className="rounded-pill px-3"
					onClick={() => setStatusFilter("INACTIVE")}
				>
					<i className="fas fa-ban me-1"></i> Band / Inactive Only ({inactiveCount})
				</Button>
			</div>

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