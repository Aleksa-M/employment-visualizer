import { Link } from "react-router-dom"

export function Home() {
    return (
        <div>
        <nav>
        <ul>
            <li><Link to="./about"> Log In </Link></li>
            <li><Link to="./indigenous"> Sign Up </Link></li>
        </ul>
        </nav>
        </div>
    );
}