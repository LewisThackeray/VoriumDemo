import React, { useMemo, useState, useEffect } from 'react'; import './loadingScreen.css';

const LoadingScreen = ({ coordinates, onLoadingComplete }) => {
  const [progress, setProgress] = useState(0); const dots = useMemo(() => {const dotsArray = []; const gridSize = 20;
    for (let row = 0; row < gridSize; row++) {for (let col = 0; col < gridSize; col++) {dotsArray.push({id: `dot-${row}-${col}`, row, col, gridSize});}}
    return dotsArray;
  }, []);

  useEffect(() => {if (coordinates && coordinates.length > 0) {const updateInterval = 100; const increment = 100 / coordinates.length;
      const interval = setInterval(() => {
        setProgress((prevProgress) => {if (prevProgress >= 100) {clearInterval(interval); onLoadingComplete(); return 100;} return prevProgress + increment;});
      }, updateInterval);
      return () => clearInterval(interval);
  } else {console.error("The Coordinates Array is Empty or Invalid!");}}, [coordinates, onLoadingComplete]);

  return (
    <div className="loading-container">
      <div className="dots-background">
        {dots.map((dot) => (<div key={dot.id} className="spinning-dot"
            style={{left: `${(dot.col / (dots.length ** 0.5)) * 100}%`, top: `${(dot.row / (dots.length ** 0.5)) * 100}%`,
              opacity: calculateOpacity(dot.row, dot.col, dot.gridSize), animationDelay: `${(dot.row + dot.col) * 0.05}s`
            }}
        ></div>))}
      </div>
      <div className="loading-content-box">
        <h1>Generating your Address List</h1>
        <div className="progress-container"> <div className="progress-bar" style={{ width: `${Math.round(progress)}%` }}> </div> </div>
        <p className="progress-percentage">{Math.round(progress)}% Complete</p> <p className="loading-hint">This may take a few moments...</p>
      </div>
    </div>
  );
}

const calculateOpacity = (row, col, gridSize) => {
  const centerRow = gridSize / 2;  const centerCol = gridSize / 2; const distanceX = Math.abs(col - centerCol); const distanceY = Math.abs(row - centerRow);
  const maxDistance = Math.sqrt((gridSize/2) * (gridSize/2) + (gridSize/2) * (gridSize/2));
  const currentDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY); return 1 - (currentDistance / maxDistance) * 0.9;
}

export default LoadingScreen;
