// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VotingTokenIssuer {
    address public owner;
    uint256 public nonce;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ------------------------
    // Elections (DRAFT -> CONFIGURED -> ACTIVE -> ENDED)
    // ------------------------
    uint256 public electionCount;
    uint256 public currentElectionId;

    mapping(uint256 => uint64) public votingStart;       // electionId => start (unix seconds)
    mapping(uint256 => uint64) public votingEnd;         // electionId => end   (unix seconds)  [EXCLUSIVE]
    mapping(uint256 => bool) public electionConfigured;  // electionId => configured

    event ElectionDraftCreated(uint256 indexed electionId);
    event ElectionConfiguredEvent(uint256 indexed electionId, uint64 start, uint64 end);

    function createDraftElection() external onlyOwner returns (uint256) {
        // If there is a current election:
        // - if configured, it must be ended (now >= end)
        // - if draft, you must configure it first (no new draft)
        if (currentElectionId != 0) {
            if (electionConfigured[currentElectionId]) {
                // ✅ end is exclusive, so ended means now >= end
                require(block.timestamp >= votingEnd[currentElectionId], "Current election not ended");
            } else {
                revert("Current election is draft");
            }
        }

        electionCount += 1;
        uint256 eid = electionCount;

        electionConfigured[eid] = false;
        votingStart[eid] = 0;
        votingEnd[eid] = 0;

        currentElectionId = eid;

        emit ElectionDraftCreated(eid);
        return eid;
    }

    function setElectionPeriod(uint256 electionId, uint64 start, uint64 end) external onlyOwner {
        require(electionId >= 1 && electionId <= electionCount, "Bad electionId");
        require(!electionConfigured[electionId], "Already configured");
        require(end > start, "Invalid period");
        require(block.timestamp < start, "Start must be future");

        votingStart[electionId] = start;
        votingEnd[electionId] = end;
        electionConfigured[electionId] = true;

        emit ElectionConfiguredEvent(electionId, start, end);
    }

    // ✅ ACTIVE is [start, end)  (end is EXCLUSIVE)
    function isElectionActive(uint256 electionId) public view returns (bool) {
        if (!electionConfigured[electionId]) return false;
        return block.timestamp >= votingStart[electionId] && block.timestamp < votingEnd[electionId];
    }

    modifier whenElectionActive(uint256 electionId) {
        require(isElectionActive(electionId), "Voting not active");
        _;
    }

    // ✅ allow in DRAFT or BEFORE start only
    function isBeforeStart(uint256 electionId) public view returns (bool) {
        if (!electionConfigured[electionId]) return true; // draft
        return block.timestamp < votingStart[electionId];
    }

    modifier onlyBeforeStart(uint256 electionId) {
        require(isBeforeStart(electionId), "Period started");
        _;
    }

    // ------------------------
    // Candidates (per election)
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

    mapping(uint256 => uint256) public candidateCount; // electionId => count
    mapping(uint256 => mapping(uint256 => Candidate)) private _candidates;

    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name_en);
    event VoteCast(uint256 indexed electionId, uint256 indexed candidateId);

    event CandidateUpdated(uint256 indexed electionId, uint256 indexed candidateId, string name_en);
    event CandidateStatusChanged(uint256 indexed electionId, uint256 indexed candidateId, bool is_active);

    modifier onlyDraft(uint256 electionId) {
    require(electionId >= 1 && electionId <= electionCount, "Bad electionId");
    require(!electionConfigured[electionId], "Not registration stage");
    _;
}

    function addCandidate(
        uint256 electionId,
        string calldata name_en,
        string calldata name_kh,
        string calldata party,
        string calldata photo_url
    ) external onlyOwner onlyDraft(electionId) {
        require(electionId >= 1 && electionId <= electionCount, "Bad electionId");
        require(bytes(name_en).length > 0, "name_en required");

        candidateCount[electionId] += 1;
        uint256 cid = candidateCount[electionId];

        _candidates[electionId][cid] = Candidate({
            id: cid,
            name_en: name_en,
            name_kh: name_kh,
            party: party,
            photo_url: photo_url,
            voteCount: 0,
            is_active: true
        });

        emit CandidateAdded(electionId, cid, name_en);
    }

    function updateCandidate(
    uint256 electionId,
    uint256 candidateId,
    string calldata name_en,
    string calldata name_kh,
    string calldata party,
    string calldata photo_url
    ) external onlyOwner onlyBeforeStart(electionId) {
    require(electionId >= 1 && electionId <= electionCount, "Bad electionId");
    require(candidateId >= 1 && candidateId <= candidateCount[electionId], "Invalid candidate");
    require(bytes(name_en).length > 0, "name_en required");

    Candidate storage c = _candidates[electionId][candidateId];
    c.name_en = name_en;
    c.name_kh = name_kh;
    c.party = party;
    c.photo_url = photo_url;

    emit CandidateUpdated(electionId, candidateId, name_en);
}

    function setCandidateActive(
        uint256 electionId,
        uint256 candidateId,
        bool active
    ) external onlyOwner onlyBeforeStart(electionId) {
        require(electionId >= 1 && electionId <= electionCount, "Bad electionId");
        require(candidateId >= 1 && candidateId <= candidateCount[electionId], "Invalid candidate");

        Candidate storage c = _candidates[electionId][candidateId];
        c.is_active = active;

        emit CandidateStatusChanged(electionId, candidateId, active);
    }

    function getCandidate(uint256 electionId, uint256 candidateId) external view returns (
        uint256,
        string memory,
        string memory,
        string memory,
        string memory,
        uint256,
        bool
    ) {
        Candidate memory c = _candidates[electionId][candidateId];
        return (c.id, c.name_en, c.name_kh, c.party, c.photo_url, c.voteCount, c.is_active);
    }

    // ------------------------
    // Tokens (per election) - NO voter identity on chain
    // ------------------------
    struct TokenInfo {
        uint64 expiresAt; // absolute unix seconds (EXCLUSIVE)
        bool used;
    }

    mapping(uint256 => mapping(bytes32 => TokenInfo)) public tokens; // electionId => token => info
    event TokenIssued(uint256 indexed electionId, bytes32 token, uint64 expiresAt);

    function issueToken(uint256 electionId, uint64 ttlSeconds)
    external
    onlyOwner
    onlyBeforeStart(electionId)
    returns (bytes32 token)
{
    require(electionId >= 1 && electionId <= electionCount, "Bad electionId");
    require(ttlSeconds > 0, "Bad ttl");

    uint64 exp;

    // During registration stage (DRAFT), keep token usable until later.
    // Voting is still blocked by whenElectionActive(), so token cannot be used early.
    if (!electionConfigured[electionId]) {
        exp = type(uint64).max;
    } else {
        exp = uint64(block.timestamp + ttlSeconds);

        uint64 endTs = votingEnd[electionId];
        if (exp > endTs) exp = endTs;
    }

    token = keccak256(
        abi.encodePacked(electionId, nonce++, blockhash(block.number - 1), block.timestamp)
    );

    tokens[electionId][token] = TokenInfo(exp, false);
    emit TokenIssued(electionId, token, exp);
    return token;
}

function validateToken(uint256 electionId, bytes32 token) public view returns (bool) {
    TokenInfo memory t = tokens[electionId][token];
    if (t.expiresAt == 0) return false;
    if (t.used) return false;

    // After election ended, token is no longer valid
    if (electionConfigured[electionId] && block.timestamp >= votingEnd[electionId]) return false;

    if (block.timestamp >= t.expiresAt) return false;
    return true;
}

    function voteWithToken(uint256 electionId, bytes32 token, uint256 candidateId)
        external
        whenElectionActive(electionId)
    {
        require(candidateId >= 1 && candidateId <= candidateCount[electionId], "Invalid candidate");

        Candidate storage c = _candidates[electionId][candidateId];
        require(c.is_active, "Candidate inactive");

        require(validateToken(electionId, token), "Invalid/expired/used token");

        tokens[electionId][token].used = true;
        c.voteCount += 1;

        emit VoteCast(electionId, candidateId);
    }
}