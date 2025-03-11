import getAddresses from './reverseGeocoding.jsx'; // Importing the Necessary Modules for my Implementation.

const threshold = 238; // Creating a Threshold which is used to Create the Greyscale Image into a Binary Image.

// Function Responsible for Controlling the Flow of Data in this File, Extracting the Coordinates to be Processed from the Input Image.
async function message(sharedState, callback) {

  const inputImage = sharedState.dataURL; const noRoadsImage = await removeRoads(inputImage); // STEP 1: Removing the Roads from the Input Image.

  // STEP 2: Creating an Abstraction around the Image being Processed by Changing the Colour of all the Pixels Outside of the Polygon or Rectangle to Black.
  const vertices = await localCoordinates(sharedState.bounds, noRoadsImage, sharedState.vertices); const abstractedImage = await abstraction(noRoadsImage, vertices);

  // STEP 3: Convert the Image into a Greyscale Image for use in the Harris Corner Detection Algorithm.
  const greyscaleImage = await greyscale(abstractedImage);

  // STEP 4: Find the Corners of the Properties in the Polygon or Rectangle using the Harris Corner Detection Algorithm.

  // Pre-Processing the Image by Applying a Gaussian Blur and Removing Outliers, then Converting the Image to a Binary Image and then back to a Greyscale Image.
  const blurred = await gaussianBlur(greyscaleImage); const blurredBinary = await binary(blurred); const cleanedImage = await unionFind(blurredBinary, 50);

  const corners = await harrisCornerDetectionAlgorithm(cleanedImage); // Applying the Harris Corner Detection Algorithm.

  // STEP 5: Create a Convex Hull for Each Property in the Polygon or Rectangle which the User has Drawn on the Map.
  const binaryImage = await binary(cleanedImage); const groupedCorners = await traceContours(binaryImage, corners.corners);
  const convexHulls = []; for (let i = 0; i < groupedCorners.length; i++) {const polygon = await convexHull(groupedCorners[i]); convexHulls.push(polygon);}

  // STEP 6: Choosing 3 Random a x,y Points from Each Convex Hull and Converting them to a Longitude, Latitude Format for Reverse Geocoding.
  const selectedPoints = []; convexHulls.forEach(hull => {
    if (hull.length < 3) {selectedPoints.push(...hull);} else {const copy = [...hull]; const random = []; const randomIndex = Math.floor(Math.random() * copy.length);
      random.push(copy[randomIndex]); copy.splice(randomIndex, 1); selectedPoints.push(...random);
    }
  });

  const pointsToReverseGeocode = await globalCoordinates(sharedState.bounds, inputImage, selectedPoints);

  if (callback) {callback(pointsToReverseGeocode);} // Sending the Points to the App.jsx File which to Calculate how Long the Loading Screen should be Displayed for.

  getAddresses(pointsToReverseGeocode); // Sending the Points to the reverseGeocoding.jsx File to Find the Addresses.

}

// Function to Create a Canvas which the Updated Image is Drawn onto when Processing an Image.
function createCanvas(width, height) {const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas.getContext('2d');}

// Function to Load an Image from a Data URL.
async function loadImage(source) {
  const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = source;
  return new Promise((resolve, reject) => {img.onload = () => resolve(img); img.onerror = () => reject(new Error("Failed to Load the Image!"));})
}

// Function to Convert Coordinates from Longitude, Latitude Coordinates to Pixel Coordinates in the Image.
function localCoordinates(bounds, image, vertices) {
    const {xmin, ymin, xmax, ymax} = bounds; const pixelCoordinates = []; const img = new Image(); img.src = image; return new Promise((resolve) => {
        img.onload = function() {vertices.forEach(function(vertex) {
                const {longitude, latitude} = vertex; const x = ((longitude - xmin) / (xmax - xmin)) * img.width;
                const y = ((ymax - latitude) / (ymax - ymin)) * img.height; pixelCoordinates.push({ x, y });
        }); resolve(pixelCoordinates);};
    });
}

// Function to Convert Pixel Coordinates from the Image to Longitude, Latitude Coordinates.
function globalCoordinates(bounds, image, coordinates) {
  const {xmin, ymin, xmax, ymax} = bounds; const geographicalCoordinates = []; const img = new Image(); img.src = image; return new Promise((resolve) => {
    img.onload = function() {coordinates.forEach(function(coordinate) {
      const {x,y} = coordinate; const longitude = ((x * (xmax - xmin)) / img.width) + xmin; const latitude = ymax - ((y * (ymax - ymin)) / img.height);
      geographicalCoordinates.push({longitude, latitude});
    }); resolve(geographicalCoordinates);};
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

  for (let corner of corners) {const index = (corner.y * width + corner.x) * 4; data[index] = data[index + 3] = 255;  data[index + 1] = data[index + 2] = 0;}

  // Placing the Binary Image onto the Canvas and Returning the Binary Image as a Data URL.
  canvas.putImageData(imageData, 0, 0); return {corners: corners, image: canvas.canvas.toDataURL()};

}

// Function to Remove Outlier White Pixels, using a Simple Union-Find Approach to Clean the Data, Before Finding the Corners of the Properties in the Area.
async function unionFind(binaryImage, minArea = 50) {

  const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const img = new Image(); // Creating a Canvas Dynamically for Processing.

  // Function to Find the Root Label of a Component.
  function find(parent, x) {if (!parent[x]) parent[x] = x; if (parent[x] !== x) parent[x] = find(parent, parent[x]); return parent[x];}

  function union(parent, x, y) {parent[find(parent, x)] = find(parent, y);} // Function to Merge Two Components by Setting One's Parent to the Other's Parent.

  return new Promise((resolve, reject) => {
    img.onload = function() {

      canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img,0,0); // Set the Canvas Dimensions to Match the Image and Draw the Image on the Canvas.

      const imageData = ctx.getImageData(0,0,canvas.width,canvas.height); const data = imageData.data; // Extracting the Pixel Data from the Canvas.

      // Creating a Binary Array from the Image Data for Processing.
      const binary = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0; i < data.length; i += 4) {const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3; binary[i / 4] = brightness > 127 ? 255 : 0;}

      // Labelling the Connected Components using a Two-Pass Union-Find Algorithm.
      const labels = new Uint32Array(canvas.width * canvas.height); const parent = []; let nextLabel = 1; for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % img.width; const y = Math.floor(i / 4 / img.width); const idx = y * canvas.width + x; if (binary[idx] === 255) {
          const neighbours = [(y > 0 ? labels[idx - canvas.width] : 0), (x > 0 ? labels[idx - 1] : 0)].filter(n => n > 0);
          if (neighbours.length === 0) {labels[idx] = nextLabel++; parent[labels[idx]] - labels[idx];} else {
            let minLabel = Math.min(...neighbours); labels[idx] = minLabel; for (let n of neighbours) {union(parent, n, minLabel);}
          }
        }
      }

      const sizes = new Map(); for (let i = 0; i < labels.length; i++) {
        if (labels[i] > 0) {labels[i] = find(parent, labels[i]); sizes.set(labels[i], (sizes.get(labels[i]) || 0) + 1);}
      }

      // Filtering Out the Outliers.
      const output = new Uint8Array(binary.length);
      for (let i = 0; i < labels.length; i++) {if (labels[i] > 0 && sizes.get(labels[i]) >= minArea) {output[i] = 255;} else {output[i] = 0;}}

      // Updating the Canvas with the Cleaned Binary Image.
      for (let i = 0; i < data.length; i += 4) {const val = output[i / 4]; data[i] = data[i + 1] = data[i + 2] = val; data[i + 3] = 255;}
      ctx.putImageData(imageData, 0, 0); resolve(canvas.toDataURL());

    }; img.src = binaryImage;

  });
}

// Function to Group Corners Detected by the Harris Corner Detection Method into the White Polygons (Properties) in the Input Image using their Trace Contours.
async function traceContours(source, corners) {

  // Loading the Greyscale Image, Creating the Canvas, Drawing the Image on the Canvas and Getting the Image Data from the Canvas.
  const img = await loadImage(source); const canvas = createCanvas(img.width, img.height); canvas.drawImage(img, 0, 0);
  const imageData = canvas.getImageData(0, 0, canvas.canvas.width, canvas.canvas.height); const data = imageData.data;

  // Converting the Image Data into a 2D Binary Array (1 for White Pixels, 0 for Black Pixels).
  const binary = new Uint8Array(img.width * img.height); for (let i = 0; i < data.length; i += 4) {binary[i / 4] = data[i] === 255 ? 1 : 0;}

  // Creating Variables for the Width and Height of the Image and an Array and Set for use in the Moore-Neighbour Tracing Algorithm to Find Contours.
  const width = img.width; const height = img.height; const contours = []; const visited = new Set();

  function getPixel(x, y) {return (x >= 0 && x < img.width && y >= 0 && y < img.height) ? binary[y * img.width + x] : 0;} // Returning the Binary Value of a Pixel.

  // Function to Find the Next Boundary Pixel in the Contour.
  function findNextBoundary(x, y) {
    const directions = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]]; for (let i = 0; i < 8; i++) {
      const [dx, dy] = directions[i]; const nx = x + dx; const ny = y + dy; if (getPixel(nx, ny) === 1 && !visited.has(`${nx},${ny}`)) {return [nx, ny];}
    }; return null;
  }

  // Iterate through Every Pixel in the Image to Detect Contours.
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % img.width; const y = Math.floor(i / 4 / img.width); const idx = y * width + x; if (binary[idx] === 1 && !visited.has(`${x},${y}`)) {
      const contour = []; let currentX = x; let currentY = y; const start = [x, y]; do {
        visited.add(`${currentX},${currentY}`); contour.push({ x: currentX, y: currentY }); const next = findNextBoundary(currentX, currentY); if (!next) {break;}
        [currentX, currentY] = next;
      } while (!(currentX === start[0] && currentY === start[1]) && contour.length < 10000); if (contour.length > 3) {contours.push(contour);}
    }
  }

  // Grouping the Corners which were Detected using the Harris Corner Detection Method.
  const groupedCorners = contours.map(contour => {
    const cornersInContour = corners.filter(corner => {
      return contour.some(point => {const dist = Math.sqrt((corner.x - point.x) ** 2 + (corner.y - point.y) ** 2); return dist < 5;});
    }); return cornersInContour;
  }).filter(group => group.length > 0);

  return groupedCorners;
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

export default message;
