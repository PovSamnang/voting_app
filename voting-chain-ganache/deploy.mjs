import fs from "fs";
import path from "path";
import solc from "solc";
import { ethers } from "ethers";

const RPC_URL = "http://127.0.0.1:8545";
const DEPLOYER_KEY = process.env.DEPLOYER_KEY; // Ganache private key 0x...

if (!DEPLOYER_KEY) {
  console.error("Missing DEPLOYER_KEY. Example:\nDEPLOYER_KEY=0x... node deploy.mjs");
  process.exit(1);
}

const source = fs.readFileSync(path.resolve("contracts/VotingTokenIssuer.sol"), "utf8");

const input = {
  language: "Solidity",
  sources: { "VotingTokenIssuer.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors || []).filter((e) => e.severity === "error");
if (errors.length) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}

const c = output.contracts["VotingTokenIssuer.sol"]["VotingTokenIssuer"];
const abi = c.abi;
const bytecode = "0x" + c.evm.bytecode.object;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);

console.log("Deploying with:", wallet.address);

const factory = new ethers.ContractFactory(abi, bytecode, wallet);
const contract = await factory.deploy();
await contract.waitForDeployment();

const address = await contract.getAddress();
console.log("✅ Contract deployed to:", address);

// Save ABI for backend
fs.mkdirSync("abi", { recursive: true });
fs.writeFileSync("abi/VotingTokenIssuer.json", JSON.stringify(abi, null, 2));
console.log("✅ ABI saved: abi/VotingTokenIssuer.json");
