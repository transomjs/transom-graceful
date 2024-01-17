"use strict";

let expect;
const sinon = require("sinon");
const TransomGraceful = require("../index");

describe("TransomGraceful", function () {
  beforeEach(() => {
    // Use a dynamic import for the chai ES module!
    return import("chai").then((chai) => (expect = chai.expect));
  });

  afterEach(function () {});

  it("looks like a Transom plugin", function (done) {
    expect(TransomGraceful).to.be.an.instanceOf(Object);
    expect(TransomGraceful.initialize).to.be.an.instanceOf(Function);
    done();
  });

  it("needs tests", function (done) {
    done();
  });
});
