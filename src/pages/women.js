import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";
import { Line } from "react-chartjs-2";
import { useState, useEffect, useRef } from "react";
import { nameToIdentifier, identifierToName } from '../helpers';
import Canada from "@react-map/canada";
import "./analysis.css";

Chart.register(CategoryScale);
const BACKEND_PORT = process.env.BACKEND_PORT || 3002;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `http://localhost:${BACKEND_PORT}`;

console.log(BACKEND_URL)

export function Women() {
    // ------------------------------------------------------------------------------------
    // STATES
    // ------------------------------------------------------------------------------------
    const [geography, setGeography] = useState("can");
    const [characteristic, setCharacteristic] = useState("avg-hourly-rate");

    const [start, setStart] = useState(4);
    const [latest, setLatest] = useState(0);

    const [employmentTypes, setEmploymentTypes] = useState([]);
    const [genders, setGenders] = useState([]);
    const [educations, setEducations] = useState([]);
    const [ages, setAges] = useState([]);

    const [chartTrends, setChartTrends] = useState({
        labels: [],
        datasets: []
    });

    const [chartOptions, setChartOptions] = useState({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: "chart label"
            },
            legend: {
                display: true,
                position: 'top',
                align: 'start',
                labels: {
                    boxWidth: 12,
                    padding: 20,
                    usePointStyle: true
                }
            }
        },
        layout: {
            padding: {
                left: 10,
                right: 10,
                top: 20,
                bottom: 5
            }
        },
        scales: {
            y: {
                title: {
                    display: true,
                    text: 'default'
                },
                ticks: {
                    padding: 10,
                    callback: function(value) {
                        return value.toFixed(1); // Format y-axis labels to one decimal place
                    }
                },
                grid: {
                    display: true,
                    drawBorder: true,
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'year'
                },
                ticks: {
                    padding: 10,
                    autoSkip: false,
                    maxRotation: 45,
                    minRotation: 45
                },
                grid: {
                    display: true,
                    drawBorder: true,
                },
                afterFit: (scale) => {
                    scale.height = 80; // Increase space for x-axis labels
                }
            },
        }
    });

    const [unavailable, setUnavailable] = useState([]);
    const [rendered, setRendered] = useState([]);

    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef(null);
    const startX = useRef(0);
    const startWidth = useRef(0);

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
            case "employment-type":
                if (e.target.checked) setEmploymentTypes(prev => [...prev, e.target.value]);
                else setEmploymentTypes(prev => prev.filter(item => item != e.target.value));
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
                setStart(2022 - parseInt(e.target.value) + 1);
                break;
            case "latest":
                setLatest(2022 - parseInt(e.target.value));
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
        employmentTypes.map(employmentType =>
        Promise.all(
        genders.map(gender =>
        Promise.all(
        educations.map(education =>
        Promise.all(
        ages.map(async age => {
            let name = `${start}_${latest}_${geography}_${characteristic}_${employmentType}_${gender}_${education}_${age}`

            if (!rendered.includes(name)) {
                let query = `geography=${geography}&characteristic=${characteristic}&employmentType=${employmentType}&gender=${gender}&education=${education}&age=${age}&start=${start}&latest=${latest}`

                let header = {
                    "Content-Type": "application/json"
                };
                let response = await fetch(`${BACKEND_URL}/get-women-trend?${query}`, {
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
            case "avg-hourly-rate":
                yText = "Average hourly wage ($)";
                break;
            case "avg-weekly-rate":
                yText = "Average weekly wage ($)";
                break;
            case "med-hourly-rate":
                yText = "Median hourly wage ($)";
                break;
            case "med-weekly-rate":
                yText = "Median weekly wage ($)";
                break;
            case "avg-hourly-ratio":
                yText = "Average hourly wage ratio ($/$)";
                break;
            case "avg-weekly-ratio":
                yText = "Average weekly wage ratio ($/$)";
                break;
            case "med-hourly-ratio":
                yText = "Median hourly wage ratio ($/$)";
                break;
            case "med-weekly-ratio":
                yText = "Median weekly wage ratio ($/$)";
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

    const handleMouseDown = (e) => {
        startX.current = e.clientX;
        startWidth.current = sidebarWidth;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        const deltaX = startX.current - e.clientX;
        const newWidth = startWidth.current + deltaX;
        setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // ------------------------------------------------------------------------------------
    // HOOKS
    // ------------------------------------------------------------------------------------

    useEffect(() => {
        console.log(employmentTypes)
    }, [employmentTypes])

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

    useEffect(() => {
        console.log(process.env.BACKEND_URL);
        console.log(process.env);
    }, [])

    // ------------------------------------------------------------------------------------
    // HTML
    // ------------------------------------------------------------------------------------

    return (
        <div className="chart-container">
            <div className="main-content">
                <h2>Women Trends Dashboard</h2>

                <div className="map-controls-wrapper">
                    <div className="map-section">
                        <h2>Select Geographic Region</h2>
                        <Canada onSelect={handleMapSelect} size={400} hoverColor="orange" type="select-single"/>
                        <button onClick={handleResetMap}>Canada</button>
                    </div>

                    <div className="controls-section">
                        <h3>Labour Characteristic</h3>
                        <select name="characteristic" onChange={handleDropdown}>
                            <option value="population">Population</option>
                            <option value="avg-hourly-rate" selected="selected">Average Hourly Wage</option>
                            <option value="avg-weekly-rate">Average Weekly Wage</option>
                            <option value="med-hourly-rate">Median Hourly Wage</option>
                            <option value="med-weekly-rate">Median Weekly Wage</option>
                            <option value="avg-hourly-ratio">Average Hourly Ratio</option>
                            <option value="avg-weekly-ratio">Average Weekly Ratio</option>
                            <option value="med-hourly-ratio">Median Hourly Ratio</option>
                            <option value="med-weekly-ratio">Median Weekly Ratio</option>
                        </select>

                        <h3>Employment Type</h3>
                        <input type="checkbox" name="employment-type" value="full-time" onChange={handleCheckBox}/> Full Time <br></br>
                        <input type="checkbox" name="employment-type" value="part-time" onChange={handleCheckBox}/> Part Time <br></br>
                        <input type="checkbox" name="employment-type" value="both-time" onChange={handleCheckBox}/> All types <br></br>

                        <h3>Gender</h3>
                        <input type="checkbox" name="gender" value="total-gender" onChange={handleCheckBox}/> All-genders <br></br>
                        <input type="checkbox" name="gender" value="men" onChange={handleCheckBox}/> men+ <br></br>
                        <input type="checkbox" name="gender" value="women" onChange={handleCheckBox}/> women+ <br></br>

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
                            <option value="2022" selected="selected">2022</option>
                        </select>

                        <button onClick={fetchChart}>fetch chart</button>
                    </div>
                </div>
                    
                <div className="chart-wrapper">
                    <h2>Trends</h2>
                    <Line data={chartTrends} options={chartOptions} />
                </div>

                <div className="unavailable-section">
                    <h2>Unavailable Trends</h2>
                    <ul>
                        {
                            unavailable.map(item => (
                                <li key={item}> {item} </li>
                            ))
                        }
                    </ul>
                </div>
            </div>

            <div 
                className={`sidebar ${isResizing ? 'resizing' : ''}`}
                ref={sidebarRef}
                style={{ width: `${sidebarWidth}px` }}>

                <div 
                    className={`sidebar-resize-handle ${isResizing ? 'resizing' : ''}`} 
                    onMouseDown={handleMouseDown}
                    ref={sidebarRef}
                    style={{ 
                        backgroundColor: isResizing ? 'rgba(255, 255, 255, 0.5)' : 'transparent'
                    }}
                ></div>

                <div className="sidebar-content">
                    <h2>Women Primer</h2>
                    <p>
                        <strong>Introduction</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Over the past two decades, Canadian women have transformed their role in the labour market, reshaping not only patterns of work but also the foundations of Canada’s economic growth. Women’s participation in management, entrepreneurship, and specialized industries has expanded, but progress remains uneven [1][4][6]. While women now account for nearly half of the workforce, they remain underrepresented in senior leadership positions [1], earn less across almost all occupational groups [3][6], and face persistent barriers to promotion, financing, and recognition [2][9].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        This contradiction—between gains in participation and persistence of inequality—highlights the complexity of gendered labour market change. For example, women-owned businesses demonstrate higher survival rates than men-owned firms, but they continue to invest less in research and development [2]. In the environmental and clean technology sector, women’s participation has grown, but wages remain 17% below those of men [3]. Meanwhile, the gender wage gap among middle and senior managers has narrowed since 2000 but has not disappeared [1]. These findings suggest that equality of access has not yet translated into equality of outcomes.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Diversity within women’s experiences is also central. Indigenous, immigrant, and racialized women continue to face barriers in credential recognition, promotion, and representation in leadership [6][10]. Women with disabilities face higher educational interruptions and lower accommodation in workplaces [7]. And women with caregiving responsibilities—especially mothers of young children—are more likely to face discrimination in hiring and promotion, a reality often referred to as the “motherhood penalty” [8].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        This paper integrates Statistics Canada data from 2000 to 2024 to examine the intersections of education, management, entrepreneurship, sectoral representation, and structural barriers. By situating women’s experiences within broader socioeconomic transformations, it highlights both the progress that has been achieved and the persistent inequities that remain.
                        <br></br><br></br>
                        <strong>Education and Skills Development</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;

                        Education has been the cornerstone of women’s entry into higher-quality jobs and leadership positions. Canadian women now surpass men in postsecondary completion rates, with significant representation in health, education, and increasingly in STEM fields [10]. This educational advantage has helped women expand into management [1] and professional occupations, protecting them from some of the risks of job  automation [11].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        However, education has not erased systemic barriers. Even with equivalent qualifications, women advance more slowly into senior positions compared to men [8]. Biases in promotion decisions, limited access to mentorship, and assumptions around family responsibilities continue to hinder advancement. The result is a labour market where women’s strong educational credentials do not always yield proportional career returns.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        For women with disabilities, the barriers are sharper. More than half (53%) report interruptions in their education, compared to 37% of men with disabilities, and many rely on online coursework to complete their training [7]. These interruptions limit opportunities for higher-skilled employment, compounding challenges in labour force participation.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Education also plays a protective role in the context of technological change. Women with postsecondary degrees face a much lower risk of automation compared to women without degrees [11]. Yet, because women remain overrepresented in clerical, service, and support roles, many still face disproportionate vulnerability as workplaces adopt new technologies.
                        <br></br><br></br>
                        <strong>Women in Management and Leadership</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Women’s representation in management roles has grown steadily, though gaps remain. In 2021, women accounted for 42.7% of middle managers and 30.8% of senior managers, compared to 47.2% of non-management workers [1]. While women’s share of leadership roles lags behind their overall labour force presence, the wage gap between men and women in management has narrowed. Between 2001 and 2021, the gap declined from 19.3 to 8.7 percentage points for middle managers, and from 20.0 to 9.0 percentage points for senior managers [1].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Importantly, women-owned businesses report much higher internal representation: in 2024, 68.2% of middle managers and 73.5% of senior managers were women [1]. This suggests that when women lead organizations, they are more likely to foster gender equity in leadership pipelines.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Yet despite these improvements, women remain less likely than men to transition into executive roles, even when controlling for education, age, and experience [8]. This reflects systemic issues of mentorship, networking, and bias. Many women report “glass ceiling” effects where progression slows at senior levels despite strong qualifications.
                        <br></br><br></br>
                        <strong>Women-Owned Enterprises and Innovation</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;

                        Entrepreneurship has become a significant avenue for women to shape the economy. However, structural differences persist between women- and men-owned firms. Between 2001 and 2019, men-owned businesses were consistently more likely to engage in patenting and research and development (R&D). Men-owned firms were 16.5 percentage points more likely to pursue R&D, and when they did, they invested around 70% more than women-owned firms [2].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Despite lower R&D investment, women-owned patenting firms demonstrated greater resilience, with higher five-year survival rates (+8 ppt compared to unassigned-gender firms) [2]. This suggests that while women entrepreneurs may face constraints in financing and innovation, they develop strong survival strategies in competitive markets.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        The productivity gap between women- and men-owned enterprises remains a key issue. Women-owned firms generally report lower productivity levels, but this gap narrows significantly when women have strong prior industry experience [9]. Knowledge transfer, mentorship, and professional networks therefore play critical roles in narrowing disparities.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Access to financing remains one of the largest barriers. Women-owned firms are less likely to secure venture capital or large-scale loans compared to men [9]. This limits their ability to scale, adopt productivity-enhancing technologies, or expand internationally.
                        <br></br><br></br>
                        <strong>Sector-Specific Representation</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Women’s participation varies across industries. In the environmental and clean technology (ECT) sector, women account for 28.6% of the workforce [3]. Their representation has grown, but earnings remain significantly lower: in 2023, women earned $48.80/hour compared to $58.78/hour for men, a 17% gap [3].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Representation also varies by demographic background. In 2021, 24.6% of Indigenous women, 31.5% of racialized women, and 32.0% of immigrant women were employed in ECT occupations [3]. Yet across these groups, leadership roles remain limited.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Occupational segregation also persists across broader industries. South Asian women are concentrated in STEM and health professions, Chinese women in professional and technical occupations, and Black women in public service, health care, and community roles [10]. Despite high levels of education, Chinese and South Asian women are underrepresented in leadership, while Black women remain underrepresented in STEM [10]. These disparities underscore the persistence of systemic discrimination and barriers to promotion.
                        <br></br><br></br>
                        <strong>Employment Patterns and Self-Employment</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;

                        Self-employment has been a growing pathway for women. By 2022, nearly 1 million Canadian women were self-employed, representing 37% of all self-employed individuals, compared to only 26% in 1976 [4]. The nature of self-employment has shifted: in 1976, 34% of women in self-employment were unpaid family workers, but by 2022 this number had dropped to just 1% [4].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Women are concentrated in roles such as retail and wholesale trade managers, real estate agents, early childhood educators, cleaners, and hairstylists [4]. Korean Canadian women report the highest self-employment rate (~20%), while Filipino and Black Canadian women show the lowest (5–6%) [4].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Employment experiences also differ by caregiving status. Women with children face slower career progression and reduced access to promotions compared to men or women without children [8]. Women with disabilities are more likely to need workplace accommodations and more often report workload adjustments, yet they continue to experience employment instability [7]. Full-time employment gaps persist across immigrant and racialized groups, reflecting layered inequalities [6].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <strong>Structural Barriers</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Despite progress, systemic barriers continue to limit women’s labour market outcomes.
                        <br></br><br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        The Motherhood Penalty: Women face discrimination based on parental status. Employers often assume that mothers, especially those with young children, are less committed or less flexible workers [8]. In practice, this translates into fewer hiring opportunities and slower promotions.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        The Wage Gap: Despite narrowing, women continue to earn less across nearly all occupational groups. Even in management, where progress is notable, women’s earnings remain below men’s [1][3][6].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        The Productivity Gap: Women-owned firms underperform men’s in productivity, but prior experience and strong networks substantially reduce this difference [9].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Automation Risk: Women are disproportionately concentrated in clerical, administrative, and service roles, which are at higher risk of automation. In 2016, 44.4% of women’s jobs were at moderate-to-high risk of automation compared to 34.8% for men [11]. Without retraining and reskilling initiatives, women remain particularly vulnerable to labour market disruption.
                        <br></br><br></br>
                        <strong>Conclusion</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;

                        The trajectory of women’s participation in Canada’s labour market reveals both major gains and persistent inequalities. Women have expanded into management, self-employment, and specialized industries, with measurable progress in narrowing the wage gap and increasing representation [1][4][6]. Women-owned enterprises demonstrate resilience and contribute significantly to Canada’s innovation ecosystem, even while facing financing barriers [2][9].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Yet systemic inequities remain. Women continue to earn less, face slower advancement into leadership, and remain more vulnerable to automation risk. Structural disadvantages related to caregiving, disability, race, and immigration compound these gaps [6][7][8][10]. The persistence of the motherhood penalty, wage inequality, and financing barriers underscores the need for stronger equity-focused policies.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Women’s contributions—to management, innovation, caregiving, and entrepreneurship—are indispensable to Canada’s economic future [5]. Achieving full equity requires targeted strategies: ensuring access to mentorship and networks, addressing unconscious bias in hiring and promotion, expanding financing opportunities for women entrepreneurs, and investing in retraining to prepare women for technological change. Without dismantling these systemic barriers, progress will remain uneven.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                    </p>
                    <h2>Sources</h2>
                    <p>
                    <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2024010/article/00005-eng.htm">[1] Women middle and senior managers </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2024009/article/00003-eng.htm">[2] Performance of women-owned businesses that patent </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2024007/article/00003-eng.htm">[3] Women in the environmental and clean technology sector </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/75-006-x/2023001/article/00014-eng.htm">[4] Self-employment among women in Canada </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2023002/article/00001-eng.htm">[5] Measuring the value of women’s contribution to the Canadian economy </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/75-006-x/2022001/article/00009-eng.htm">[6] Unmasking differences in women’s full-time employment </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2021010/article/00004-eng.htm">[7] Work experiences of women with disabilities </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2021009/article/00002-eng.htm">[8] Gender-related differences in the career advancement of women in Canada </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/11f0019m/11f0019m2021007-eng.htm">[9] Examining the labour-productivity gap between women-owned and men-owned enterprises </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/75-004-m/75-004-m2020002-eng.htm">[10] Occupations of South Asian, Chinese and Black women </a>
                    <br></br><br></br>
                    <a href="https://www150.statcan.gc.ca/n1/pub/11f0019m/11f0019m2020015-eng.htm">[11] Automation and the sexes: Job transformation risks </a>
                    </p>
                </div>
            </div>
        </div>
    );
}