// Importing the Necessary Modules for my Implementation.
import React, {useState, useEffect, useRef} from 'react'; import {CiZoomIn, CiZoomOut} from 'react-icons/ci'; import {GrFormAdd} from 'react-icons/gr';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils'; import Graphic from '@arcgis/core/Graphic'; import './App.css';
import {IoMenu, IoCloseOutline} from 'react-icons/io5'; import Polyline from '@arcgis/core/geometry/Polyline'; import {loadModules} from 'esri-loader';
import ReactDOM from 'react-dom/client'; import PopUp from './PopUp.jsx'; import {IoIosContact} from "react-icons/io"; import message from './processing.jsx';
import LoadingScreen from './loadingScreen.jsx'

// This is a Shared State between App.jsx and Processing.jsx for Holding Coordinates and Tracking Progress.
const sharedState = {vertices: [], dataURL: '', bounds: [], progress: 0};

// Defining Constants to be Used in my Application.
const threshold = 768; const earthRadius = 6378137; const maxZoomLevel = 20; const minZoomLevel = 7; const sketchThreshold = 16;

// Function to Convert a Mercator X Coordinate to a Longitudinal Value.
function mercatorXToLongitude(x) {return (x / earthRadius) * (180 / Math.PI);}

// Function to Convert a Mercator Y Coordinate to a Latitudinal Value.
function mercatorYToLatitude(y) {return ((2 * Math.atan(Math.exp(y / earthRadius))) - (Math.PI / 2)) * (180 / Math.PI);}

// Main Component of my React Application.
function App() {

  // Creating State and Reference Variables for Data Handling and Document Object Model (DOM) Manipulation.
  const [windowWidth, setWindowWidth] = useState(window.innerWidth); const [isShowingLoadingScreen, setIsShowingLoadingScreen] = useState(false);
  const [isSketchDrawn, setIsSketchDrawn] = useState(false); const [isDrawing, setIsDrawing] = useState(false); const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShowingButtons, setIsShowingButtons] = useState(false); const [isPopUpOpen, setIsPopUpOpen] = useState(false);

  const [popUpTitle, setPopUpTitle] = useState(''); const [popUpMessage, setPopUpMessage] = useState(''); const [polygonPoints, setPolygonPoints] = useState([]);
  const[drawnGraphics, setDrawnGraphics] = useState([]); const [coordinates, setCoordinates] = useState([]);

  const shapeRef = useRef(false); const mapRef = useRef(null); const viewRef = useRef(null); const sketchRef = useRef(null); const graphicsLayerRef = useRef(null);

  // Updating the Window Width when the Window is Resized.
  useEffect(() => {
    const handleResize = () => {setWindowWidth(window.innerWidth)};
    window.addEventListener('resize', handleResize); return () => {window.removeEventListener('resize', handleResize);};
  }, []);

  // Showing or Hiding the Buttons based on the Window Width and whether the Application is in "Drawing State", for the User to Draw on the Map.
  useEffect(() => {
    if (windowWidth < threshold) {setIsShowingButtons(false);} else if (drawnGraphics.length > 0) {setIsShowingButtons(true);}
    else if ((document.getElementById('doneButton')) && (document.getElementById('cancelButton'))) {setIsShowingButtons(true)} else {setIsShowingButtons(false);}
  }, [windowWidth, drawnGraphics]);

  // Load ESRI Map Modules and Initialise the Map View.
  useEffect(() => {

    const APIKey = 'AAPK4604558b826347378511cef6b5d1a4a6-BlB1_ieB3va36SG742WM1Y8nQhuK2T509cTExm3ZE1LPxOxR0f00HZtVps3BniP';
    loadModules(['esri/Map', 'esri/views/MapView', 'esri/config', 'esri/widgets/Search', 'esri/widgets/Sketch', 'esri/layers/GraphicsLayer', 'esri/Graphic',
    'esri/geometry/Polygon'], {css: true}).then(([Map, MapView, esriConfig, Search, Sketch, GraphicsLayer, Graphic, Polygon]) => {

      // Using the ESRI Map Modules through my API Key and Removing any Existing "Done" or "Cancel" Buttons from the User Interface.
      esriConfig.apiKey = APIKey; const doneButton = document.getElementById('doneButton'); const cancelButton = document.getElementById('cancelButton');
      if (doneButton) {doneButton.remove()}; if (cancelButton) {cancelButton.remove()};

      const map = new Map({basemap: 'streets-vector'}); // Creating the Map Object.

      // Creating the MapView Object.
      const view = new MapView({
        container: mapRef.current, map: map, center: [-0.118092, 51.509865], zoom: 13, ui: {components: ["attribution"]}, minZoom: minZoomLevel, maxZoom: maxZoomLevel
      });

      // Creating a Layer to Hold the Drawings on the Map.
      const graphicsLayer = new GraphicsLayer(); map.add(graphicsLayer); graphicsLayerRef.current = graphicsLayer;

      // Handling a Single Click for a Polygon on the Map.
      view.on('click', (event) => {if (isDrawing) {const point = event.mapPoint; setPolygonPoints(prev => [...prev, [point.longitude, point.latitude]]);}});

      // Handling a Double Click for Completing the Drawing of the Polygon on the Map.
      view.on('double-click', (event) => {
        if (isDrawing && polygonPoints.length > 2){
          const polygon = new Polygon({rings: [polygonPoints.concat(polygonPoints[0])], spatialReference: view.spatialReference});
          const graphic = new Graphic({geometry: polygon, symbol: {type: 'simple-fill', colour: [255,255,255,0], outline: {color: 'black', width: 1}}});
          graphicsLayer.add(graphic); setIsDrawing(false); setPolygonPoints([]);
        }
      });

      // Adding the Search Widget to the Map View.
      const searchWidget = new Search({view: view}); view.ui.add(searchWidget, {position: "top-right"}); viewRef.current = view;

      // Initialise the Sketch Widget for Drawing Shapes.
      const sketch = new Sketch({
        view: view, layer: graphicsLayer, availableCreateTools: ["polygon", "rectangle"], creationMode: 'update', visibleElements: {selectionTools: false,
        settingsMenu: false, undoRedoMenu: false, createTools: ["polygon", "rectangle"]}
      }); sketchRef.current = sketch;

      // Handling the Creation of a Sketch on the Map.
      sketch.on('create', (event) => {
        if (event.state === 'complete') {
          event.graphic.symbol = {type: 'simple-fill', color: [0,0,0,0], outline: {color: 'black', width: 2}}; graphicsLayerRef.current.add(event.graphic);
          if (event.graphic.geometry.type == 'polygon') { // Getting the Coordinates of the Vertices of the Polygon.
            const rings = event.graphic.geometry.rings; rings[0].forEach(([x,y]) => {const long = mercatorXToLongitude(x); const lat = mercatorYToLatitude(y);
              const isDuplicate = sharedState.vertices.some(vertex => vertex.longitude === long && vertex.latitude === lat);
              if (!isDuplicate) {sharedState.vertices.push({longitude: long, latitude: lat});}
            });
          } else if (event.graphic.geometry.type === 'rectangle') { // Getting the Coordinates of the Vertices of the Rectangle.
            const {xmin, ymin, xmax, ymax} = event.graphic.geometry.extent;
            const vertices = [{x: xmin, y: ymin}, {x: xmax, y: ymin}, {x: xmax, y: ymax}, {x: xmin, y: ymax}];
            vertices.forEach(({x,y}) => {
              const long = mercatorXToLongitude(x); const lat = mercatorYToLatitude(y);
              const isDuplicate = sharedState.vertices.some(vertex => vertex.longitude === long && vertex.latitude === lat);
              if (!isDuplicate) {sharedState.vertices.push({longitude: long, latitude: lat});}
            });
          }
          setIsSketchDrawn(true); shapeRef.current = true; setDrawnGraphics(prevGraphics => [...prevGraphics, {graphic: event.graphic}]);
        }
      });

      // Handling the Deletion of a Sketch on the Map
      sketch.on('delete', (event) => {if (event.graphics.length > 0) {setDrawnGraphics([]); shapeRef.current = false; setIsShowingButtons(false);}});

      // Allowing the User to Control the Zoom Level on the Map using the Scroll Wheel on their Mouse.
      view.on("mouse-wheel", event => {
        if (event.deltaY < 0 && view.zoom >= maxZoomLevel) {event.stopPropagation();} else if (event.deltaY > 0 && view.zoom <= minZoomLevel) {event.stopPropagation();}
      });

      view.watch("zoom", (newZoom) => {if (newZoom !== 17) {closeSketchWidget();}}); // Ensuring the User cannot Sketch on the Map if the Zoom Level Changes.

    }).catch(err => console.error(err));
  }, [])

  // Preventing the User from Sketching another Shape on the Map when a Sketch has Already been Drawn.
  useEffect(() => {if (isSketchDrawn) {viewRef.current.ui.remove(sketchRef.current); setIsSketchDrawn(false);}}, [isSketchDrawn])

  // Handling the Processing of the Shape Drawn on the Map when the "Done" Button is Clicked.
  const handleDoneClick = async () => {

    if (sketchRef.current) {viewRef.current.ui.remove(sketchRef.current);} // Removing the Sketch Widget from the UI and Clearing the Graphics Layer.

    // Adding the Vertices from the Polygon or Rectangle to the Map.
    if (graphicsLayerRef.current) {
      graphicsLayerRef.current.removeAll(); sharedState.vertices.forEach((vertex) => {
        const point = {type: 'point', longitude: vertex.longitude, latitude: vertex.latitude};
        const pointGraphic = new Graphic({geometry: point, symbol: {type: 'simple-marker', color: 'red', size: '8px', outline: {color: 'black', width: 1}}});
        graphicsLayerRef.current.add(pointGraphic);
      });
    }

    // Connecting the Vertices of the Polygon or Rectangle on the Map using Lines.
    if (sharedState.vertices.length > 1) {
      for (let i = 0; i < sharedState.vertices.length - 1; i++) {
        const start = sharedState.vertices[i]; const end = sharedState.vertices[i + 1];
        const polyline = new Polyline({paths: [[start.longitude, start.latitude], [end.longitude, end.latitude]], spatialReference: {wkid: 4326}});
        const lineGraphic = new Graphic({geometry: polyline, symbol: {type: 'simple-line', color: 'black', width: 2}}); graphicsLayerRef.current.add(lineGraphic);
      }
    }

    // Connecting the First Vertex in the Polygon with the Last Vertex, hence Closing the Polygon.
    if (sharedState.vertices.length > 2) {
      const first = sharedState.vertices[0]; const last = sharedState.vertices[sharedState.vertices.length - 1];
      const closingPolyline = new Polyline({paths: [[last.longitude, last.latitude], [first.longitude, first.latitude]], spatialReference: {wkid: 4326}});
      const closingLineGraphic = new Graphic({geometry: closingPolyline, symbol: {type: 'simple-line', color: 'black', width: 2}});
      graphicsLayerRef.current.add(closingLineGraphic);
    }

    // Take an Image of the Polygon/Rectangle and the Surrounding Area to Process and Feed into the API to Find the Addresses of the Properties within the Sketch.
    const extent = viewRef.current.extent; const geographicExtent = webMercatorUtils.webMercatorToGeographic(extent);
    const { xmin, ymin, xmax, ymax } = geographicExtent; const graphics = graphicsLayerRef.current.graphics.toArray();

    if (graphics.length > 0) {
        try {
            const graphic = graphics[0]; const extent = graphic.geometry.extent || graphic.geometry;
            if (!extent) {showErrorPopup("There is no Polygon or Rectangle to Capture! Please try again."); return;}
            viewRef.current.extent = extent; await viewRef.current.when();

            const canvas = document.createElement('canvas'); canvas.width = viewRef.current.width; canvas.height = viewRef.current.height;
            const ctx = canvas.getContext('2d');

            await new Promise((resolve) => {
                viewRef.current.when(() => {
                    viewRef.current.takeScreenshot().then((screenshot) => {
                        const img = new Image(); img.src = screenshot.dataUrl; img.onload = () => {
                            ctx.drawImage(img, 0, 0); sharedState.dataURL = canvas.toDataURL('image/png'); sharedState.bounds = { xmin, ymin, xmax, ymax };
                            message(sharedState, (pointsToReverseGeocode) => {setCoordinates(pointsToReverseGeocode);}); setIsShowingLoadingScreen(true);
                        }; resolve();
                    }).catch((error) => {showErrorPopup("Screenshot couldn't be taken!");});
                });
            });
        } catch (error) {showErrorPopup("Failed to capture the graphic. Please try again!");}
    } else {console.error("No graphics available to capture.");}
    setIsShowingLoadingScreen(false);
  };

  // Handling the Processing of the Shape Drawn on the Map when the "Cancel" Button is Clicked.
  const handleCancelClick = () => {
    if (graphicsLayerRef.current) {graphicsLayerRef.current.removeAll()}; setPolygonPoints([]); setDrawnGraphics([]); sharedState.vertices = []; setIsDrawing(false);
    setIsSketchDrawn(false); shapeRef.current = false; setIsShowingButtons(false); viewRef.current.ui.add(sketchRef.current, 'manual');
  }

  // Handling the Closing of the Sketch Widget and the Tools used to Draw on the Map.
  const closeSketchWidget = () => {
    if (sketchRef.current && viewRef.current) {
      viewRef.current.ui.remove(sketchRef.current);
      if (graphicsLayerRef.current) {graphicsLayerRef.current.removeAll()}; setDrawnGraphics([]); setIsShowingButtons(false); shapeRef.current = false;
    }
  }

  const zoomIn = () => {if (viewRef.current && viewRef.current.zoom < maxZoomLevel) {viewRef.current.zoom += 1}}; // Allowing the User to Zoom In on the Map.

  const zoomOut = () => {if (viewRef.current && viewRef.current.zoom > minZoomLevel) {viewRef.current.zoom -= 1}}; // Allowing the User to Zoom Out on the Map.

  const toggleMenu = () => {setIsMenuOpen(prevState => !prevState)}; // Allowing the User to Open and Close the Toggleable Side Menu.

  const showErrorPopUp = (message) => {setPopUpTitle('WARNING!'); setPopUpMessage(message); setIsPopUpOpen(true);} // Creating an Error Message if an Error Occurs.

  // Creating the Toolbar which Stores the Tools the User Requires to Draw a Polygon or Rectangle on the Map.
  const polygonTool = () => {
    if (viewRef.current) {
      if (viewRef.current.zoom <= sketchThreshold) {
        if (viewRef.current.ui.find('sketchWidget')) {closeSketchWidget();} showErrorPopUp("You need to zoom in further to create a new polygon.");
      } else {
        if (sketchRef.current) {
          if (!viewRef.current.ui.find('sketchWidget')) {
            viewRef.current.zoom = 17; viewRef.current.ui.add(sketchRef.current, 'manual');
            sketchRef.current.container.classList.add('sketchWidget'); const closeButton = document.createElement('button');
            closeButton.onclick = () => closeSketchWidget(); sketchRef.current.container.appendChild(closeButton);

            const closeIcon = React.createElement(IoCloseOutline, { size: 20 }); const root = ReactDOM.createRoot(closeButton); root.render(closeIcon);
          }
        }
      }
    }
  }

  return (
    <div className="App">
      <aside className={`sidemenu ${isMenuOpen ? 'open' : 'closed'}`} id="sidemenu">
        <button className="contact-button">
          <IoIosContact size={30} className="contact-icon" onClick={() => window.location.href = "mailto:lewisthackeray123@outlook.com"} />
          <p className="contact-title">Contact</p>
        </button>
        <div className="sidemenu-company-info">
          <img src="./src/assets/images/logo.png" alt="logo" className="sidemenu-image"/> <p className="sidemenu-info"> © Vorium - March 2025 </p>
        </div>
        {windowWidth >= threshold && !isShowingButtons && (<GrFormAdd size={30} color='black' className='new-menu-open' onClick={polygonTool} />)}
      </aside>
      <section className="main">
        <IoMenu size={30} className={`menuIcon-menu-closed ${isMenuOpen ? 'menuIcon-menu-open' : ''}`} onClick={toggleMenu} />
        <div ref={mapRef} className="mapContainer"></div>
        <div className="custom-zoom-container">
          <div className="custom-zoom-button" onClick={zoomIn}> <CiZoomIn size={30} /> </div>
          <div className="custom-zoom-button" onClick={zoomOut}> <CiZoomOut size={30} /> </div>
          {!isShowingButtons && (<GrFormAdd size={30} className='new-menu-closed' onClick={polygonTool}/>)};
        </div>
      </section>
      {isShowingButtons && (
        <div className='button-container'>
          <button id='doneButton' className='doneButton' onClick={handleDoneClick}>Done</button>
          <button id='cancelButton' className='cancelButton' onClick={handleCancelClick}>Cancel</button>
        </div>
      )}
      {isPopUpOpen && <PopUp closePopUp={() => setIsPopUpOpen(false)} title={popUpTitle} message={popUpMessage} />}
      {isShowingLoadingScreen && <LoadingScreen coordinates={coordinates}/>}
    </div>
  );
}

export default App; export {sharedState};
