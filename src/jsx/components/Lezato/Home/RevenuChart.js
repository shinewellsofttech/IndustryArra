import React from "react";
import ReactApexChart from "react-apexcharts";

class RevenuChart extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			series: [{
				name: 'Net Profit',
				data: [20, 30, 20, 30, 20, 30, 20,30],
			}],
			options: {
				chart: {
					height: 230,
					type:'area',
					toolbar:{
						show:false
					}
				},
				colors:['var(--primary)'],
				dataLabels: {
				  enabled: false
				},
				stroke: {
				  show: true,
				  width: 4,
				  curve:'smooth',
				  colors:['var(--primary)'],
				},
				
				legend:{
					show:false
				},
				grid: {
					borderColor: '#eee',
					xaxis: {
						lines: {
							show: true
						}
					},   
					yaxis: {
						lines: {
							show: false
						}
					},  
				},
				markers: {
					shape: "circle",
				},
				yaxis: {
					labels: {
						offsetX:-12,
						style: {
							colors: '#787878',
							fontSize: '13px',
							fontFamily: 'Poppins',
							fontWeight: 400
							
						}
					},
				},
				xaxis: {
					categories: ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","",],
					labels:{
						style: {
							colors: '#787878',
							fontSize: '13px',
							fontFamily: 'Poppins',
							fontWeight: 400
						
						},
					}
				},
				fill:{
					type:"solid",
					opacity:0.1
				},
				tooltip: {
				  x: {
					format: 'dd/MM/yy HH:mm'
				  },
				},
			},
		};
	}
	render() {
		return (
			<div id="chart" >
				<ReactApexChart
				  options={this.state.options}
				  series={this.state.series}
				  type="area"
				  height={230}
				/>
			</div>
		);
	}
}

export default RevenuChart;