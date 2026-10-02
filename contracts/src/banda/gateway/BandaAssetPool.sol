// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";

interface IGatewayToken {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
}

/// @notice Fixed-price testnet liquidity between settlement USDG and basket assets.
/// @dev Gateway tokens are minted on buy and burned on sell. Canonical testnet tokens (AMD, TSLA, WETH)
///      are served from inventory the owner deposits. Prices are fixed demo values, not market prices.
contract BandaAssetPool {
    struct Listing {
        uint128 priceUsdg;
        uint64 unit;
        bool mintable;
        bool listed;
    }

    IERC20 public immutable usdg;
    address public immutable owner;
    mapping(address => Listing) public listings;

    event Listed(address indexed asset, uint256 priceUsdg, uint256 unit, bool mintable);
    event Bought(address indexed asset, address indexed recipient, uint256 usdgIn, uint256 assetOut);
    event Sold(address indexed asset, address indexed recipient, uint256 assetIn, uint256 usdgOut);

    constructor(address usdg_, address owner_) {
        require(usdg_ != address(0) && owner_ != address(0), "Pool: invalid setup");
        usdg = IERC20(usdg_);
        owner = owner_;
    }

    /// @notice Lists an asset once; `priceUsdg` is the USDG (6 decimals) paid for one whole unit of the asset.
    function list(address asset, uint128 priceUsdg, uint64 unit, bool mintable) external {
        require(msg.sender == owner, "Pool: not owner");
        require(!listings[asset].listed && asset.code.length != 0 && priceUsdg != 0 && unit != 0, "Pool: invalid listing");
        listings[asset] = Listing(priceUsdg, unit, mintable, true);
        emit Listed(asset, priceUsdg, unit, mintable);
    }

    function quoteBuy(address asset, uint256 usdgIn) public view returns (uint256) {
        Listing memory listing = listings[asset];
        require(listing.listed, "Pool: unlisted");
        return usdgIn * listing.unit / listing.priceUsdg;
    }

    function quoteSell(address asset, uint256 assetIn) public view returns (uint256) {
        Listing memory listing = listings[asset];
        require(listing.listed, "Pool: unlisted");
        return assetIn * listing.priceUsdg / listing.unit;
    }

    function buy(address asset, uint256 usdgIn, address recipient) external returns (uint256 assetOut) {
        assetOut = quoteBuy(asset, usdgIn);
        require(assetOut != 0, "Pool: amount too small");
        require(usdg.transferFrom(msg.sender, address(this), usdgIn), "Pool: USDG pull failed");
        if (listings[asset].mintable) IGatewayToken(asset).mint(recipient, assetOut);
        else require(IERC20(asset).transfer(recipient, assetOut), "Pool: inventory exhausted");
        emit Bought(asset, recipient, usdgIn, assetOut);
    }

    function sell(address asset, uint256 assetIn, address recipient) external returns (uint256 usdgOut) {
        usdgOut = quoteSell(asset, assetIn);
        require(IERC20(asset).transferFrom(msg.sender, address(this), assetIn), "Pool: asset pull failed");
        if (listings[asset].mintable) IGatewayToken(asset).burn(assetIn);
        require(usdg.transfer(recipient, usdgOut), "Pool: USDG payout failed");
        emit Sold(asset, recipient, assetIn, usdgOut);
    }
}
