// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";
import {MockUsdGAssetPool} from "./MockUsdGAssetPool.sol";

/// @dev Strategy fixture that routes tUSDG through a canonical tWBTC pool.
contract MockGatewayStrategy {
    IERC20 public immutable usdg;
    MockUsdGAssetPool public immutable pool;

    constructor(address usdg_, address pool_) {
        usdg = IERC20(usdg_);
        pool = MockUsdGAssetPool(pool_);
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        require(usdg.transferFrom(msg.sender, address(this), assets), "Gateway: pull failed");
        require(usdg.approve(address(pool), 0) && usdg.approve(address(pool), assets), "Gateway: approve failed");
        shares = pool.buy(assets, receiver);
        require(usdg.approve(address(pool), 0), "Gateway: revoke failed");
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        require(msg.sender == owner, "Gateway: account required");
        return pool.sellFrom(owner, shares, receiver);
    }

    function previewRedeem(uint256 shares) external view returns (uint256 assets) {
        return pool.previewSell(shares);
    }
}
