
import cors from "cors"
import http from "http"
import express, { json } from "express"
import { parse } from "node-html-parser"
import puppeteer from "puppeteer"
import indigenousVectors from './indigenous-vectors.json' assert { type: "json" };

const PORT = process.env.PORT || 3002;

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
                } else {
                    console.log("response ok");
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
    console.log("vector: ", vector);
    let data = vector.vectorDataPoint
    console.log("data: ", data);
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
latestN: latest period, inclusive, measured in number of periods away from present. if blank, defaults to 0
*/
app.get("/get-vector", async (req, res) => {
    let latest = 0;
    if (req.query.latest) {
        latest = parseInt(req.query.latest);
    }
    const vector = await getVector(req.query.vectorId, req.query.start, latest);
    if (vector instanceof Error) {
        console.error("Error fetching or parsing data:", vector);
        return res.status(500).send({ error: "Failed to fetch or parse data" });
    }
    res.send(vector); 
});

/*
QUERY PARAMS: 

start (int): first period, inclusive, measured in number of periods away from present>,
latestN (int): latest period, inclusive, measured in number of periods away from present. if blank, defaults to 0
geography (string): desired geography, either any one of the provinces or Canada. defaults to Canada
gender (boolean): true to compare genders, false to not compare genders. defaults to false
indigenous-groups (array of strings): array of indigenous groups to include in the chart from first nations, inuit, metis, non indigenous. indigenous does not need to be specified. defaults to empty array
characteristic (string): string to denote whether to use employment, unemployment, or participation. defaults to employment
education (boolean): true to include education attainment, false to not include education attainment. defaults to false
age (array of strings): array of age groups to include in the chart. defaults to ["15+"]
reserve (boolean): true to include distinguish reserve and non-rserve, false to not distinguish. defaults to false
disability (boolean): true to include disability, false to not include disability. defaults to false
earnings


*/
app.get("/get-indigenous-chart", (req, res) => {
    // HEIRARCHY
    // 1. geography
    // 2. indgenous groups/non-indigenous
    // 3. characteristics
    // 4. gender
    // 5. education
    // 6. age
    const vectors = indigenousVectors;

});

app.get("/get-generic-chart", (req, res) => {

});


//----------------------------------------------------------------------------------
// POST
//----------------------------------------------------------------------------------



//----------------------------------------------------------------------------------
// DELETE
//----------------------------------------------------------------------------------



//----------------------------------------------------------------------------------


