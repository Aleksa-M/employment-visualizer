import { Link } from "react-router-dom";
import "./home.css";
import logo from  "../assets/glocal_logo.png";


export function Home() {
    return (
        <>
            <div className="logo">
                <img src={logo} alt="This project was created under the GLOCAL Foundation of Canada"></img>
            </div>
            <div className="nav-page">
                <h2>Canadian Employment Visualizer Tool</h2>
                
                <div className="nav-content">
                    <div className="card-wrapper" style={{marginLeft: '10em'}}>
                        <h3>Analysis Index</h3>
                        <div className="card">
                            <nav>
                                <ul>
                                    <li><Link to="./indigenous"> Indigenous Analysis </Link></li>
                                    <li><Link to="./immigrants"> Immigrants Analysis </Link></li>
                                    <li><Link to="./women"> Women Analysis </Link></li>
                                    <li><Link to="./disability"> Disability Analysis </Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>

                    <div className="card-wrapper">
                        <h3>About</h3>
                        <div className="card">
                            <p>
                                The Canadian Employment Visualizer is an interactive tool that helps users explore 
                                employment trends and labour market data across Canada. It allows you to view regional 
                                differences and track changes over time across different population demographics. Currently,
                                pages for Indigenous people, immigrants, people with disabilities, and women are supported.
                                On each page, you can read a primer on employment facts about the page's demographic and 
                                view data using an interatactive chart.
                            </p>
                        </div>
                    </div>

                    <div className="card-wrapper" style={{marginRight: '15em'}}>
                        <h3>Interface Guide</h3>
                        <div className="card">
                            <p>
                                Each analysis page has an interactive chart component and a primer sidebar. The sidebar and can
                                be horizontally expanded and retracted by dragging the left edge horizontally, and can be moved
                                up and down by scrolling while hovering over the sidebar or dragging the sidebar scroll bar. The
                                interactive chart has four components: the map of Canada, the trend controls, the line graph, and
                                the unavailable trends. By default, data displayed will be for all of Canada, but by clicking a
                                province, the region of data will be set to that province. The controls section lets you set which
                                filters you want to apply to the data. the specific filers vary by demoraphic, but the data being
                                outputted will be plotted as a line graph, which will have a horizontal component in years and a
                                vertical component in percentage of the observed sub population (determined by the filters.) When
                                you ress fetch chart, the data will be compiled from various Statistics Canada databases and the tool
                                will try to display a line for every possible combination of filters you chose. Some filters either can
                                not be applied to the available databases or the data is unsufficient, which will result in the filter
                                combination name being displayed in the unavailable trends section.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
}