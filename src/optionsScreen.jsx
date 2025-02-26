import React, {useEffect, useState} from 'react'; import './optionsScreen.css';

// Functional Component to Create the Options Screen which is Displayed when Reverse Geocoding is Complete.
const OptionsScreen = () => {
  return (
    <div className="options-container">
      <h1>Your Address List has been Created. What Next?</h1> <div className="buttons-container">
        <button>Download Address List</button> <button>Create Letters/Postcards</button>
      </div>
    </div>
  );
}

export default OptionsScreen;
