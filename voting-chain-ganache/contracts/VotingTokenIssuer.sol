// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VotingTokenIssuer {
    address public owner;
    uint256 public nonce;

    // ------------------------
    // Voting window
    // ------------------------
    uint64 public votingStart;     // unix seconds
    uint64 public votingEnd;       // unix seconds
    bool public votingConfigured;

    event VotingPeriodSet(uint64 start, uint64 end);

    function setVotingPeriod(uint64 start, uint64 end) external onlyOwner {
        require(end > start, "Invalid period");
        votingStart = start;
        votingEnd = end;
        votingConfigured = true;
        emit VotingPeriodSet(start, end);
    }

    function isVotingActive() public view returns (bool) {
        if (!votingConfigured) return false;
        return block.timestamp >= votingStart && block.timestamp <= votingEnd;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenVotingActive() {
        require(isVotingActive(), "Voting not active");
        _;
    }

    // ------------------------
    // One vote per voter (by idHash)
    // ------------------------
    mapping(bytes32 => bool) public hasVoted; // ✅ prevents multiple votes

    // ------------------------
    // Token
    // ------------------------
    struct TokenInfo {
        bytes32 token;
        uint64 expiresAt;
        bool used;
    }

    mapping(bytes32 => TokenInfo) public tokens; // idHash => token info
    event TokenIssued(bytes32 indexed idHash, bytes32 token, uint64 expiresAt);

    // ------------------------
    // Candidates
    // ------------------------
    struct Candidate {
        uint256 id;
        string name_en;
        string name_kh;
        string party;
        string photo_url;
        uint256 voteCount;
        bool is_active;
    }

    uint256 public candidateCount;
    mapping(uint256 => Candidate) private _candidates;

    event CandidateAdded(uint256 indexed id, string name_en);
    event VoteCast(uint256 indexed candidateId);

    constructor() {
        owner = msg.sender;
    }

    function addCandidate(
        string calldata name_en,
        string calldata name_kh,
        string calldata party,
        string calldata photo_url
    ) external onlyOwner {
        require(bytes(name_en).length > 0, "name_en required");

        candidateCount += 1;
        _candidates[candidateCount] = Candidate({
            id: candidateCount,
            name_en: name_en,
            name_kh: name_kh,
            party: party,
            photo_url: photo_url,
            voteCount: 0,
            is_active: true
        });

        emit CandidateAdded(candidateCount, name_en);
    }

    function getCandidate(uint256 id) external view returns (
        uint256,
        string memory,
        string memory,
        string memory,
        string memory,
        uint256,
        bool
    ) {
        Candidate memory c = _candidates[id];
        return (c.id, c.name_en, c.name_kh, c.party, c.photo_url, c.voteCount, c.is_active);
    }

    // ------------------------
    // Token issue/validate
    // ------------------------
    function issueToken(bytes32 idHash, uint64 ttlSeconds)
        external
        onlyOwner
        whenVotingActive
        returns (bytes32 token)
    {
        require(!hasVoted[idHash], "Already voted"); // ✅ stop new token after voting

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

    function validateToken(bytes32 idHash, bytes32 token) public view returns (bool) {
        TokenInfo memory t = tokens[idHash];
        if (t.token == bytes32(0)) return false;
        if (t.token != token) return false;
        if (t.used) return false;
        if (block.timestamp > t.expiresAt) return false;
        return true;
    }

    // ------------------------
    // Vote
    // ------------------------
    function voteWithToken(bytes32 idHash, bytes32 token, uint256 candidateId)
        external
        onlyOwner
        whenVotingActive
    {
        require(!hasVoted[idHash], "Already voted"); // ✅ one vote per voter

        require(candidateId >= 1 && candidateId <= candidateCount, "Invalid candidate");
        Candidate storage c = _candidates[candidateId];
        require(c.is_active, "Candidate inactive");

        require(validateToken(idHash, token), "Invalid/expired/used token");

        // mark used + lock voter
        tokens[idHash].used = true;
        hasVoted[idHash] = true;

        c.voteCount += 1;
        emit VoteCast(candidateId);
    }
}