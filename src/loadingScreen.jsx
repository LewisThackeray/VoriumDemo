import React, {useEffect, useState} from 'react'; import './loadingScreen.css'; // Importing the Necessary Modules for my Implementation.

// Functional Component to Create the Loading Screen which is Displayed when Reverse Geocoding is being Performed on the Coordinates.
const LoadingScreen = ({coordinates}) => {
  const [progress, setProgress] = useState(0); useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const updateInterval = 100; const increment = 100 / coordinates.length; const interval = setInterval(() => {setProgress((prevProgress) => {
        if (prevProgress >= 100) {clearInterval(interval); return 100;} return prevProgress + increment;
      });}, updateInterval); return () => clearInterval(interval);
    } else {console.error("The Coordinates Array is Empty of Invalid!");}
  }, [coordinates]);

  return(
    <div className="loading-screen">
      <h1>Processing the Image ...</h1> <img src="../src/assets/images/icon.png" alt="Loading" className="loading-image"/>
      <div className="progress-container">
        <progress value={progress} max="100"></progress> <p>{Math.round(progress)}%</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
