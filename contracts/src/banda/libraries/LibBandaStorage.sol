// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

library LibBandaStorage {
    bytes32 internal constant POSITION = keccak256("banda.managed-baskets.storage.v1");

    struct StrategyConfig {
        address strategy;
        uint96 minimumDeposit;
        uint16 annualFeeBps;
        address feeRecipient;
        bool enabled;
    }

    struct Basket {
        uint32 strategyId;
        address account;
        uint128 shares;
        uint128 feeLiability;
        uint40 feeCheckpoint;
        uint256 feeRemainder;
    }

    struct RebalanceBounds {
        uint16 minimumBps;
        uint16 maximumBps;
        bool configured;
    }

    struct AppStorage {
        bool initialized;
        bool paused;
        bool depositEntered;
        address settlement;
        address accountRegistry;
        address accountImplementation;
        address navAdapter;
        uint48 maxNavAge;
        uint256 nextTokenId;
        uint32 nextStrategyId;
        mapping(uint32 => StrategyConfig) strategies;
        mapping(uint32 => uint256) strategyBasketCount;
        mapping(uint256 => Basket) baskets;
        mapping(uint256 => address) ownerOf;
        mapping(address => uint256) balanceOf;
        mapping(uint256 => address) tokenApproval;
        mapping(address => mapping(address => bool)) operatorApproval;
        address rebalanceOperator;
        mapping(uint32 => RebalanceBounds) rebalanceBounds;
        uint48 maxNavBlockLag;
    }

    function appStorage() internal pure returns (AppStorage storage s) {
        bytes32 p = POSITION;
        assembly { s.slot := p }
    }
}
