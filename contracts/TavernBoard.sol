// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

/// @title  TavernBoard
/// @notice On-chain message board. Anyone posts a short message; frontend pulls
///         messages by random index to populate the quest board. Completely
///         independent of Datum protocol contracts.
contract TavernBoard {
    struct Message {
        address author;
        string  text;
        uint64  postedAt; // block.timestamp
    }

    uint256 public constant MAX_LENGTH = 280;

    Message[] private _messages;

    event MessagePosted(uint256 indexed id, address indexed author, string text);

    /// @notice Post a message to the board.
    function post(string calldata text) external {
        require(bytes(text).length > 0,              "empty");
        require(bytes(text).length <= MAX_LENGTH,    "too long");
        uint256 id = _messages.length;
        _messages.push(Message(msg.sender, text, uint64(block.timestamp)));
        emit MessagePosted(id, msg.sender, text);
    }

    /// @notice Total messages posted.
    function count() external view returns (uint256) {
        return _messages.length;
    }

    /// @notice Fetch a single message by index.
    function getMessage(uint256 id)
        external
        view
        returns (address author, string memory text, uint64 postedAt)
    {
        require(id < _messages.length, "not found");
        Message storage m = _messages[id];
        return (m.author, m.text, m.postedAt);
    }

    /// @notice Fetch a batch of messages (ascending by id, no overflow).
    function getMessages(uint256 startId, uint256 batchSize)
        external
        view
        returns (Message[] memory batch)
    {
        uint256 total = _messages.length;
        if (startId >= total) return new Message[](0);
        uint256 end = startId + batchSize;
        if (end > total) end = total;
        batch = new Message[](end - startId);
        for (uint256 i = startId; i < end; i++) {
            batch[i - startId] = _messages[i];
        }
    }
}
