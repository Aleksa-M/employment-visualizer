
import cors from "cors"
import http from "http"
import express, { json } from "express"
import { parse } from "node-html-parser"
import puppeteer from "puppeteer"

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
const getVector = async (vectorId, latestN) => {
    const options = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify([{ vectorId: vectorId, latestN: latestN}])
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
        return response[0].object;  // response is an array of responses, each being JSON with a status and object, and object is the actual vector
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
        timeSeries[item.refPer] = item.value;
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

//----------------------------------------------------------------------------------
// POST
//----------------------------------------------------------------------------------

app.get("/scrape-table", async (req, res) => {
    const table = await scrapeTable('https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410035901');
    if (table instanceof Error) {
        console.error("Error fetching or parsing data:", table);
        return res.status(500).send({ error: "Failed to fetch or parse data" });
    }
    res.json(table);
});

app.get("/parse-table", async (req, res) => {
    const vector = await getVector(96386819, 5);
    if (vector instanceof Error) {
        console.error("Error fetching or parsing data:", vector);
        return res.status(500).send({ error: "Failed to fetch or parse data" });
    }
    const timeSeries = vectorToTimeSeries(vector);
    
    //res.setHeader('Content-Type', 'text/csv');
    res.send(timeSeries);
});

//----------------------------------------------------------------------------------
// DELETE
//----------------------------------------------------------------------------------



//----------------------------------------------------------------------------------


