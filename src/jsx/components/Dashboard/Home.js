import React,{useContext, useEffect, useState, useMemo} from 'react';
import {Link} from 'react-router-dom';
import loadable from "@loadable/component";
import pMinDelay from "p-min-delay";
import { ThemeContext } from "../../../context/ThemeContext";
import {JuiceIcon, DollerIcon, UserIcon} from '../Lezato/Home/SvgIcons/SvgIcons';
import DonutChart from '../Lezato/Home/DonutChart';
import DailyTrending from '../Lezato/Home/DailyTrending';
import TrandingBlog from '../Lezato/Home/TrandingBlog';
import CustomerMap from '../Lezato/Home/CustomerMap';
import CustomersBlog from '../Lezato/Home/CustomersBlog';
import DeliveryMaps from '../Lezato/Home/DeliveryMaps';
import {  Fn_FillListData, Fn_GetReport } from "../../../store/Functions"
import { useDispatch } from "react-redux";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const RevenuChart = loadable(() =>
	pMinDelay(import("../Lezato/Home/RevenuChart"), 1000)
);

const cardBlog = [
	{title:'Total Job Cards', Numbers:'100', 		Chartvalue: 60,	Icons: <JuiceIcon />  },
	{title:'Running Job Cards', Numbers:'50', 	Chartvalue: 80,	Icons: <DollerIcon /> },
	{title:'Pending Order', Numbers:'100', 		Chartvalue: 60,	Icons: <DollerIcon /> },
	{title:'Total Orders', Numbers:'200',  	Chartvalue: 70,	Icons: <UserIcon /> },
];

const Home = () => {
	const [gridData, setGridData] = useState([]);
	const [loading, setLoading] = useState(true);
	const API_URL_SAVE = "GetOverallTaskCompletion/0/token";
	const { changeBackground, background } = useContext(ThemeContext);
	const API_URL = `Masters/0/token/McqMasterL`;
	const dispatch = useDispatch();

	useEffect(() => {
		const fetchData = async () => {
			try {
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
				console.log("Data fetching completed");
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		};

		fetchData();
	}, [dispatch]);

	const chartData = {
		labels: ['Not Started', 'Started', 'Completed'],
		datasets: [
			{
				label: 'Container Status (%)',
				data: gridData && gridData.length > 0 && gridData[0] ? [
					gridData[0].NotStartedPercent || 0,
					gridData[0].StartedPercent || 0,
					gridData[0].CompletedPercent || 0
				] : [0, 0, 0],
				backgroundColor: [
					'rgba(255, 99, 132, 0.8)',    // Red for Not Started
					'rgba(255, 206, 86, 0.8)',    // Yellow for Started
					'rgba(75, 192, 192, 0.8)',    // Green for Completed
				],
				borderColor: [
					'rgba(255, 99, 132, 1)',
					'rgba(255, 206, 86, 1)',
					'rgba(75, 192, 192, 1)',
				],
				borderWidth: 1,
			},
		],
	};

	const options = {
		responsive: true,
		plugins: {
			legend: {
				position: 'top',
			},
			title: {
				display: true,
				text: 'Container Status Overview',
				font: {
					size: 16
				}
			},
		},
		scales: {
			y: {
				beginAtZero: true,
				max: 100,
				title: {
					display: true,
					text: 'Percentage (%)'
				}
			}
		}
	};

	return(
		<>
			<div className="mb-sm-4 d-flex flex-wrap align-items-center text-head">
				<h2 className="mb-3 me-auto">Dashboard</h2>
				<div>
					<ol className="breadcrumb">
						<li className="breadcrumb-item active"><Link to={"#"}>Dashboard</Link></li>
						<li className="breadcrumb-item"><Link to={"#"}>Dashboard</Link></li>
					</ol>
				</div>
			</div>	
			<div className="row">
				{/* <div className="col-xl-6">
					<div className="row">
						{cardBlog.map((data,index)=>(
							<div className="col-xl-6 col-sm-6" key={index}>
								<div className="card">
									<div className="card-body d-flex align-items-center justify-content-between">
										<div className="menu">
											<span className="font-w500 fs-16 d-block mb-2">{data.title}</span>
											<h2>{data.Numbers}</h2>
										</div>	
										<div className="d-inline-block position-relative donut-chart-sale">
											<DonutChart value={data.Chartvalue} backgroundColor="rgba(98, 79, 209,1)"
												backgroundColor2= "rgba(247, 245, 255)"
											/>
										</div>
									</div>
								</div>
							</div>
						))}						
					</div>	
				</div>	 */}
				{/* <div className="col-xl-6">
					<div className="card">
						<div className="card-header border-0 flex-wrap pb-0">
							<div className="mb-sm-0 mb-2">	
								<h4 className="fs-20">Today's Jobcards</h4>
								<span></span>
							</div>	
							<div>
								<h2 className="font-w700 mb-0">240</h2>	
							<p className="mb-0 font-w700"><span className="text-success">0.5% </span>than last day</p>
							</div>
						</div>
						<div className="card-body py-0">
							<RevenuChart />
						</div>
					</div>
				</div>
				<div className="col-xl-3 col-xxl-4">
					<div className="row">
						<div className="col-xl-12">
							<div className="card">
								<div className="card-header border-0">
									<div>
										<h4 className="fs-20 mb-1">Important Updates</h4>
										<span></span>
									</div>	
								</div>
								<DailyTrending />								
							</div>
						</div>
					</div>
				</div> */}
				<div className="col-xl-12">
					<div className="card">
						<div className="card-header border-0">
							<h4 className="fs-20">Containers Status Overview</h4>
						</div>
						<div className="card-body">
							<div style={{ height: '400px' }}>
								<Bar data={chartData} options={options} />
							</div>
							{gridData && gridData.length > 0 && gridData[0] && (
								<div className="row mt-4">
									<div className="col-md-4">
										<div className="alert alert-danger">
											<strong>Not Started:</strong> {(gridData[0].NotStartedPercent || 0).toFixed(2)}%
										</div>
									</div>
									<div className="col-md-4">
										<div className="alert alert-warning">
											<strong>Started:</strong> {(gridData[0].StartedPercent || 0).toFixed(2)}%
										</div>
									</div>
									<div className="col-md-4">
										<div className="alert alert-success">
											<strong>Completed:</strong> {(gridData[0].CompletedPercent || 0).toFixed(2)}%
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>	
		</>
	)
}
export default Home;