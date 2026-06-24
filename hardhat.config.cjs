// CommonJS config: the project is ESM ("type":"module") and Hardhat 2.x rejects
// a .ts config in an ESM project (HH19). A .cjs config sidesteps that. Used only
// for `hardhat compile`; deployment runs via scripts/deploy-tavern.mjs.
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  paths: { sources: "./contracts", artifacts: "./artifacts", cache: "./cache" },
};
