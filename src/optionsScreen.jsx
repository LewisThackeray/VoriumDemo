import React, {useEffect, useState} from 'react'; import { MdOutlineFileDownload } from "react-icons/md"; import './optionsScreen.css';

const OptionsScreen = () => {
  return (
    <div className="options-container">
      <h1 className="options-title">Your Address List has been Created. What's Next?</h1>
      <div className="buttons-container">
        <div className="option-box">
          <div className="download-content">
            <MdOutlineFileDownload className="download-icon" />
            <h2>Download Address List</h2> <p>Select the File Type you would like to Download the Address List as:</p>
            <div className="download-content-buttons-group"> <button>.xlsx</button> <button>.xls</button> <button>.csv</button> </div>
          </div>
        </div>
        <div className="option-box">Option 2</div>
      </div>
    </div>
  );
}

export default OptionsScreen;
