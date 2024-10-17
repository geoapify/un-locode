import { Utility } from "../src/utility/utility";

jest.mock('fs');

describe('Utility Class', () => {

    it('should accept the correct file formats', () => {
        const mockFile = { name: 'test.xls', fileContent: '' };
        expect(Utility.isFileFormatAccepted(mockFile)).toBe(true);

        const invalidFile = { name: 'test.txt', fileContent: '' };
        expect(Utility.isFileFormatAccepted(invalidFile)).toBe(false);
    });
});