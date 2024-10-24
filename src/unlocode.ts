import { LoadedFile, UnlocodeItem, UnlocodeJsonItem } from "./models/unlocode.interface";
import { promises as fs } from 'fs';
import * as path from 'path';

const loadedFiles: Map<string, LoadedFile> = new Map();
const fileExpiryTime = 1000 * 60 * 60 * 24; // 24 hours

export async function query(countryCode: string, locationCode: string): Promise<UnlocodeItem> {
    clearOldFiles();
    let jsonFile = await loadJsonFile(countryCode);
    if(!jsonFile) {
        return null;
    }
    let item = findItemInJSONFile(jsonFile, locationCode);
    if (item) {
        return {
            fullCode: item.country + item.location,
            locationName: item.name,
            subdivision: item.subdivision,
            status: item.status,
            functionCodes: item.function,
            coordinates: item.coordinates ? {
                lat: item.coordinates.lat,
                lon: item.coordinates.lon,
            } : null,
        }
    } else {
        return null;
    }
}

async function loadJsonFile(countryName: string): Promise<Array<UnlocodeJsonItem>> {
    if(loadedFiles.has(countryName)) {
        return loadedFiles.get(countryName).data;
    }
    const fileName = countryName + '.json';
    const filePath = path.join(__dirname, 'json-data', fileName);

    try {
        const fileContents = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContents);
        addFile(countryName, data);
        return data;
    } catch (error) {
        return null;
    }
}

function findItemInJSONFile(file: Array<UnlocodeJsonItem>, locationCode: string): UnlocodeJsonItem {
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
