import { LoadedFile, UnlocodeItem, UnlocodeJsonItem } from "./models/unlocode.interface";
import * as path from 'path';
import csvToJson from 'convert-csv-to-json';


const loadedFiles: Map<string, LoadedFile> = new Map();
const fileExpiryTime = 1000 * 60 * 60 * 24; // 24 hours

export async function query(countryCode: string, locationCode: string): Promise<UnlocodeItem> {
    clearOldFiles();
    let file = await loadDataFile(countryCode);

    if(!file) {
        return null;
    }
    let item = findItemInFile(file, locationCode);
    if (item) {

        const codeData: UnlocodeItem = {
            country: item.country,
            location: item.location,
            locationName: item.nameWoDiacritics,
            subdivision: item.subdivision,
            status: item.status,
            functionCodes: convertToFunctionArray(item.function)
        }

        if (item.lat && item.lon) {
            codeData.coordinates = {
                lat: parseFloat(item.lat as any),
                lon: parseFloat(item.lon as any)
            }
        }

        if (!codeData.subdivision) {
            delete codeData.subdivision;
        }

        return codeData;
    } else {
        return null;
    }
}

async function loadDataFile(countryName: string): Promise<Array<UnlocodeJsonItem>> {
    if(loadedFiles.has(countryName)) {
        return loadedFiles.get(countryName).data;
    }
    const fileName = countryName + '.csv';
    const filePath = path.join(__dirname, 'data', fileName);

    try {
        //const fileContents = await fs.readFile(filePath, 'utf-8');
        const data = csvToJson.fieldDelimiter(',').supportQuotedField(true).getJsonFromCsv(filePath);

        data.forEach(item => {
            if (item['geocoded'] === 'true') {
                item['geocoded'] = true;
            } else {
                delete item['geocoded'];
            }
        });

        addFile(countryName, data);
        return data;
    } catch (error) {
        return null;
    }
}

function findItemInFile(file: Array<UnlocodeJsonItem>, locationCode: string): UnlocodeJsonItem {
    return file.find(item => item.location === locationCode);
}

function clearOldFiles() {
    loadedFiles.forEach((value, key) => {
       if(value.loadDate.getTime() + fileExpiryTime < Date.now()) {
           loadedFiles.delete(key);
       }
    });
}

function addFile(countryName: string, data: Array<UnlocodeJsonItem>) {
    loadedFiles.set(countryName, {
        loadDate: new Date(),
        data: data
    });
}

function convertToFunctionArray(functionCode: string): string[] {
    if (!functionCode) {
       return [];
    }
 
    let result: string[] = [];
 
    for (let i = 0; i < functionCode.length; i++) {
       if (functionCode.charAt(i) !== '-') {
          result.push(functionCode.charAt(i));
       }
    }
 
    return result;
 }