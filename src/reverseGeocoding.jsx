import {loadModules} from "esri-loader"; import * as XLSX from "xlsx"; // Importing the Necessary Modules for my Implementation.

let addresses = [];

// Function Responsible for Controlling the Flow of Data in this File, Reverse Geocoding the Coordinates Provided to Gain Addresses which Letters can be Sent To.
async function getAddresses(coordinates) {

  if (!coordinates) {console.error("Coordinates are undefined"); return;} // Checking if there are Coordinates to be Processed.

  try {

    // Loading the ESRI Modules for Geocoding Functionality and the API Key for Authentication with the Geocoding Service.
    const [esriConfig, locator] = await loadModules(['esri/config', 'esri/rest/locator']);
    const API_KEY = "AAPK4604558b826347378511cef6b5d1a4a6-BlB1_ieB3va36SG742WM1Y8nQhuK2T509cTExm3ZE1LPxOxR0f00HZtVps3BniP";
    esriConfig.apiKey = API_KEY; const serviceURL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"; const myAddresses = [];

    if (coordinates.length > 0) {

      // If there are Coordinates to Process, we Iterate through Each Coordinate in the Array of Coordinates.
      for (let i = 0; i < coordinates.length; i++) {
        const coordinate = coordinates[i]; const {longitude, latitude} = coordinate;
        try {
          // Request the Given Address for the Coordinate using the Locator Service and Convert the API Response to JSON for Simplicity.
          const response = await locator.locationToAddress(serviceURL, {location: {x: coordinate.longitude, y: coordinate.latitude}});
          const responseJSON = response.toJSON ? response.toJSON() : response; const address = responseJSON.attributes.LongLabel; myAddresses.push(address);
        } catch (error) {console.error("Reverse Geocoding Error at: Longitude: " + longitude + " Latitude: " + latitude);}
      }

      // Checking the Addresses are in the Correct Format, and if they Need Correcting, the Function is Responsible for this.
      const finalArray = await removeDuplicates(myAddresses); const Array2D = await orderAddresses(finalArray); const correctedArray = await checkAddresses(Array2D);
      addresses = correctedArray;
    }

  } catch (error) {console.error("Reverse Geocoding Failed! " + error);}

}

// Function Responsible for Checking that the Addresses are in the Correct Format, and Making Corrections if Necessary.
async function checkAddresses(Array2D) {

  const newArray2D = []; // Initialising a New 2D Array to Store New Processed Addresses and then Iterating through Each Row of the Input 2D Array.

  for (let i = 0; i < Array2D.length; i++) {

    const addressParts = Array2D[i][0].split(" ");

    // Check if the First Part Matches a Range Pattern like 9-12 using Regex as this is Invalid
    if (/^\d+-\d+$/.test(addressParts[0])) {
      const findBoundaries = addressParts[0].split("-"); const lowerBoundary = parseInt(findBoundaries[0], 10); const upperBoundary = parseInt(findBoundaries[1], 10);

      if (lowerBoundary === upperBoundary) { // Handle the Case where the Range is Redundant (e.g. 77-77)
        addressParts[0] = lowerBoundary.toString(); newArray2D.push([addressParts.join(" "), ...Array2D[i].slice(1)]);
      } else if (lowerBoundary !== upperBoundary) { // Handle the Case where there is an Actual Range (e.g. 9-12).

        for (let b = lowerBoundary; b <= upperBoundary; b++) {
          const newAddress = b + " " + addressParts.slice(1).join(" "); newArray2D.push([newAddress, ...Array2D[i].slice(1)]);
        }
      }
    } else {newArray2D.push(Array2D[i]);} //
  }
  return newArray2D; // Return the Processed 2D Array with the Correct Addresses.
}

// Function Responsible for Ordering Addresses by Splitting Each Address into an Array of Components.
async function orderAddresses(addresses) {for (let i = 0; i < addresses.length; i++) {addresses[i] = addresses[i].split(",");} return addresses;}

// Function Responsible for Removing Duplicate Addresses from the Array.
async function removeDuplicates(addresses) {
  const sortedArray = addresses.sort(); for (let j = 1; j < sortedArray.length; j++) {if (sortedArray[j - 1] === sortedArray[j]) {sortedArray.splice(j, 1); j--;}}
  return sortedArray;
}

// Function Responsible for Getting the Date in the Format, dd-mm-yyyy, for Use in the File Name so the User can Differentiate between Address Lists.
function getDate() {
  const today = new Date(); const day = String(today.getDate()).padStart(2, '0'); const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear(); return `${day}-${month}-${year}`;
}

// Function Responsible for Writing the Addresses to an XLSX Document for the User to Download.
async function writeAddressesToXLSX() {
  const workbook = XLSX.utils.book_new(); const worksheet = XLSX.utils.aoa_to_sheet(addresses); XLSX.utils.book_append_sheet(workbook, worksheet, "Addresses");
  const fileName = `Address List - ${getDate()}.xlsx`; XLSX.writeFile(workbook, fileName);
}


// Function Responsible for Writing the Addresses to an XLS Document for the User to Download.
async function writeAddressesToXLS() {
  const workbook = XLSX.utils.book_new(); const worksheet = XLSX.utils.aoa_to_sheet(addresses);  XLSX.utils.book_append_sheet(workbook, worksheet, "Addresses");
  const fileName = `Address List - ${getDate()}.xls`; XLSX.writeFile(workbook, fileName);
}

// Function Responsible for Writing the Addresses to a CSV Document for the User to Download.
async function writeAddressesToCSV() {
  // IMPLEMENT THIS FUNCTION FOR ME!!!
}

export default getAddresses; export {writeAddressesToXLSX, writeAddressesToXLS, writeAddressesToCSV};
