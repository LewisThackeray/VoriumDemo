const threshold = 238; // Creating a Threshold which is used to Create the Greyscale Image into a Binary Image.

// Function to Create a Canvas which the Updated Image is Drawn onto During Processing.
function createCanvas(width, height) {const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas.getContext('2d');}

// Function to Load an Image.
async function loadImage(source) {
  return new Promise((resolve, reject) => {const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = source; img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to Load the Image!"));
  });
}

// Function to Display an Image in a New Browser Window. *** USED ONLY FOR TESTING *** -< PROBLEM EXISTS HERE!!!
function displayImage(source, windowName = 'Image Viewer', width = 800, height = 600) {
  const newWindow = window.open('', windowName, 'width=${width},height=${height}'); if (!newWindow) {new Error("Failed to Open a New Window!"); return;}
  const linkCSS = newWindow.document.createElement('link'); linkCSS.rel = 'stylesheet'; linkCSS.href = '../src/processing.css';
  const img = newWindow.document.createElement('img'); img.src = source; img.alt = 'Image'; newWindow.document.head.appendChild(linkCSS);
  newWindow.document.body.appendChild(img);
}


// Function to Add a Dot on the Image at a Specified Coordinate.
async function addDot(source, xCoordinate, yCoordinate) {
  const img = await loadImage(source); const canvas = createCanvas(img.width, img.height); canvas.drawImage(img, 0, 0); canvas.fillStyle('blue'); canvas.beginPath();
  canvas.arc(xCoordinate, yCoordinate, 10, 0, 2 * Math.PI); canvas.fill(); return canvas.canvas.toDataURL();
}

// Step 1: Convert the Image to a Greyscale Image.  Below is a Function to Convert the Image to a Greyscale Image.
async function greyscale(source) {

  // Loading the Image, Creating the Canvas, Drawing the Image on the Canvas and Getting the Image Data from the Canvas.
  const img = await loadImage(source); const canvas = createCanvas(img.width, img.height); canvas.drawImage(img, 0, 0);
  const imageData = canvas.getImageData(0, 0, canvas.canvas.width, canvas.canvas.height); const data = imageData.data;

  // Looping through the Image Data and Converting each Pixel to a Greyscale Pixel.
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]; const g = data[i + 1]; const b = data[i + 2]; const grey = (r + g + b) / 3; data[i] = grey; data[i + 1] = grey; data[i + 2] = grey;
  }

  // Placing the Greyscale Image onto the Canvas and Returing the Greyscale Image as a Data URL.
  canvas.putImageData(imageData, 0, 0); return canvas.canvas.toDataURL();
}

// Function which Controls the Process of Extracting the Addresses from the Screenshot of the Properties.
async function message(sharedState, callback) {const myImage = sharedState.dataURL; displayImage(await greyscale(myImage));}

export default message;
