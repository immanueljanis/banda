// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";
import {MockCanonicalAsset} from "./MockCanonicalAsset.sol";

/// @dev Fixed-price local liquidity fixture: 1 tWBTC is 100 tUSDG.
contract MockUsdGAssetPool {
    IERC20 public immutable usdg;
    MockCanonicalAsset public immutable asset;
    uint256 public constant ASSET_UNIT = 1e8;
    uint256 public constant PRICE_USDG = 100e6;

    constructor(address usdg_, address asset_) {
        usdg = IERC20(usdg_);
        asset = MockCanonicalAsset(asset_);
    }

    function buy(uint256 usdgIn, address recipient) external returns (uint256 assetsOut) {
        assetsOut = usdgIn * ASSET_UNIT / PRICE_USDG;
        require(assetsOut != 0 && usdg.transferFrom(msg.sender, address(this), usdgIn), "Pool: buy failed");
        asset.mint(recipient, assetsOut);
    }

    function sellFrom(address owner, uint256 assetsIn, address recipient) external returns (uint256 usdgOut) {
        usdgOut = assetsIn * PRICE_USDG / ASSET_UNIT;
        require(usdg.balanceOf(address(this)) >= usdgOut, "Pool: insufficient USDG");
        asset.burn(owner, assetsIn);
        require(usdg.transfer(recipient, usdgOut), "Pool: sell failed");
    }

    function previewSell(uint256 assetsIn) external pure returns (uint256) {
        return assetsIn * PRICE_USDG / ASSET_UNIT;
    }
}
