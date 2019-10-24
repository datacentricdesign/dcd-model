const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");
const fs = require("fs");

describe("test", function() {
  before(function() {
    // runs before all tests in this block
    const sql = fs.readFileSync("./dao/init.sql", "utf8");
    return db.serialize(function() {
      return db.exec(sql);
    });
  });

  describe("#test()", function() {
    it("test a unit test!", function() {
      return true;
      // return db.find({type: 'User'}).should.eventually.have.length(3);
    });
  });

  after(function() {
    // runs after all tests in this block
    db.close();
  });

  beforeEach(function() {
    // runs before each test in this block
  });

  afterEach(function() {
    // runs after each test in this block
  });

  // test cases
});
