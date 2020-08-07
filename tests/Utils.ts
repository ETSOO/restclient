/* eslint-disable no-undef */
import {
    isSimpleType,
    isSimpleObject,
    SimpleObject,
    mergeURLSearchParams
} from '../src/Utils';

import { JestTester } from '../src/JestTester';

describe('Tests for isSimpleType', () => {
    const tester = new JestTester<any, boolean>();
    tester.do(
        [
            {
                title: 'True cases',
                arranges: [
                    0,
                    true,
                    new Date(),
                    'hello',
                    undefined,
                    null,
                    BigInt(9999999999999999),
                    Symbol('test')
                ],
                expected: true
            },
            {
                title: 'False cases',
                arranges: [isSimpleType, new URLSearchParams(), { a: 1 }],
                expected: false
            }
        ],
        (arrange) => isSimpleType(arrange)
    );
});

describe('Tests for isSimpleObject', () => {
    const tester = new JestTester<object, boolean>();
    tester.do(
        [
            {
                title: 'True cases',
                arranges: [
                    { id: 1, date: new Date() },
                    { undefinedValue: undefined, nullValue: null }
                ],
                expected: true
            },
            {
                title: 'False cases',
                arranges: [{ items: [] }, { items: {} }],
                expected: false
            }
        ],
        (arrange) => isSimpleObject(arrange)
    );
});

describe('Tests for mergeURLSearchParams', () => {
    const data: SimpleObject = {
        id: 3,
        name: 'hello',
        age: null,
        other: undefined
    };
    const result = mergeURLSearchParams(new URLSearchParams(), data);
    test('Keys length test', () => {
        expect(Array.from(result.keys()).length).toBe(2);
    });
    test('Key name value test', () => {
        expect(result.get('name')).toBe('hello');
    });
    test('Key age test', () => {
        expect(result.get('age')).toBeNull();
    });
});
