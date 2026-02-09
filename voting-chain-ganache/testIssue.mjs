import { ethers } from "ethers";
import abi from "./abi/VotingTokenIssuer.json" with { type: "json" };

const RPC_URL = "http://127.0.0.1:8545";
const KEY = process.env.KEY;
const CONTRACT = process.env.CONTRACT;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(KEY, provider);
const c = new ethers.Contract(CONTRACT, abi, wallet);

const idNumber = "1234567890";
const idHash = ethers.keccak256(ethers.toUtf8Bytes(idNumber));
const ttl = 1800;

const tx = await c.issueToken(idHash, ttl);
const receipt = await tx.wait();

let token = null;
for (const log of receipt.logs) {
  try {
    const parsed = c.interface.parseLog(log);
    if (parsed.name === "TokenIssued") token = parsed.args.token;
  } catch {}
}

console.log("TOKEN:", token);
