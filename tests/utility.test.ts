import { isFileFormatAccepted } from "../src/utility/utility";

jest.mock('fs');

describe('Utility Class', () => {

    it('should accept the correct file formats', () => {
        const mockFile = { name: 'test.xls', fileContent: '' };
        expect(isFileFormatAccepted(mockFile)).toBe(true);

        const invalidFile = { name: 'test.txt', fileContent: '' };
        expect(isFileFormatAccepted(invalidFile)).toBe(false);
    });
});