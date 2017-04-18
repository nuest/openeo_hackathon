/* eslint-env mocha */
const assert = require('chai').assert;
const request = require('request');

//const host = 'http://localhost';
const host = 'http://localhost:3000';

describe('process', () => {
    describe('GET /process', () => {
        it('should respond with processes object', (done) => {
            request(host + '/process', (err, res, body) => {
                let response = JSON.parse(body);
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                assert.isOk(response.processes);
                assert.isOk(response.processes.addition);
                done();
            });
        });
    });

    describe('GET /process/does_not_exist', () => {
        it('should respond with error', (done) => {
            request(host + '/process/does_not_exist', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 404);
                done();
            });
        });
    });

    describe('GET /process/addition', () => {
        it('should respond with process description', (done) => {
            request(host + '/process/addition', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                let response = JSON.parse(body);
                assert.isOk(response);
                assert.property(response, 'process');
                assert.propertyVal(response.process, 'name', 'addition');
                assert.propertyVal(response.process, 'inputs', 2);
                assert.propertyVal(response.process, 'outputs', 1);
                done();
            });
        });
    });
});
