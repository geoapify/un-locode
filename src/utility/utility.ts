import { FunctionCode, UnlocodeJsonItem } from "../models/unlocode.interface";

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const xlsx = require('xlsx');

export class Utility {
   static directoryPath = 'data-source';
   static outputDirectory = 'json-data';
   static formatCSV = ".csv";
   static formatXLS = ".xls";
   static acceptedFormats = [Utility.formatXLS, Utility.formatCSV];

   static async generateFiles() {
      let loadedFiles = this.loadFiles();
      for (const loadedFile of loadedFiles) {
         if(this.isFileFormatAccepted(loadedFile)) {
            let data = await this.generateJSON(loadedFile);
            await this.saveToFiles(data);
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

   static async generateJSON(file: LoadedFile): Promise<Map<string, Array<UnlocodeJsonItem>>> {
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
         rl.on('line', (line: any) => {
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
            data.forEach((line: any) => {
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

   static convertCSVLineToJSON(line: string) {
      let lineParsed = line.split(",");
      let coordinates = this.getCoordinates(lineParsed[10]);
      return {
         change: lineParsed[0],
         country: lineParsed[1],
         location: lineParsed[2],
         name: lineParsed[3],
         nameWoDiacritics: lineParsed[4],
         subdivision: lineParsed[5],
         status: lineParsed[6],
         function: this.convertToFunctionArray(lineParsed[7]),
         date: lineParsed[8],
         iata:lineParsed[9],
         coordinates: {
            lat: coordinates.latitude,
            lon: coordinates.longitude
         },
         remarks:lineParsed[11]
      };
   }

   static convertXLSLineToJSON(line: any) {
      let coordinates = this.getCoordinates(line["Coordinates"]);
      return {
         change: line["Change"],
         country: line["Country"],
         location: line["Location"],
         name: line["Name"],
         nameWoDiacritics: line["NameWoDiacritics"],
         subdivision: line["Subdivision"],
         status: line["Status"],
         function: this.convertToFunctionArray(line["Function"]),
         date: line["Date"],
         iata: line["IATA"],
         coordinates: {
            lat: coordinates.latitude,
            lon: coordinates.longitude
         },
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

   static getCoordinates(coordinates: any) {
      if(coordinates) {
         return this.dmsToDecimal(coordinates);
      } else {
         // TODO: need to call API to get coordinates
         return {latitude: 0 , longitude:  0};
      }

   }

   static dmsToDecimal(coordinate: string): { latitude: number, longitude: number } {
      // Parse the latitude (S or N)
      const latDegrees = parseInt(coordinate.slice(0, 2), 10);
      const latMinutes = parseInt(coordinate.slice(2, 4), 10);
      const latHemisphere = coordinate[4];  // 'S' or 'N'

      // Parse the longitude (E or W)
      const lonDegrees = parseInt(coordinate.slice(6, 8), 10);
      const lonMinutes = parseInt(coordinate.slice(8, 10), 10);
      const lonHemisphere = coordinate[10];  // 'E' or 'W'

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
}

interface LoadedFile {
   fileContent: any;
   name: string;
}