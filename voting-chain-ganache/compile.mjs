import fs from "fs";
import path from "path";
import solc from "solc";

const contractPath = path.resolve("contracts", "VotingTokenIssuer.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: { "VotingTokenIssuer.sol": { content: source } },
  settings: {
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors?.length) {
  output.errors.forEach((e) => console.log(e.formattedMessage));
  if (output.errors.some((e) => e.severity === "error")) process.exit(1);
}

const c = output.contracts["VotingTokenIssuer.sol"]["VotingTokenIssuer"];
const artifact = {
  abi: c.abi,
  bytecode: "0x" + c.evm.bytecode.object,
};

fs.mkdirSync("build", { recursive: true });
fs.writeFileSync("build/VotingTokenIssuer.artifact.json", JSON.stringify(artifact, null, 2));

console.log("✅ Wrote build/VotingTokenIssuer.artifact.json");
console.log("ABI items:", artifact.abi.length);
console.log("Bytecode length:", artifact.bytecode.length);
