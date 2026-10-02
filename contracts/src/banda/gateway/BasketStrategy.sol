// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "../interfaces/IERC20.sol";
import {BandaAssetPool} from "./BandaAssetPool.sol";

/// @notice Multi-asset basket strategy whose holdings live as tokens inside each basket account.
/// @dev Deposits split settlement USDG by fixed weights and buy each leg straight into the account;
///      a leg equal to the settlement token is the USDG sleeve and is sent as-is. One share is one
///      deposited USDG base unit. On redeem the diamond first moves `holdingsFor` into this contract,
///      which sells every non-USDG leg back to USDG and pays the receiver in the same transaction.
contract BasketStrategy {
    uint256 private constant BPS = 10_000;

    IERC20 public immutable usdg;
    BandaAssetPool public immutable pool;
    address public immutable diamond;
    address[] private _tokens;
    uint16[] private _weights;
    mapping(address => uint256) public shareBalance;

    constructor(address usdg_, address pool_, address diamond_, address[] memory tokens_, uint16[] memory weights_) {
        require(usdg_ != address(0) && pool_ != address(0) && diamond_ != address(0), "Strategy: invalid setup");
        require(tokens_.length == weights_.length && tokens_.length != 0, "Strategy: invalid legs");
        uint256 total;
        for (uint256 i; i < tokens_.length; ++i) {
            require(tokens_[i] != address(0) && weights_[i] != 0, "Strategy: invalid leg");
            total += weights_[i];
        }
        require(total == BPS, "Strategy: weights must total 100%");
        usdg = IERC20(usdg_);
        pool = BandaAssetPool(pool_);
        diamond = diamond_;
        _tokens = tokens_;
        _weights = weights_;
    }

    function legs() external view returns (address[] memory tokens, uint16[] memory weights) {
        return (_tokens, _weights);
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        require(msg.sender == diamond, "Strategy: diamond only");
        require(usdg.transferFrom(msg.sender, address(this), assets), "Strategy: pull failed");
        uint256 remaining = assets;
        for (uint256 i; i < _tokens.length; ++i) {
            uint256 leg = i == _tokens.length - 1 ? remaining : assets * _weights[i] / BPS;
            remaining -= leg;
            if (leg == 0) continue;
            if (_tokens[i] == address(usdg)) {
                require(usdg.transfer(receiver, leg), "Strategy: sleeve transfer failed");
            } else {
                require(usdg.approve(address(pool), leg), "Strategy: approve failed");
                pool.buy(_tokens[i], leg, receiver);
            }
        }
        shares = assets;
        shareBalance[receiver] += shares;
    }

    function holdingsFor(address account, uint256 shares)
        external
        view
        returns (address[] memory tokens, uint256[] memory amounts)
    {
        uint256 held = shareBalance[account];
        require(shares != 0 && shares <= held, "Strategy: shares");
        tokens = _tokens;
        amounts = new uint256[](tokens.length);
        for (uint256 i; i < tokens.length; ++i) {
            uint256 balance = IERC20(tokens[i]).balanceOf(account);
            amounts[i] = shares == held ? balance : balance * shares / held;
        }
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        require(msg.sender == owner, "Strategy: account required");
        require(shareBalance[owner] >= shares, "Strategy: shares");
        shareBalance[owner] -= shares;
        for (uint256 i; i < _tokens.length; ++i) {
            if (_tokens[i] == address(usdg)) continue;
            uint256 held = IERC20(_tokens[i]).balanceOf(address(this));
            if (held == 0) continue;
            require(IERC20(_tokens[i]).approve(address(pool), held), "Strategy: approve failed");
            pool.sell(_tokens[i], held, address(this));
        }
        assets = usdg.balanceOf(address(this));
        require(usdg.transfer(receiver, assets), "Strategy: payout failed");
    }

    function previewRedeem(uint256 shares) external pure returns (uint256 assets) {
        return shares;
    }
}
