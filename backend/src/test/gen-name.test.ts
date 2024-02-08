import dayjs from "dayjs";
import { generateReverseChronoName } from "../lib/gen-name";

describe("gen-name", () => {

    test("generate reverse chrono name", () => {
        const date = dayjs("2024-02-06T03:06:22.731Z").toDate();
        expect(generateReverseChronoName(date)).toBe("00000000030828027216");
    });

    test("generate names in reverse chronological order", () => {

        const dates = [
            "2012-07-29T10:30:59.000Z",
            "2024-02-06T03:06:22.731Z",
            "2012-08-03T02:07:48.000Z",
        ];

        const expectedOutputUnsorted = [
            "00000000031191658140",
            "00000000030828027216",
            "00000000031191256331"
        ];

        const expectedOutputSorted = [
            "00000000030828027216",
            "00000000031191256331",
            "00000000031191658140",
        ];

        const names = dates
            .map(dateStr => dayjs(dateStr).toDate())
            .map((date) => generateReverseChronoName(date));

        expect(names).toEqual(expectedOutputUnsorted);

        names.sort();

        expect(names).toEqual(expectedOutputSorted);        
    });
    
});
