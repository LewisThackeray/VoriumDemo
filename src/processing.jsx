const threshold = 238; // Creating a Threshold which is used to Create the Greyscale Image into a Binary Image.

// TO REDUCE THE AMOUNT OF NOISE I NEED TO APPLY A GAUSSIAN BLUR AND THEN REMOVE ANY OUTLIERS.

async function message(sharedState, callback) {

  const inputImage = sharedState.dataURL; const noRoadsImage = await removeRoads(inputImage); // STEP 1: Removing the Roads from the Input Image.

  // STEP 2: Creating an Abstraction around the Image being Processed by Changing the Colour of all the Pixels Outside of the Polygon or Rectangle to Black.
  const vertices = await localCoordinates(sharedState.bounds, noRoadsImage, sharedState.vertices); const abstractedImage = await abstraction(noRoadsImage, vertices);

  // STEP 3: Convert the Image into a Greyscale Image for use in the Harris Corner Detection Algorithm.
  const greyscaleImage = await greyscale(abstractedImage);

  // STEP 4: Find the Corners of the Properties in the Polygon or Rectangle using the Harris Corner Detection Algorithm.

  // Pre-Processing the Image to Reduce Noise by Applying a Gaussian Blur, then Converting the Image to a Binary Image and then back to a Greyscale Image.
  const preProcessedImage = await gaussianBlur(greyscaleImage); const pre = await binary(preProcessedImage); const cleanedGreyscale = await greyscale(pre);

  const corners = await harrisCornerDetectionAlgorithm(cleanedGreyscale); displayImage(corners.image); // Applying the Harris Corner Detection Algorithm.

  console.log("Corners: " + JSON.stringify(corners.corners)); 

  // STEP 5: Create a Convex Hull for Each Property in the Polygon or Rectangle which the User has Drawn on the Map.

  // STEP 6: Choose a x,y Point within Each Convex Hull for Reverse Geocoding.
}

// Function to Create a Canvas which the Updated Image is Drawn onto when Processing an Image.
function createCanvas(width, height) {const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas.getContext('2d');}

// Function to Load an Image from a Data URL.
async function loadImage(source) {
  const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = source;
  return new Promise((resolve, reject) => {img.onload = () => resolve(img); img.onerror = () => reject(new Error("Failed to Load the Image!"));})
}

// Function used in Testing to Display an Image in a New Browser Window.
function displayImage(image, windowName = 'Image Viewer', width = 800, height = 600) {
  const newWindow = window.open('', windowName, `width=${width},height=${height}`); if (!newWindow) {throw new Error("Failed to Open a New Window!"); return;}
  const doc = newWindow.document; doc.head.innerHTML = `<link rel="stylesheet" href="../src/processing.css">`;
  doc.body.innerHTML = `<img src="${image}" alt="Image">`;
}

// Function to Convert Coordinates from Longitude, Latitude Coordinates to Pixel Coordinates in the Image.
function localCoordinates(bounds, imageDataURL, vertices) {
    const { xmin, ymin, xmax, ymax } = bounds; const pixelCoordinates = []; const img = new Image(); img.src = imageDataURL; return new Promise((resolve) => {
        img.onload = function() {vertices.forEach(function(vertex) {
                const { longitude, latitude } = vertex; const x = ((longitude - xmin) / (xmax - xmin)) * img.width;
                const y = ((ymax - latitude) / (ymax - ymin)) * img.height; pixelCoordinates.push({ x, y });
            }); resolve(pixelCoordinates);
        };
    });
}

// Function to Remove the Roads in an Image.
async function removeRoads(source) {

  // Loading the Image, Creating the Canvas, Drawing the Image on the Canvas and Getting the Image Data from the Canvas.
  const img = await loadImage(source); const canvas = createCanvas(img.width, img.height); canvas.drawImage(img, 0, 0);
  const imageData = canvas.getImageData(0, 0, canvas.canvas.width, canvas.canvas.height); const data = imageData.data;

  // Looping through the Image Data and Removing any Roads in the Image which May Cause Unexpected Results during Reverse Geocoding.
  for (let i = 0; i < data.length; i += 4) {if (data[i] === data[i + 1] && data[i + 1] === data[i + 2]) {data[i] = data[i + 1] = data[i + 2] = 0;}}

  // Placing the Updated Image without Roads onto the Canvas and Returning the Updated Image as a Data URL.
  canvas.putImageData(imageData, 0, 0); return canvas.canvas.toDataURL();

}

// Function which uses the Ray Casting Algorithm to Determine whether a Point lies inside the Polygon or Rectangle which the User has Drawn.
function rayCastingAlgorithm(vertices, point) {

  // Initialising a Flag to Track whether the Point is Inside the Polygon or Rectangle and Looping through Each Edge in the Polygon.
  let inside = false; for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {

    // Extracting the Coordinates of the Current and Previous Vertex.
    const xi = vertices[i].x; const yi = vertices[i].y; const xj = vertices[j].x; const yj = vertices[j].y;

    // Checking if the Ray Created Intersects the Edge of the User Selected Area, if there is an Intersection, the Point lies Inside the Polygon or Rectangle.
    const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi); if (intersect) {inside = !inside;}

  } return inside; // Returning the Result of the Ray Casting Algorithm.
}

// Function to Create an Abstraction around the Processing of the Properties by Ignoring Properties Outside of the User Selected Area.
async function abstraction(source, vertices) {

  // Loading the Image, Creating the Canvas, Drawing the Image on the Canvas and Getting the Image Data from the Canvas.
  const img = await loadImage(source); const canvas = createCanvas(img.width, img.height); canvas.drawImage(img, 0, 0);
  const imageData = canvas.getImageData(0, 0, canvas.canvas.width, canvas.canvas.height); const data = imageData.data;

  // Looping through the Image Data and Changing the Colour of Pixels outside of the User Selected Area to Black.
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % img.width; const y = Math.floor(i / 4 / img.width); const point = {x: x, y: y}; if (!rayCastingAlgorithm(vertices, point)) {
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }

  // Placing the Binary Image onto the Canvas and Returning the Binary Image as a Data URL.
  canvas.putImageData(imageData, 0, 0); return canvas.canvas.toDataURL();

}

// Function to Convert an Image to a Greyscale Image.
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

// Function to Pre-Process the Image, Applying a Gaussian Blur to Reduce Noise.
async function gaussianBlur(source) {

  // Loading the Image, Creating the Canvas, Drawing the Image on the Canvas and Getting the Image Data from the Canvas.
  const img = await loadImage(source); const canvas = createCanvas(img.width, img.height); canvas.drawImage(img, 0, 0);
  const imageData = canvas.getImageData(0, 0, canvas.canvas.width, canvas.canvas.height); const data = imageData.data;

  const temp = new Uint8ClampedArray(data.length); // Creating a Temporary Array to Store the Blurred Pixel Values.

  // Defining the Gaussian Kernel for Blurring - a 3x3 Kernel with Weights that Approximate a Gaussian Distribution.
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1]; const kernelSize = 3; const halfKernel = Math.floor(kernelSize / 2);

  // Looping through Each Pixel in the Image.
  for (let y = halfKernel; y < img.height - halfKernel; y++) {for (let x = halfKernel; x < img.width - halfKernel; x++) {
    let r = 0, g = 0, b = 0; for (let ky = -halfKernel; ky <= halfKernel; ky++) {for (let kx = -halfKernel; kx <= halfKernel; kx++) {
      const idx = ((y + ky) * img.width + (x + kx)) * 4; const kernelIdx = (ky + halfKernel) * kernelSize + (kx + halfKernel); r += data[idx] * kernel[kernelIdx];
      g += data[idx + 1] * kernel[kernelIdx]; b += data[idx + 2] * kernel[kernelIdx];
    }}
    const idx = (y * img.width + x) * 4; temp[idx] = r / 16; temp[idx + 1] = g / 16; temp[idx + 2] = b / 16; temp[idx + 3] = data[idx + 3];
  }}

  for (let i = 0; i < data.length; i++) {data[i] = temp[i];} // Copying the Blurred Pixels from the Temporary Array Back to the Original Image Data.

  // Placing the Greyscale Image onto the Canvas and Returing the Greyscale Image as a Data URL.
  canvas.putImageData(imageData, 0, 0); return canvas.canvas.toDataURL();

}

// Function to Convert a Greyscale Image to a Binary Image.
async function binary(greyscale) {

  // Loading the Image, Creating the Canvas, Drawing the Image on the Canvas and Getting the Image Data from the Canvas.
  const img = await loadImage(greyscale); const canvas = createCanvas(img.width, img.height); canvas.drawImage(img, 0, 0);
  const imageData = canvas.getImageData(0, 0, canvas.canvas.width, canvas.canvas.height); const data = imageData.data;

  // Looping through the Image Data and Converting each Pixel to a Binary Pixel.
  for (let i = 0; i < data.length; i += 4) {const grey = data[i]; const binary = grey >= threshold ? 255 : 0; data[i] = data[i + 1] = data[i + 2] = binary;}

  // Placing the Binary Image onto the Canvas and Returning the Binary Image as a Data URL.
  canvas.putImageData(imageData, 0, 0); return canvas.canvas.toDataURL();

}

// Function to Find the Corners of the Properties within the User Selected Area using the Harris Corner Detection Algorithm.
async function harrisCornerDetectionAlgorithm(greyscale) {

  // Loading the Greyscale Image, Creating the Canvas, Drawing the Image on the Canvas and Getting the Image Data from the Canvas.
  const img = await loadImage(greyscale); const canvas = createCanvas(img.width, img.height); canvas.drawImage(img, 0, 0);
  const imageData = canvas.getImageData(0, 0, canvas.canvas.width, canvas.canvas.height); const data = imageData.data;

  // Calculating the Gradient of Each Pixel using Sobel Operators.
  const width = img.width; const height = img.height; const Ix = new Float32Array(width * height); const Iy = new Float32Array(width * height);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]; const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]; // 3x3 Sobel Filters for Horizontal and Vertical Gradients.

  for (let y = 1; y < height - 1; y++) {for (let x = 1; x < width - 1; x++) {
    let gx = 0; let gy = 0; const idx = (y * width + x) * 4; for (let ky = -1; ky <= 1; ky++) {for (let kx = -1; kx <= 1; kx++) {
      const pixelIdx = ((y + ky) * width + (x + kx)) * 4; const pixelValue = data[pixelIdx]; const kernelIdx = (ky + 1) * 3 + (kx + 1);
      gx += pixelValue * sobelX[kernelIdx]; gy += pixelValue * sobelY[kernelIdx];
    }} Ix[y * width + x] = gx; Iy[y * width + x] = gy;
  }}

  // Calculating the Products of Gradients.
  const Ix2 = new Float32Array(width * height); const Iy2 = new Float32Array(width * height); const Ixy = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {Ix2[i] = Ix[i] * Ix[i]; Iy2[i] = Iy[i] * Iy[i]; Ixy[i] = Ix[i] * Iy[i];}

  // Applying the Gaussian Blur to Gradient Products.
  const gaussianKernel = [1, 4, 6, 4, 1]; const kernelSize = 5; const halfKernel = Math.floor(kernelSize / 2); const blur = (input) => {
    const output = new Float32Array(width * height); const temp = new Float32Array(width * height); for (let y = 0; y < height; y++) {
        for (let x = halfKernel; x < width - halfKernel; x++) {
            let sum = 0; for (let k = -halfKernel; k <= halfKernel; k++) {sum += input[y * width + (x + k)] * gaussianKernel[k + halfKernel];}
            temp[y * width + x] = sum / 16;
        }
    }
    for (let x = 0; x < width; x++) {for (let y = halfKernel; y < height - halfKernel; y++) {
      let sum = 0; for (let k = -halfKernel; k <= halfKernel; k++) {sum += temp[(y + k) * width + x] * gaussianKernel[k + halfKernel];}
      output[y * width + x] = sum / 16;
    }}
    return output;
  };

  // Calculating the Harris Response.
  const Sx2 = blur(Ix2); const Sy2 = blur(Iy2); const Sxy = blur(Ixy); const R = new Float32Array(width * height); const k = 0.04; const thresholdValue = 1000000;
  for (let i = 0; i < width * height; i++) {const det = Sx2[i] * Sy2[i] - Sxy[i] * Sxy[i]; const trace = Sx2[i] + Sy2[i]; R[i] = det - k * trace * trace;}

  // Find the Corners with Non-Maximum Supression.
  const corners = []; for (let y = 1; y < height - 1; y++) {for (let x = 1; x < width - 1; x++) {const idx = y * width + x; if (R[idx] > thresholdValue) {
    let isMax = true; for (let ky = -1; ky <= 1 && isMax; ky++) {for (let kx = -1; kx <= 1; kx++) {
      if (ky === 0 && kx === 0) {continue;} if (R[(y + ky) * width + (x + kx)] > R[idx]) {isMax = false; break;}
    }} if (isMax) {corners.push({x, y, response: R[idx]});}
  }}}

  // Drawing the Corners on the Image for Visualisation.
  corners.forEach(corner => {const idx = (corner.y * width + corner.x) * 4; data[idx] = 255; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;});

  canvas.putImageData(imageData, 0, 0); return {corners: corners, image: canvas.canvas.toDataURL()};
}

export default message;
