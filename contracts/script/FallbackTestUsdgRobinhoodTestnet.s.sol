// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AdminFacet} from "../src/banda/facets/AdminFacet.sol";
import {BasketViewFacet} from "../src/banda/facets/BasketViewFacet.sol";
import {GatewayToken} from "../src/banda/gateway/GatewayToken.sol";
import {PricedAssetPool} from "../src/banda/gateway/PricedAssetPool.sol";
import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {SettlementMigrationInit} from "../src/banda/SettlementMigrationInit.sol";
import {BasketStrategy} from "../src/banda/gateway/BasketStrategy.sol";
import {SecureMockNavAdapter} from "../src/banda/mocks/SecureMockNavAdapter.sol";

interface MigrateVm {
    function envAddress(string calldata name) external view returns (address value);
    function envUint(string calldata name) external view returns (uint256 value);
    function envString(string calldata name) external view returns (string memory value);
    function readFile(string calldata path) external view returns (string memory data);
    function parseJsonUint(string calldata json, string calldata key) external pure returns (uint256 value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

interface ITestUsdg {
    function mint(address to, uint256 amount) external;
}

/// @notice Moves settlement back to public-mint tUSDG and opens five market-priced Baskets (strategies 16-20).
/// @dev Used because the Paxos testnet faucet stopped dispensing. Every leg is a pool-minted testnet mock priced
///      at live market prices republished by the operator; the pool gets a tUSDG solvency buffer. Strategies 6-15,
///      bound to Paxos USDG, are closed to deposits. The same initializer can move settlement back to Paxos later.
contract FallbackTestUsdgRobinhoodTestnet {
    MigrateVm private constant vm = MigrateVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant DIAMOND = 0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7;
    address private constant ADAPTER = 0x50EB95DB909e7870B48D24c01234e69a19066011;
    address private constant USDG = 0xB42Df4e64356cAFbAEB63f572Ec95CC3BAE75dba;
    address private constant OPERATOR = 0x407dC6447B4D767AB5B5073A8cd7B2D3C9422e13;
    uint96 private constant MINIMUM_DEPOSIT = 10_000_000;
    uint16 private constant ANNUAL_FEE_BPS = 25;

    PricedAssetPool private pool;
    string private prices;
    mapping(string => address) private tokenOf;

    function run() external returns (PricedAssetPool, BasketStrategy[5] memory strategies) {
        require(block.chainid == 46_630, "Deploy: wrong chain");
        address admin = vm.envAddress("BANDA_ADMIN");
        uint256 usdgBuffer = vm.envUint("USDG_BUFFER");
        prices = vm.readFile(vm.envString("PRICES_FILE"));

        vm.startBroadcast();
        IDiamondCut(DIAMOND).diamondCut(
            new IDiamondCut.FacetCut[](0),
            address(new SettlementMigrationInit()),
            abi.encodeCall(SettlementMigrationInit.init, (USDG))
        );
        pool = new PricedAssetPool(USDG, admin, OPERATOR, 15 minutes, 2_000);
        _listMocks();
        _mock("AMD", "AMD");
        _mock("TSLA", "Tesla");
        _mock("ETH", "Ether");
        tokenOf["USDG"] = USDG;
        if (usdgBuffer != 0) ITestUsdg(USDG).mint(address(pool), usdgBuffer);
        strategies = _openBaskets(admin);
        _closeStrategies(6, 15);
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

    function _closeStrategies(uint32 first, uint32 last) private {
        for (uint32 id = first; id <= last; ++id) {
            (address strategy, uint96 minimum, uint16 fee, address recipient, bool enabled) = BasketViewFacet(DIAMOND).strategy(id);
            if (enabled) AdminFacet(DIAMOND).configureStrategy(id, strategy, minimum, fee, recipient, false);
        }
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
