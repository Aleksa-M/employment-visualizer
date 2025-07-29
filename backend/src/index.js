
const cors = require("cors");
const http = require("http");
const express = require("express");
const { json } = require("express");

/*
HEIRARCHY OF indigenousVectors
    1. geography
    2. indgenous groups/non-indigenous
    3. characteristics
    4. gender
    5. education
    6. age

vectors from statscan tables are manually entered so that retrival on backend is blind.
some vectors that are missing (esp from age when relating to education) can be derived from other vectors.
*/
const indigenousVectors = require('./indigenous-vectors.json');

/*
cache to store vectors to minimize statscan WDS API calls.
cache will include vectors from all chart generation calls, possibly simultaneously.
/get-vector will first try to find the vector from the cache before fetching it from statscan api
when a chart generation call is finished, it will delete only its own vectors from the vector cache.
key is vectorId and cache is unprocessed vector (same format as directly taken from statscan WDS API).
*/
let vector_cache_global = {};

const PORT = process.env.PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

const app = express();
app.use(json());
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['POST', 'GET']  // Allow GET for root route
}));
const server = http.createServer();

//----------------------------------------------------------------------------------
// HELPER FUNCTIONS
//----------------------------------------------------------------------------------

// Function to retrieve vector from statscan
// input is vectorId (string), start (int), latest (int) as described in /get-vector
// returns vector object with shaved vectorDataPoint
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
// input is a vector json as retrieved from statscan, with vectorDataPoint already shaved
// returns a json where keys are time period and respective values are the value for that period
const vectorToTimeSeries = (vector) => {
    let data = vector.vectorDataPoint
    // console.log("step 2b")
    let timeSeries = {};
    data.forEach((item) => {
        timeSeries[item.refPer.substring(0, 4)] = parseInt(item.value);
    });
    return timeSeries;
}

// determines if age is calculateable given all other vector parameters are fixed
// input is age (string) as either "15+", "15-24", "25+", "25-54", "55+" and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingAge = (geography, identity, characteristic, gender, education, age) => {
    let completionObject = {
        calculable: false,
        calculation_queue
    };

    let age_15p = indigenousVectors[geography][identity][characteristic][gender][education]["15+"];
    let age_15_24 = indigenousVectors[geography][identity][characteristic][gender][education]["15-24"];
    let age_25p = indigenousVectors[geography][identity][characteristic][gender][education]["25+"];
    let age_25_54 = indigenousVectors[geography][identity][characteristic][gender][education]["25-54"];
    let age_55p = indigenousVectors[geography][identity][characteristic][gender][education]["55+"];



    switch (age) {
        case "15+":
        default:
            if (age_15_24 != "" && age_25p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15_24);
                completionObject.calculation_queue.push(age_25p);
                completionObject.calculation_queue.push("addition");
            } else if (age_15_24 != "" && age_25_54 != "" && age_55p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15_24);
                completionObject.calculation_queue.push(age_25_54);
                completionObject.calculation_queue.pushh("addition");
                completionObject.calculation_queue.push(age_55p);
                completionObject.calculation_queue.push("addition");
            }
            break;
        case "15-24":
            if (age_15p != "" && age_25p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15p);
                completionObject.calculation_queue.push(age_25p);
                completionObject.calculation_queue.push("subtraction");
            } else if (age_15p != "" && age_25_54 != "" && age_55p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15p);
                completionObject.calculation_queue.push(age_25_54);
                completionObject.calculation_queue.pushh("subtraction");
                completionObject.calculation_queue.push(age_55p);
                completionObject.calculation_queue.push("subtraction");
            }
            break;
        case "25+":
            if (age_15p != "" && age_15_24 != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15p);
                completionObject.calculation_queue.push(age_15_24);
                completionObject.calculation_queue.push("subtraction");
            } else if (age_25_54 != "" && age_55p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_25_54);
                completionObject.calculation_queue.push(age_55p);
                completionObject.calculation_queue.pushh("addition");
            }
            break;
        case "25-54":
            if (age_15p != "" && age_15_24 != "" && age_55p) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15p);
                completionObject.calculation_queue.push(age_15_24);
                completionObject.calculation_queue.push("subtraction");
                completionObject.calculation_queue.push(age_55p);
                completionObject.calculation_queue.push("subtraction");
            } else if (age_25p != "" && age_55p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_25p);
                completionObject.calculation_queue.push(age_55p);
                completionObject.calculation_queue.pushh("subtraction");
            }
            break;
        case "55+":
            if (age_15p != "" && age_15_24 != "" && age_25_54) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15p);
                completionObject.calculation_queue.push(age_15_24);
                completionObject.calculation_queue.push("subtraction");
                completionObject.calculation_queue.push(age_25_54);
                completionObject.calculation_queue.push("subtraction");
            } else if (age_25p != "" && age_25_54 != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_25p);
                completionObject.calculation_queue.push(age_25_54);
                completionObject.calculation_queue.pushh("subtraction");
            }
            break;
    }

    return completionObject;
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



/*
QUERY PARARMS:
    
    vectorId:
        vectorId of the vector to retrieve
        
    start:
        first period, inclusive, measured in number of periods away from present

    latest:
        latest period, inclusive, measured in number of periods away from present. if blank, defaults to 0
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

    {
        geography: <geogrraphical region requested by frontend>
        characteristic: <labour characteristic requested by frontend>
        trends: <array({name: <name of trend>, time_series: <vectorToTimeSeries output>})
    }

*/
app.get("/get-indigenous-chart", async (req, res) => {
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
        let response = {"ok": false};

        if (vectorId != "") {
            console.log("i might do a thing")
            let response = await fetch(
                `${BACKEND_URL}/get-trend?vectorId=${vectorId}&vectorName=${identity}_${gender}_${education}_${age}&start=${start}&latest=${latest}`
            );
        } else {
            console.log("shits missing lol")

            let completionObject = completeMissingAge(geography, identity, characteristic, gender, education, age);

            if (completionObject.calculable) {
                let calculation_queue = completionObject.calculation_queue
                let response = await fetch(
                    `${BACKEND_URL}/get-missing-trend?vectorName=${identity}_${gender}_${education}_${age}&start=${start}&latest=${latest}`, {
                        method: 'POST',
                        body: JSON.stringify({ calculation_queue })
                    }
                );
            }
        }

        console.log("wowza")
        if (response.ok) {
            const trend = await response.json();
            chartArray.push(trend);
        }
    }))))))));

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

    vectorId (string):
        id of group. reuired field

    vectorName (string):
        string name of vector so that time series can be identified

    start (int):
        first period, inclusive, measured in number of periods away from present, defaults to 1

    finish (int):
        latest period, inclusive, measured in number of periods away from present. if blank, defaults to 0

RETURN

    {
        name: <string for name>
        time_series: <json(<year>: <value>)>
    }

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

    const response = await fetch(`${BACKEND_URL}/get-vector?vectorId=${vectorId}&start=${start}&latest=${latest}`);
    const vector = await response.json();

    timeSeries = vectorToTimeSeries(vector);

    if (vectorName[vectorName.length - 1] == " ") {
        vectorName = vectorName.substring(0, vectorName.length - 1) + "+";
    }
    trendObject = {
        "name": vectorName,
        "time_series": timeSeries
    };

    res.send(trendObject);
});



//----------------------------------------------------------------------------------
// POST
//----------------------------------------------------------------------------------



/*
QUERY PARAMS

    opperation (string):
        one of "addition", "subtraction", "multiplication", or "divison", applied on the values of the time series
        applied as vector1 [opp] vector2 (not neccessarily commutative) 

    vectorName (string), start (int), finish (int):
        same as /get-trend

QUERY BODY

    calculationQueue (array):
        array of vectorIds and operations to calculate the time series, in reverse polish notation

RETURN

    same as /get-trend

*/
app.get("/get-synthesis-trend", async (req, res) => {
    let vectorName = req.query.vectorName || "unnamed";
    const start = req.query.start || "1";
    const latest = req.query.latest || "0";
    let calculationQueue = req.body.calculation_queue;

    let calculationStack = [];

    // reverse polish notation calculation
    while (calculationQueue.length != 0) {
        let curr = calculationQueue[0];
        switch (curr) {
            case "addition":
                for (let key in calculationStack[1]) {
                    calculationStack[1][key] += calculationStack[0][key];
                }
                calculationStack = calculationStack.shift();
                break;
            case "subtraction":
                for (let key in calculationStack[1]) {
                    calculationStack[1][key] -= calculationStack[0][key];
                }
                calculationStack = calculationStack.shift();
                break;
            case "multiplication":
                for (let key in calculationStack[1]) {
                    calculationStack[1][key] *= calculationStack[0][key];
                }
                calculationStack = calculationStack.shift();
                break;
            case "divsion":
                for (let key in calculationStack[0]) {
                    calculationStack[1][key] /= calculationStack[0][key];
                }
                calculationStack = calculationStack.shift();
                break;
            // invalid token will be handled by /get-vector
            default:
                let response = await fetch(`${BACKEND_URL}/get-vector?vectorId=${curr}&start=${start}&latest=${latest}`);
                let vector = await response.json();
                let timeSeries = vectorToTimeSeries(vector);
                calculationStack.unshift(timeSeries);
                break;
        }
        calculationQueue = calculationQueue.shift();
    }

    let timeSeries = calculationStack[0];

    if (vectorName[vectorName.length - 1] == " ") {
        vectorName = vectorName.substring(0, vectorName.length - 1) + "+";
    }
    trendObject = {
        "name": vectorName,
        "time_series": timeSeries
    };

    res.send(trendObject);
});



//----------------------------------------------------------------------------------
// DELETE
//----------------------------------------------------------------------------------



//----------------------------------------------------------------------------------


