import React from "react"; import { MdOutlineFileDownload } from "react-icons/md"; import { IoIosMail } from "react-icons/io"; import { ImMagicWand } from "react-icons/im";
import {writeAddressesToCSV, writeAddressesToXLSX, writeAddressesToXLS} from './reverseGeocoding.jsx'; import './optionsScreen.css';

const OptionsScreen = () => {
  return (
    <div className="options-container">
      <h1 className="options-title">Your Address List has been Created. What's Next?</h1>
      <div className="buttons-container">
        <div className="option-box">
          <div className="download-content">
            <MdOutlineFileDownload className="download-icon"/>
            <h2>Download Address List</h2> <p>Select the File Type you would like to Download the Address List as:</p>
            <div className="download-content-buttons-group">
              <button onClick={writeAddressesToXLSX}>.xlsx</button> <button onClick={writeAddressesToXLS}>.xls</button> <button onClick={writeAddressesToCSV}>.csv</button>
            </div>
          </div>
        </div>
        <div className="option-box">
          <div className="generate-content">
            <IoIosMail className="generate-icon"/> <h2>Create your Letter or Postcard</h2>
            <p className="AI-content">
              <span className="wand-container"> <ImMagicWand className="wand-icon"/> Build your Personalised Letter or Postcard Effortlessly with AI. </span>
            </p>
            <p className="example">
              Customise the content, design, and tone of each letter to connect with stakeholders on a personal level — showing them how valued they are by your
              organisation!
            </p>
            <div className="taster"> <p>COMING SOON</p> </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OptionsScreen;
