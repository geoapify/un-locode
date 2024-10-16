import * as fs from 'fs';
import * as path from 'path';
import { Utility } from "../src";
import * as readline from 'readline';

jest.mock('fs');

describe('Utility Class', () => {
    const mockFilePath = 'data-source/test.xls';
    const mockFileStream = { on: jest.fn() }; // Mock file stream

    beforeEach(() => {
        (fs.readdirSync as jest.Mock).mockReturnValue(['test.xls', 'test.csv']);
        (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
        (fs.createReadStream as jest.Mock).mockReturnValue(mockFileStream);

        // Mock fs.promises.writeFile
        // (fs.promises.writeFile as jest.Mock) = jest.fn().mockResolvedValue(undefined);

        // Optionally mock fs.existsSync and mkdirSync
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);


    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load files correctly', () => {
        const loadedFiles = Utility.loadFiles();
        expect(loadedFiles).toHaveLength(2);
        expect(loadedFiles[0].name).toBe('test.xls');
        expect(loadedFiles[1].name).toBe('test.csv');
    });

    it('should accept the correct file formats', () => {
        const mockFile = { name: 'test.xls', fileContent: '' };
        expect(Utility.isFileFormatAccepted(mockFile)).toBe(true);

        const invalidFile = { name: 'test.txt', fileContent: '' };
        expect(Utility.isFileFormatAccepted(invalidFile)).toBe(false);
    });

    it('should generate JSON from CSV', async () => {
        const mockCSVFile = {
            fileContent: fs.createReadStream('data-source/test.csv'),
            name: 'test.csv',
        };

        // Mock readline interface behavior
        const lines = [
            'change,country,location,name,nameWoDiacritics,subdivision,status,function,date,iata,coordinates,remarks',
            'update,US,New York,John Doe,,NY,active,,2024-10-16,IATA123,,'
        ];

        mockFileStream.on.mockImplementation((event, callback) => {
            if (event === 'line') {
                lines.forEach(line => callback(line));
            } else if (event === 'close') {
                callback();
            }
        });

        const result = await Utility.generateJSONFromCSV(mockCSVFile);
        expect(result.size).toBe(1);
        expect(result.get('US')).toHaveLength(1);
    });

    it('should generate JSON from XLS', async () => {
        const mockXLSFile = {
            fileContent: fs.createReadStream('data-source/test.xls'),
            name: 'test.xls',
        };

        mockFileStream.on.mockImplementation((event, callback) => {
            if (event === 'data') {
                // Simulate data chunks
                callback(Buffer.from('some binary data'));
            } else if (event === 'end') {
                callback();
            }
        });

        // Mock xlsx read
        jest.spyOn(require('xlsx'), 'read').mockReturnValue({
            SheetNames: ['Sheet1'],
            Sheets: {
                Sheet1: {
                    '!ref': 'A1:B2',
                    A1: { v: 'Change' },
                    A2: { v: 'update' },
                    B1: { v: 'Country' },
                    B2: { v: 'US' },
                },
            },
        });

        const result = await Utility.generateJSONFromXLS(mockXLSFile);
        expect(result.size).toBe(1);
        expect(result.get('US')).toHaveLength(1);
    });

    // Add more tests as needed...

});