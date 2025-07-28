
const cors = require("cors");
const http = require("http");
const express = require("express");
const { json } = require("express");
const { parse } = require("node-html-parser");
const puppeteer = require("puppeteer");
// where all the vectors are added
// some vectors that are missing (esp from age when relating to education) can be derived from other vectors
const indigenousVectors = require('./indigenous-vectors.json');

const PORT = process.env.PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

const app = express();
app.use(json());
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['POST', 'GET']  // Allow GET for root route
}));
const server = http.createServer();

// Function to scrape statscan databases
const scrapeTable = async (url) => {
    // headless browser setup
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const text = await page.content();
    const root = parse(text);
    const list = root.querySelectorAll("table");
    let tableJSON = {};
    list.forEach((table, index) => {
        let tableArray = [];
        const rows = table.querySelectorAll("tr");
        rows.forEach((row) => {
            let rowArray = [];
            row.querySelectorAll("td, th").forEach((cell) => {
                rowArray.push(cell.text.trim());
            });
            tableArray.push(rowArray);
        });
        tableJSON[`Table ${index + 1}:`] = {
            class: table.getAttribute("class"),
            id: table.getAttribute("id"),
            tableArray: tableArray
        };
    });
    return tableJSON;

}

// Function to retrieve vector from statscan
// returns vector as an array of json objects
const getVector = async (vectorId, start, latest) => {
    const options = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify([{ vectorId: vectorId, latestN: start}])
    };
    try {
        const response = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods', options).then(
            (res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res;
            }
        ).then(
            res => res.json()
        ).catch(
            (err) => {
                console.error("Error fetching data:", err);
                return err;
            }
        );
        let vector = response[0].object; // response is an array of responses, each being JSON with a status and object, and object is the actual vector
        vector.vectorDataPoint = vector.vectorDataPoint.slice(0, start - latest);
        return response[0].object;  
    } catch (err) {
        return err;
    }
}

// Function to convert vector json to time series json
// time series is a json where key is time period and value is the value for that period
const vectorToTimeSeries = (vector) => {
    let data = vector.vectorDataPoint
    // console.log("step 2b")
    let timeSeries = {};
    data.forEach((item) => {
        timeSeries[item.refPer.substring(0, 4)] = item.value;
    });
    return timeSeries;
}

//----------------------------------------------------------------------------------
// SERVER SETUP
//----------------------------------------------------------------------------------

// http server
app.listen(3002, () => {
    console.log("Backend server is running on tcp 3002");
});

//----------------------------------------------------------------------------------
// GET
//----------------------------------------------------------------------------------

app.get("/", (req,res)=>{
    console.log("nae nae");
    res.send("<h1>gurt: yo</h1>");
});

app.get("/scrape-table", async (req, res) => {
    const table = await scrapeTable('https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410035901');
    if (table instanceof Error) {
        console.error("Error fetching or parsing data:", table);
        return res.status(500).send({ error: "Failed to fetch or parse data" });
    }
    res.json(table);
});

/*
QUERY PARARMS:
    
vectorId: vectorId of the vector to retrieve,
start: first period, inclusive, measured in number of periods away from present>,
latest: latest period, inclusive, measured in number of periods away from present. if blank, defaults to 0
*/
app.get("/get-vector", async (req, res) => {
    // console.log("step 1a")
    const vectorId = req.query.vectorId;
    const latest = parseInt(req.query.latest) || 0;
    const start = parseInt(req.query.start) || 1;
    // console.log("step 1b")
    const vector = await getVector(req.query.vectorId, start, latest);
    // console.log("step 1c")
    if (vector instanceof Error) {
        console.error("Error fetching or parsing data:", vector);
        return res.status(500).send({ error: "Failed to fetch or parse data" });
    }
    // console.log("step 1d")
    res.send(vector); 
});

/*
QUERY PARAMS: 

    geography (string):
        desired geography, either any one of the provinces or Canada. defaults to Canada

    characteristic (string):
        string to denote whether to use employment, unemployment, or participation. defaults to employment

    start (int): 
        first period, inclusive, measured in number of periods away from present, defaults to 1

    latest (int):
        latest period, inclusive, measured in number of periods away from present. if blank, defaults to 0

    identity (array of strings):
        array of indigenous groups to include in the chart from first nations, inuit, metis, non indigenous.
        defaults to ["indigenous", "non-indigenous"]

    gender (array of strings):
        true to compare genders, false to not compare genders. defaults to false

    education (array of strings):
        true to include education attainment, false to not include education attainment. defaults to false

    age (array of strings):
        array of age groups to include in the chart. defaults to ["15+"]

RETURN

    array(<trend object>)

    <trend object> = {
        trend-name: <name of trend>
        time-series: <vectorToTimeSeries output>
    }

*/
app.get("/get-indigenous-chart", async (req, res) => {
    /*
    HEIRARCHY OF indigenousVectors
        1. geography
        2. indgenous groups/non-indigenous
        3. characteristics
        4. gender
        5. education
        6. age
    */

    // chart has two axes: time and characteristic, so following values only have one string val. 
    // chart only displays data for one geographic region
    const geography = req.query.geography || "can";
    const characteristic = req.query.characteristic || "employment-rate";

    // chart consists of any number of trends, so following values can have any number of string values
    const identities = Array.isArray(req.query.identity)
        ? req.query.identity
        : req.query.identity
            ? [req.query.identity]
            : ["indigenous", "non-indigenous"];
    const genders = Array.isArray(req.query.gender)
        ? req.query.gender
        : req.query.gender
            ? [req.query.gender]
            : ["total-gender"];
    const educations = Array.isArray(req.query.education)
        ? req.query.education
        : req.query.education
            ? [req.query.education]
            : ["total-education"];
    const ages = Array.isArray(req.query.age)
        ? req.query.age
        : req.query.age
            ? [req.query.age]
            : ["15+"];

    const start = parseInt(req.query.start) || 1;
    const latest = parseInt(req.query.latest) || 0;
    
    let chartArray = [];

    // Use Promise.all with map at every level to ensure all async fetches are awaited
    await Promise.all(
        identities.map(identity =>
            Promise.all(
                genders.map(gender =>
                    Promise.all(
                        educations.map(education =>
                            Promise.all(
                                ages.map(async age => {
                                    let vectorId = indigenousVectors[geography][identity][characteristic][gender][education][age];
                                    if (vectorId != "") {
                                        console.log("i might do a thing")
                                        const response = await fetch(
                                            `${BACKEND_URL}/get-trend?vectorId=${vectorId}&vectorName=${identity}_${gender}_${education}_${age}&start=${start}&latest=${latest}`
                                        );
                                        console.log("wowza")
                                        if (response.ok) {
                                            const trend = await response.json();
                                            chartArray.push(trend);
                                        }
                                    }
                                })
                            )
                        )
                    )
                )
            )
        )
    );

    console.log("out of the loop :3");

    let chartObject = {
        "geography": geography,
        "characteristic": characteristic,
        "trends": chartArray
    }

    res.send(chartObject);
});

/*
QUERY PARAMS

vectorId:
    id of group. reuired field
vectorName
    string name of vector so that time series can be identified
start:
    first period, inclusive, measured in number of periods away from present, defaults to 1
finish:
    latest period, inclusive, measured in number of periods away from present. if blank, defaults to 0
*/
app.get("/get-trend", async (req, res) => {
    if (!req.query.vectorId) {
        res.status(500).send({ error: "Missing vectorID" });
    }
    const vectorId = req.query.vectorId;
    let vectorName = req.query.vectorName || "unnamed"
    const start = req.query.start || "1";
    const latest = req.query.latest || "0";
    if (latest > start) {
        res.status(500).send({"error": "latest cant be bigger than start"});
    }
    const response = await fetch(`${BACKEND_URL}/get-vector?vectorId=${req.query.vectorId}&start=${req.query.start}&latest=${req.query.latest}`)
    const vector = await response.json();
    timeSeries = vectorToTimeSeries(vector);
    if (vectorName[vectorName.length - 1] == " ") {
        vectorName = vectorName.substring(0, vectorName.length - 1) + "+";
    }
    trendObject = {
        "name": vectorName,
        "time-series": timeSeries
    }
    res.send(trendObject);
});


//----------------------------------------------------------------------------------
// POST
//----------------------------------------------------------------------------------



//----------------------------------------------------------------------------------
// DELETE
//----------------------------------------------------------------------------------



//----------------------------------------------------------------------------------


