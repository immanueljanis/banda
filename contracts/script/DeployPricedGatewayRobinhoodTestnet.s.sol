// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AdminFacet} from "../src/banda/facets/AdminFacet.sol";
import {BasketViewFacet} from "../src/banda/facets/BasketViewFacet.sol";
import {GatewayToken} from "../src/banda/gateway/GatewayToken.sol";
import {PricedAssetPool} from "../src/banda/gateway/PricedAssetPool.sol";
import {BasketStrategy} from "../src/banda/gateway/BasketStrategy.sol";
import {SecureMockNavAdapter} from "../src/banda/mocks/SecureMockNavAdapter.sol";
import {IERC20} from "../src/banda/interfaces/IERC20.sol";

interface MigrateVm {
    function envAddress(string calldata name) external view returns (address value);
    function envUint(string calldata name) external view returns (uint256 value);
    function envString(string calldata name) external view returns (string memory value);
    function readFile(string calldata path) external view returns (string memory data);
    function parseJsonUint(string calldata json, string calldata key) external pure returns (uint256 value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

interface IWETH {
    function deposit() external payable;
}

/// @notice Opens five market-priced Baskets (strategies 11-15) beside the snapshot-priced 6-10.
/// @dev Listing prices come from a JSON file of live USDG prices (6 decimals) keyed by ticker; the operator
///      then republishes prices on demand before each user transaction. Cutover (disabling 6-10) is a separate step.
contract DeployPricedGatewayRobinhoodTestnet {
    MigrateVm private constant vm = MigrateVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant DIAMOND = 0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7;
    address private constant ADAPTER = 0x50EB95DB909e7870B48D24c01234e69a19066011;
    address private constant USDG = 0x7E955252E15c84f5768B83c41a71F9eba181802F;
    address private constant OPERATOR = 0x407dC6447B4D767AB5B5073A8cd7B2D3C9422e13;
    address private constant AMD = 0x71178BAc73cBeb415514eB542a8995b82669778d;
    address private constant TSLA = 0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E;
    address private constant WETH = 0x7943e237c7F95DA44E0301572D358911207852Fa;
    uint96 private constant MINIMUM_DEPOSIT = 10_000_000;
    uint16 private constant ANNUAL_FEE_BPS = 25;

    PricedAssetPool private pool;
    string private prices;
    mapping(string => address) private tokenOf;

    function run() external returns (PricedAssetPool, BasketStrategy[5] memory strategies) {
        require(block.chainid == 46_630, "Deploy: wrong chain");
        address admin = vm.envAddress("BANDA_ADMIN");
        uint256 wethInventory = vm.envUint("WETH_INVENTORY_WEI");
        uint256 usdgBuffer = vm.envUint("USDG_BUFFER");
        prices = vm.readFile(vm.envString("PRICES_FILE"));

        vm.startBroadcast();
        pool = new PricedAssetPool(USDG, admin, OPERATOR, 15 minutes, 2_000);
        _listMocks();
        _listCanonical(admin, wethInventory);
        if (usdgBuffer != 0) require(IERC20(USDG).transfer(address(pool), usdgBuffer), "Deploy: USDG buffer");
        strategies = _openBaskets(admin);
        vm.stopBroadcast();
        return (pool, strategies);
    }

    function _price(string memory symbol) private view returns (uint128) {
        uint256 value = vm.parseJsonUint(prices, string.concat(".", symbol));
        require(value != 0 && value <= type(uint128).max, "Deploy: missing price");
        return uint128(value);
    }

    function _listMocks() private {
        _mock("NVDA", "NVIDIA");
        _mock("TAO", "Bittensor");
        _mock("GOOGL", "Alphabet");
        _mock("NEAR", "NEAR Protocol");
        _mock("GLD", "SPDR Gold Shares");
        _mock("COIN", "Coinbase");
        _mock("CRCL", "Circle");
        _mock("SOL", "Solana");
        _mock("LINK", "Chainlink");
        _mock("BTC", "Bitcoin");
        _mock("SPY", "SPDR S&P 500 ETF");
        _mock("QQQ", "Invesco QQQ");
        _mock("RENDER", "Render");
        _mock("USO", "United States Oil Fund");
    }

    function _mock(string memory symbol, string memory name) private {
        GatewayToken token = new GatewayToken(string.concat(name, " (testnet mock)"), symbol, 18, address(pool));
        pool.list(address(token), _price(symbol), 1e18, true);
        tokenOf[symbol] = address(token);
    }

    function _listCanonical(address admin, uint256 wethInventory) private {
        pool.list(AMD, _price("AMD"), 1e18, false);
        pool.list(TSLA, _price("TSLA"), 1e18, false);
        pool.list(WETH, _price("ETH"), 1e18, false);
        tokenOf["AMD"] = AMD;
        tokenOf["TSLA"] = TSLA;
        tokenOf["ETH"] = WETH;
        tokenOf["USDG"] = USDG;
        _fund(AMD, IERC20(AMD).balanceOf(admin));
        _fund(TSLA, IERC20(TSLA).balanceOf(admin));
        if (wethInventory != 0) {
            IWETH(WETH).deposit{value: wethInventory}();
            _fund(WETH, wethInventory);
        }
    }

    function _fund(address token, uint256 amount) private {
        if (amount != 0) require(IERC20(token).transfer(address(pool), amount), "Deploy: inventory");
    }

    function _openBaskets(address admin) private returns (BasketStrategy[5] memory strategies) {
        strategies[0] = _basket(admin, _legs6(["NVDA", "TAO", "GOOGL", "NEAR", "GLD", "USDG"], [uint16(3000), 2000, 1500, 1000, 1000, 1500]));
        strategies[1] = _basket(admin, _legs7(["COIN", "CRCL", "ETH", "SOL", "LINK", "GLD", "USDG"], [uint16(2000), 1500, 2000, 1500, 1000, 500, 1500]));
        strategies[2] = _basket(admin, _legs5(["BTC", "SPY", "GLD", "ETH", "USDG"], [uint16(3000), 2500, 2000, 1000, 1500]));
        strategies[3] = _basket(admin, _legs8(["QQQ", "AMD", "TSLA", "RENDER", "SOL", "GLD", "USO", "USDG"], [uint16(2500), 1500, 1500, 1500, 1000, 500, 500, 1000]));
        strategies[4] = _basket(admin, _legs5(["GLD", "SPY", "BTC", "ETH", "USDG"], [uint16(3000), 2000, 1500, 1000, 2500]));
    }

    function _basket(address admin, Legs memory legs) private returns (BasketStrategy strategy) {
        strategy = new BasketStrategy(USDG, address(pool), DIAMOND, legs.tokens, legs.weights);
        AdminFacet(DIAMOND).configureStrategy(0, address(strategy), MINIMUM_DEPOSIT, ANNUAL_FEE_BPS, admin, true);
        SecureMockNavAdapter(ADAPTER).setQuote(address(strategy), 1e18, 1, 1, true);
    }

    struct Legs {
        address[] tokens;
        uint16[] weights;
    }

    function _legs(string[] memory symbols, uint16[] memory weights) private view returns (Legs memory legs) {
        legs.tokens = new address[](symbols.length);
        for (uint256 i; i < symbols.length; ++i) {
            legs.tokens[i] = tokenOf[symbols[i]];
            require(legs.tokens[i] != address(0), "Deploy: unknown symbol");
        }
        legs.weights = weights;
    }

    function _legs6(string[6] memory symbols, uint16[6] memory weights) private view returns (Legs memory) {
        string[] memory s = new string[](6);
        uint16[] memory w = new uint16[](6);
        for (uint256 i; i < 6; ++i) (s[i], w[i]) = (symbols[i], weights[i]);
        return _legs(s, w);
    }

    function _legs5(string[5] memory symbols, uint16[5] memory weights) private view returns (Legs memory) {
        string[] memory s = new string[](5);
        uint16[] memory w = new uint16[](5);
        for (uint256 i; i < 5; ++i) (s[i], w[i]) = (symbols[i], weights[i]);
        return _legs(s, w);
    }

    function _legs7(string[7] memory symbols, uint16[7] memory weights) private view returns (Legs memory) {
        string[] memory s = new string[](7);
        uint16[] memory w = new uint16[](7);
        for (uint256 i; i < 7; ++i) (s[i], w[i]) = (symbols[i], weights[i]);
        return _legs(s, w);
    }

    function _legs8(string[8] memory symbols, uint16[8] memory weights) private view returns (Legs memory) {
        string[] memory s = new string[](8);
        uint16[] memory w = new uint16[](8);
        for (uint256 i; i < 8; ++i) (s[i], w[i]) = (symbols[i], weights[i]);
        return _legs(s, w);
    }
}
