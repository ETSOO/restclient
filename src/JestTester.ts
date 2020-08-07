/* eslint-disable no-undef */
export class JestTester<A, T> {
    do(
        cases: {
            /**
             * Title of the test
             */
            title: string;

            /**
             * Arranges / inputs
             */
            arranges: A[];

            /**
             * Expected result
             */
            expected: T;
        }[],
        act: {
            /**
             * Action interface
             */
            (arrange: A): T;
        }
    ) {
        // Loop through cases
        cases.forEach((item) => {
            // Each test
            test(`${item.title} (${item.arranges.length})`, () => {
                // Find the error index
                const errorIndex = item.arranges.findIndex(
                    (arrange: any) => act(arrange) !== item.expected
                );

                // -1, no error item founded (all match)
                expect(errorIndex).toBe(-1);
            });
        });
    }
}
