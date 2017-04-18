/* eslint-env mocha */
const assert = require('chai').assert;
const request = require('request');

const host = 'http://localhost:3000';

describe('addition', () => {
    describe('POST /process/addition', () => {
        it('should return an ID of a running process instance', (done) => {
            let reqParams = {
                uri: host + '/process/addition',
                method: 'POST',
                json: {
                    "band1": "/data/S2A_1/red",
                    "band2": "/data/S2A_1/green",
                    "output": "/data/user/foo"
                },
                timeout: 20000
            };

            request(reqParams, (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                console.log(body);  
                assert.isOk(body);
                done();
            });
        }).timeout(20000);
    });
});
