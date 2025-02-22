const threshold = 238; // Creating a Threshold which is used to Create the Greyscale Image into a Binary Image.

async function message(sharedState, callback) {

  const inputImage = sharedState.dataURL; const noRoadsImage = await removeRoads(inputImage); // Step 1: Removing the Roads from the Input Image.

  const greyscaleImage = await greyscale(noRoadsImage); // Step 2: Converting the Input Image with No Roads to a Greyscale Image.

  const binaryImage = await binary(greyscaleImage); // Step 3: Converting the Greyscale Image to a Binary Image.

  // Step 4: Creating an Abstraction around the Image being Processed by Changing the Colour of all the Pixels of the Rectangle or Polygon to Black.
  const localVertices = await localCoordinates(sharedState.bounds, binaryImage, sharedState.vertices); const selectedConvexHull = await convexHull(localVertices);
  const abstractedImage = await abstraction(binaryImage, selectedConvexHull); displayImage(abstractedImage);

  // Step 5: Finding the Vertices of the Properties within the Polygon or Rectangle that the User has Drawn on the Map.

  // Step 6: Using the Vertices of the Properties within the Convex Hull which the User Created, Create Convex Hulls for the Different Properties in the Area.

  // Step 7: Choose a Pixel to be Reverse Geocoded from Each Convex Hull in the User Selected Area.

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

function cross(o, a, b) {return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);} // Function to Calculate the Cross Product of Vectors OA and OB.

// Function to Create a Convex Hull from a Set of Vertices.
async function convexHull(vertices) {

  const points = vertices.map(vertex => [vertex.x, vertex.y]); // Converting the Vertices to x,y Format if they are Objects.

  // Checking if the Hull is Already Convex and Sorting the Vertices Lexicographically.
  if (points.length <= 3) {return vertices;} points.sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);

  // Building the Lower Hull.
  const lowerHull = []; for (const point of points) {
    while (lowerHull.length >= 2 && cross(lowerHull[lowerHull.length - 2], lowerHull[lowerHull.length - 1], point) <= 0) {lowerHull.pop();} lowerHull.push(point);
  }

  // Building the Upper Hull.
  const upperHull = []; for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i];
    while (upperHull.length >= 2 && cross(upperHull[upperHull.length - 2], upperHull[upperHull.length - 1], point) <= 0) {upperHull.pop();} upperHull.push(point);
  }

  lowerHull.pop(); upperHull.pop(); // Removing the Last Point from the Lower Hull and the Upper Hull as they are Duplicated at the Start of the Other Hull.

  // Combining the Upper and Lower Hull to Form the Convex Hull and Converting Back to x,y Format if Necessary.
  const convexHullPoints = lowerHull.concat(upperHull); const convexHullVertices = convexHullPoints.map(point => ({ x: point[0], y: point[1] }));

  return convexHullVertices; // Returning the Convex Hull to the Caller.

}

function windingNumberAlgorithm(convexHull, point) {

  // Initialising the Winding Number and Converting the Convex Hull Vertices to x,y Format if they are Objects.
  let windingNumber = 0; const hullPoints = convexHull.map(vertex => [vertex.x, vertex.y]);

  // Iterating through Each Vertex in the Convex Hull and Checking if the Point lies within the Conex Hull.
  for (let i = 0; i < hullPoints.length; i++) {

    const a = hullPoints[i]; const b = hullPoints[(i + 1) % hullPoints.length]; // Getting the Current and Next Vertex in the Convex Hull to Process.

    // If the Point is on the Edge of the Convex Hull, we Class the Point as within the Convex Hull.
    if (cross(a, b, point) === 0 && Math.min(a[0], b[0]) <= point[0] && point[0] <= Math.max(a[0], b[0]) &&
        Math.min(a[1], b[1]) <= point[1] && point[1] <= Math.max(a[1], b[1])) {return true;}

    // Calculate the Angle between the Vectors (point -> a) and (point -> b).
    let deltaAngle = Math.atan2(b[1] - point[1], b[0] - point[0]) - Math.atan2(a[1] - point[1], a[0] - point[0]);

    // Adjust the Angle to Ensure it Remains in the Range [-π, π] and Accumulating the Signed Angle Difference.
    if (deltaAngle > Math.PI) {deltaAngle -= 2 * Math.PI;} else if (deltaAngle < -Math.PI) {deltaAngle += 2 * Math.PI;} windingNumber += deltaAngle;

  }

  return Math.abs(windingNumber) > 1e-6; // If the Absolute Value of the Winding Number is Greater than the Threshold (2π), the Point is Inside the Convex Hull.

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

// Function to Create an Abstraction around the Processing of the Properties by Ignoring Properties Outside of the User Selected Area.
async function abstraction(binary, convexHull) {

  // Loading the Image, Creating the Canvas, Drawing the Image on the Canvas and Getting the Image Data from the Canvas.
  const img = await loadImage(binary); const canvas = createCanvas(img.width, img.height); canvas.drawImage(img, 0, 0);
  const imageData = canvas.getImageData(0, 0, canvas.canvas.width, canvas.canvas.height); const data = imageData.data;

  // Looping through the Image Data and Changing the Colour of Pixels outside of the User Selected Area to Black.
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % img.width; const y = Math.floor(i / 4 / img.width); const point = [x,y]; if (!windingNumberAlgorithm(convexHull, point)) {
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }

  // Placing the Binary Image onto the Canvas and Returning the Binary Image as a Data URL.
  canvas.putImageData(imageData, 0, 0); return canvas.canvas.toDataURL();

}

export default message;
