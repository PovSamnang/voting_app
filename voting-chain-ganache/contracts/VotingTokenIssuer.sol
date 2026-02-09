// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VotingTokenIssuer {
    address public owner;
    uint256 public nonce;

    struct TokenInfo {
        bytes32 token;
        uint64 expiresAt;
        bool used;
    }

    mapping(bytes32 => TokenInfo) public tokens; // idHash => token info

    event TokenIssued(bytes32 indexed idHash, bytes32 token, uint64 expiresAt);
    event TokenUsed(bytes32 indexed idHash, bytes32 token);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() { owner = msg.sender; }

    function issueToken(bytes32 idHash, uint64 ttlSeconds)
        external
        onlyOwner
        returns (bytes32 token)
    {
        TokenInfo memory prev = tokens[idHash];
        if (prev.token != bytes32(0)) {
            bool expired = block.timestamp > prev.expiresAt;
            require(prev.used || expired, "Active token exists");
        }

        uint64 expiresAt = uint64(block.timestamp + ttlSeconds);

        token = keccak256(
            abi.encodePacked(idHash, nonce++, blockhash(block.number - 1), block.timestamp)
        );

        tokens[idHash] = TokenInfo(token, expiresAt, false);
        emit TokenIssued(idHash, token, expiresAt);
        return token;
    }

    function validateToken(bytes32 idHash, bytes32 token) external view returns (bool) {
        TokenInfo memory t = tokens[idHash];
        if (t.token == bytes32(0)) return false;
        if (t.token != token) return false;
        if (t.used) return false;
        if (block.timestamp > t.expiresAt) return false;
        return true;
    }

    function markUsed(bytes32 idHash) external onlyOwner {
        TokenInfo storage t = tokens[idHash];
        require(t.token != bytes32(0), "No token");
        require(!t.used, "Already used");
        require(block.timestamp <= t.expiresAt, "Expired");
        t.used = true;
        emit TokenUsed(idHash, t.token);
    }
}
