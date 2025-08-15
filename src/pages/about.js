import { Link } from "react-router-dom";

export function About() {

    return (
        <div>
        <h2>Canadian Employment Visualizer Tool</h2>
        <h3>About Page</h3>
        <nav>
            <ul>
                <li><Link to="/"> Go back home </Link></li>
            </ul>
        </nav>
        </div>
    );
}