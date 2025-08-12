// CanadaMap.js
import React, { useState, useEffect } from 'react';
import Canada from "@react-map/canada";

export function CanadaMap() {

    const [geography, setGeography] = useState("can");

    const eventHandler = (province) => {
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

    const resetHandler = (e) => {
        console.log(e)
        setGeography("can");
    }

    useEffect(() => {
        console.log(`geography was set to ${geography}`)
    }, [geography])

    return (
        <div>
            <Canada onSelect={eventHandler} size={900} hoverColor="orange" type="select-single"/>
            <button onClick={resetHandler}>Canada</button>
        </div>
    );
}