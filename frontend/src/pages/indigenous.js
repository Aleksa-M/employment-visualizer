import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";
import { Line } from "react-chartjs-2";
import { useState, useRef, useEffect } from "react";

Chart.register(CategoryScale);
const BACKEND_PORT = process.env.PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${BACKEND_PORT}`;

export function Indigenous() {
    const [chartLabel, setChartLabel] = useState("chart label");
    const [chartYearSeries, setChartYearSeries] = useState([2023, 2024, 2025]);

    const [trendLabel, setChartText] = useState("trend label");
    const [trendData, setChartData] = useState([1, 2, 3]);

    const [chartTrends, setChartTrends] = useState({
        labels: chartYearSeries,
        datasets: [
            {
              label: trendLabel,
              data: trendData,
              borderWidth: 1,
            }
        ]
    });

    const [chartOptions, setChartOptions] = useState({
        plugins: {
            title: {
                display: true,
                text: chartLabel
            },
            legend: {
                display: true
            }
        }
    })

    const fetchChart = async () => {
        console.log("starting fetch")

        let header = {
            "Content-Type": "application/json"
        };
        let response = await fetch(`${BACKEND_URL}/get-indigenous-chart?start=5`, {
            headers: header
        }).catch((error) => {
            console.log(`ERROR: ${error}`);
            return;
        })
        let chart = await response.json();

        let trends = chart.trends;
        let dataSets = [];
        
        trends.forEach((trend) => {
            dataSets.push({
                label: trend.name,
                data: Object.values(trend.time_series),
                borderWidth: 1
            })
        })


        let years = Object.keys(trends[0].time_series);

        setChartTrends({
            labels: years,
            datasets: dataSets
        });
    }

    return (
        <div className="chart-container">
            <h2 style={{ textAlign: "center" }}>Indigenous Trends</h2>
            <Line
                data={chartTrends}
                options={chartOptions}
            />
            <button onClick={fetchChart}>fetch chart</button>
        </div>
    );
}