// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

/// @title  TavernBetting
/// @notice Simple P2P / vs-house wagering for tavern mini-games.
///         Completely independent of Datum protocol contracts.
///
///         RNG: keccak256(blockhash(n-1), gameId, p1, p2, timestamp).
///         Demo-grade only — production path would use a VRF oracle.
contract TavernBetting {
    enum GameType  { DICE, ARM_WRESTLE, DARTS, CARD_DRAW, HIGH_CARD, LOW_CARD }
    enum GameState { OPEN, RESOLVED, CANCELLED }

    struct Game {
        address   player1;
        address   player2;    // address(0) = open for P2P; address(this) = vs house
        GameType  gameType;
        uint256   betAmount;
        GameState state;
        uint64    createdAt;
        address   winner;     // address(this) = house won
    }

    uint256 public constant MAX_BET      = 1_000 * 10 ** 10; // 1 000 PAS in planck
    uint256 public constant JOIN_TIMEOUT = 30 minutes;

    Game[] private _games;

    event GameCreated  (uint256 indexed id, address indexed player1, GameType gameType, uint256 betAmount, bool vsHouse);
    event GameJoined   (uint256 indexed id, address indexed player2);
    event GameResolved (uint256 indexed id, address indexed winner, uint256 payout);
    event GameCancelled(uint256 indexed id);

    // ─── Create ──────────────────────────────────────────────────────────────

    /// @param gameType  Which mini-game is being played.
    /// @param vsHouse   true → resolve immediately against the contract balance;
    ///                  false → leave open for a second player to join.
    function createGame(GameType gameType, bool vsHouse)
        external
        payable
        returns (uint256 id)
    {
        require(msg.value > 0 && msg.value <= MAX_BET, "bet out of range");
        if (vsHouse) {
            require(address(this).balance >= msg.value * 2, "house funds low");
        }

        id = _games.length;
        address p2 = vsHouse ? address(this) : address(0);
        _games.push(Game({
            player1:   msg.sender,
            player2:   p2,
            gameType:  gameType,
            betAmount: msg.value,
            state:     GameState.OPEN,
            createdAt: uint64(block.timestamp),
            winner:    address(0)
        }));

        emit GameCreated(id, msg.sender, gameType, msg.value, vsHouse);

        if (vsHouse) _resolve(id);
    }

    // ─── P2P join ────────────────────────────────────────────────────────────

    function joinGame(uint256 id) external payable {
        Game storage g = _games[id];
        require(g.state        == GameState.OPEN,    "not open");
        require(g.player2      == address(0),         "not a P2P game");
        require(msg.value      == g.betAmount,        "wrong bet amount");
        require(block.timestamp <= g.createdAt + JOIN_TIMEOUT, "expired");
        require(msg.sender     != g.player1,          "can't join own game");

        g.player2 = msg.sender;
        emit GameJoined(id, msg.sender);
        _resolve(id);
    }

    // ─── Cancel (P2P only, after timeout) ────────────────────────────────────

    function cancelGame(uint256 id) external {
        Game storage g = _games[id];
        require(g.state   == GameState.OPEN,   "not open");
        require(g.player2 == address(0),        "opponent joined");
        require(msg.sender == g.player1,        "not your game");
        require(block.timestamp > g.createdAt + JOIN_TIMEOUT, "wait for timeout");

        g.state = GameState.CANCELLED;
        payable(g.player1).transfer(g.betAmount);
        emit GameCancelled(id);
    }

    // ─── Internal resolution ─────────────────────────────────────────────────

    function _resolve(uint256 id) internal {
        Game storage g = _games[id];
        bytes32 seed = keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            id,
            g.player1,
            g.player2,
            block.timestamp
        ));
        bool p1Wins = uint256(seed) % 2 == 0;

        address winner = p1Wins ? g.player1 : g.player2; // g.player2 == address(this) for house
        g.winner = winner;
        g.state  = GameState.RESOLVED;

        uint256 payout = g.betAmount * 2;
        if (p1Wins) {
            payable(g.player1).transfer(payout);
        } else if (g.player2 != address(this)) {
            // P2P: pay actual second player
            payable(g.player2).transfer(payout);
        }
        // house win: funds stay in contract

        emit GameResolved(id, winner, p1Wins || g.player2 != address(this) ? payout : 0);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function gameCount() external view returns (uint256) { return _games.length; }

    function getGame(uint256 id) external view returns (Game memory) {
        require(id < _games.length, "not found");
        return _games[id];
    }

    function houseBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ─── House funding ────────────────────────────────────────────────────────

    /// @dev Owner funds the house pot via plain transfer.
    receive() external payable {}
}
