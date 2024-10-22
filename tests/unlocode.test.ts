import { query } from "../src/unlocode";
import { FunctionCode, Status } from "../src/models/unlocode.interface";
import { promises as fs } from 'fs';

describe('query', () => {
    it('query should return data', async () => {
        let queryResult = await query("US", "NYC");
        expect(queryResult).toStrictEqual({
            fullCode: 'USNYC',
            locationName: 'New York',
            subdivision: 'NY',
            status: Status.CODE_ADOPTED_BY_INTERNATIONAL_ORGANISATION,
            functionCodes: [FunctionCode.PORT, FunctionCode.RAIL_TERMINAL,
                FunctionCode.ROAD_TERMINAL, FunctionCode.AIRPORT, FunctionCode.POSTAL_EXCHANGE_OFFICE],
            coordinates: {
                lat: 40.7,
                lon: -74,
            },
        });
    });

    it('query should work if coordinates are null', async () => {
        let queryResult = await query("US", "TFY");
        expect(queryResult).toStrictEqual({
            fullCode: 'USTFY',
            locationName: 'Taneytown',
            subdivision: 'MD',
            status: Status.REQUEST_UNDER_CONSIDERATION,
            functionCodes: [FunctionCode.ROAD_TERMINAL],
            coordinates: null,
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
        const mockFileContents = JSON.stringify([{
            country: 'AU',
            location: 'ABP',
            name: 'Name',
            subdivision: 'Sub',
            status: Status.CODE_ADOPTED_BY_INTERNATIONAL_ORGANISATION,
            function: [FunctionCode.PORT],
            coordinates: { lat: 40.7, lon: -74 }
        }]);

        const readFileSpy = jest.spyOn(fs, 'readFile').mockResolvedValue(mockFileContents);

        await query("AU", "ABP");
        expect(readFileSpy).toHaveBeenCalledTimes(1);

        await query("AU", "ABP");
        expect(readFileSpy).toHaveBeenCalledTimes(1); // Still called only once
    });
});
