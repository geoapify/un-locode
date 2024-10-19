import { UnlocodeItem, UnlocodeJsonItem } from "./models/unlocode.interface";
import { promises as fs } from 'fs';
import * as path from 'path';

export class Unlocode {
    async query(countryCode: string, locationCode: string): Promise<UnlocodeItem> {
        let jsonFile = await this.loadJsonFile(countryCode);
        let item = this.findItemInJSONFile(jsonFile, locationCode);
        if (item) {
            return {
                fullCode: item.country + item.location,
                locationName: item.name,
                subdivision: item.subdivision,
                status: item.status,
                functionCodes: item.function,
                coordinates: {
                    lat: item.coordinates.lat,
                    lon: item.coordinates.lon,
                },
            }
        } else {
            throw new Error('Location not found');
        }
    }

    async loadJsonFile(countryName: string): Promise<Array<UnlocodeJsonItem>> {
        const fileName = countryName + '.json';
        const filePath = path.join(__dirname, '../json-data', fileName);

        try {
            const fileContents = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(fileContents);
        } catch (error) {
            throw new Error('Error reading JSON file: ' + error);
        }
    }

    findItemInJSONFile(file: Array<UnlocodeJsonItem>, locationCode: string): UnlocodeJsonItem {
        return file.find(item => item.location === locationCode);
    }
}
