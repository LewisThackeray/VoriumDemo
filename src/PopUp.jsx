// Importing the Necessary Modules for my Implementation.
import React from 'react'; import './PopUp.css'; import {IoIosWarning} from "react-icons/io"; import {IoCloseOutline} from "react-icons/io5";

// Functional Component to Create a Pop-Up when Called, Displaying Information to the User.
const PopUp = ({title, message, closePopUp}) => {
  return (
    <div className='popup-outer'>
      <div className='popup-inner'>
        <IoIosWarning size={40} className='popup-image'/> <h2 className='popup-title'>{title}</h2> <p className='popup-message'>{message}</p>
        <button className='popup-close-button-outer' onClick={closePopUp}> <IoCloseOutline size={24} className='popup-close-button-inner'/> </button>
      </div>
    </div>
  );
}

export default PopUp;
