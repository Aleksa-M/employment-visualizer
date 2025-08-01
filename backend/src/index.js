
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

const BACKEND_PORT = process.env.PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${BACKEND_PORT}`;

const app = express();
app.use(json());
app.use(cors());
// TODO: fix this with Allow-Control-Allow-Origin
// {
//     origin: process.env.CLIENT_URL,
//     methods: ['POST', 'GET', 'OPTIONS'],  // Allow GET for root route
//     'Access-Control-Allow-Origin': '*'
// }
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
    let timeSeries = {};
    data.forEach((item) => {
        timeSeries[item.refPer.substring(0, 4)] = parseFloat(item.value);
    });
    return timeSeries;
}

// determines if age is calculateable given all other vector parameters are fixed
// bottom level of completion function hieararchy
// input is age (string) and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingAge = (geography, identity, characteristic, gender, education, age) => {
    let completionObject = {
        calculable: false,
        calculation_queue: []
    };

    let age_15p = indigenousVectors[geography][identity][characteristic][gender][education]["15+"];
    let age_15_24 = indigenousVectors[geography][identity][characteristic][gender][education]["15-24"];
    let age_25p = indigenousVectors[geography][identity][characteristic][gender][education]["25+"];
    let age_25_54 = indigenousVectors[geography][identity][characteristic][gender][education]["25-54"];
    let age_55p = indigenousVectors[geography][identity][characteristic][gender][education]["55+"];

    switch (age) {
        case "15+":
        default:
            if (age_15p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15p);
            } else if (age_15_24 != "" && age_25p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15_24);
                completionObject.calculation_queue.push(age_25p);
                completionObject.calculation_queue.push("addition");
            } else if (age_15_24 != "" && age_25_54 != "" && age_55p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15_24);
                completionObject.calculation_queue.push(age_25_54);
                completionObject.calculation_queue.push("addition");
                completionObject.calculation_queue.push(age_55p);
                completionObject.calculation_queue.push("addition");
            }
            break;
        case "15-24":
            if (age_15_24 != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15_24);
            } else if (age_15p != "" && age_25p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15p);
                completionObject.calculation_queue.push(age_25p);
                completionObject.calculation_queue.push("subtraction");
            } else if (age_15p != "" && age_25_54 != "" && age_55p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15p);
                completionObject.calculation_queue.push(age_25_54);
                completionObject.calculation_queue.push("subtraction");
                completionObject.calculation_queue.push(age_55p);
                completionObject.calculation_queue.push("subtraction");
            }
            break;
        case "25+":
            if (age_25p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_25p);
            } else if (age_15p != "" && age_15_24 != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_15p);
                completionObject.calculation_queue.push(age_15_24);
                completionObject.calculation_queue.push("subtraction");
            } else if (age_25_54 != "" && age_55p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_25_54);
                completionObject.calculation_queue.push(age_55p);
                completionObject.calculation_queue.push("addition");
            }
            break;
        case "25-54":
            if (age_25_54 != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_25_54);
            } else if (age_15p != "" && age_15_24 != "" && age_55p) {
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
                completionObject.calculation_queue.push("subtraction");
            }
            break;
        case "55+":
            if (age_55p != "") {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(age_55p);
            } else if (age_15p != "" && age_15_24 != "" && age_25_54) {
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
                completionObject.calculation_queue.push("subtraction");
            }
            break;
    }

    return completionObject;
}



// determines if education is calculateable given all other vector parameters in indigenousVectors hierarchy fixed
// above ages in the completion function hierarchy
// input is education (string) and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingEducation = (geography, identity, characteristic, gender, education, age) => {
    let completionObject = {
        calculable: false,
        calculation_queue: []
    };

    let totalEduction_CO = completeMissingAge(geography, identity, characteristic, gender, "total-education", age);
    let underHighSchool_CO = completeMissingAge(geography, identity, characteristic, gender, "less-than-high-school", age);
    let somePostSec_CO = completeMissingAge(geography, identity, characteristic, gender, "high-school-or-some-postsecondary", age);
    let donePostSec_CO = completeMissingAge(geography, identity, characteristic, gender, "completed-postsecondary", age);


    switch (education) {
        case "total-education":
        default:
            if (totalEduction_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEduction_CO.calculation_queue);
            } else if (underHighSchool_CO.calculable && somePostSec_CO.calculable && donePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...underHighSchool_CO.calculation_queue);
                completionObject.calculation_queue.push(...somePostSec_CO.calculation_queue);
                completionObject.calculation_queue.push("addition");
                completionObject.calculation_queue.push(...donePostSec_CO.calculation_queue);
                completionObject.calculation_queue.push("addition");
            }
            break;
        case "less-than-high-school":
            if (underHighSchool_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...underHighSchool_CO.calculation_queue);
            } else if (totalEduction_CO.calculable && somePostSec_CO.calculable && donePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEduction_CO.calculation_queue);
                completionObject.calculation_queue.push(...somePostSec_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
                completionObject.calculation_queue.push(...donePostSec_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
            }
            break;
        case "high-school-or-some-postsecondary":
            if (somePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...somePostSec_CO.calculation_queue);
            } else if (totalEduction_CO.calculable && underHighSchool_CO.calculable && donePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEduction_CO.calculation_queue);
                completionObject.calculation_queue.push(...underHighSchool_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
                completionObject.calculation_queue.push(...donePostSec_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
            }
            break;
        case "completed-postsecondary":
            if (donePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEduction_CO.calculation_queue);
            } else if (totalEduction_CO.calculable && underHighSchool_CO.calculable && somePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEduction_CO.calculation_queue);
                completionObject.calculation_queue.push(...underHighSchool_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
                completionObject.calculation_queue.push(...somePostSec_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
            }
            break;
    }

    return completionObject;
}



// determines if gender is calculateable given all other vector parameters in indigenousVectors hierarchy fixed
// top of the completion function hierarchyh above education
// input is gender (string) as either "15+", "15-24", "25+", "25-54", "55+" and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingGender = (geography, identity, characteristic, gender, education, age) => {
    let completionObject = {
        calculable: false,
        calculation_queue: []
    };

    let totalGender_CO = completeMissingEducation(geography, identity, characteristic, "total-gender", education, age);
    let male_CO = completeMissingEducation(geography, identity, characteristic, "male", education, age);
    let female_CO = completeMissingEducation(geography, identity, characteristic, "female", education, age);


    switch (gender) {
        case "total-gender":
        default:
            if (totalGender_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalGender_CO.calculation_queue);
            } else if (male_CO.calculable && female_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...underHighSchool_CO.calculation_queue);
                completionObject.calculation_queue.push(...somePostSec_CO.calculation_queue);
                completionObject.calculation_queue.push("addition");
            }
            break;
        case "men":
            if (male_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...male_CO.calculation_queue);
            } else if (totalGender_CO.calculable && female_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalGender_CO.calculation_queue);
                completionObject.calculation_queue.push(...female_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
            }
            break;
        case "women":
            if (female_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...female_CO.calculation_queue);
            } else if (totalGender_CO.calculable && male_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalGender_CO.calculation_queue);
                completionObject.calculation_queue.push(...male_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
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
    const vectorId = req.query.vectorId;
    const latest = parseInt(req.query.latest) || 0;
    const start = parseInt(req.query.start) || 1;
    let vector = "";
    let fetchedNow = [];
    if (vector_cache_global.hasOwnProperty(vectorId)) {
        vector = vector_cache_global[vectorId];
    } else {
        vector = await getVector(req.query.vectorId, start, latest);
        if (vector instanceof Error) {
            console.error("Error fetching or parsing data:", vector);
            return res.status(500).send({ error: "Failed to fetch or parse data" });
        }
        vector_cache_global[vectorId] = vector;
        fetchedNow.push(vectorId);
    }
    res.send({ data: vector, fetched: fetchedNow }); 
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
    // local cache to only store vector ids
    // when /get-indigenous-chart is done, local cache is used to determine which arrays are destroyed in global cache
    let vector_cache_local = [];

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
    // correct for + symbol being lost in query params
    for (let i = 0; i < ages.length; i++) {
        if (ages[i] == '15 ') {
            ages[i] = "15+";
        } else if (ages[i] == '55 ') {
            ages[i] = "55+";
        } else if (ages[i] == '25 ') {
            ages[i] = "25+";
        }
    }

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
            response = await fetch(
                `${BACKEND_URL}/get-trend?vectorId=${vectorId}&vectorName=${identity}_${gender}_${education}_${age}&start=${start}&latest=${latest}`
            );
        } else {
            // gender is top level of the hierarchy, so it will try completion for gender, education, and age (identity is not mutually exclusive)
            let completionObject = completeMissingGender(geography, identity, characteristic, gender, education, age);

            if (completionObject.calculable) {
                let calculation_queue = completionObject.calculation_queue
                response = await fetch(
                    `${BACKEND_URL}/get-synthesis-trend?vectorName=${identity}_${gender}_${education}_${age}&start=${start}&latest=${latest}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ calculation_queue })
                    }
                );
            }
        }

        if (response.ok) {
            const trend = await response.json();
            chartArray.push(trend.data);
            vector_cache_local.push(...trend.fetched);
        }
    }))))))));

    let chartObject = {
        "geography": geography,
        "characteristic": characteristic,
        "trends": chartArray
    }

    for (index in vector_cache_local) {
        delete vector_cache_global[vector_cache_local[index]];
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
        return;
    }
    const vectorId = req.query.vectorId;
    let vectorName = req.query.vectorName || "unnamed"
    const start = parseInt(req.query.start) || 1;
    const latest = parseInt(req.query.latest) || 0;
    if (latest > start) {
        res.status(500).send({"error": "latest cant be bigger than start"});
        return;
    }

    const response = await fetch(`${BACKEND_URL}/get-vector?vectorId=${vectorId}&start=${start}&latest=${latest}`);
    const vector = await response.json();

    timeSeries = vectorToTimeSeries(vector.data);

    if (vectorName[vectorName.length - 1] == " ") {
        vectorName = vectorName.substring(0, vectorName.length - 1) + "+";
    }
    trendObject = {
        data: {
            "name": vectorName,
            "time_series": timeSeries
        },
        fetched: vector.fetched
    };

    res.send(trendObject);
});



//----------------------------------------------------------------------------------
// POST
//----------------------------------------------------------------------------------



/*
QUERY PARAMS

    vectorName (string), start (int), finish (int):
        same as /get-trend

QUERY BODY

    calculationQueue (array):
        array of vectorIds and operations to calculate the time series, in reverse polish notation

RETURN

    same as /get-trend

*/
app.post("/get-synthesis-trend", async (req, res) => {
    let vectorName = req.query.vectorName || "unnamed";
    const start = req.query.start || "1";
    const latest = req.query.latest || "0";
    let calculationQueue = req.body.calculation_queue;

    let fetchedSynthesis = [];

    let calculationStack = [];

    // reverse polish notation calculation
    while (calculationQueue.length != 0) {
        let curr = calculationQueue[0];
        switch (curr) {
            case "addition":
                for (let key in calculationStack[1]) {
                    calculationStack[1][key] += calculationStack[0][key];
                }
                calculationStack.shift();
                break;
            case "subtraction":
                for (let key in calculationStack[1]) {
                    calculationStack[1][key] -= calculationStack[0][key];
                }
                calculationStack.shift();
                break;
            case "multiplication":
                for (let key in calculationStack[1]) {
                    calculationStack[1][key] *= calculationStack[0][key];
                }
                calculationStack.shift();
                break;
            case "divsion":
                for (let key in calculationStack[0]) {
                    calculationStack[1][key] /= calculationStack[0][key];
                }
                calculationStack.shift();
                break;
            // invalid token will be handled by /get-vector
            default:
                let response = await fetch(`${BACKEND_URL}/get-vector?vectorId=${curr}&start=${start}&latest=${latest}`);
                let vector = await response.json();
                let timeSeries = vectorToTimeSeries(vector.data);
                fetchedSynthesis.push(...vector.fetched);
                calculationStack.unshift(timeSeries);
                break;
        }
        calculationQueue.shift();
    }

    let timeSeries = calculationStack[0];

    if (vectorName[vectorName.length - 1] == " ") {
        vectorName = vectorName.substring(0, vectorName.length - 1) + "+";
    }
    trendObject = {
        data: {
            "name": vectorName,
            "time_series": timeSeries
        },
        fetched: fetchedSynthesis
    };

    res.send(trendObject);
});



//----------------------------------------------------------------------------------
// DELETE
//----------------------------------------------------------------------------------



//----------------------------------------------------------------------------------


