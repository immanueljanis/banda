// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IRebalanceStrategy} from "../interfaces/IRebalanceStrategy.sol";
import {LibBandaStorage} from "../libraries/LibBandaStorage.sol";
import {LibNavGuard} from "../libraries/LibNavGuard.sol";

/// @notice Operator execution against the basket's configured strategy and admin-set allocation range.
contract RebalanceFacet {
    event BasketRebalanced(
        uint256 indexed tokenId,
        address indexed account,
        uint16 targetBps,
        bytes32 indexed reason,
        uint256 navBefore,
        uint256 navAfter
    );

    function rebalance(uint256 tokenId, uint16 targetBps, uint256 minNavAfter, bytes32 reason)
        external
        returns (uint256 navAfter)
    {
        LibBandaStorage.AppStorage storage s = LibBandaStorage.appStorage();
        require(msg.sender == s.rebalanceOperator, "Banda: not rebalance operator");
        require(!s.paused, "Banda: paused");
        require(!s.depositEntered, "Banda: lifecycle busy");
        require(reason != bytes32(0), "Banda: reason required");
        LibBandaStorage.Basket storage b = s.baskets[tokenId];
        require(b.account != address(0), "Banda: basket missing");
        LibBandaStorage.RebalanceBounds storage bounds = s.rebalanceBounds[b.strategyId];
        require(
            bounds.configured && targetBps >= bounds.minimumBps && targetBps <= bounds.maximumBps,
            "Banda: outside mandate"
        );
        address strategy = s.strategies[b.strategyId].strategy;
        uint256 navBefore = LibNavGuard.requireValidQuote(strategy, b.shares);
        s.depositEntered = true;
        uint256 sharesAfter = IRebalanceStrategy(strategy).rebalance(b.account, targetBps);
        require(sharesAfter == b.shares, "Banda: shares changed");
        navAfter = LibNavGuard.requireValidQuote(strategy, b.shares);
        require(navAfter >= minNavAfter, "Banda: NAV below minimum");
        s.depositEntered = false;
        emit BasketRebalanced(tokenId, b.account, targetBps, reason, navBefore, navAfter);
    }
}
