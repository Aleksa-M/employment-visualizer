// determines if age population is calculateable given all other vector parameters are fixed
// bottom level of completion function hieararchy
// input is age (string) and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingAgePopulation = (root, gender, education, age) => {
    let completionObject = {
        calculable: false,
        calculation_queue: []
    };

    let age_15p = root["population"][gender][education]["15+"];
    let age_15_24 = root["population"][gender][education]["15-24"];
    let age_25p = root["population"][gender][education]["25+"];
    let age_25_54 = root["population"][gender][education]["25-54"];
    let age_55p = root["population"][gender][education]["55+"];

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



// determines if age rate is calculateable given all other vector parameters are fixed
// bottom level of completion function hieararchy
// input is age (string) and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingAgeRate = (root, characteristic, gender, education, age) => {
    let completionObject = {
        calculable: false,
        calculation_queue: []
    };

    let target = root[characteristic][gender][education][age];
    if (target != "") {
        completionObject.calculable = true;
        completionObject.calculation_queue.push(target);
        return completionObject;
    }

    let populationCompletion = completeMissingAgePopulation(root, gender, education, age);
    // target == "" ensures that calculable isnt false if you have the rate
    if (!populationCompletion.calculable && target == "") return completionObject;
    if (characteristic == "population") return populationCompletion;

    let age_15p_rate = root[characteristic][gender][education]["15+"];
    let age_15p_pop_CO = completeMissingAgePopulation(root, gender, education, "15+");

    let age_15_24_rate = root[characteristic][gender][education]["15-24"];
    let age_15_24_pop_CO = completeMissingAgePopulation(root, gender, education, "15-24");

    let age_25p_rate = root[characteristic][gender][education]["25+"];
    let age_25p_pop_CO = completeMissingAgePopulation(root, gender, education, "25+");

    let age_25_54_rate = root[characteristic][gender][education]["25-54"];
    let age_25_54_pop_CO = completeMissingAgePopulation(root, gender, education, "25-54");

    let age_55p_rate = root[characteristic][gender][education]["55+"];
    let age_55p_pop_CO = completeMissingAgePopulation(root, gender, education, "55+");


    switch (age) {
        // determine if you can calculate the count of the characteristic in the demographic
        case "15+":
        default:
            if ((age_15p_rate != "")
                && (age_15p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_15p_rate);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((age_15_24_rate != "" && age_25p_rate != "")
                && (age_15_24_pop_CO.calculable && age_25p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_15_24_rate);
                    completionObject.calculation_queue.push(...age_15_24_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_25p_rate);
                    completionObject.calculation_queue.push(...age_25p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("addition");

            } else if ((age_15_24_rate != "" && age_25_54_rate != "" && age_55p_rate != "")
                && (age_15_24_pop_CO.calculable && age_25_54_pop_CO.calculable && age_55p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_15_24_rate);
                    completionObject.calculation_queue.push(...age_15_24_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_25_54_rate);
                    completionObject.calculation_queue.push(...age_25_54_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("addition");

                    completionObject.calculation_queue.push(age_55p_rate);
                    completionObject.calculation_queue.push(...age_55p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("addition");

            } else {
                return completionObject;
            }
            break;


        case "15-24":
            if ((age_15_24_rate != "") 
                && (age_15_24_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_15_24_rate);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((age_15p_rate != "" && age_25p_rate != "")
                && (age_15p_pop_CO.calculable && age_25p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_25p_rate);
                    completionObject.calculation_queue.push(...age_25p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_15p_rate);
                    completionObject.calculation_queue.push(...age_15p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

            } else if ((age_15p_rate != "" && age_25_54_rate != "" && age_55p_rate != "")
                && (age_15p_pop_CO.calculable && age_25_54_pop_CO.calculable && age_55p_pop_completion.calculable)) {

                    completionObject.calculation_queue.push(age_15p_rate);
                    completionObject.calculation_queue.push(...age_15p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_25_54_rate);
                    completionObject.calculation_queue.push(...age_25_54_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_55p_rate);
                    completionObject.calculation_queue.push(...age_55p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("addition");

                    completionObject.calculation_queue.push("subtraction");

            } else {
                return completionObject;
            }
            break;


        case "25+":
            if ((age_25p_rate != "") 
                && (age_25p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_25p_rate);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((age_15p_rate != "" && age_15_24_rate != "")
                && (age_15p_pop_CO.calculable && age_15_24_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_15p_rate);
                    completionObject.calculation_queue.push(...age_15p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_15_24_rate);
                    completionObject.calculation_queue.push(...age_15_24_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

            } else if ((age_25_54_rate != "" && age_55p_rate != "")
                && (age_25_54_pop_CO.calculable && age_55p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_25_54_rate);
                    completionObject.calculation_queue.push(...age_25_54_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_55p_rate);
                    completionObject.calculation_queue.push(...age_55p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("addition");

                    completionObject.calculation_queue.push("subtraction");

            } else {
                return completionObject;
            }
            break;

        
        case "25-54":
            if ((age_25_54_rate != "")
                && (age_25p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_25_54_rate);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((age_25p_rate != "" && age_55p_rate != "")
                && (age_25p_pop_CO.calculable && age_55p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_25p_rate);
                    completionObject.calculation_queue.push(...age_25p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_55p_rate);
                    completionObject.calculation_queue.push(...age_55p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

            } else if ((age_15p_rate != "" && age_15_24_rate != "" && age_55p_rate)
                && (age_15p_pop_CO.calculable && age_15_24_pop_CO.calculable && age_55p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_15p_rate);
                    completionObject.calculation_queue.push(...age_15p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_15_24_rate);
                    completionObject.calculation_queue.push(...age_15_24_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

                    completionObject.calculation_queue.push(age_55p_rate);
                    completionObject.calculation_queue.push(...age_55p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

            } else {
                return completionObject;
            }
            break;


        case "55+":
            if ((age_55p_rate != "")
                && (age_25p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_25_54_rate);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((age_25p_rate != "" && age_25_54_rate != "")
                && (age_25p_pop_CO.calculable && age_25_54_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_25p_rate);
                    completionObject.calculation_queue.push(...age_25p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_25_54_rate);
                    completionObject.calculation_queue.push(...age_25_54_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

            } else if ((age_15p_rate != "" && age_15_24_rate != "" && age_25_54_rate)
                && (age_15p_pop_CO.calculable && age_15_24_pop_CO.calculable && age_55p_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(age_15p_rate);
                    completionObject.calculation_queue.push(...age_15p_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(age_15_24_rate);
                    completionObject.calculation_queue.push(...age_15_24_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

                    completionObject.calculation_queue.push(age_25_54_rate);
                    completionObject.calculation_queue.push(...age_25_54_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

            } else {
                return completionObject;
            }
            break;
    }

    // determines if you can calculate the population of the demographic
    if (populationCompletion.calculable) {
        completionObject.calculable = true;
        completionObject.calculation_queue.push(...populationCompletion.calculation_queue)
        completionObject.calculation_queue.push("division");
    }

    return completionObject;
}



// determines if education population is calculateable given all other vector parameters in indigenousVectors hierarchy fixed
// above ages in the completion function hierarchy
// input is education (string) and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingEducationPopulation = (root, gender, education, age) => {
    let completionObject = {
        calculable: false,
        calculation_queue: []
    };

    let totalEducation_CO = completeMissingAgePopulation(root, gender, "total-education", age);
    let underHighSchool_CO = completeMissingAgePopulation(root, gender, "less-than-high-school", age);
    let somePostSec_CO = completeMissingAgePopulation(root, gender, "high-school-or-some-postsecondary", age);
    let donePostSec_CO = completeMissingAgePopulation(root, gender, "completed-postsecondary", age);


    switch (education) {
        case "total-education":
        default:
            if (totalEducation_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEducation_CO.calculation_queue);
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
            } else if (totalEducation_CO.calculable && somePostSec_CO.calculable && donePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEducation_CO.calculation_queue);
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
            } else if (totalEducation_CO.calculable && underHighSchool_CO.calculable && donePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEducation_CO.calculation_queue);
                completionObject.calculation_queue.push(...underHighSchool_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
                completionObject.calculation_queue.push(...donePostSec_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
            }
            break;
        case "completed-postsecondary":
            if (donePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEducation_CO.calculation_queue);
            } else if (totalEducation_CO.calculable && underHighSchool_CO.calculable && somePostSec_CO.calculable) {
                completionObject.calculable = true;
                completionObject.calculation_queue.push(...totalEducation_CO.calculation_queue);
                completionObject.calculation_queue.push(...underHighSchool_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
                completionObject.calculation_queue.push(...somePostSec_CO.calculation_queue);
                completionObject.calculation_queue.push("subtraction");
            }
            break;
    }

    return completionObject;
}



// determines if education rate is calculateable given all other vector parameters in indigenousVectors hierarchy fixed
// above ages in the completion function hierarchy
// input is education (string) and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingEducationRate = (root, characteristic, gender, education, age) => {
    let completionObject = {
        calculable: false,
        calculation_queue: []
    };

    let target = root[characteristic][gender][education][age];
    if (target != "") {
        completionObject.calculable = true;
        completionObject.calculation_queue.push(target);
        return completionObject;
    }

    let populationCompletion = completeMissingEducationPopulation(root, gender, education, age)

    // target == "" ensures that calculable isnt false if you have the rate
    if (!populationCompletion.calculable && target == "") return completionObject;
    if (characteristic == "population") return populationCompletion;

    let totalEducation_rate_CO = completeMissingAgeRate(root, characteristic, gender, "total-education", age);
    let totalEducation_pop_CO = completeMissingEducationPopulation(root, gender, "total-education", age);

    let underHighSchool_rate_CO = completeMissingAgeRate(root, characteristic, gender, "less-than-high-school", age);
    let underHighSchool_pop_CO = completeMissingEducationPopulation(root, gender, "less-than-high-school", age);

    let somePostSec_rate_CO = completeMissingAgeRate(root, characteristic, gender, "high-school-or-some-postsecondary", age);
    let somePostSec_pop_CO = completeMissingEducationPopulation(root, gender, "high-school-or-some-postsecondary", age);

    let donePostSec_rate_CO = completeMissingAgeRate(root, characteristic, gender, "completed-postsecondary", age);
    let donePostSec_pop_CO = completeMissingEducationPopulation(root, gender, "completed-postsecondary", age);


    switch (education) {
        case "total-education":
        default:
            if (totalEducation_rate_CO.calculable) {

                    completionObject.calculation_queue.push(...totalEducation_rate_CO.calculation_queue);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((underHighSchool_rate_CO.calculable && somePostSec_rate_CO.calculable && donePostSec_rate_CO.calculable)
                && (underHighSchool_pop_CO.calculable && somePostSec_pop_CO.calculable && donePostSec_pop_CO.calculable)) {

                completionObject.calculation_queue.push(...underHighSchool_rate_CO.calculation_queue);
                completionObject.calculation_queue.push(...underHighSchool_pop_CO.calculation_queue);
                completionObject.calculation_queue.push("multiplication")

                completionObject.calculation_queue.push(...somePostSec_rate_CO.calculation_queue);
                completionObject.calculation_queue.push(...somePostSec_pop_CO.calculation_queue);
                completionObject.calculation_queue.push("multiplication")

                completionObject.calculation_queue.push("addition");

                completionObject.calculation_queue.push(...donePostSec_rate_CO.calculation_queue);
                completionObject.calculation_queue.push(...donePostSec_pop_CO.calculation_queue);
                completionObject.calculation_queue.push("multiplication")

                completionObject.calculation_queue.push("addition");

            }
            break;


        case "less-than-high-school":
            if (underHighSchool_rate_CO.calculable) {

                    completionObject.calculation_queue.push(...underHighSchool_rate_CO.calculation_queue);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((totalEducation_rate_CO.calculable && somePostSec_rate_CO.calculable && donePostSec_rate_CO.calculable)
                && (totalEducation_pop_CO.calculable && somePostSec_pop_CO.calculable && donePostSec_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(...totalEducation_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...totalEducation_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication")

                    completionObject.calculation_queue.push(...somePostSec_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...somePostSec_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication")

                    completionObject.calculation_queue.push("addition");

                    completionObject.calculation_queue.push(...donePostSec_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...donePostSec_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication")

                    completionObject.calculation_queue.push("addition");

            }
            break;


        case "high-school-or-some-postsecondary":
            if (somePostSec_rate_CO.calculable) {

                    completionObject.calculation_queue.push(...somePostSec_rate_CO.calculation_queue);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((totalEducation_rate_CO.calculable && underHighSchool_rate_CO.calculable && donePostSec_rate_CO.calculable)
                && (totalEducation_pop_CO.calculable && underHighSchool_pop_CO.calculable && donePostSec_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(...totalEducation_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...totalEducation_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication")

                    completionObject.calculation_queue.push(...underHighSchool_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...underHighSchool_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication")

                    completionObject.calculation_queue.push("addition");

                    completionObject.calculation_queue.push(...donePostSec_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...donePostSec_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication")

                    completionObject.calculation_queue.push("addition");

            }
            break;


        case "completed-postsecondary":
            if (donePostSec_rate_CO.calculable) {

                    completionObject.calculation_queue.push(...donePostSec_rate_CO.calculation_queue);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((totalEducation_rate_CO.calculable && underHighSchool_rate_CO.calculable && somePostSec_rate_CO.calculable)
                && (totalEducation_pop_CO.calculable && underHighSchool_pop_CO.calculable && somePostSec_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(...totalEducation_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...totalEducation_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication")

                    completionObject.calculation_queue.push(...underHighSchool_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...underHighSchool_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication")

                    completionObject.calculation_queue.push("addition");

                    completionObject.calculation_queue.push(...somePostSec_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...somePostSec_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication")

                    completionObject.calculation_queue.push("addition");

            }
            break;
    }

    // determines if you can calculate the population of the demographic
    if (populationCompletion.calculable) {
        completionObject.calculable = true;
        completionObject.calculation_queue.push(...populationCompletion.calculation_queue)
        completionObject.calculation_queue.push("division");
    }

    return completionObject;
}



// determines if gender population is calculateable given all other vector parameters in indigenousVectors hierarchy fixed
// top of the completion function hierarchyh above education
// input is gender (string) as either "15+", "15-24", "25+", "25-54", "55+" and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingGenderPopulation = (root, gender, education, age) => {
    let completionObject = {
        calculable: false,
        calculation_queue: []
    };

    let totalGender_CO = completeMissingEducationPopulation(root, "total-gender", education, age);
    let male_CO = completeMissingEducationPopulation(root, "men", education, age);
    let female_CO = completeMissingEducationPopulation(root, "women", education, age);


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



// determines if gender rate is calculateable given all other vector parameters in indigenousVectors hierarchy fixed
// top of the completion function hierarchyh above education
// input is gender (string) as either "15+", "15-24", "25+", "25-54", "55+" and other neccessary identifiers specified to specify place in indigenousVectors
// returns json with calculable (boolean), and calculation_queue (array), which stores calculation in reverse polish notation
const completeMissingGenderRate = (root, geography, identity, characteristic, gender, education, age) => {
    console.log(`completing: ${characteristic}_${gender}_${education}_${age}`)
    let completionObject = {
        calculable: false,
        calculation_queue: []
    };

    let target = root[characteristic][gender][education][age];
    if (target != "") {
        completionObject.calculable = true;
        completionObject.calculation_queue.push(target);
        return completionObject;
    }

    let populationCompletion = completeMissingGenderPopulation(root, gender, education, age)

    // target == "" ensures that calculable isnt false if you have the rate
    if (!populationCompletion.calculable && target == "") return completionObject;
    if (characteristic == "population") return populationCompletion;

    let totalGender_rate_CO = completeMissingEducationRate(root, characteristic, "total-gender", education, age);
    let totalGender_pop_CO = completeMissingEducationPopulation(root, "total-gender", education, age);

    let male_rate_CO = completeMissingEducationRate(root, characteristic, "men", education, age);
    let male_pop_CO = completeMissingEducationPopulation(root, "men", education, age);

    let female_rate_CO = completeMissingEducationRate(root, characteristic, "women", education, age);
    let female_pop_CO = completeMissingEducationPopulation(root, "women", education, age);


    switch (gender) {
        case "total-gender":
        default:
            if (totalGender_rate_CO.calculable) {

                    completionObject.calculation_queue.push(...totalGender_rate_CO.calculation_queue);
                    completionObject.calculable = true;
                    console.log(completionObject.calculation_queue)
                    return completionObject;

            } else if ((male_rate_CO.calculable && female_rate_CO.calculable) 
                && (male_pop_CO.calculable && female_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(...male_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...male_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(...female_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...female_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("addition");

            }
            break;


        case "men":
            if (male_rate_CO.calculable) {

                    completionObject.calculation_queue.push(...male_rate_CO.calculation_queue);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((totalGender_rate_CO.calculable && female_rate_CO.calculable) 
                && (totalGender_pop_CO.calculable && female_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(...totalGender_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...totalGender_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(...female_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...female_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

            }
            break;

            
        case "women":
            if (female_rate_CO.calculable) {

                    completionObject.calculation_queue.push(...female_rate_CO.calculation_queue);
                    completionObject.calculable = true;
                    return completionObject;

            } else if ((totalGender_rate_CO.calculable && male_rate_CO.calculable) 
                && (totalGender_pop_CO.calculable && male_pop_CO.calculable)) {

                    completionObject.calculation_queue.push(...totalGender_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...totalGender_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push(...male_rate_CO.calculation_queue);
                    completionObject.calculation_queue.push(...male_pop_CO.calculation_queue);
                    completionObject.calculation_queue.push("multiplication");

                    completionObject.calculation_queue.push("subtraction");

            }
            break;
    }

    // determines if you can calculate the population of the demographic
    if (populationCompletion.calculable) {
        completionObject.calculable = true;
        completionObject.calculation_queue.push(...populationCompletion.calculation_queue)
        completionObject.calculation_queue.push("division");
    }

    return completionObject;
}