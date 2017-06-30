import { expect } from "chai";
import { findRootDir } from "../src/config";

describe("config", () => {
  describe("findRootDir", () => {
    it("should find Longest Common Path for list of paths", () => {
      expect(findRootDir([ "a/b/c", "a/b/c/d", "a/b/d" ])).to.equal("a/b/");
      expect(findRootDir([ "interspecies", "interstelar", "interstate" ])).to.equal("inters");
      expect(findRootDir([ "throne", "throne" ])).to.equal("throne");
      expect(findRootDir([ "throne", "dungeon" ])).to.equal("");
      expect(findRootDir([ "cheese" ])).to.equal("cheese");
      expect(findRootDir([])).to.equal("");
      expect(findRootDir([ "prefix", "suffix" ])).to.equal("");
    });
  });
});
