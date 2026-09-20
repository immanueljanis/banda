// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {IERC20} from "../interfaces/IERC20.sol";

/// @dev Attempts a nested Banda deposit before accepting the outer strategy deposit.
contract MockReentrantStrategy {
    IERC20 public immutable asset;
    address public immutable banda;
    uint32 public immutable strategyId;
    bool public nestedCallBlocked;
    mapping(address => uint256) public shareBalance;

    constructor(address asset_, address banda_, uint32 strategyId_) {
        asset = IERC20(asset_);
        banda = banda_;
        strategyId = strategyId_;
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        (bool nested,) = banda.call(abi.encodeWithSignature("deposit(uint32,uint256)", strategyId, 1));
        nestedCallBlocked = !nested;
        require(nestedCallBlocked, "MockReentrantStrategy: nested call succeeded");
        require(asset.transferFrom(msg.sender, address(this), assets), "MockReentrantStrategy: transfer failed");
        shareBalance[receiver] += assets;
        return assets;
    }
}
