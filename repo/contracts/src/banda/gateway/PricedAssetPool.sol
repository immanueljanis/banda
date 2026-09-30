// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";

interface IPricedGatewayToken {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
}

/// @notice Testnet liquidity between settlement USDG and basket assets at published market prices.
/// @dev The updater publishes prices just before a user transacts; buys and sells revert once a price is
///      older than `maxAge`, and each update may move a price by at most `maxDeviationBps` (the owner can
///      force a reset). Gateway tokens are minted on buy and burned on sell; canonical testnet tokens are
///      served from inventory. The pool is the counterparty: sells are paid from USDG it holds.
contract PricedAssetPool {
    uint256 private constant BPS = 10_000;

    struct Listing {
        uint128 priceUsdg;
        uint64 updatedAt;
        uint64 unit;
        bool mintable;
        bool listed;
    }

    IERC20 public immutable usdg;
    address public immutable owner;
    address public immutable updater;
    uint64 public immutable maxAge;
    uint16 public immutable maxDeviationBps;
    mapping(address => Listing) public listings;

    event Listed(address indexed asset, uint256 priceUsdg, uint256 unit, bool mintable);
    event PriceUpdated(address indexed asset, uint256 priceUsdg, bool forced);
    event Bought(address indexed asset, address indexed recipient, uint256 usdgIn, uint256 assetOut);
    event Sold(address indexed asset, address indexed recipient, uint256 assetIn, uint256 usdgOut);

    constructor(address usdg_, address owner_, address updater_, uint64 maxAge_, uint16 maxDeviationBps_) {
        require(usdg_ != address(0) && owner_ != address(0) && updater_ != address(0), "Pool: invalid setup");
        require(maxAge_ != 0 && maxDeviationBps_ != 0 && maxDeviationBps_ <= BPS, "Pool: invalid policy");
        usdg = IERC20(usdg_);
        owner = owner_;
        updater = updater_;
        maxAge = maxAge_;
        maxDeviationBps = maxDeviationBps_;
    }

    /// @notice Lists an asset once; `priceUsdg` is the USDG (6 decimals) value of one whole unit of the asset.
    function list(address asset, uint128 priceUsdg, uint64 unit, bool mintable) external {
        require(msg.sender == owner, "Pool: not owner");
        require(!listings[asset].listed && asset.code.length != 0 && priceUsdg != 0 && unit != 0, "Pool: invalid listing");
        listings[asset] = Listing(priceUsdg, uint64(block.timestamp), unit, mintable, true);
        emit Listed(asset, priceUsdg, unit, mintable);
    }

    function setPrices(address[] calldata assets, uint128[] calldata prices) external {
        require(msg.sender == updater || msg.sender == owner, "Pool: not updater");
        require(assets.length == prices.length, "Pool: length mismatch");
        for (uint256 i; i < assets.length; ++i) {
            Listing storage listing = listings[assets[i]];
            require(listing.listed && prices[i] != 0, "Pool: invalid price");
            uint256 previous = listing.priceUsdg;
            uint256 difference = prices[i] > previous ? prices[i] - previous : previous - prices[i];
            require(difference * BPS <= previous * maxDeviationBps, "Pool: excessive deviation");
            listing.priceUsdg = prices[i];
            listing.updatedAt = uint64(block.timestamp);
            emit PriceUpdated(assets[i], prices[i], false);
        }
    }

    function forcePrice(address asset, uint128 priceUsdg) external {
        require(msg.sender == owner, "Pool: not owner");
        Listing storage listing = listings[asset];
        require(listing.listed && priceUsdg != 0, "Pool: invalid price");
        listing.priceUsdg = priceUsdg;
        listing.updatedAt = uint64(block.timestamp);
        emit PriceUpdated(asset, priceUsdg, true);
    }

    function isFresh(address asset) public view returns (bool) {
        Listing memory listing = listings[asset];
        return listing.listed && block.timestamp - listing.updatedAt <= maxAge;
    }

    function quoteBuy(address asset, uint256 usdgIn) public view returns (uint256) {
        Listing memory listing = _fresh(asset);
        return usdgIn * listing.unit / listing.priceUsdg;
    }

    function quoteSell(address asset, uint256 assetIn) public view returns (uint256) {
        Listing memory listing = _fresh(asset);
        return assetIn * listing.priceUsdg / listing.unit;
    }

    function buy(address asset, uint256 usdgIn, address recipient) external returns (uint256 assetOut) {
        assetOut = quoteBuy(asset, usdgIn);
        require(assetOut != 0, "Pool: amount too small");
        require(usdg.transferFrom(msg.sender, address(this), usdgIn), "Pool: USDG pull failed");
        if (listings[asset].mintable) IPricedGatewayToken(asset).mint(recipient, assetOut);
        else require(IERC20(asset).transfer(recipient, assetOut), "Pool: inventory exhausted");
        emit Bought(asset, recipient, usdgIn, assetOut);
    }

    function sell(address asset, uint256 assetIn, address recipient) external returns (uint256 usdgOut) {
        usdgOut = quoteSell(asset, assetIn);
        require(usdg.balanceOf(address(this)) >= usdgOut, "Pool: insufficient USDG");
        require(IERC20(asset).transferFrom(msg.sender, address(this), assetIn), "Pool: asset pull failed");
        if (listings[asset].mintable) IPricedGatewayToken(asset).burn(assetIn);
        require(usdg.transfer(recipient, usdgOut), "Pool: USDG payout failed");
        emit Sold(asset, recipient, assetIn, usdgOut);
    }

    function _fresh(address asset) private view returns (Listing memory listing) {
        listing = listings[asset];
        require(listing.listed, "Pool: unlisted");
        require(block.timestamp - listing.updatedAt <= maxAge, "Pool: stale price");
    }
}
