import { Link } from "react-router-dom"
import "./test.css"
import 'src/map'

export function Home() {
    return (
        <>
        <link rel="stylesheet" href="test.css"></link>
        <header><h2>Canadian Employment Visualizer Tool</h2></header>
        <div>
            <nav>
                <ul>
                    <li><Link to="./about"> Tool Overview </Link></li>
                    <li><Link to="./analysis-index"> Analysis </Link></li>
                    <li><Link to="./primer-temp"> Temp for primer </Link></li>
                    <li><Link to="./canada-map"> Interactive Map </Link></li>
                    <map></map>
                </ul>
            </nav>
        </div>
        </> 
    );
}