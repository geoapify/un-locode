import { Unlocode } from "../src/unlocode";
import { FunctionCode, Status } from "../src/models/unlocode.interface";

describe('UNLocode Class', () => {
    let unlocode = new Unlocode();

    it('query should return data', async () => {
        let queryResult = await unlocode.query("US", "NYC");
        expect(queryResult).toStrictEqual({
            fullCode: 'USNYC',
            locationName: 'New York',
            subdivision: 'NY',
            status: Status.ACTIVE,
            functionCodes: [FunctionCode.PORT, FunctionCode.RAIL_TERMINAL,
                FunctionCode.ROAD_TERMINAL, FunctionCode.AIRPORT, FunctionCode.POSTAL_EXCHANGE_OFFICE],
            coordinates: {
                lat: 40.7128,
                lon: -74.0060,
            },
        });
    });
});
