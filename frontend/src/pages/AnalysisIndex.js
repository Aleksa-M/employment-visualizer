import { Link } from "react-router-dom"
import "./test.css"
export function AnalysisIndex() {

    return (
        <>
        <h2>Canadian Employment Visualizer Tool</h2>
        <h3>Index For Analysis</h3>
        <div>
            <nav>
                <ul>
                    <li><Link to="/"> Go back home </Link></li>
                    <li><Link to="./Indigenous"> Indigenous Analysis </Link></li>
                </ul>
            </nav>
        </div>
        </>
    );
}