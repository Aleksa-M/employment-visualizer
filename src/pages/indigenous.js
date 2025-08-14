import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";
import { Line } from "react-chartjs-2";
import { useState, useEffect } from "react";
import { nameToIdentifier, identifierToName } from '../helpers';
import Canada from "@react-map/canada";


Chart.register(CategoryScale);
const BACKEND_PORT = process.env.PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${BACKEND_PORT}`;

export function Indigenous() {
    // ------------------------------------------------------------------------------------
    // STATES
    // ------------------------------------------------------------------------------------
    const [geography, setGeography] = useState("can");
    const [characteristic, setCharacteristic] = useState("employment-rate");

    const [start, setStart] = useState(4);
    const [latest, setLatest] = useState(0);

    const [identities, setIdentities] = useState([]);
    const [genders, setGenders] = useState([]);
    const [educations, setEducations] = useState([]);
    const [ages, setAges] = useState([]);

    const [chartTrends, setChartTrends] = useState({
        labels: [],
        datasets: []
    });

    const [chartOptions, setChartOptions] = useState({
        plugins: {
            title: {
                display: true,
                text: "chart label"
            },
            legend: {
                display: true
            }
        },
        scales: {
            y: {
                title: {
                    display: true,
                    text: 'default'
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'year'
                },
            },
        }
    })

    const [unavailable, setUnavailable] = useState([])
    const [rendered, setRendered] = useState([])

    // ------------------------------------------------------------------------------------
    // EVENT HANDLERS
    // ------------------------------------------------------------------------------------

    const handleMapSelect = (province) => {
        switch (province) {
            case "Newfoundland and Labrador":
                setGeography("nl")
                break;
            case "Prince Edward Island":
                setGeography("pei")
                break;
            case "Nova Scotia":
                setGeography("ns")
                break;
            case "New Brunswick":
                setGeography("nb")
                break;
            case "Quebec":
                setGeography("qb")
                break;
            case "Ontario":
                setGeography("on")
                break;
            case "Manitoba":
                setGeography("mb")
                break;
            case "Saskatchewan":
                setGeography("sk")
                break;
            case "Alberta":
                setGeography("ab")
                break;
            case "British Columbia":
                setGeography("bc")
                break;
            case "Nunavut":
                setGeography("nv")
                break;
            case "Northwest Territories":
                setGeography("nt")
                break;
            case "Yukon":
                setGeography("yk")
                break;
        }
    }

    const handleResetMap = () => {
        setGeography("can");
    }

    const handleCheckBox = (e) => {
        switch (e.target.name) {
            case "identity":
                if (e.target.checked) setIdentities(prev => [...prev, e.target.value]);
                else setIdentities(prev => prev.filter(item => item != e.target.value));
                break;
            case "gender":
                if (e.target.checked) setGenders(prev => [...prev, e.target.value]);
                else setGenders(prev => prev.filter(item => item != e.target.value));
                break;
            case "education":
                if (e.target.checked) setEducations(prev => [...prev, e.target.value]);
                else setEducations(prev => prev.filter(item => item != e.target.value));
                break;
            case "age":
                if (e.target.checked) setAges(prev => [...prev, e.target.value]);
                else setAges(prev => prev.filter(item => item != e.target.value));
                break;
            default:
                break;
        }
    }

    const handleDropdown = (e) => {
        switch (e.target.name) {
            case "start":
                setStart(2024 - parseInt(e.target.value) + 1);
                break;
            case "latest":
                setLatest(2024 - parseInt(e.target.value));
                break;
            case "characteristic":
                setCharacteristic(e.target.value);
                break;
            default:
                break;
        }
    }

    const fetchChart = async () => {
        console.log("starting fetch")

        let dataSets = [];
        let years = [];
        let nextUnavailable = [];
        let nextRendered = [];

        await Promise.all(
        identities.map(identity =>
        Promise.all(
        genders.map(gender =>
        Promise.all(
        educations.map(education =>
        Promise.all(
        ages.map(async age => {
            let name = `${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}`

            if (!rendered.includes(name)) {
                let query = `geography=${geography}&characteristic=${characteristic}&identity=${identity}&gender=${gender}&education=${education}&age=${age}&start=${start}&latest=${latest}`

                let header = {
                    "Content-Type": "application/json"
                };
                let response = await fetch(`${BACKEND_URL}/get-indigenous-trend?${query}`, {
                    headers: header
                }).then(res => res.json())
                .catch((error) => {
                    console.log(`ERROR: ${error}`);
                    return;
                });

                let trends = response.trends;
                let trend = trends[0]

                if (Object.keys(trend.time_series).length > years.length) years = Object.keys(trend.time_series);

                // TODO: some status code thing
                if (trend.responseStatusCode >= 400) {
                    nextUnavailable.push(trend.name);
                } else {
                    dataSets.push({
                        label: trend.name,
                        data: Object.values(trend.time_series),
                        borderWidth: 1
                    })
                }

                nextRendered.push(trend.name);

            } else {
                // all trends have the same yearspan, thus if one is rendered, then that yearspan has already been rendered
                years = chartTrends.labels;
                for (let i = 0; i < chartTrends.datasets.length; i++) {
                    if (chartTrends.datasets[i].label == name) {
                        dataSets.push({
                            label: chartTrends.datasets[i].label,
                            data: chartTrends.datasets[i].data,
                            borderWith: 1
                        })
                    }
                }
                if (unavailable.includes(name)) {
                    nextUnavailable.push(name);
                }

                nextRendered.push(name)
            }

        }))))))));

        let yText = "";

        switch (characteristic) {
            case "population":
                yText = "Population (1000 persons)";
                break;
            case "employment-rate":
                yText = "Employment rate (% of respective demographic)";
                break;
            case "participation-rate":
                yText = "Participation rate (% of respective demographic)";
                break;
            case "unemployment-rate":
                yText = "Unemployment rate (% of respective demographic)";
                break;
            default:
                yText = "N/A";
                break;
        }

        setChartTrends(() => ({
            labels: years,
            datasets: dataSets
        }));
        setChartOptions(prevOptions => ({
            ...prevOptions,
            scales: {
                ...prevOptions.scales,
                y: {
                    ...prevOptions.scales.y,
                    title: {
                        ...prevOptions.scales.y.title,
                        text: yText
                    }
                }
            }
        }));
        setUnavailable(nextUnavailable);
        setRendered(nextRendered);
    }

    // ------------------------------------------------------------------------------------
    // HOOKS
    // ------------------------------------------------------------------------------------

    useEffect(() => {
        console.log(identities)
    }, [identities])

    useEffect(() => {
        console.log(genders)
    }, [genders])

    useEffect(() => {
        console.log(educations)
    }, [educations])

    useEffect(() => {
        console.log(ages)
    }, [ages])

    useEffect(() => {
        console.log(rendered)
    }, [rendered])

    // ------------------------------------------------------------------------------------
    // HTML
    // ------------------------------------------------------------------------------------

    return (
        <div className="chart-container">
            <h2 style={{ textAlign: "center" }}>Select Geographic Region</h2>
            <Canada onSelect={handleMapSelect} size={900} hoverColor="orange" type="select-single"/>
            <button onClick={handleResetMap}>Canada</button>

            <h2 style={{ textAlign: "center" }}>Indigenous Trends</h2>
            <Line
                data={chartTrends}
                options={chartOptions}
            />

            <div>
                <h2>Unavailable</h2>
                <ul>
                    {
                        unavailable.map(item => (
                            <li key={item}> {item} </li>
                        ))
                    }
                </ul>

                <h3>Labour Characteristic</h3>
                <select name="characteristic" onChange={handleDropdown}>
                    <option value="population">Population</option>
                    <option value="employment-rate" selected="selected">Employment rate</option>
                    <option value="participation-rate">Participation rate</option>
                    <option value="unemployment-rate">Unemployment rate</option>
                </select>

                <h3>Indigenous Identity</h3>
                <input type="checkbox" name="identity" value="indigenous" onChange={handleCheckBox}/> All Indigenous Groups <br></br>
                <input type="checkbox" name="identity" value="non-indigenous" onChange={handleCheckBox}/> Non-Indigenous <br></br>
                <input type="checkbox" name="identity" value="first-nations" onChange={handleCheckBox}/> First Nations <br></br>
                <input type="checkbox" name="identity" value="metis" onChange={handleCheckBox}/> Metis <br></br>
                <input type="checkbox" name="identity" value="inuit" onChange={handleCheckBox}/> Inuit <br></br>
                <input type="checkbox" name="identity" value="total-everyone" onChange={handleCheckBox}/> Total population <br></br>

                <h3>Gender</h3>
                <input type="checkbox" name="gender" value="total-gender" onChange={handleCheckBox}/> All-genders <br></br>
                <input type="checkbox" name="gender" value="men" onChange={handleCheckBox}/> men <br></br>
                <input type="checkbox" name="gender" value="women" onChange={handleCheckBox}/> women <br></br>

                <h3>Education</h3>
                <input type="checkbox" name="education" value="total-education" onChange={handleCheckBox}/> All education levels <br></br>
                <input type="checkbox" name="education" value="less-than-high-school" onChange={handleCheckBox}/> Less than high school <br></br>
                <input type="checkbox" name="education" value="high-school-or-some-postsecondary" onChange={handleCheckBox}/> High school or some post-secondary <br></br>
                <input type="checkbox" name="education" value="completed-postsecondary" onChange={handleCheckBox}/> Completed post secondary <br></br>

                <h3>Age Ranges</h3>
                <input type="checkbox" name="age" value="15+" onChange={handleCheckBox}/> 15+ <br></br>
                <input type="checkbox" name="age" value="15-24" onChange={handleCheckBox}/> 15-24  <br></br>
                <input type="checkbox" name="age" value="25+" onChange={handleCheckBox}/> 25+ <br></br>
                <input type="checkbox" name="age" value="25-54" onChange={handleCheckBox}/> 25-54 <br></br>
                <input type="checkbox" name="age" value="55+" onChange={handleCheckBox}/> 55+ <br></br>

                <h3>Start Year</h3>
                <select name="start" onChange={handleDropdown}>
                    <option value="2010">2010</option>
                    <option value="2011">2011</option>
                    <option value="2012">2012</option>
                    <option value="2013">2013</option>
                    <option value="2014">2014</option>
                    <option value="2015">2015</option>
                    <option value="2016">2016</option>
                    <option value="2017">2017</option>
                    <option value="2018">2018</option>
                    <option value="2019">2019</option>
                    <option value="2020" selected="selected">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                </select>

                <h3>End Year</h3>
                <select name="latest" onChange={handleDropdown}>
                    <option value="2010">2010</option>
                    <option value="2011">2011</option>
                    <option value="2012">2012</option>
                    <option value="2013">2013</option>
                    <option value="2014">2014</option>
                    <option value="2015">2015</option>
                    <option value="2016">2016</option>
                    <option value="2017">2017</option>
                    <option value="2018">2018</option>
                    <option value="2019">2019</option>
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024" selected="selected">2024</option>
                </select>
                
            </div>
            <button onClick={fetchChart}>fetch chart</button>
        </div>
    );
}