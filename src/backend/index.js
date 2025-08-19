
const cors = require("cors");
const http = require("http");
const express = require("express");
const { json } = require("express");

const { completeMissingGenderRate } = require('./helpers/completionFunctions');

/*
vectors from statscan tables are manually entered so that retrival on backend is blind.
some vectors that are missing (esp from age when relating to education) can be derived from other vectors.

HEIRARCHY OF indigenous-vectors
    1. geography
    2. indgenous groups/non-indigenous
    3. labour characteristic
    4. gender
    5. education
    6. age

Indigenous tables used:
pid=1410035901
pid=1410047001

HEIRARCHY OF immigrant-vectors
    1. geography
    2. immigrant landing times/non-immigrants
    3. place of origin
    4. labour characteristic
    5. gender
    6. education
    7. age

Immigrant tables used:
pid=1410047201
pid=1410008701 (completed filling)

*/
const indigenousVectors = require('./vectors/indigenous-vectors.json');
const immigrantVectors = require('./vectors/immigrant-vectors.json');


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
    const res = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods', options)
    const response = await res.json();

    // response is an array of responses, each being JSON with a status and object, and object is the actual vector
    // in the instance of a failure, the response will be:
    // {
    //     message: 'JSON syntax error, please refer to the manual to check the input JSON content'
    // }
    // since the api is designed to only get one vector at a time, response[0] picks the first vector and only vector in that array
    let vector = response[0];
    if (!vector.hasOwnProperty("object")) {
        // ERROR HERE 
        // since the original error object is not the same as the vector, you have to make it into the vector format 
        // (statcan api try to be good challenge)
        // the format here is the exact same except it has a status failure, status code 500, zero-value for productId and coordinate
        // (since they are unused), and an empty vectorDataPoint
        vector = [
            {
                "status": "FAILURE",
                "object": {
                    "responseStatusCode": 500,
                    "productId": 0,
                    "coordinate": "0",
                    "vectorId": vectorId,
                    "vectorDataPoint": []
                }
            }
        ]
    }
    vector = vector.object;
    vector.vectorDataPoint = vector.vectorDataPoint.slice(0, start - latest);
    return response[0].object;
}



// Function to convert vector json to time series json
// input is an array vectorDataPoint which is provided in the vector object from statcan, but can also be an empty array
// returns a json where keys are time period and respective values are the value for that period
const vectorToTimeSeries = (vectorDataPoint) => {
    let timeSeries = {};
    
    vectorDataPoint.forEach((item) => {
        timeSeries[item.refPer.substring(0, 4)] = parseFloat(item.value);
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
        // ERROR HERE
        // you dont actually have to do any error check here because my error checking design is 200iq

        // you should still push the vector, because it means the vector
        // (what if thats not the issue, like the server being temporarily down?)
        vector_cache_global[vectorId] = vector;
        fetchedNow.push(vectorId);
    }

    res.send({
        vector_data: vector,
        fetched: fetchedNow
    }); 
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
        trends: <array({responseStatusCode: <status of request, whether vector data was retrieved>, name: <name of trend>, time_series: <vectorToTimeSeries output>})
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
        let vectorId = indigenonusVectors[geography][identity][characteristic][gender][education][age];
        let trendObject = {};

        if (vectorId != "") {
            console.log(`present ${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}`)
            trendObject = await fetch(
                `${BACKEND_URL}/get-trend?vectorId=${vectorId}&vectorName=${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}&start=${start}&latest=${latest}`
            ).then(res => res.json());

        } else {
            // gender is top level of the hierarchy, so it will try completion for gender, education, and age (identity is not mutually exclusive)
            let completionObject = completeMissingGenderRate(geography, identity, characteristic, gender, education, age);

            if (completionObject.calculable) {
                console.log(`completable ${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}`)
                let calculation_queue = completionObject.calculation_queue
                trendObject = await fetch(
                    `${BACKEND_URL}/get-synthesis-trend?vectorName=${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}&start=${start}&latest=${latest}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ calculation_queue })
                    }
                ).then(res => res.json());
    
            } else {
                // ERROR HERE
                // return error object saying that there is no way to complete vector
                // it needs to be a promise because the other ones are promises
                console.log(`incompleteable ${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}`)
                await new Promise(resolve => {
                    trendObject = {
                        trend_data: {
                            responseStatusCode: 404,
                            name: `${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}`,
                            time_series: {}
                        },
                        fetched: []
                    };
                    resolve();
                });
            }
        }

        // ERROR HERE
        // lol u dont even need to to do this error check either since the status code is propagated to the frontend thru
        // the responseStatusCode property

        chartArray.push(trendObject.trend_data);
        vector_cache_local.push(...trendObject.fetched);

    }))))))));

    console.log(chartArray)

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
QUERY PARAMS: 

    geography (string):
        desired geography, either any one of the provinces or Canada. defaults to Canada

    characteristic (string):
        string to denote whether to use employment, unemployment, or participation. defaults to employment

    start (int): 
        first period, inclusive, measured in number of periods away from present, defaults to 1

    latest (int):
        latest period, inclusive, measured in number of periods away from present. if blank, defaults to 0

    identity (string):
        array of indigenous groups to include in the chart from first nations, inuit, metis, non indigenous.
        defaults to ["indigenous", "non-indigenous"]

    gender (string):
        true to compare genders, false to not compare genders. defaults to false

    education (string):
        true to include education attainment, false to not include education attainment. defaults to false

    age (string):
        array of age groups to include in the chart. defaults to ["15+"]

RETURN

    {
        geography: <geogrraphical region requested by frontend>
        characteristic: <labour characteristic requested by frontend>
        trend: <{responseStatusCode: <status of request, whether vector data was retrieved>, name: <name of trend>, time_series: <vectorToTimeSeries output>)
    }

*/
app.get("/get-indigenous-trend", async (req, res) => {
    // local cache to only store vector ids
    // when /get-indigenous-chart is done, local cache is used to determine which arrays are destroyed in global cache
    let vector_cache_local = [];

    // chart has two axes: time and characteristic, so following values only have one string val. 
    // chart only displays data for one geographic region
    let geography = req.query.geography || "can";
    let characteristic = req.query.characteristic || "employment-rate";

    // chart consists of any number of trends, so following values can have any number of string values
    let identity = req.query.identity || "indigenous";
    let gender = req.query.gender || "total-gender";
    let education = req.query.education || "total-education";
    let age = req.query.age || "15+";
    // correct for + symbol being lost in query params
    if (age == '15 ') age = "15+";
    else if (age == '55 ') age = "55+";
    else if (age == '25 ') age = "25+";

    let start = parseInt(req.query.start) || 1;
    let latest = parseInt(req.query.latest) || 0;

    let vectorId = indigenousVectors[geography][identity][characteristic][gender][education][age];
    let trendObject = {};

    if (vectorId != "") {
        console.log(`present ${identity}_${gender}_${education}_${age}`)
        trendObject = await fetch(
            `${BACKEND_URL}/get-trend?vectorId=${vectorId}&vectorName=${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}&start=${start}&latest=${latest}`
        ).then(res => res.json());

    } else {
        // gender is top level of the hierarchy, so it will try completion for gender, education, and age (identity is not mutually exclusive)
        let completionObject = completeMissingGenderRate(indigenousVectors[geography][identity], characteristic, gender, education, age);

        if (completionObject.calculable) {
            console.log(`completable ${identity}_${gender}_${education}_${age}`)
            let calculation_queue = completionObject.calculation_queue
            trendObject = await fetch(
                `${BACKEND_URL}/get-synthesis-trend?vectorName=${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}&start=${start}&latest=${latest}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ calculation_queue })
                }
            ).then(res => res.json());

        } else {
            // ERROR HERE
            // return error object saying that there is no way to complete vector
            // it needs to be a promise because the other ones are promises
            console.log(`incompleteable ${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}`)
            await new Promise(resolve => {
                trendObject = {
                    trend_data: {
                        responseStatusCode: 404,
                        name: `${start}_${latest}_${geography}_${characteristic}_${identity}_${gender}_${education}_${age}`,
                        time_series: {}
                    },
                    fetched: []
                };
                resolve();
            });
        }
    }

    // ERROR HERE
    // lol u dont even need to to do this error check either since the status code is propagated to the frontend thru
    // the responseStatusCode property

    vector_cache_local.push(...trendObject.fetched);

    let chartObject = {
        "geography": geography,
        "characteristic": characteristic,
        "trends": [trendObject.trend_data]
    }

    for (index in vector_cache_local) {
        delete vector_cache_global[vector_cache_local[index]];
    }

    res.send(chartObject);
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

    status (string):
        array of statuses that specify whether the group are immigrants and how long ago they landed.
        defaults to ["immigrants", "non-immigrants"]

    gender (string):
        true to compare genders, false to not compare genders. defaults to false

    education (string):
        true to include education attainment, false to not include education attainment. defaults to false

    age (string):
        array of age groups to include in the chart. defaults to ["15+"]

RETURN

    {
        geography: <geogrraphical region requested by frontend>
        characteristic: <labour characteristic requested by frontend>
        trend: <{responseStatusCode: <status of request, whether vector data was retrieved>, name: <name of trend>, time_series: <vectorToTimeSeries output>)
    }

*/
app.get("/get-immigrant-trend", async (req, res) => {
    // local cache to only store vector ids
    // when /get-indigenous-chart is done, local cache is used to determine which arrays are destroyed in global cache
    let vector_cache_local = [];

    // chart has two axes: time and characteristic, so following values only have one string val. 
    // chart only displays data for one geographic region
    let geography = req.query.geography || "can";
    let characteristic = req.query.characteristic || "employment-rate";

    // chart consists of any number of trends, so following values can have any number of string values
    let status = req.query.status || "immigrant";
    let origin = req.query.origin || "anywhere"
    let gender = req.query.gender || "total-gender";
    let education = req.query.education || "total-education";
    let age = req.query.age || "15+";
    // correct for + symbol being lost in query params
    if (age == '15 ') age = "15+";
    else if (age == '55 ') age = "55+";
    else if (age == '25 ') age = "25+";

    let start = parseInt(req.query.start) || 1;
    let latest = parseInt(req.query.latest) || 0;

    let vectorId = immigrantVectors[geography][status][origin][characteristic][gender][education][age];
    let trendObject = {};

    if (vectorId != "") {
        console.log(`present ${status}_${origin}_${gender}_${education}_${age}`)
        trendObject = await fetch(
            `${BACKEND_URL}/get-trend?vectorId=${vectorId}&vectorName=${start}_${latest}_${geography}_${characteristic}_${status}_${origin}_${gender}_${education}_${age}&start=${start}&latest=${latest}`
        ).then(res => res.json());

    } else {
        // gender is top level of the hierarchy, so it will try completion for gender, education, and age (identity is not mutually exclusive)
        let completionObject = completeMissingGenderRate(immigrantVectors[geography][status][origin], characteristic, gender, education, age);

        if (completionObject.calculable) {
            console.log(`completable ${status}_${origin}_${gender}_${education}_${age}`)
            let calculation_queue = completionObject.calculation_queue
            trendObject = await fetch(
                `${BACKEND_URL}/get-synthesis-trend?vectorName=${start}_${latest}_${geography}_${characteristic}_${status}_${origin}_${gender}_${education}_${age}&start=${start}&latest=${latest}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ calculation_queue })
                }
            ).then(res => res.json());

        } else {
            // ERROR HERE
            // return error object saying that there is no way to complete vector
            // it needs to be a promise because the other ones are promises
            console.log(`incompleteable ${start}_${latest}_${geography}_${characteristic}_${status}_${origin}_${gender}_${education}_${age}`)
            await new Promise(resolve => {
                trendObject = {
                    trend_data: {
                        responseStatusCode: 404,
                        name: `${start}_${latest}_${geography}_${characteristic}_${status}_${origin}_${gender}_${education}_${age}`,
                        time_series: {}
                    },
                    fetched: []
                };
                resolve();
            });
        }
    }

    // ERROR HERE
    // lol u dont even need to to do this error check either since the status code is propagated to the frontend thru
    // the responseStatusCode property

    vector_cache_local.push(...trendObject.fetched);

    let chartObject = {
        "geography": geography,
        "characteristic": characteristic,
        "trends": [trendObject.trend_data]
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
    const vectorId = req.query.vectorId;
    let vectorName = req.query.vectorName || "unnamed"
    const start = parseInt(req.query.start) || 1;
    const latest = parseInt(req.query.latest) || 0;

    if (vectorName[vectorName.length - 1] == " ") {
        vectorName = vectorName.substring(0, vectorName.length - 1) + "+";
    }

    if (req.query.vectorId == "") {
        // ERROR HERE
        // return error saying that the vectorId is missing
    }
    if (latest > start) {
        // ERROR HERE
        // return error saying that the vectorId is missing
    }

    const response = await fetch(`${BACKEND_URL}/get-vector?vectorId=${vectorId}&start=${start}&latest=${latest}`);
    const vector = await response.json();

    // ERROR HERE
    // you dont have to do an error check here either

    timeSeries = vectorToTimeSeries(vector.vector_data.vectorDataPoint);

    let fetchedNow = [];
    fetchedNow.push(vector.fetched)

    trendObject = {
        trend_data: {
            responseStatusCode: vector.vector_data.responseStatusCode,
            name: vectorName,
            time_series: timeSeries
        },
        fetched: fetchedNow
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
    if (vectorName[vectorName.length - 1] == " ") {
        vectorName = vectorName.substring(0, vectorName.length - 1) + "+";
    }
    // console.log(`working on: ${vectorName}`)
    // console.log(`calculationQueue: `);
    // console.log(calculationQueue);


    let synthesisStatusCode = 200;

    let fetchedSynthesis = [];
    let calculationStack = [];

    // reverse polish notation calculation
    while (calculationQueue.length != 0) {
        let curr = calculationQueue[0];
        //console.log(`up next: ${curr}`);
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
            case "division":
                for (let key in calculationStack[0]) {
                    calculationStack[1][key] /= calculationStack[0][key];
                }
                calculationStack.shift();
                break;
            // invalid token will be handled by /get-vector
            default:
                let response = await fetch(`${BACKEND_URL}/get-vector?vectorId=${curr}&start=${start}&latest=${latest}`);
                let vector = await response.json();
                // ERROR HERE
                // means that nothing can be calculated, since the timeSeries must be blank
                // thus, everything that has been synthesized thus far and anything that needs to be synthesized
                // must be nuked
                if (vector.vector_data.responseStatusCode >= 500) {
                    //console.log("fart smella")
                    synthesisStatusCode = vector.vector_data.responseStatusCode;
                    calculationStack = [];
                    calculationQueue = [];
                }
                let timeSeries = vectorToTimeSeries(vector.vector_data.vectorDataPoint);
                fetchedSynthesis.push(...vector.fetched);
                //console.log("smart fella")
                //console.log(timeSeries)
                calculationStack.unshift(timeSeries);
                break;
        }
        //console.log("calculation stack: ")
        //console.log(calculationStack);
        calculationQueue.shift();
        //console.log("calculation queue: ")
        //console.log(calculationQueue);
    }

    let timeSeries = calculationStack[0];

    trendObject = {
        trend_data: {
            responseStatusCode: synthesisStatusCode,
            name: vectorName,
            time_series: timeSeries
        },
        fetched: fetchedSynthesis
    };

    res.send(trendObject);
});



//----------------------------------------------------------------------------------
// DELETE
//----------------------------------------------------------------------------------



//----------------------------------------------------------------------------------


