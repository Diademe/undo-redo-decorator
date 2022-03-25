module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: "../",
    globals: {
        "ts-jest": {
            tsconfig: "spec/tsconfig.spec.json"
        }
    },
    collectCoverageFrom: [
        "src/**/*.ts"
    ]
};
