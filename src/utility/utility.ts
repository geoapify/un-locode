import { UnlocodeJsonItem } from '../models/unlocode.interface';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const xlsx = require('xlsx');
import { json2csv } from 'json-2-csv';

const directoryPath = 'data-source';
const outputDirectory = 'src/data';
const formatCSV = ".csv";
const formatXLS = ".xls";
const acceptedFormats = [formatCSV, formatXLS];

const DELAY_BETWEEN_REQUESTS = 20;
const API_KEY = `YOUR_API_KEY`;

export async function generateFiles() {
   let loadedFiles = loadFiles();
   for (const loadedFile of loadedFiles) {
      if (isFileFormatAccepted(loadedFile)) {
         let data = await generateJSON(loadedFile);

         let dataWithCoordinates = await getCoordinatesIfMissing(data);
         await saveToFiles(dataWithCoordinates);
      } else {
         console.log('File format not accepted fileName:' + loadedFile.name);
      }
   }
}

function loadFiles(): LoadedFile[] {
   const files = fs.readdirSync(directoryPath);
   const allFiles = files.filter((file: any) => fs.statSync(path.join(directoryPath, file)).isFile());
   console.log('Files:', allFiles);

   let result: LoadedFile[] = [];
   allFiles.forEach((file: string) => {
      result.push({
         fileContent: fs.createReadStream(directoryPath + "/" + file),
         name: file
      });
   })
   return result;
}

function generateJSON(file: LoadedFile): Promise<{ [key: string]: UnlocodeJsonItem[] }> {
   if (isFileExtensionMatching(file, formatCSV)) {
      return generateJSONFromCSV(file);
   }
   if (isFileExtensionMatching(file, formatXLS)) {
      return generateJSONFromXLS(file);
   }

   return undefined;
}

async function generateJSONFromCSV(file: LoadedFile): Promise<{ [key: string]: UnlocodeJsonItem[] }> {
   let fileStream = file.fileContent;
   const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
   });
   let firstRow: string | null = null;
   let result: { [key: string]: UnlocodeJsonItem[] } = {};

   return new Promise((resolve, reject) => {
      rl.on('line', async (line: any) => {
         if (!firstRow) {
            firstRow = line;
         } else {
            let item = convertCSVLineToJSON(line);

            if (item.country && item.location) {

               addRow(result, item);
            }
         }
      });

      rl.on('close', () => {
         resolve(result);
      });

      rl.on('error', (error: any) => {
         console.error('Error reading the file:', error);
         reject(error);
      });
   });
}

async function generateJSONFromXLS(file: LoadedFile): Promise<{ [key: string]: UnlocodeJsonItem[] }> {
   const fileStream = file.fileContent;
   return new Promise((resolve, reject) => {
      let result: { [key: string]: UnlocodeJsonItem[] } = {};

      const chunks: Buffer[] = [];

      fileStream.on('data', (chunk: any) => {
         chunks.push(chunk);
      });

      fileStream.on('end', () => {
         const buffer = Buffer.concat(chunks);

         const workbook = xlsx.read(buffer, { type: 'buffer' });

         const sheetName = workbook.SheetNames[0];
         const sheet = workbook.Sheets[sheetName];

         const data = xlsx.utils.sheet_to_json(sheet);
         data.forEach(async (line: any) => {
            let item = convertXLSLineToJSON(line);
            addRow(result, item);
         })
         resolve(result);
      });

      fileStream.on('error', (err: any) => {
         console.error('Error reading the file:', err);
      });
   });
}

function convertCSVLineToJSON(line: string): UnlocodeJsonItem {
   let lineParsed = line.split(",");
   let coordinates = getCoordinates(lineParsed[10]);
   return {
      change: lineParsed[0],
      country: lineParsed[1],
      location: lineParsed[2],
      name: lineParsed[3],
      nameWoDiacritics: lineParsed[4],
      subdivision: lineParsed[5],
      status: lineParsed[6],
      function: lineParsed[7],
      date: lineParsed[8],
      iata: lineParsed[9],
      lat: coordinates ? coordinates.latitude : undefined,
      lon: coordinates ? coordinates.longitude : undefined,
      remarks: lineParsed[11]
   };
}

function convertXLSLineToJSON(line: any): UnlocodeJsonItem {
   let coordinates = getCoordinates(line["Coordinates"]);
   return {
      change: line["Change"],
      country: line["Country"],
      location: line["Location"],
      name: line["Name"],
      nameWoDiacritics: line["NameWoDiacritics"],
      subdivision: line["Subdivision"],
      status: line["Status"],
      function: line["Function"],
      date: line["Date"],
      iata: line["IATA"],
      lat: coordinates.latitude,
      lon: coordinates.longitude,
      remarks: line["Remarks"]
   };
}

function addRow(result: {[key: string]: UnlocodeJsonItem[]}, item: UnlocodeJsonItem) {

   if (false && item.country !== 'DE') {
      return;
   }

   result[item.country] = result[item.country] || [];
   result[item.country].push(item);
}

async function saveToFiles(result: {[key: string]: UnlocodeJsonItem[]}): Promise<void> {
   if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory);
   }

   await Object.keys(result).forEach((countryKey) => {
      const items = result[countryKey];
      const filename = path.join(outputDirectory, `${countryKey}.csv`);
      const fileContent = json2csv(items, {emptyFieldValue: '', excludeKeys: ['change', 'date', 'remarks']});
      fs.writeFileSync(filename, fileContent, 'utf8');
      console.log(`File saved: ${filename}`);
   });
}

export function isFileFormatAccepted(file: LoadedFile): boolean {
   return acceptedFormats.includes(path.extname(file.name));
}

function isFileExtensionMatching(file: LoadedFile, format: string): boolean {
   return path.extname(file.name) === format;
}

function getCoordinates(coordinates: any): { latitude: number, longitude: number } {
   if (coordinates) {
      return dmsToDecimal(coordinates);
   } else {
      return undefined;
   }

}

async function getCoordinatesIfMissing(data: {[key: string]: UnlocodeJsonItem[]}): Promise<{[key: string]: UnlocodeJsonItem[]}> {

   return new Promise(async (resolveResult) => {

      const promises: Promise<any>[] = [];

      for (const countryKey in data) {
         const items = data[countryKey];
         for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.lat && item.lon) {
               continue;
            }

            const promise = new Promise<void>(async (resolve) => {
               if (!(item.lat && item.lon) && hasFunctionAirport(item.function)) {
                  const coords = await getAirportCoordinatesByGeoapifyAPIs(item.nameWoDiacritics, item.subdivision, item.country);

                  if (coords) {
                     item.lat = coords.lat;
                     item.lon = coords.lon;
                     item.geocoded = true;
                  }
               }

               if (!(item.lat && item.lon) && hasFunctionAirport(item.function)) {
                  const coords = await getLocationByName(item.nameWoDiacritics, item.subdivision, item.country);

                  if (coords) {
                     item.lat = coords.lat;
                     item.lon = coords.lon;

                     console.log("Place coordinates found for name: " + item.name + " with country: " + item.country);
                     item.geocoded = true;
                  }
               }

               if (!(item.lat && item.lon)) {
                  let cityData = await getCityData(item.nameWoDiacritics, item.subdivision, item.country);
                  console.log("City coordinates found for name: " + item.name + " with country: " + item.country);

                  if (cityData) {
                     item.lat = cityData.lat;
                     item.lon = cityData.lon;
                     item.geocoded = true;
                  }
               }

               if (!(item.lat && item.lon)) {
                  let cityData = await getCityData(item.nameWoDiacritics, null, item.country);
                  console.log("City coordinates found for name: " + item.name + " with country: " + item.country);

                  if (cityData) {
                     item.lat = cityData.lat;
                     item.lon = cityData.lon;
                     item.geocoded = true;
                  }
               }

               if (!(item.lat && item.lon)) {
                  console.log("No coordinates found for: " + item.name + ", " + item.subdivision + " with country: " + item.country);
               }
               resolve();
            });

            promises.push(promise);
            await delay(DELAY_BETWEEN_REQUESTS);
         }
      }

      Promise.all(promises).then(() => resolveResult(data));
   });
}

async function getAirportCoordinatesByGeoapifyAPIs(city: string, subdivision: string, country: string): Promise<{lat: number, lon: number}> {
   let cityData = await getCityData(city, subdivision, country);
   if (cityData) {
      let locationCoordinates = await getAirportLocationCoordinates(cityData.place_id);
      if (locationCoordinates) {
         console.log("Airport coordinates found for city: " + city + " with country: " + country);
         return locationCoordinates;
      } else {
         console.log("Airport coordinates found for city by city: " + city + " with country: " + country);
         return { lat: cityData.lat, lon: cityData.lon }
      }
   }
   console.log("City place id not found for city: " + city + " with country: " + country);
   return null;
}

async function getLocationByName(name: string, division: string, countryCode: string): Promise<{lat: number, lon: number}> {
   return await new Promise((resolve, reject) => {
      fetch(`https://api.geoapify.com/v1/geocode/search?text=${name}&type=amenity&filter=countrycode:${countryCode.toLowerCase()}&format=geojson&apiKey=${API_KEY}`)
         .then((response: any) => {
            if (response.ok) {
               response.json().then((data: any) => {
                  // console.log(data);
                  if (data.results?.length > 0) {
                     resolve({ lat: data.features[0].properties.lat, lon: data.features[0].properties.lon });
                  } else {
                     resolve(null);
                  }
               });
            } else {
               response.json().then((data: any) => {
                  console.log("Error: " + data.message + "for amenity: " + name + " with country: " + countryCode);
                  resolve(null);
               });
            }
         }, err => {
            console.log("getLocationByName: " + err);
            console.log(name, countryCode);
            resolve(null)
         });
   });
}

async function getCityData(city: string, subdivision: string | null, countryCode: string): Promise<any> {
   return await new Promise((resolve, reject) => {
      const text = subdivision ? city + ", " + subdivision : city;
      fetch(`https://api.geoapify.com/v1/geocode/search?text=${text}&type=city&filter=countrycode:${countryCode.toLowerCase()}&format=json&apiKey=${API_KEY}`)
         .then((response: any) => {
            if (response.ok) {
               response.json().then((data: any) => {
                  // console.log(data);
                  if (data.results?.length > 0) {
                     resolve(data.results[0]);
                  } else {
                     resolve(null);
                  }
               });
            } else {
               response.json().then((data: any) => {
                  console.log("Error: " + data.message + "for city: " + city + " with country: " + countryCode);
                  resolve(null);
               });
            }
         }, err => {
            console.log("getCityData: " + err);
            console.log(city, countryCode);
            resolve(null)
         });
   });
}

async function getAirportLocationCoordinates(cityPlaceId: string): Promise<{lat: number, lon: number}> {
   return await new Promise((resolve, reject) => {
      fetch(`https://api.geoapify.com/v2/places?categories=airport&filter=place:${cityPlaceId}&limit=5&apiKey=${API_KEY}`)
         .then((response: any) => {
            if (response.ok) {
               response.json().then((data: any) => {
                  // console.log(data);
                  if (data.features?.length > 0) {
                     resolve({ lat: data.features[0].properties.lat, lon: data.features[0].properties.lon });
                  } else {
                     resolve(null);
                  }
               });
            } else {
               response.json().then((data: any) => {
                  // console.log("Error: " + data.message + "for city: " + city + " with country: " + countryCode);
                  resolve(null);
               });
            }
         }, err => {
            console.log("getCityData: " + err);
            console.log(cityPlaceId);
            resolve(null)
         });
   });
}

function hasFunctionAirport(functions: string): boolean {
   return functions.includes('4');
}

function hasFunctionPort(functions: string): boolean {
   return functions.includes('1');
}

function dmsToDecimal(coordinate: string): { latitude: number, longitude: number } {
   // Parse the latitude (S or N)
   const latDegrees = parseInt(coordinate.slice(0, 2), 10);
   const latMinutes = parseInt(coordinate.slice(2, 4), 10);
   const latHemisphere = coordinate[4];  // 'S' or 'N'

   // Parse the longitude (E or W)
   const lonDegrees = parseInt(coordinate.slice(5, 9), 10);  // Adjusted to capture three digits for longitude degrees
   const lonMinutes = parseInt(coordinate.slice(9, 11), 10);
   const lonHemisphere = coordinate[11];  // 'E' or 'W'

   // Convert latitude to decimal
   let latitude = latDegrees + latMinutes / 60;
   if (latHemisphere === 'S') {
      latitude = -latitude;
   }

   // Convert longitude to decimal
   let longitude = lonDegrees + lonMinutes / 60;
   if (lonHemisphere === 'W') {
      longitude = -longitude;
   }

   return { latitude, longitude };
}

function delay(ms: number): Promise<void> {
   return new Promise(resolve => setTimeout(resolve, ms));
}

interface LoadedFile {
   fileContent: any;
   name: string;
}