import { CategoryScale } from "chart.js";
import Chart from "chart.js/auto";
import { Line } from "react-chartjs-2";
import { useState, useEffect, useRef } from "react";
import { nameToIdentifier, identifierToName } from '../helpers';
import Canada from "@react-map/canada";
//import "./analysis.css";

Chart.register(CategoryScale);
const BACKEND_PORT = process.env.BACKEND_PORT || 3002;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `http://localhost:${BACKEND_PORT}`;

console.log(BACKEND_URL)

export function Immigrants() {
    // ------------------------------------------------------------------------------------
    // STATES
    // ------------------------------------------------------------------------------------
    const [geography, setGeography] = useState("can");
    const [characteristic, setCharacteristic] = useState("employment-rate");

    const [start, setStart] = useState(4);
    const [latest, setLatest] = useState(0);

    const [statuses, setStatuses] = useState([]);
    const [origins, setOrigins] = useState([]);
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
            case "status":
                if (e.target.checked) setStatuses(prev => [...prev, e.target.value]);
                else setStatuses(prev => prev.filter(item => item != e.target.value));
                break;
            case "origin":
                if (e.target.checked) setOrigins(prev => [...prev, e.target.value]);
                else setOrigins(prev => prev.filter(item => item != e.target.value));
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
        statuses.map(status =>
        Promise.all(
        origins.map(origin => 
        Promise.all(
        genders.map(gender =>
        Promise.all(
        educations.map(education =>
        Promise.all(
        ages.map(async age => {
            let name = `${start}_${latest}_${geography}_${characteristic}_${status}_${origin}_${gender}_${education}_${age}`

            if (!rendered.includes(name)) {
                let query = `geography=${geography}&characteristic=${characteristic}&status=${status}&origin=${origin}&gender=${gender}&education=${education}&age=${age}&start=${start}&latest=${latest}`

                let header = {
                    "Content-Type": "application/json"
                };
                let response = await fetch(`${BACKEND_URL}/get-immigrant-trend?${query}`, {
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

        }))))))))));

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

        console.log("finished fetch");
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
        console.log(statuses)
    }, [statuses])

    useEffect(() => {
        console.log(origins)
    }, [origins])

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
                <h2>Immigrant Trends Dashboard</h2>

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

                        <h3>Immigrant Status</h3>
                        <input type="checkbox" name="status" value="immigrants" onChange={handleCheckBox}/> All Immigrants <br></br>
                        <input type="checkbox" name="status" value="non-immigrants" onChange={handleCheckBox}/> Non-Immigrants <br></br>
                        <input type="checkbox" name="status" value="landed-5yrs" onChange={handleCheckBox}/> Immigrants who landed less than 5 years before present year <br></br>
                        <input type="checkbox" name="status" value="landed-5-10yrs" onChange={handleCheckBox}/> Immigrants who landed between 5 and 10 years before present <br></br>
                        <input type="checkbox" name="status" value="landed-10-yrs" onChange={handleCheckBox}/> Immigrants who landed longer than 10 years before present <br></br>
                        <input type="checkbox" name="status" value="total-everyone" onChange={handleCheckBox}/> Total Population <br></br>

                        <h3>Place of Origin</h3>
                        <input type="checkbox" name="origin" value="anywhere" onChange={handleCheckBox}/> All Immigrants <br></br>
                        <input type="checkbox" name="origin" value="canadian-born" onChange={handleCheckBox}/> Born in Canada <br></br>
                        <input type="checkbox" name="origin" value="north-america" onChange={handleCheckBox}/> Born in North America <br></br>
                        <input type="checkbox" name="origin" value="latin-america" onChange={handleCheckBox}/> Born in Latin America <br></br>
                        <input type="checkbox" name="origin" value="europe" onChange={handleCheckBox}/> Born in Europe <br></br>
                        <input type="checkbox" name="origin" value="africa" onChange={handleCheckBox}/> Born in Africa <br></br>

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
                    <h2>Immigrants Primer</h2>
                    <p>
                        <strong>Introduction</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Since the beginning of Canadian history, immigrants have played a crucial role in developing the Canadian economy and contributing to the labour market. The main purpose of this primer is to provide an introductory overview of different immigration classes and programs; varying immigrant demographics, wages, and labour characteristics; and naturalization, citizenship, and permanent residency trends.
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        One of the main economic goals of accepting immigrants is to fill labour shortages [7]. When immigrants come to Canada, they do two things: increase labour supply, which strengthens the labour market, and they bring money into the Canadian economy from outside [7]. Usually, for immigrants to be admitted to Canada, they must hold a work permit or be a part of some work related or refugee program [4]. Usually, these workers are temporary, but some of them transition to permanent residents (PR) or citizens at some point after arrival (this ranges from one to several years) [4]. By the end of 2022, the majority of individuals who held work permits from 2006 to 2020 had naturalized or transitioned to PR in Canada. The rate of individuals with work term permits transitioning to PR has increased  in the last decade, mostly attributable to a rise in economic class immigrants, who are individuals accepted into Canada on the basis that their contribution to the labour market will strengthen the economy, in contrast with family class (those who are admitted based on family connection in Canada) and refugee (those who are admitted into Canada as a refugee or are seeking asylum) [8]. Some of the foreign recruitment programs include:
                        <br></br><br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Temporary Foreign Worker Program (TFWP):</b> Foreign workers who obtain a work visa or another kind of permit to work in Canada, with a Labour Market Impact Assessment (LMIA) from their employer to prove that there do not exist existing Canadian residents to fill the roles. [4]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>International Mobility Program (IMP):</b> Similar to TFWs, except they do not require a LMIA. This is because not all IMP members are in Canada for work related purposes [4]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Provincial Nominee Program (PNP):</b> Foreign workers who have been selected by a province or territory to fill an unavailable position in the labour market. [8]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Canadian Experience Class (CEC):</b> Skilled foreign workers who already have work experience in Canada. [8]
                        <br></br><br></br>
                        Immigrants to Canada tend to have a reputation for being highly skilled, due to Canada’s points-based immigration system (established in 1967) and the PNP (established in the 2000s) favoring higher skilled workers [7]. However, immigrants working jobs of all skill levels are accepted into Canada [7]. Generally, these can be grouped into high and low skill jobs, but specific categorizations include:
                        <br></br><br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level 0:</b> Management jobs [7]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level A:</b> Professional jobs that usually require a university degree [7]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level B:</b> Technical jobs and skilled trades that usually require a college diploma or apprenticeship training [7]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level C:</b> Lower-skilled jobs that usually require a high school diploma or job-specific training [7]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level D:</b> Labourer jobs that have no educational requirements and usually provide on-the-job training [7]
                        <br></br><br></br>
                        It is also worth noting that the COVID-19 pandemic has influenced immigration patterns and admission, especially among the 2016-2020 cohort. The most common pathways for economic immigrants were PNP and CEC [8].
                        <br></br><br></br>
                        <strong>Characteristics and Demographics:</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;	
                        The characteristics of immigrants, such as wage, employment rate, and industry vary greatly with respect to a number of complex factors such as official language proficiency, category of admissions, and other socioeconomic factors [2].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        The median entry wage for newly admitted immigrants has been increasing over the years, with it being $26,500 in 2016 and $30,100 in 2018 [2]. Furthermore, a decrease in the gap between the wages of Canadian-born workers and immigrants has been decreasing, as the median entry wage for Canadian-born workers in 2017 was $37,400 [2]. Official language proficiency and other socioeconomic factors increase the chance and amount of wage increase among immigrant workers [2]. Notably, place of origin influences wages. Considering place of origin, median wages can be as low as $15,300 from immigrants from Algeria, to as high as $86,200 from immigrants born in the United States. Of economic immigrants after 10 years of admissions, with respect to place of origin, the highest median wages were from those born in the United States ($100,700,) United Kingdom ($91,000,) and Brazil ($78,200,) and the lowest being among those born in South Korea ($38,000) [2]. The highest increases in median wages occurred among Iran (+254.4%; from $16,000 one year after admission to $56,700 10 years after admission), Egypt (+219.4%; from $18,600 to $59,400) and Algeria (+212.4%; from $15,300 to $47,800) born immigrants [2].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        In general, there is no guaranteed pathway for immigrants securing jobs, but general trends present themselves when observing individual skill levels [7]. The only notable trend is that the economic class was the largest source of employed immigrants (in 2021) [7]. For each skill level, common attributes are: 
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level 0:</b> two thirds were economic PA (primary applicants, individuals directly applying for employment through the economic class. Does not include spouses or dependents.) 80% had a university degree. [7]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level A:</b> two thirds were economic PAs. 58% held graduate degrees, 36% held bachelors, mostly educated in developed nations and India [7]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level B:</b> From a wide variety of evenly divided backgrounds (immigration classes, education level/place, etc.)
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level C:</b> Most were family class, or spouses and dependents of economic immigrants, usually educated in India, Phillipines, Canada, or Africa [7]
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        <b>Skill level D:</b> Family class, refugees, and dependents made up most, most had high school education or less, and most were from the Philippines [7]
                        <br></br><br></br>
                        These further exemplify the occupational difference between immigrant and Canadian-born workers, which has been a long standing observation dating back to at least 2010 [7]. This is an intended consequence of the way that economic immigrants are selected [7]. Since economic immigrants are selected based on unavailabilities in the Canadian job market and not as substitutes for Canadian-born workers, economic immigrants naturally hold positions in different industries than Canadian-born workers [7]. In 2021, when compared with Canadian-born individuals, immigrants were 1.3 times as likely to hold professional jobs, 1.4 times as likely to be labourers, and 0.7 times as likely to be in the trades and technical jobs [7]. Immigrants are less likely to be employed in construction compared to Canadian-born individuals, which is mainly attributable to Canada’s recent population boom and recent housing demand [7]. As mentioned earlier, Canada’s point system is believed to select only high skill workers, which is actually not the case, as Canada intentionally accepts as many low skill workers [7]. In 2021, from immigrants who landed in 2018 and 2019, the share of recent immigrants in skill levels C and D combined was almost as high as the share working in skill levels 0 and A combined (35% vs. 40%) [7]. There has been an uptick in recruiting of low skill workers, as one quarter of economic PAs entering Canada in 2018 and 2019 were employed in skill level C or D jobs [7]. On the province level, all provinces seek out workers from high skill industries (STEM, healthcare, trade, transportation, agriculture, etc.,) but some provinces also seek out low skill workers (construction labourers, material handlers, restaurant and food servers, cooks, janitors, and caretakers and cleaners) [7]. This approach is taken because accepted low skill workers mitigates labour recruitment difficulties and accepting high skill workers increases national GDP [7]. Recent immigrants and immigrants overall were much less likely than Canadian-born individuals to be in middle skill technical or trades jobs such as construction [7]. Recent immigrants were more likely than their Canadian-born counterparts to be employed in high skill occupations such as engineering and computer and information systems professions but less likely than Canadian-born individuals to be in nursing professions, partly because of the time it may take to become professional nurses [7].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        There is significant variation of the skill level of occupation with respect to the kind of education an immigrant receives [7]. This is especially observable in the country in which one was educated [7]. Around 72% of those educated in and who graduated from the Philippines worked in skill level C or D occupations, while only 5% were in skill level A occupations [7]. Other regions that provided large shares of labour at skill levels C and D included Africa (51%), South and Southeast Asia (excluding India and the Philippines) (45%), and South and Central America (41%) [7]. On the other hand, immigrants educated in Canada, the US, and India had about 35% to 58% rates of working in skill level A jobs [7]. Across all education, however, immigrants were less likely than Canadian-born citizens to work in trades or technical jobs [7].
                        <br></br><br></br>
                        <strong>Citizenship and Naturalization:</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Naturalization is an important part of immigrants’ integration into Canada, and has many positive benefits for immigrants that affect their legal status, rights, and political and civic activities [1]. After naturalization, immigrants can vote in Canadian elections, run for office, and generally become involved in political activities [1]. They can also obtain a passport, which has many more advantages compared to a permanent residency card, such as being able to travel freely to almost any country in the world and obtain the Canadian consulate and embassy if issues arise when travelling to said countries [1]. As well, naturalized citizens cannot be deported and their children automatically become Canadian citizens without any application process [1]. Most immigrants, if they ever do so, become citizens within 10 years, with very few doing so after [1].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Naturalization is important in the economic integration of immigrants because it gives them access to many jobs, such as most federal government jobs (until recently), which non-citizens do not have access to [1]. It also has the psychological effect of increasing desirability in the labour market, as employers tend to perceive naturalized immigrants as being more competent, whereas non-citizens are perceived to be less committed and likely to move back to their home country or somewhere else [1]. As a result, naturalized immigrants were more likely to be employed in the public sector and more likely to report higher earnings than non-citizen counterparts [1]. Nearly all results have found that naturalized immigrants, on average, have had better results than non-naturalized immigrants, including higher employment rates in the public sector [1]. Interestingly, naturalization had a more visible impact on immigrants from developing nations [1]. However, a result that states naturalization causes better labour prospects has never been directly observed [1]. As mentioned earlier, naturalization and labour market attainment are strongly positively correlated, but this may be because immigrants who end up becoming citizens have undetectable qualities that simultaneously aid them in the job market [1]. This serves as a possible explanation as to why some employers are likely to hire naturalized immigrants rather than non-naturalized immigrants, as they are perceived to be more hard working [1]. It has been shown that immigrants who naturalize have vastly different background characteristics than those who do not [1]. Immigrants who acquired citizenship from 2004 to 2023 were much more highly educated than their counterparts who were not naturalized. About 56% of naturalized immigrants had a university degree compared with 40% of those who were not naturalized [1]. 34% of non-citizens did not speak English or French upon entering Canada, while only 16% of naturalized immigrants didn’t [1]. Furthermore, naturalized immigrants were likelier than non-citizens to have entered Canada through the Federal Skilled Worker Program or CEC (31% vs. 24%) [1]. Naturalized immigrants tended to be from East Asia (mainly China), the United States, and Western and Northern Europe [1], which are countries whose immigrants tend to have the highest prospects (as explained earlier.) However, there are some subgroups where naturalization directly causes better employment opportunities, such as among immigrants from some developing nations and among family class immigrants and refugees [1].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        An indirect consequence of naturalization is that immigrants who become citizens tend to report having an increased sense of commitment and belonging to Canada [1]. Interestingly, Canadian naturalized immigrants were more likely to see naturalization as a “process that tied them to a positively valued nation,” while American naturalized immigrants were more likely to see naturalization as “offering some protection in an anti-immigrant policy environment” [1].
                        <br></br><br></br>
                        <strong>Permanent and temporary foreign workers:</strong>
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Temporary statuses, such as being a TFW or having a work or study permit are known as pre-admission experiences [2]. Not all immigrants have pre-admission experience, which is becoming increasingly relevant and popular among immigrant workers [2]. Compared with previous years, more immigrants admitted in 2017 had pre-admission experience in Canada, such as having held a work or study permit or having claimed refugee status prior to admission [2]. Holders of permits for non-work purposes accounted for 42% of temporary foreign workers in 2021, most of them being international students [4]. Importantly, higher wages reported after one year of employment are associated with having a work permit one year prior to admission [2]. In fact, the median entry wage of holders of work permits surpassed the Canadian median entry wage of $37,400, compared to immigrants without pre-admission experience having a median wage of $22,600 and holders of study permits having a median wage of $14,100 [2]. 
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        In recent years, the total number of TFWs has seen a substantial increase, and the composition of work permit types has also undergone significant changes [8]. In 2021, The number of temporary foreign workers increased from 356,000 in 2011 to 845,000, which accounted for 4.1% of all paid workers in Canada, up from 1.9% in 2011 [4]. Over the past 2 decades, the percentage of TFW arrivals transitioning to permanent residents (PR) has been increasing [8]. 27% of 2006-2010 and 34% of 2011-2015 arrivals transitioned to PR within 5 years [8]. 77% of these transitions were motivated by change in certain programs (such as live-in-caregiver program,) mostly in low skilled programs [8]. The transition rate among different programs and industries varies [8]. Study related permit holders accounted for most of the TFWs, which means that many TFW can only work part time or only for parts of the year due to program restrictions and permit lengths [4]. While immigrants with study experience only have a lower median entry wage, they tend to be younger than immigrants with other types of pre-admission experiences and may continue studying after admission [2]. TFWs have become an important source of Canada’s labour supply, especially in some lower-paying sectors [3]. For instance, in 2021, TFWs accounted for 18% of the workforce in the agriculture sector and 10% in the accommodation and food services sector [3]. 
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        Not all TFWs stay in the same industry after gaining PR [3]. Over two-thirds of work permit holders for work purposes remained in the same sector one year after transition, with large variation across work permit programs [3], while five years after transitioning to PR, 20% to 50% of TFWs stayed in the same industry of their first employment in Canada, depending on their occupational skill level and initial industrial sector [3]. Among major work permit programs, only higher-skilled TFWP participants and intra-company transferees maintained a five-year retention rate above 50% [3]. Work permit holders for work purposes who worked in utilities, health care and social assistance, and finance and insurance were most likely to stay in the same sector after transitioning to permanent residency (ranging from 75% to 81%,) while agriculture, forestry, fishing and hunting; real estate and rental and leasing; and management of companies and enterprises had the lowest rates (ranging from 37% to 53%) [3].
                        <br></br>&nbsp;&nbsp;&nbsp;&nbsp;
                        In response to the rise in TFWs, Provinces have begun to actively seek foreign workers under the PNP so that they would stay within the province and provide more long term economic development [6]. Between 2011 and 2020, when former work permit holders obtained their permanent residency, 97% intended to settle in the province or territory where they last worked, ranging slightly by industry and by program (TFWP and IMP had retention rates of 94% and 90% respectively) [6]. 87% of immigrants with pre-admission work experience tended to stay in their province of admission [2]. Of the provinces, Ontario had the highest retention rate (93.2%), followed by Alberta (90.4%) and British Columbia (90.1%) [2]. Retention rates were higher among immigrants with asylum claims (93.6%) or a work permit only (89.7%) prior to admission, while they were lower among immigrants who had a study permit only (80.9%) or a study permit in addition to a work permit (79.7%) prior to admission [2]. However, the retention rate has been decreasing, as across the board, immigrants from the 2016-2020 cohort had a lower retention rate than immigrants in the 2011-2015 cohort, with the exception of Ontario [6]. Overall, former work permit holders were much more likely to stay in their intended province than economic immigrants without prior Canadian experience in the first and fifth years after immigration, which may be because former work permit holders would have been better informed when choosing their destination at the time of immigration [6]. 
                        <br></br><br></br>
                    </p>
                    <h2>Sources</h2>
                    <p>
                        <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2025006/article/00003-eng.htm">[1] Citizenship and the economic outcomes of immigrants in Canada:</a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/daily-quotidien/210201/dq210201a-eng.htm">[2] Income and mobility of immigrants, 2018:</a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2024011/article/00002-eng.htm">[3] Foreign workers in Canada: Industry retention after transitioning to permanent residency among work permit holders for work purposes:</a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/11-631-x/11-631-x2024006-eng.htm">[4] Research to Insights: Temporary Foreign Workers in Canada:</a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2025002/article/00002-eng.htm">[5] Economic and fiscal performance of immigrant-owned firms in Canada:</a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2024010/article/00002-eng.htm">[6] Foreign workers in the labour force: Provincial retention after transition to permanent residency among work permit holders for work purposes:</a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2024009/article/00005-eng.htm">[7] The provision of higher- and lower-skilled immigrant labour to the Canadian economy:</a>
                        <br></br><br></br>
                        <a href="https://www150.statcan.gc.ca/n1/pub/36-28-0001/2024009/article/00005-eng.htm">[8] The provision of higher- and lower-skilled immigrant labour to the Canadian economy:</a>
                    </p>
                </div>
            </div>
        </div>       
    );
}