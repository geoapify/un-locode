import { query } from "../src/unlocode";
import csvToJson from "convert-csv-to-json";

describe('query', () => {
    it('query should return data', async () => {
        let queryResult = await query("US", "NYC");
        expect(queryResult).toStrictEqual({
            country: 'US',
            location: "NYC",
            locationName: 'New York',
            subdivision: 'NY',
            status: "AI",
            functionCodes: ["1", "2", "3", "4", "5"],
            coordinates: {
                lat: 40.7,
                lon: -74,
            },
        });
    });

    it('query should work if coordinates are null', async () => {
        let queryResult = await query("US", "TLJ");
        expect(queryResult).toStrictEqual({
            country: 'US',
            location: 'TLJ',
            locationName: 'Tatalina',
            subdivision: 'AK',
            status: "AI",
            functionCodes: ["4"]
        });
    });

    it('query should work fine for Bhutan (issue#2)', async () => {
        let queryResult = await query("BT", "CCS");
        expect(queryResult).toStrictEqual({
            country: 'BT',
            location: 'CCS',
            locationName: 'Chuchungsa',
            subdivision: '14',
            status: "",
            functionCodes: ["3", "6"],
            coordinates: {
                lat: 26.966666666666665,
                lon: 88.93333333333334,
            },
        });

        let queryResult2 = await query("BT", "NYP");
        expect(queryResult2).toStrictEqual({
            country: 'BT',
            location: 'NYP',
            locationName: 'Nyonpaling',
            subdivision: '14',
            status: "",
            functionCodes: ["3", "6"],
            coordinates: {
                lat: 26.816666666666666,
                lon: 89.21666666666667,
            },
        });
    });

    it('query should work fine for name with comma', async () => {
        let queryResult = await query("AT", "MLD");
        expect(queryResult).toStrictEqual({
            country: 'AT',
            location: 'MLD',
            locationName: 'Mollersdorf, Baden',
            subdivision: '3',
            status: "RL",
            functionCodes: ["3"],
            coordinates: {
                lat: 48.016666666666666,
                lon: 16.3,
            },
        });
    });

    it('query should work if country not found', async () => {
        let queryResult = await query("XX", "TFY");
        expect(queryResult).toEqual(null);
    });

    it('query should work if location not found', async () => {
        let queryResult = await query("US", "XXXZ");
        expect(queryResult).toEqual(null);
    });

    it('should cache the file and load it only once', async () => {
        const mockFileContents = [
            {
                country: 'AU',
                location: 'ABP',
                name: 'Abbot Point',
                nameWoDiacritics: 'Abbot Point',
                subdivision: 'QLD',
                status: 'AC',
                function: '1-------',
                iata: '',
                lat: '-19.9',
                lon: '148.08333333333334',
                geocoded: undefined
            }
        ];

        const readFileSpy = jest .spyOn(csvToJson, 'getJsonFromCsv').mockReturnValue(mockFileContents);

        await query("AU", "ABP");
        expect(readFileSpy).toHaveBeenCalledTimes(1);

        await query("AU", "ABP");
        expect(readFileSpy).toHaveBeenCalledTimes(1); // Still called only once
    });
});
