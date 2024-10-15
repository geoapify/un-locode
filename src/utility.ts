const fs = require('fs');
const path = require('path');
const readline = require('readline');

class Utility {
   static directoryPath = 'data-source';
   static outputDirectory = 'json-data';

   static async generateFiles() {
      let files = this.loadFiles();
      for (const fileContent of files) {
         let data = await this.generateJSON(fileContent);
         await this.saveToFiles(data);
      }
   }

   static loadFiles(): Array<string> {
      const files = fs.readdirSync(this.directoryPath);
      const allFiles = files.filter((file: any) => fs.statSync(path.join(this.directoryPath, file)).isFile());
      console.log('Files:', allFiles);

      let result: Array<string> = [];
      allFiles.forEach((file: string) => {
         result.push(fs.createReadStream(this.directoryPath + "/" + file));
      })
      return result;
   }

   static async generateJSON(fileStream: string): Promise<Map<string, Array<UnlocodeItem>>> {
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
               let item = this.convertToJSON(line);
               this.addRow(result, item);
            }
         });

         rl.on('close', () => {
            resolve(result);
         });

         rl.on('error', (error: any) => {
            reject(error);
         });
      });
   }

   static convertToJSON(line: string) {
      let lineParsed = line.split(",");
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
         iata:lineParsed[9],
         coordinates: lineParsed[10],
         remarks:lineParsed[11]
      };
   }

   static addRow(result: Map<string, Array<UnlocodeItem>>, item: UnlocodeItem) {
      if(!result.has(item.country)) {
         result.set(item.country, []);
      }
      result.get(item.country).push(item);
   }

   static async saveToFiles(result: Map<string, Array<UnlocodeItem>>): Promise<void> {
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
}

interface UnlocodeItem {
   change: string;
   country: string;
   location: string;
   name: string;
   nameWoDiacritics: string;
   subdivision: string;
   status: string;
   function: string;
   date: string;
   iata: string
   coordinates: string;
   remarks: string;
}

Utility.generateFiles();