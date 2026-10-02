// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";

/// @dev Local accounting fixture: targetBps records sleeve weights; no swap or external venue is executed.
contract MockRebalanceStrategy {
    IERC20 public immutable asset;
    address public immutable controller;
    mapping(address => uint256) public shareBalance;
    mapping(address => uint16) public sleeveBps;

    constructor(address asset_, address controller_) {
        asset = IERC20(asset_);
        controller = controller_;
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        require(asset.transferFrom(msg.sender, address(this), assets), "MockRebalance: pull failed");
        shareBalance[receiver] += assets;
        return assets;
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        require(msg.sender == owner && shareBalance[owner] >= shares, "MockRebalance: invalid redeem");
        shareBalance[owner] -= shares;
        require(asset.transfer(receiver, shares), "MockRebalance: payout failed");
        return shares;
    }

    function previewRedeem(uint256 shares) external pure returns (uint256 assets) {
        return shares;
    }

    function rebalance(address account, uint16 targetBps) external returns (uint256 sharesAfter) {
        require(msg.sender == controller && shareBalance[account] != 0, "MockRebalance: unauthorized");
        sleeveBps[account] = targetBps;
        return shareBalance[account];
    }
}
