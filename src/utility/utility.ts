import { Coordinates, FunctionCode, Status, UnlocodeJsonItem } from "../models/unlocode.interface";

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const xlsx = require('xlsx');

export class Utility {
   static directoryPath = 'data-source';
   static outputDirectory = 'json-data';
   static formatCSV = ".csv";
   static formatXLS = ".xls";
   static acceptedFormats = [Utility.formatCSV, Utility.formatXLS];

   static DELAY_BETWEEN_REQUESTS = 0;
   static API_KEY = `6dc7fb95a3b246cfa0f3bcef5ce9ed9a`;

   static async generateFiles() {
      let loadedFiles = this.loadFiles();
      for (const loadedFile of loadedFiles) {
         if(this.isFileFormatAccepted(loadedFile)) {
            let data = await this.generateJSON(loadedFile);
            let dataWithCoordinates = await this.getCoordinatesIfMissing(data);
            await this.saveToFiles(dataWithCoordinates);
         } else {
            console.log('File format not accepted fileName:' + loadedFile.name);
         }
      }
   }

   static loadFiles(): Array<LoadedFile> {
      const files = fs.readdirSync(this.directoryPath);
      const allFiles = files.filter((file: any) => fs.statSync(path.join(this.directoryPath, file)).isFile());
      console.log('Files:', allFiles);

      let result: Array<LoadedFile> = [];
      allFiles.forEach((file: string) => {
         result.push({
            fileContent: fs.createReadStream(this.directoryPath + "/" + file),
            name: file
         });
      })
      return result;
   }

   static generateJSON(file: LoadedFile): Promise<Map<string, Array<UnlocodeJsonItem>>> {
      if(this.isFileExtensionMatching(file, this.formatCSV)) {
         return this.generateJSONFromCSV(file);
      }
      if(this.isFileExtensionMatching(file, this.formatXLS)) {
         return this.generateJSONFromXLS(file);
      }
   }

   static async generateJSONFromCSV(file: LoadedFile): Promise<Map<string, Array<UnlocodeJsonItem>>> {
      let fileStream = file.fileContent;
      const rl = readline.createInterface({
         input: fileStream,
         crlfDelay: Infinity
      });
      let firstRow: string | null = null;
      let result = new Map();

      return new Promise((resolve, reject) => {
         rl.on('line', async (line: any) => {
            if (!firstRow) {
               firstRow = line;
            } else {
               let item = this.convertCSVLineToJSON(line);
               this.addRow(result, item);
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

   static async generateJSONFromXLS(file: LoadedFile): Promise<Map<string, Array<UnlocodeJsonItem>>> {
      const fileStream = file.fileContent;
      return new Promise((resolve, reject) => {
         let result = new Map();

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
               let item = this.convertXLSLineToJSON(line);
               this.addRow(result, item);
            })
            resolve(result);
         });

         fileStream.on('error', (err: any) => {
            console.error('Error reading the file:', err);
         });
      });
   }

   static convertCSVLineToJSON(line: string): UnlocodeJsonItem {
      let lineParsed = line.split(",");
      let functions = this.convertToFunctionArray(lineParsed[7]);
      let coordinates = this.getCoordinates(lineParsed[10]);
      return {
         change: lineParsed[0],
         country: lineParsed[1],
         location: lineParsed[2],
         name: lineParsed[3],
         nameWoDiacritics: lineParsed[4],
         subdivision: lineParsed[5],
         status: this.convertStatusToEnum(lineParsed[6]),
         function: functions,
         date: lineParsed[8],
         iata:lineParsed[9],
         coordinates: coordinates ? {
            lat: coordinates.latitude,
            lon: coordinates.longitude
         } : null,
         remarks:lineParsed[11]
      };
   }

   static convertXLSLineToJSON(line: any): UnlocodeJsonItem {
      let functions = this.convertToFunctionArray(line["Function"]);
      let coordinates = this.getCoordinates(line["Coordinates"]);
      return {
         change: line["Change"],
         country: line["Country"],
         location: line["Location"],
         name: line["Name"],
         nameWoDiacritics: line["NameWoDiacritics"],
         subdivision: line["Subdivision"],
         status: this.convertStatusToEnum(line["Status"]),
         function: functions,
         date: line["Date"],
         iata: line["IATA"],
         coordinates: coordinates ? {
            lat: coordinates.latitude,
            lon: coordinates.longitude
         } : null,
         remarks: line["Remarks"]
      };
   }

   static addRow(result: Map<string, Array<UnlocodeJsonItem>>, item: UnlocodeJsonItem) {
      if(!result.has(item.country)) {
         result.set(item.country, []);
      }
      result.get(item.country).push(item);
   }

   static async saveToFiles(result: Map<string, Array<UnlocodeJsonItem>>): Promise<void> {
      if (!fs.existsSync(this.outputDirectory)) {
         fs.mkdirSync(this.outputDirectory);
      }

      for (const [country, items] of result.entries()) {
         const filename = path.join(this.outputDirectory, `${country}.json`);
         const fileContent = JSON.stringify(items, null, 2);

         await fs.promises.writeFile(filename, fileContent, 'utf8');
         console.log(`File saved: ${filename}`);
      }
   }

   static isFileFormatAccepted(file: LoadedFile): boolean {
      return this.acceptedFormats.includes(path.extname(file.name));
   }

   static isFileExtensionMatching(file: LoadedFile, format: string): boolean {
      return path.extname(file.name) === format;
   }

   static getCoordinates(coordinates: any): { latitude: number, longitude: number } {
      if(coordinates) {
         return this.dmsToDecimal(coordinates);
      } else {
         return null;
      }

   }

   static async getCoordinatesIfMissing(data: Map<string, Array<UnlocodeJsonItem>>): Promise<Map<string, Array<UnlocodeJsonItem>>> {
      return new Promise(async (resolve, reject) => {
         for (const itemsPerCountry of data) {
            for (const item of itemsPerCountry[1]) {
               if(!item.coordinates && this.hasFunctionAirport(item.function)) {
                  item.coordinates = await this.getCoordinatesByGeoapifyAPIs(item.name, item.country);
                  await this.delay(this.DELAY_BETWEEN_REQUESTS);
               }
            }
         }
         resolve(data);
      });
   }

   static async getCoordinatesByGeoapifyAPIs(city: string, country: string): Promise<Coordinates> {
      // console.log("Getting airport coordinates for city: " + city + " with country: " + country);
      if(!city) {
         console.log("No city or no country for city: " + city + " with country: " + country);
         return null;
      }
      let cityPlaceId = await this.getCityPlaceId(city, country);
      if(cityPlaceId) {
         let locationCoordinates = await this.getLocationCoordinates(cityPlaceId);
         if(locationCoordinates) {
            console.log("Airport coordinates found for city: " + city + " with country: " + country);
            return locationCoordinates;
         } else {
            console.log("Airport coordinates not found for city: " + city + " with country: " + country);
            return null;
         }
      }
      console.log("City place id not found for city: " + city + " with country: " + country);
      return null;
   }

   static async getCityPlaceId(city: string, countryCode: string): Promise<string> {
      return await new Promise((resolve, reject) => {
         fetch(`https://api.geoapify.com/v1/geocode/search?text=${city}&type=city&filter=countrycode:${countryCode.toLowerCase()}&format=json&apiKey=${this.API_KEY}`)
             .then((response) => {
                if (response.ok) {
                   response.json().then(data => {
                      // console.log(data);
                      if(data.results?.length > 0) {
                         resolve(data.results[0].place_id);
                      } else {
                         resolve(null);
                      }
                   });
                } else {
                   response.json().then(data => {
                      console.log("Error: " + data.message + "for city: " + city + " with country: " + countryCode);
                      resolve(null);
                   });
                }
             });
      });
   }

   static async getLocationCoordinates(cityPlaceId: string): Promise<Coordinates> {
      return await new Promise((resolve, reject) => {
         fetch(`https://api.geoapify.com/v2/places?categories=airport&filter=place:${cityPlaceId}&limit=20&apiKey=${this.API_KEY}`)
             .then((response) => {
                if (response.ok) {
                   response.json().then(data => {
                      // console.log(data);
                      if(data.features?.length > 0) {
                         resolve({ lat: data.features[0].properties.lat, lon: data.features[0].properties.lon });
                      } else {
                         resolve(null);
                      }
                   });
                } else {
                   response.json().then(data => {
                      // console.log("Error: " + data.message + "for city: " + city + " with country: " + countryCode);
                      resolve(null);
                   });
                }
             });
      });
   }

   static hasFunctionAirport(functions: Array<FunctionCode>): boolean {
      return functions.includes(FunctionCode.AIRPORT);
   }

   static dmsToDecimal(coordinate: string): { latitude: number, longitude: number } {
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


   static convertToFunctionArray(functionCode: string): FunctionCode[] {
      if(!functionCode) {
         return [];
      }
      const functionMap = [
         { char: '1', type: FunctionCode.PORT },
         { char: '2', type: FunctionCode.RAIL_TERMINAL },
         { char: '3', type: FunctionCode.ROAD_TERMINAL },
         { char: '4', type: FunctionCode.AIRPORT },
         { char: '5', type: FunctionCode.POSTAL_EXCHANGE_OFFICE },
         { char: '6', type: FunctionCode.INLAND_CLEARANCE_DEPOT },
         { char: '7', type: FunctionCode.FIXED_TRANSPORT_FUNCTIONS },
         { char: 'B', type: FunctionCode.BORDER_CROSSING_FUNCTION },
         { char: '0', type: FunctionCode.FUNCTION_NOT_KNOWN }
      ];

      let result: FunctionCode[] = [];

      for (let i = 0; i < functionCode.length && i < functionMap.length; i++) {
         if (functionCode.charAt(i) !== '-') {
            result.push(functionMap[i].type);
         }
      }

      return result;
   }

   static convertStatusToEnum(status: string): Status {
      if(!status) {
         return null;
      }
      switch (status.toUpperCase()) {
         case 'AA':
            return Status.APPROVED_BY_COMPETENT_NATIONAL_GOVERNMENT_AGENCY;
         case 'AC':
            return Status.APPROVED_BY_CUSTOMS_AUTHORITY;
         case 'AF':
            return Status.APPROVED_BY_NATIONAL_FACILITATION_BODY;
         case 'AI':
            return Status.CODE_ADOPTED_BY_INTERNATIONAL_ORGANISATION;
         case 'AM':
            return Status.APPROVED_BY_UN_LOCODE_MAINTENANCE_AGENCY;
         case 'AQ':
            return Status.ENTRY_APPROVED_FUNCTIONS_NOT_VERIFIED;
         case 'AS':
            return Status.APPROVED_BY_NATIONAL_STANDARDISATION_BODY;
         case 'RL':
            return Status.RECOGNISED_LOCATION;
         case 'RN':
            return Status.REQUEST_FROM_CREDIBLE_NATIONAL_SOURCES;
         case 'RQ':
            return Status.REQUEST_UNDER_CONSIDERATION;
         case 'UR':
            return Status.ENTRY_INCLUDED_ON_USER_REQUEST;
         case 'RR':
            return Status.REQUEST_REJECTED;
         case 'QQ':
            return Status.ORIGINAL_ENTRY_NOT_VERIFIED;
         case 'XX':
            return Status.ENTRY_TO_BE_REMOVED_NEXT_ISSUE;
         default:
            return null;
      }
   }

   static delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
   }
}

interface LoadedFile {
   fileContent: any;
   name: string;
}