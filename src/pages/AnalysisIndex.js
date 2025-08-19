import { Link } from "react-router-dom"

export function AnalysisIndex() {

    return (
        <>
        <h2>Canadian Employment Visualizer Tool</h2>
        <h3>Index For Analysis</h3>
        <div>
            <nav>
                <ul>
                    <li><Link to="/"> Go back home </Link></li>
                    <li><Link to="./indigenous"> Indigenous Analysis </Link></li>
                    <li><Link to="./immigrants"> Immigrants Analysis </Link></li>
                </ul>
            </nav>
        </div>
        </>
    );
}