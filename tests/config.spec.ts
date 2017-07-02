import { expect } from "chai";
import { findRootDir } from "../src/config";

describe("config", () => {
  describe("findRootDir", () => {
    it("should find Longest Common Path for list of paths", () => {
      expect(findRootDir([ "some/deep/file.ts", "some/deep/awesome/file.ts", "some/deep/file.js" ])).to.equal("some/deep");
      expect(findRootDir([ "some/deep/file.ts", "some/deep/file.js" ])).to.equal("some/deep");
      expect(findRootDir([ "some/deep/file.ts", "another/file.ts" ])).to.equal("");
      expect(findRootDir([ "the/file.ts" ])).to.equal("the");
      expect(findRootDir([])).to.equal("");
      expect(findRootDir([ "file.ts", "file.js" ])).to.equal("");
      expect(findRootDir([ "file.ts", "deeper/file.js" ])).to.equal("");
    });
  });
});
