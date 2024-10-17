import { Unlocode } from "../src/unlocode";
import { FunctionCode, Status } from "../src/models/unlocode.interface";
import * as fs from "node:fs";

jest.mock('fs');

describe('UNLocode Class', () => {
    let unlocode = new Unlocode();

    it('query should return data', async () => {
        await mockFetchRequest.call(this, this, "json-data/US.json");
        let queryResult = await unlocode.query("US", "NYC");
        expect(queryResult).toStrictEqual({
            fullCode: 'USNYC',
            locationName: 'New York',
            subdivision: 'NY',
            status: Status.ACTIVE,
            functionCodes: [FunctionCode.Seaport, FunctionCode.Airport],
            coordinates: {
                lat: 40.7128,
                lon: -74.0060,
            },
        })
    });
});

async function mockFetchRequest(outerThis: any, filePath: string) {
    const fileContent: any = await fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);  // Parse the JSON content

    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(data),
            headers: new Headers(),  // Optional, can mock specific headers if needed
            redirected: false,
            statusText: 'OK',
            type: 'basic',
            url: '',
            clone: () => outerThis,
            body: null,
            bodyUsed: false,
            arrayBuffer: jest.fn(),
            blob: jest.fn(),
            formData: jest.fn(),
            text: jest.fn(),
        })
    );
}