// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {IERC20} from "../interfaces/IERC20.sol";

contract MockStrategy {
    IERC20 public immutable asset;
    bool public failDeposits;
    mapping(address => uint256) public shareBalance;

    constructor(address asset_) {
        asset = IERC20(asset_);
    }

    function setFailDeposits(bool value) external {
        failDeposits = value;
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        require(!failDeposits, "MockStrategy: forced failure");
        require(asset.transferFrom(msg.sender, address(this), assets), "MockStrategy: transfer failed");
        shareBalance[receiver] += assets;
        return assets;
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        require(msg.sender == owner, "MockStrategy: account required");
        require(shareBalance[owner] >= shares, "MockStrategy: shares");
        shareBalance[owner] -= shares;
        require(asset.transfer(receiver, shares), "MockStrategy: payout failed");
        return shares;
    }

    function previewRedeem(uint256 shares) external pure returns (uint256 assets) {
        return shares;
    }
}
