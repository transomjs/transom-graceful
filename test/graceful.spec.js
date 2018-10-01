"use strict";
const expect = require('chai').expect;
const sinon = require('sinon');
const TransomGraceful = require('../index');

describe('TransomGraceful', function () {

    beforeEach(function () {
    });

    afterEach(function () {
    });
    
    it('looks like a Transom plugin', function (done) {
        expect(TransomGraceful).to.be.an.instanceOf(Object);
        expect(TransomGraceful.initialize).to.be.an.instanceOf(Function);
        done();
    });

    it('needs tests', function (done) {
        done();
    });

});