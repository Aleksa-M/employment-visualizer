import { Link } from "react-router-dom"
import "./test.css"

export function Home() {
    return (
        <>
        <link rel="stylesheet" href="test.css"></link>
        <header><h2>Canadian Employment Visualizer Tool</h2></header>
        <div className="content">
                <nav>
                    <ul>
                        <li><Link to="./analysis-index/indigenous"> Interactive Map </Link></li>
                        <li><Link to="./primer-temp"> Temp for primer </Link></li>
                    </ul>
                </nav>

                <p>
                    The Canadian Employment Visualizer is an interactive tool that helps users explore employment trends 
                    and labour market data across Canada. It allows you to view regional differences, track changes over 
                    time, and compare key indicators such as youth employment, Indigenous participation, and sector-specific 
                    trends. By turning complex statistics into clear visuals, the tool makes it easier to understand how 
                    Canada’s workforce is evolving.
                </p>
            </div>
        </>
    );
}
