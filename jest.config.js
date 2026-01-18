module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '^kakidash$': '<rootDir>/node_modules/kakidash/dist/kakidash.cjs'
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: 'tsconfig.json'
        }]
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$'
};
