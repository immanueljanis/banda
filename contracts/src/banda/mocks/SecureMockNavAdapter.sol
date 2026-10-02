// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Testnet NAV fixture with production-shaped authorization and replay controls.
/// @dev Values use 1e18 price precision. This remains a mock and must not secure real assets.
contract SecureMockNavAdapter {
    uint256 private constant BPS = 10_000;

    struct Quote {
        uint256 price;
        uint256 updatedAt;
        uint256 observedBlock;
        bool valid;
    }

    address public immutable owner;
    address public immutable updater;
    uint16 public immutable maxDeviationBps;
    mapping(address => Quote) public quotes;

    event QuoteUpdated(
        address indexed strategy, uint256 price, uint256 updatedAt, uint256 observedBlock, bool valid, bool forced
    );

    constructor(address owner_, address updater_, uint16 maxDeviationBps_) {
        require(owner_ != address(0) && updater_ != address(0), "NavAdapter: invalid role");
        require(maxDeviationBps_ != 0 && maxDeviationBps_ <= BPS, "NavAdapter: invalid deviation");
        owner = owner_;
        updater = updater_;
        maxDeviationBps = maxDeviationBps_;
    }

    function setQuote(address strategy, uint256 price, uint256 updatedAt, uint256 observedBlock, bool valid) external {
        require(msg.sender == updater || msg.sender == owner, "NavAdapter: unauthorized");
        _setQuote(strategy, price, updatedAt, observedBlock, valid);
    }

    function forceSetQuote(address strategy, uint256 price, uint256 updatedAt, uint256 observedBlock, bool valid)
        external
    {
        require(msg.sender == owner, "NavAdapter: not owner");
        _store(strategy, price, updatedAt, observedBlock, valid, true);
    }

    function quote(address strategy, uint256 shares)
        external
        view
        returns (uint256 grossAssets, uint256 updatedAt, uint256 observedBlock, bool valid)
    {
        Quote storage current = quotes[strategy];
        return (shares * current.price / 1e18, current.updatedAt, current.observedBlock, current.valid);
    }

    function _setQuote(address strategy, uint256 price, uint256 updatedAt, uint256 observedBlock, bool valid) private {
        Quote storage previous = quotes[strategy];
        if (previous.price != 0) {
            uint256 difference = price > previous.price ? price - previous.price : previous.price - price;
            require(difference * BPS <= previous.price * maxDeviationBps, "NavAdapter: excessive deviation");
        }
        _store(strategy, price, updatedAt, observedBlock, valid, false);
    }

    function _store(address strategy, uint256 price, uint256 updatedAt, uint256 observedBlock, bool valid, bool forced)
        private
    {
        require(strategy.code.length != 0 && price != 0, "NavAdapter: invalid quote");
        require(updatedAt <= block.timestamp && observedBlock <= block.number, "NavAdapter: future quote");
        Quote storage previous = quotes[strategy];
        require(
            updatedAt >= previous.updatedAt && observedBlock >= previous.observedBlock, "NavAdapter: quote rollback"
        );
        quotes[strategy] = Quote(price, updatedAt, observedBlock, valid);
        emit QuoteUpdated(strategy, price, updatedAt, observedBlock, valid, forced);
    }
}
