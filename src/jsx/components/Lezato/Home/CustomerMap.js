import React from 'react';
import {Link} from 'react-router-dom';
import {Dropdown} from 'react-bootstrap';
import ReactApexChart from "react-apexcharts";
//import loadable from "@loadable/component";
//import pMinDelay from "p-min-delay";

/* const TimeLineApexChart = loadable(() =>
	pMinDelay(import("./TimeLineApexChart"), 1000)
);
const TimeLineApexChart2 = loadable(() =>
	pMinDelay(import("./TimeLineApexChart2"), 1000)
); */


class CustomerMap extends React.Component{
	constructor(props) {
		super(props);
		this.state = {
			series: [
				{
					name: "New Clients",
					data: [300, 450, 200, 600, 400, 350, 410, 470, 480, 700, 500, 400, 400, 600, 250, 250, 500, 450, 300, 400, 200]
				}
			],
			options: {
				chart: {
					height: 270,
					type: "bar",
					toolbar: {
						show: false,
					},
					sparkline: {
						//enabled: true
					},
					offsetX: -10,
				},
				plotOptions: {
					bar: {
						columnWidth: "20%",
						borderRadius: 5,
						colors: {
							backgroundBarOpacity: 1,
							backgroundBarRadius: 5,
						},

					},
					distributed: true				
				},
				colors:['var(--primary)'],
				grid: {
					show: true,
					strokeDashArray: 3,
					borderColor: '#9B9B9B',
				
				
				},
				legend: {
					show: false
				},
				fill: {
				  opacity: 1
				},
				dataLabels: {
					enabled: false,
					colors: ['#000'],
					dropShadow: {
					  enabled: true,
					  top: 1,
					  left: 1,
					  blur: 1,
					  opacity: 1
				  }
				},
				stroke:{
					 show: true,	
					 curve: 'smooth',
					 lineCap: 'rounded',
				},
				xaxis: {
				 categories: ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28'],
				  labels: {
				   style: {
					  colors: '#3E4954',
					  fontSize: '13px',
					  fontFamily: 'poppins',
					  fontWeight: 100,
					  cssClass: 'apexcharts-xaxis-label',
					},
				  },
				  crosshairs: {
					show: false,
				  },
				  axisBorder: {
					  show: false,
					},
				axisTicks:{
					  show: false,
				},
					
				},
				yaxis: {
				labels: {
				   style: {
					  colors: '#3E4954',
					  fontSize: '14px',
					   fontFamily: 'Poppins',
					  fontWeight: 100,
					  
					},
					formatter: function (y) {
					  return y.toFixed(0) + "";
					}
				  },
				},
				tooltip: {
					x: {
						show: true
					}
				},
				 responsive: [{
					breakpoint: 575,
					options: {
						chart: {
							height: 250,
						},
						series: [
							 {
								name: "New Clients",
								data: [300, 250, 600, 600, 400, 450, 310, 470, 480]
							}
						],
						xaxis: {
						categories: ['06', '07', '08', '09', '10', '11', '12', '13', '14'],
						}
					}
				 }]
			
			},
		};
	}
	onSeriesUpdate = (seriesData,event) =>{
		var navUl = [].slice.call(document.querySelectorAll('.nav-link'));
		navUl.forEach(el =>  el.classList.remove('active') );
		event.target.className = "nav-link active";
		this.setState({
			series:[{
				...this.state.series,
				data: seriesData
				
			}]
		});
	};
	
	render() {
		return(
			<>
				
					<div className="card">
						<div className="card-header border-0  flex-wrap">
							<div>
								<h4 className="fs-20 mb-1">Customer Map</h4>
								<span>Lorem ipsum dolor sit amet, consectetur</span>
							</div>	
							<div className="d-flex align-items-center">
								<div className="card-action coin-tabs mt-3 mt-sm-0">
									<ul className="nav nav-tabs" role="tablist">
										<li className="nav-item">
											<Link to={'#'} className="nav-link active" 
												onClick={this.onSeriesUpdate.bind(this, [300, 450, 200, 600, 400, 350, 410, 470, 480, 700, 500, 400, 400, 600, 250, 250, 500, 450, 300, 400, 200])}
											>
												Year
											</Link>
										</li>
										<li className="nav-item">
											<Link to={'#'}  className="nav-link" 
												onClick={this.onSeriesUpdate.bind(this, [400, 350, 410, 470, 480, 700, 500, 400, 400, 600, 250, 250, 500, 450, 300, 400, 200,300, 450, 200, 600])} >
												Monthly
											</Link>
										</li>
										<li className="nav-item">
											<Link to={'#'}  className="nav-link" 
												onClick={this.onSeriesUpdate.bind(this, [400, 400, 600, 250, 250, 500, 450, 300, 400, 350, 410, 470, 480, 700, 500, 400, 200,300, 450, 200, 600])} >
												Week
											</Link>
										</li>
									</ul>
								</div>
								<Dropdown className="dropdown custom-dropdown mb-0 ms-3">
									<Dropdown.Toggle as="div" className="btn sharp tp-btn dark-btn i-false">
										<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13C12.5523 13 13 12.5523 13 12Z" stroke="#2E2E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
											<path d="M6 12C6 11.4477 5.55228 11 5 11C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13C5.55228 13 6 12.5523 6 12Z" stroke="#2E2E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
											<path d="M20 12C20 11.4477 19.5523 11 19 11C18.4477 11 18 11.4477 18 12C18 12.5523 18.4477 13 19 13C19.5523 13 20 12.5523 20 12Z" stroke="#2E2E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
									</Dropdown.Toggle>
									<Dropdown.Menu className="dropdown-menu dropdown-menu-right">
										<Dropdown.Item eventKey="Monthly">Details</Dropdown.Item>
										<Dropdown.Item eventKey="Today" className="text-danger">Cancel</Dropdown.Item>
									</Dropdown.Menu>
								</Dropdown>
							</div>
						</div>
						<div className="card-body pb-2">
							<div id="chartTimeline1" className="chart-timeline">
								<div id="chart" >
									<ReactApexChart
									  options={this.state.options}
									  series={this.state.series}
									  type="bar"
									  height={270}
									/>
								</div>
							</div>
						</div>	
					</div>
				
			</>
		)
	}
}
export default CustomerMap;