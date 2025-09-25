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

export function Disability() {
    // ------------------------------------------------------------------------------------
    // STATES
    // ------------------------------------------------------------------------------------
    const [geography, setGeography] = useState("can");
    const [characteristic, setCharacteristic] = useState("employment-rate");

    const [start, setStart] = useState(4);
    const [latest, setLatest] = useState(0);

    const [abilities, setAbilities] = useState([]);
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
    })

    const [unavailable, setUnavailable] = useState([])
    const [rendered, setRendered] = useState([])

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
            case "ability":
                if (e.target.checked) setAbilities(prev => [...prev, e.target.value]);
                else setAbilities(prev => prev.filter(item => item != e.target.value));
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
        abilities.map(ability =>
        Promise.all(
        genders.map(gender =>
        Promise.all(
        educations.map(education =>
        Promise.all(
        ages.map(async age => {
            let name = `${start}_${latest}_${geography}_${characteristic}_${ability}_${gender}_${education}_${age}`

            if (!rendered.includes(name)) {
                let query = `geography=${geography}&characteristic=${characteristic}&identity=${ability}&gender=${gender}&education=${education}&age=${age}&start=${start}&latest=${latest}`

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
        console.log(abilities)
    }, [abilities])

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
                <h2>Indigenous Trends Dashboard</h2>

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
                            <option value="employment-rate" selected="selected">Employment rate</option>
                            <option value="participation-rate">Participation rate</option>
                            <option value="unemployment-rate">Unemployment rate</option>
                        </select>

                        <h3>Ability</h3>
                        <input type="checkbox" name="abled" value="disabled" onChange={handleCheckBox}/> All Abilities <br></br>
                        <input type="checkbox" name="abled" value="disabled" onChange={handleCheckBox}/> Persons with disabilities <br></br>
                        <input type="checkbox" name="abled" value="disabled" onChange={handleCheckBox}/> Persons without disabilities <br></br>

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
                            <option value="2022" selected="selected">2022</option>
                            <option value="2023">2023</option>
                            <option value="2024">2024</option>
                        </select>

                        <h3>End Year</h3>
                        <select name="latest" onChange={handleDropdown}>
                            <option value="2022">2022</option>
                            <option value="2023">2023</option>
                            <option value="2024" selected="selected">2024</option>
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
                    <h2>Disability Primer</h2>
                    <p>
                        <strong>Introduction:</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        From year to year, the labour market characteristics of persons with disabilities are affected by changes in overall labour market conditions, as well as the persistence or reduction of barriers that limit their full integration into the labour market. The specific circumstances of persons with disabilities, including the type and severity of their disability, are also important factors that shape their experience in the labour market [1]. For instance, a lower participation rate can signal the presence of barriers that may prevent persons with disabilities from engaging in paid work or job search activities [1].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;


                        One of the main datasets for labour characteristics among disabled people is the CSD (Canadian Survey on Disability), which is taken every 5 years, the last one being in 2022. This primer will mainly focus on how disability affects labour market performance, analysing disability type, disability severity, age, gender, and other intersectional factors, as well as how these factors influence income, occupation type, labour characteristics, and more. There will also be a focus on how people with disabilities are accommodated in the workplace and inequities relating to workplace accessibility.
                        <br></br><br></br>

                        <strong>Labour Characteristics:</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;


                        The employment rate among people with disabilities has always been lower than that of people without disabilities, and employed people with dis	abilities are much more likely to work part time compared to their non-disabled counterparts [17]. In 2021, for the ages 25-64 cohort, the employment rate for people with disabilities compared with people without disabilities was 62% vs. 78%, where employment rates decreased for cohorts of people with increasingly severe disabilities [4]. Among those with disabilities aged 25 to 64 years who were not employed in 2022, 42% could be considered as having work potential [4]. In 2021, the employment rate among people with severe disabilities was roughly 30% [4]. Despite the recent large gap in employment rate, it has narrowed since 2016, where, respectively, the employment rates were 58% and 80% [4]. Similarly, the difference in unemployment rate between people with and without disabilities has been narrowing, as in 2023 it was 7.6% and  4.6% respectively, while in 2024 it was 8.1% and 5.6%, respectively [1].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        One of the biggest factors that dictates labour outcome and income is severity of disability [4]. In 2023, the employment rate among those with mild disabilities was 54.7%, while for those with severe disabilities it was 26.4% [1]. Among the 25-64 age group, severity of disability correlated with being likelier to to work part time [4].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Although labour discrimination is similar between men and women with disabilities (with the exception that women with disabilities tend to report having been turned down because of their disability less than their male counterparts) [5], women with disabilities tend to face greater labour market challenges not directly tied to overt discrimination, such as  underemployment and underearnings [5]. Women’s participation rate among people with disabilities was lower, as 51.6% of men with disabilities, 74.6% of men without, 49.5% of women with disabilities, and 65.4% of women without participating in the labour market [1]. Women with disabilities were also more likely to be employed while in school and were likelier to work part time than their male counterparts [2], as 14% of men with severe disabilities, 23% of women with severe disabilities, 8% of men without disabilities, and 18% of women without disabilities worked part time (less than 30 hours a week) [4]. However, men with more severe disabilities are likelier to be not in education, employment, or training (NEET) than women with severe disabilities and people with mild disabilities [2].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Education and training plays a more pronounced role in labour market success for people with disabilities than it does for people without [4]. Among people with disabilities, those who had a university degree (bachelor’s degree or higher) had an employment rate that was 34 percentage points higher than that of their counterparts with high school or less (79% versus 45%), which, although present in those without disabilities, was not as large [4].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Among Canadians aged 15 years and older with a disability, 14.3% are a member of a group designated as a visible minority [6] Of the persons with disabilities who are visible minorities 49.9% have work potential, 33.9% have a bachelor’s degree or higher, 25.2% of those who were employed consider themselves to be disadvantaged in employment because of their condition, 32.4% of employees said their work does not give them the opportunity to use all their education, skills or work experience [6].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        The share of people with disabilities working in professional, scientific, technical and service, and public sector grows [1]. In fact, people with disabilities are better represented in the public sector than people without disabilities, as among paid employees with disabilities, the public sector accounted for 28.0% of employment in 2024, compared to 22.8% for those without disabilities, especially in healthcare (15.7% vs. 13.1%) and public administration (7.6% vs. 5.6%) [1]. However, in scientific and professional fields, people with disabilities continue to be underrepresented compared to people without disabilities in 2024 [1].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;

                        <strong>Income:</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Employees with disabilities tend to have lower wages than employees without disabilities. These differences stem from various factors, such as the industries in which the two groups are employed and the share of employees working full-time or part-time [1]. In 2019, among those aged 16 years and older, persons with disabilities earn 21.4% less than persons without disabilities [19]. Due to slower wage growth among employees with disabilities (+4.6% to $33.42 per hour) compared to their peers without disabilities (+5.3% to $35.64 per hour), the gap in average hourly wages between both groups widened from $1.91 in 2023 to $2.22 in 2024 [1]. These differences in income are likely attributed to the differences in employment rates (which was previously explained) [4]. In 2020, people with disabilities who were employed had a median personal income twice that of their unemployed counterparts [4]. In 2020, the largest percentage increase in income was observed in those not employed, where the median personal income among persons without disabilities rose by more than 60% (from $14,020 in 2015 to $22,960 in 2020) and by almost 40% for persons with disabilities (from $13,740 to $18,980) [4]. This may be attributable to the exceptional circumstance of the COVID-19 pandemic and the government's efforts to provide relief income to unemployed people [4]. 
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Severity of disability is a major factor in income. The median incomes for employees without disabilities, with any disabilities, with mild disabilities, and with severe disabilities were $46,080, $38,810, $44,210, and $30,590 respectively [4], with similar trends observed at all ages [4]. Interestingly, among full time employees for 49 weeks in 2020, people with mild disabilities had a slightly higher median income than those without ($60,070 compared to $58,530), which has not been the case before or since [4]. In 2020, median income among persons with milder disabilities increased by 35% (from $14,230 to $19,230), while it increased by 38% (from $13,560 to $18,730) for those with more severe disabilities (this may also be skewed by the circumstances of the COVID-19 pandemic) [4].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Among individuals aged 25 to 64 years, the income gap between women and men was significant among those without disabilities as well as those with disabilities [4]. The median income of women with disabilities ($37,010) was 11% less than men with disabilities ($41,580). Among those with milder disabilities, the median income of women ($41,960) was 12% less than men ($47,870). Among those with more severe disabilities, no significant differences were found in median income between women and men. Among those without disabilities, the median income of women ($42,430) was 16% less than men ($50,260) [4]. Between 2015 and 2020, median income increased for people with and without disabilities, regardless of age or gender, with the greatest increases being among women with disabilities aged 25 to 64 years (+33%), women with disabilities aged 65 years and over (+17%), and men with disabilities aged 25 to 64 years (+17%) [4].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Poverty (measured using Market Basket Measure (MBM,)) and more generally low income, disproportionately affects people with disabilities[4]. In 2020, 10% of persons with disabilities aged 15 years and over lived in poverty compared to 7% of their counterparts without disabilities [4]. For those aged 25-64, the poverty rate among people with any disabilities, without disabilities, with mild disabilities, and with severe disabilities were 12%, 7%, 8%, and 18% respectively [4]. Men and women with disabilities had roughly the same proportion of living under the poverty line among ages 15 and up, whereas among ages 25-64, men had a slightly higher chance of living under the poverty line [4]. In 2014, 23% of people with disabilities were affected by low income while only 9% of those without a disability did [18]. Low income also varied by family type [18]. For people with disabilities, the low income rate was over 50% for lone parents and persons living alone, compared with 8% for persons with a disability who lived with a spouse who did not have a disability [18]. Among persons with disabilities who were part of a couple without children, those with more severe disabilities had a poverty rate of 9%, about twice as much as their counterparts with milder disabilities or no disabilities [4]. In 2014, unattached people aged 45 to 64 with a disability and lone parents with a disability accounted for nearly one quarter of the total low‑income population [18]. As can be seen, the poverty and low income rates of people with disabilities has been decreasing over the years, more so than for people without disabilities. Between 2015 and 2020, the poverty rate among persons with disabilities aged 15 years and over in Canada decreased from 18% to 10%, whereas for people without disabilities it went from 12% to 7% [4]. However, it is once again important to acknowledge that the reduction of the poverty rates for persons with and without disabilities between 2015 and 2020 is likely related to the financial assistance provided by the Government of Canada to support Canadians affected by the COVID-19 pandemic [4].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Looking by disability type, the pay gap was greatest between persons with cognitive disabilities and persons without disabilities (46.4%) [19]. Low‑income rates vary by disability type. For example, the rate was 17% for those with a physical–sensory disability, 27% for those with a mental–cognitive disability, and 35% for those with a combination of both [18]. Among those without a job, 22% of people without a disability were in low income, compared with 35% for those with a physical–sensory disability, 46% for those with a mental–cognitive disability and 47% for those who had a combination of both [18]. 
                        <br></br><br></br>

                        <strong>Youth:</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;

                        In 2022, the disability rate for persons aged 15 years and over in Canada was 27%. representing nearly 8 million people [2]. Disability rates are shown to increase with age: 20.1% among youth aged 15 to 24 and 40.4% among seniors aged 65 and older [2]. Youth experience disability differently than older age groups, with youth being more likely to have a mild disability, less likely to have two or more disability types, and experiencing different disability types, compared with their older counterparts [2]. Among youth, the three most prevalent disability types were mental health-related (13.6%), learning (9.2%) and pain-related (6.7%) while among seniors, pain-related (27.6%), mobility (25.5%) and flexibility (23.7%) were the most prevalent disability types [2]. Mental health-related disabilities among youth rose 6 percentage points between 2017 and 2022, marking the largest increase in prevalence among all disability types for that age group [2]. 
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        During ages 15-24, youth will leave high school and may also move into the workforce and/or attend, and potentially complete, post-secondary education, making educational attainment and support very important for labour market outcomes [2]. In 2024, a notable drop in the employment rate was recorded among youth aged 15 to 24 with disabilities (-6.9 percentage points to 45.0%), with declines observed among both young men (-7.7 percentage points to 39.7%) and young women (-6.5 percentage points to 49.2%). The employment rate of youth without disabilities also fell from 2023 to 2024, but to a lesser extent (-1.9 percentage points to 55.8%) [1]. In 2024, they were twice as likely as their counterparts without disabilities to be not in employment, education or training (NEET) (24.4% vs. 12.3%) [1].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        In some cases, working while in school can be seen as an indication of a person’s capacity to manage multiple priorities simultaneously [2]. In other cases, it can be indicative of a person’s need to work in order to provide necessary financial support [2]. It may also be influenced by a combination of societal and cultural practices that either encourage or discourage a person from being employed while in school, or from going to school while working [2]. Among the 141,980 youth with disabilities who were neither in school nor employed in 2022, 114,490 (or 81%) could be identified as having work potential (53,160 women and 61,340 men) [4]. These youth who were not in school or employment are particularly vulnerable to low income and social exclusion [4]. Regardless of ability, youth were most likely to be enrolled in school while not employed and not in the labour force [2]. Youth with disabilities (22.8%) were less likely than their counterparts without disabilities (29.4%) to be employed and attending school [2]. The proportion of youth with disabilities who were attending school while unemployed or not in the labour force was higher among the racialized groups (56.6%) than among the non-racialized and non-Indigenous groups (37.9%) [2]. The proportion of youth in this combination was also higher among immigrant youth with disabilities (56.1%), compared with non-immigrant youth with disabilities (40.7%) [2]. Youth with milder disabilities were more likely to be employed while in school than youth with more severe disabilities (25.7% vs. 16.8%,) with a similar trend observed for all ages in the 15-24 range [2]. Young women were more likely to be employed while they were enrolled in school than young men (26.5% vs. 17.5%) [2]. Youth with more severe disabilities are less likely to be employed and not in school than those with milder disabilities (15.2% vs. 20.7%) [2]. Three in ten youth with more severe disabilities are neither in school nor employed [4].
                        <br></br><br></br>

                        <strong>Accommodations:</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;


                        Accommodations for people with disabilities can include specialized training, restructuring of physical space, accessible technology, and much more. People with disabilities continue to struggle with having their accommodations met for a variety of reasons. One major reason is income and costs, which have been shown to disproportionately affect people with disabilities. In 2022, 56% of persons with disabilities, nearly 4.5 million people, reported at least one unmet need when it comes to either aids, devices, medication or healthcare services. Three-quarters (73%) of persons with unmet needs (or 3.2 million) cited cost as the reason for those unmet needs [4]. Women with disabilities were more likely than men to indicate unmet needs due to cost for health care services (34% versus 22%) and prescription medication (14% versus 10%) [4]. Severity of disability also had an impact on the likelihood of having unmet needs due to cost for disability supports [4]. Among persons with milder disabilities, 32% had at least one unmet need for an aid, device, prescription medication, and/or healthcare service due to cost [4]. This proportion increased to 53% among persons with more severe disabilities [4]. One in two (53%) persons with disabilities aged 15 years and over who were living below Canada’s official poverty line had at least one unmet need for an aid, device, prescription medication, and/or healthcare service due to cost [4].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Due to people with disabilities tending to work in public sector jobs, they tend to fare better in other aspects of quality of employment [1].are more likely to be unionized and to have access to medical or dental insurance [1]. In 2024, a higher share of employees with disabilities had access to paid sick leave (66.1% vs. 64.6% of employees without disabilities) and to medical or dental insurance (68.0% vs. 65.6%) [1].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Barriers present themselves differently among different groups of people with different disabilities [3]. Among those with sensory, cognitive, physical, pain-related, and mental health-related disabilities, 80%, 78%, 77%, 72%, and 71% reported encountering barriers of any kind relating to their disabilities in the workplace [3]. In 2024, among the employed population with disabilities, 69% claimed to face barriers to accessibility in the workplace, with 46% saying it affected their ability to do their day-to-day work to a moderate or extreme extent [3]. 49% face physically related barriers, 41% face communication barriers, 35% face technology related barriers, 35% face transportation related barriers, 50% face barriers disclosing their disability, 27% lack respect from colleagues and hiring staff, and 26% face barriers with accommodation [3].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Accommodations for people with disabilities are often not met by employers. Among employed people with disabilities, 61% agreed that their employer provides them with adequate training and resources to do their job and 43% agreed that they felt like they could equitably compete for promotion opportunities [3]. A higher proportion of women than men with disabilities required workplace accommodations, but there were no significant sex differences on whether these accommodations were available [5]. In 2022, among persons with disabilities aged 25 to 64 years who specified a medical condition, 24% reported that one of the underlying causes of their condition was work-related, which can include accidents or injuries at work, stress or violence in the workplace, and exposure to chemicals [4]. Men were 30% likely to report this while women were only 19% likely to do so [4].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        During the COVID-19 pandemic, one of the main forms of support for underearning people, especially people with disabilities, the Canadian government utilized were CERB stimulant payments [16]. Among the 2.6 million Canadian workers with disabilities who earned at least $5,000 in 2019, 35% received CERB payments [16].43% were aged 18-34 years, 33% were aged 35-64, and 29% were aged 65 and older [16].Workers with more severe disabilities were more likely to receive CERB payments (40%) than those with less severe disabilities (33%) [16]. 
                        <br></br><br></br>

                    </p>
                    <h2>Sources</h2>
                    <p>
                        <a href="https://www150.statcan.gc.ca/n1/daily-quotidien/250514/dq250514b-eng.htm"> [1] Labour market characteristics of persons with and without disabilities, 2024 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2025001-eng.htm"> [2] Education and employment experiences of youth with disabilities, 2022 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/11-627-m/11-627-m2025024-eng.htm"> [3] Employed persons with disabilities or long-term conditions </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2024001-eng.htm"> [4] A demographic, employment and income profile of persons with disabilities aged 15 years and over in Canada, 2022 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2021010/article/00004-eng.htm"> [5] Work experiences of women with disabilities </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/11-627-m/11-627-m2020086-eng.htm"> [6] The Visible Minority Population with a Disability in Canada: Employment and Education </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2016007-eng.htm"> [7] Pain-related disabilities among Canadians aged 15 years and older, 2012 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2016004-eng.htm"> [8] Flexibility disabilities among Canadians aged 15 years and older, 2012 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2016005-eng.htm"> [9] Mobility disabilities among Canadians aged 15 years and older, 2012 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2016001-eng.htm"> [10] Seeing disabilities among Canadians aged 15 years and older, 2012: </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2016002-eng.htm"> [11] Hearing disabilities among Canadians aged 15 years and older, 2012 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2014003-eng.htm"> [12] Learning disabilities among Canadians aged 15 years and older, 2012 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2016006-eng.htm"> [13] Dexterity disabilities among Canadians aged 15 years and older, 2012 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2015002-eng.htm"> [14] Memory disabilities among Canadians aged 15 years and older, 2012 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2015003-eng.htm"> [15] Developmental disabilities among Canadians aged 15 years and older, 2012 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/11-627-m/11-627-m2021083-eng.htm"> [16] Workers with disabilities receiving payments from the Canada Emergency Response Benefit program, 2020 </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2022001-eng.htm"> [17] Time use among persons with disabilities in Canada </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/75-006-x/2017001/article/54854-eng.htm"> [18] Low income among persons with a disability in Canada </a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/89-654-x/89-654-x2023002-eng.htm"> [19] Earnings pay gap among persons with and without disabilities, 2019 </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

