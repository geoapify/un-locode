import { FunctionCode, Status, UnlocodeItem, UnlocodeJsonItem } from "./models/unlocode.interface";

export class Unlocode {

    async query(countryCode: string, locationCode: string): Promise<UnlocodeItem> {
        let jsonFile = await this.loadJsonFile(countryCode);
        let item = this.findItemInJSONFile(jsonFile, locationCode);
        if (item) {
            return {
                fullCode: item.country + item.location,
                locationName: item.name,
                subdivision: item.subdivision,
                status: Status.ACTIVE,
                functionCodes: [FunctionCode.Seaport, FunctionCode.Airport],
                coordinates: {
                    lat: 40.7128,
                    lon: -74.0060,
                },
            }
        } else {
            throw new Error('Location not found');
        }
    }

    async loadJsonFile(countryName: string): Promise<Array<UnlocodeJsonItem>> {
        let fileName = countryName + '.json';
        const filePath = `/json-data/${fileName}`;
        try {
            const response = await fetch(filePath);
            return await response.json();
        } catch (error) {
            throw new Error('Error fetching JSON file: ' + error);
        }
    }

    findItemInJSONFile(file: Array<UnlocodeJsonItem>, locationCode: string): UnlocodeJsonItem {
        return file.find(item => item.location === locationCode);
    }
}
