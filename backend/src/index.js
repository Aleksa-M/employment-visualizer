
import cors from "cors"
import http from "http"
import express, { json } from "express"
import { parse } from "node-html-parser"

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
    // get html from url
    console.log("zero");
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("one");
    const text = await fetch(url).then(
        response => {
            response = response.text().then((text) => {
                return text;
            }).catch(err => {
                return err;
            });
            return response;
        }).catch(err => {
            return err
        });
    // parse html
    const root = parse(text);
    console.log(root.outerHTML);
    const list = root.querySelectorAll("table");
    let tableJSON = {};
    list.forEach((table, index) => {
        let tableArray = [];
        console.log(table);
        console.log("and now, for something completely different...");
        const rows = table.querySelectorAll("tbody tr");
        console.log(rows);
        table.childNodes.forEach((child) => {
            console.log(child.outerHTML);
        });
        rows.forEach((row) => {
            let rowArray = [];
            row.querySelectorAll("td, th").forEach((cell) => {
                rowArray.push(cell.text.trim());
            });
        });
        tableJSON[`Table ${index + 1}:`] = {
            class: table.getAttribute("class"),
            id: table.getAttribute("id"),
            tableArray: tableArray
        };
    });
    return tableJSON;

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

//----------------------------------------------------------------------------------
// DELETE
//----------------------------------------------------------------------------------



//----------------------------------------------------------------------------------


