import React,{ useEffect, useMemo, useState, useCallback } from 'react';
import PageTitle from "../layouts/PageTitle";
import { useTable, useGlobalFilter, useFilters, usePagination } from 'react-table';
import MOCK_DATA from '../components/table/FilteringTable/MOCK_DATA_2.json';
import { Row, Col, Button, FormControl, Table, Spinner, Badge, Card } from "react-bootstrap";
import { GlobalFilter } from '../components/table/FilteringTable/GlobalFilter'; 
//import './table.css';
import '../components/table/FilteringTable/filtering.css';
import {ColumnFilter } from '../components/table/FilteringTable/ColumnFilter';
import {DateFilter } from '../components/table/FilteringTable/DateFilter';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { API_WEB_URLS } from '../../constants/constAPI';
import { Fn_AddEditData, Fn_FillListData, Fn_GetReport } from '../../store/Functions';
import XLSX from 'xlsx';

const ProcessStep = ({ status, label, isLast }) => {
	const getStatusDetails = (status) => {
		switch(status) {
			case 0:
				return {
					icon: '',
					statusClass: 'pending',
					statusText: 'Pending',
					lineClass: 'pending'
				};
			case 1:
				return {
					icon: '⟳',
					statusClass: 'started',
					statusText: 'Started',
					lineClass: 'started'
				};
			case 2:
				return {
					icon: '✓',
					statusClass: 'completed',
					statusText: 'Completed',
					lineClass: 'completed'
				};
			default:
				return {
					icon: '',
					statusClass: 'pending',
					statusText: 'Pending',
					lineClass: 'pending'
				};
		}
	};

	const statusDetails = getStatusDetails(status);

	return (
		<div className="process-step">
			<div className="step-content">
				<div className={`step-circle ${statusDetails.statusClass}`}>
					{statusDetails.icon}
				</div>
				<div className="step-label">
					{label}
					<div className="status-text">{statusDetails.statusText}</div>
				</div>
			</div>
			{!isLast && <div className={`step-line ${statusDetails.lineClass}`}></div>}
		</div>
	);
};

export const Report_ContainerWise = () => {
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
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const API_URL = API_WEB_URLS.MASTER + "/0/token/Items";

	const API_URL_SAVE = "GetTaskStatusReport/0/token";

	const formatDate = (dateString) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	useEffect(() => {
		const fetchData = async () => {
		  console.log('useEffect running');
		  setLoading(true);
          let vformData = new FormData();
          vformData.append("Id", 0);

          await Fn_GetReport(
              dispatch,
              setGridData,
              "tenderData",
              API_URL_SAVE,
              { arguList: { id: 0, formData: vformData } },
              true
          );
		  setLoading(false);
		};
	
		fetchData();
	  }, [dispatch, API_URL]);
	

	const calculateCompletedSteps = (item) => {
		return [
			item.WoodIssueStatus,
			item.PreCuttingStatus,
			item.MachiningStatus,
			item.MMTStatus,
			item.AssemblyStatus,
			item.SandingStatus,
			item.PolishStatus,
			item.FittingStatus,
			item.QcStatus
		].filter(status => status === 1).length;
	};

	return(
		<>
			<PageTitle activeMenu="Container Wise Report" motherMenu="Reports" />
			<div className="container-fluid">
				{loading ? (
					<div className="text-center p-5">
						<Spinner animation="border" role="status">
							<span className="visually-hidden">Loading...</span>
						</Spinner>
					</div>
				) : (
					<Row>
						{gridData.map((item, index) => {
							const completedSteps = calculateCompletedSteps(item);
							const totalSteps = 9; // Total number of steps
							return (
								<Col key={index} md={6} lg={4} className="mb-4">
									<Card className="h-100 shadow-sm">
										<Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
											<h5 className="mb-0">Container: {item.ContainerNumber}</h5>
											<Badge bg="light" text="dark" className="fs-6">
												{formatDate(item.InspectionDate)}
											</Badge>
										</Card.Header>
										<Card.Body>
											<div className="item-details mb-4">
												<h6 className="section-title">Item Details</h6>
												<div className="detail-item">
													<span className="detail-label">Item Name:</span>
													<span className="detail-value">{item.ItemName}</span>
												</div>
												<div className="detail-item">
													<span className="detail-label">Quantity:</span>
													<span className="detail-value">{item.Quantity}</span>
												</div>
											</div>
											<div className="process-flow-container">
												<h6 className="section-title mb-3">Production Status</h6>
												<div className="process-flow">
													<ProcessStep status={item.WoodIssueStatus} label="Wood Issue" />
													<ProcessStep status={item.PreCuttingStatus} label="Pre Cutting" />
													<ProcessStep status={item.MachiningStatus} label="Machining" />
													<ProcessStep status={item.MMTStatus} label="MMT" />
													<ProcessStep status={item.AssemblyStatus} label="Assembly" />
													<ProcessStep status={item.SandingStatus} label="Sanding" />
													<ProcessStep status={item.PolishStatus} label="Polish" />
													<ProcessStep status={item.FittingStatus} label="Fitting" />
													<ProcessStep status={item.QcStatus} label="QC" isLast={true} />
												</div>
											</div>
										</Card.Body>
									</Card>
								</Col>
							);
						})}
					</Row>
				)}
			</div>
			<style jsx>{`
				.process-flow-container {
					background: #f8f9fa;
					border-radius: 8px;
					padding: 20px;
					margin-top: 20px;
				}
				.process-flow {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 10px 0;
					overflow-x: auto;
					scrollbar-width: thin;
					scrollbar-color: #6c757d #f8f9fa;
				}
				.process-flow::-webkit-scrollbar {
					height: 6px;
				}
				.process-flow::-webkit-scrollbar-track {
					background: #f8f9fa;
				}
				.process-flow::-webkit-scrollbar-thumb {
					background-color: #6c757d;
					border-radius: 3px;
				}
				.process-step {
					display: flex;
					align-items: center;
					flex: 1;
					min-width: 100px;
				}
				.step-content {
					display: flex;
					flex-direction: column;
					align-items: center;
					position: relative;
				}
				.step-circle {
					width: 35px;
					height: 35px;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					background-color: #fff;
					border: 2px solid #dc3545;
					color: #fff;
					font-weight: bold;
					z-index: 1;
					box-shadow: 0 2px 4px rgba(0,0,0,0.1);
					transition: all 0.3s ease;
				}
				.step-circle.pending {
					background-color: #fff;
					border-color: #dc3545;
					color: #dc3545;
				}
				.step-circle.started {
					background-color: #ffc107;
					border-color: #ffc107;
					color: #fff;
				}
				.step-circle.completed {
					background-color: #28a745;
					border-color: #28a745;
					color: #fff;
				}
				.step-label {
					margin-top: 10px;
					font-size: 12px;
					text-align: center;
					color: #495057;
					font-weight: 500;
					white-space: nowrap;
				}
				.status-text {
					font-size: 11px;
					margin-top: 2px;
					color: #6c757d;
				}
				.step-line {
					flex: 1;
					height: 3px;
					background-color: #dc3545;
					margin: 0 5px;
					transition: all 0.3s ease;
				}
				.step-line.pending {
					background-color: #dc3545;
				}
				.step-line.started {
					background-color: #ffc107;
				}
				.step-line.completed {
					background-color: #28a745;
				}
				.card {
					transition: transform 0.2s, box-shadow 0.2s;
					border: none;
				}
				.card:hover {
					transform: translateY(-5px);
					box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
				}
				.section-title {
					color: #495057;
					font-weight: 600;
					margin-bottom: 15px;
					font-size: 1rem;
				}
				.item-details {
					padding: 15px;
					background: #fff;
					border-radius: 8px;
					box-shadow: 0 2px 4px rgba(0,0,0,0.05);
				}
				.detail-item {
					display: flex;
					justify-content: space-between;
					margin-bottom: 8px;
					padding: 8px 0;
					border-bottom: 1px solid #f0f0f0;
				}
				.detail-item:last-child {
					border-bottom: none;
					margin-bottom: 0;
				}
				.detail-label {
					color: #6c757d;
					font-weight: 500;
				}
				.detail-value {
					color: #212529;
					font-weight: 600;
				}
				.badge {
					padding: 8px 12px;
					font-weight: 500;
				}
			`}</style>
		</>
	)
}
export default Report_ContainerWise;