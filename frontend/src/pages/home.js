import { Link } from "react-router-dom"
import "./test.css"

export function Home() {
    return (
        <>
        <link rel="stylesheet" href="test.css"></link>
        <header><h2>Canadian Employment Visualizer Tool</h2></header>
        <div>
            <nav>
                <ul>
                    <li><Link to="./about"> Tool Overview </Link></li>
                    <li><Link to="./AnalysisIndex"> Analysis </Link></li>
                </ul>
            </nav>
        </div>
        </>
    );
}