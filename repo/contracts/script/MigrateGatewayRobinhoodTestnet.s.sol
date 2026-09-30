// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {AdminFacet} from "../src/banda/facets/AdminFacet.sol";
import {BasketViewFacet} from "../src/banda/facets/BasketViewFacet.sol";
import {RedeemFacet} from "../src/banda/facets/RedeemFacet.sol";
import {SettlementMigrationInit} from "../src/banda/SettlementMigrationInit.sol";
import {GatewayToken} from "../src/banda/gateway/GatewayToken.sol";
import {BandaAssetPool} from "../src/banda/gateway/BandaAssetPool.sol";
import {BasketStrategy} from "../src/banda/gateway/BasketStrategy.sol";
import {SecureMockNavAdapter} from "../src/banda/mocks/SecureMockNavAdapter.sol";
import {IERC20} from "../src/banda/interfaces/IERC20.sol";

interface MigrateVm {
    function envAddress(string calldata name) external view returns (address value);
    function envUint(string calldata name) external view returns (uint256 value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

interface IWETH {
    function deposit() external payable;
}

/// @notice Moves the live Diamond to Paxos USDG and opens five holding-in-account Baskets at 0.25% a year.
/// @dev Legacy strategies 1-5 are disabled for deposits. Mock tokens stand in for assets absent from testnet;
///      AMD, TSLA and WETH are the canonical testnet tokens served from admin-funded pool inventory.
///      Quotes are seeded valid but stale, so the on-demand NAV service refreshes them with parent-block metadata.
contract MigrateGatewayRobinhoodTestnet {
    MigrateVm private constant vm = MigrateVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant DIAMOND = 0xB1dD20D06fc0741237c812Ca904bD8dc3f7DE4e7;
    address private constant ADAPTER = 0x50EB95DB909e7870B48D24c01234e69a19066011;
    address private constant USDG = 0x7E955252E15c84f5768B83c41a71F9eba181802F;
    address private constant AMD = 0x71178BAc73cBeb415514eB542a8995b82669778d;
    address private constant TSLA = 0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E;
    address private constant WETH = 0x7943e237c7F95DA44E0301572D358911207852Fa;
    uint96 private constant MINIMUM_DEPOSIT = 10_000_000;
    uint16 private constant ANNUAL_FEE_BPS = 25;

    BandaAssetPool private pool;
    mapping(string => address) private tokenOf;

    function run() external returns (BandaAssetPool, BasketStrategy[5] memory strategies) {
        require(block.chainid == 46_630, "Migrate: wrong chain");
        address admin = vm.envAddress("BANDA_ADMIN");
        uint256 wethInventory = vm.envUint("WETH_INVENTORY_WEI");

        vm.startBroadcast();
        _migrateSettlement();
        pool = new BandaAssetPool(USDG, admin);
        _listMocks();
        _listCanonical(admin, wethInventory);
        strategies = _openBaskets(admin);
        _disableLegacy();
        vm.stopBroadcast();
        return (pool, strategies);
    }

    function _migrateSettlement() private {
        RedeemFacet redeemFacet = new RedeemFacet();
        SettlementMigrationInit migration = new SettlementMigrationInit();
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = RedeemFacet.redeem.selector;
        selectors[1] = RedeemFacet.previewRedeem.selector;
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](1);
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(redeemFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: selectors
        });
        IDiamondCut(DIAMOND).diamondCut(cuts, address(migration), abi.encodeCall(SettlementMigrationInit.init, (USDG)));
    }

    function _listMocks() private {
        _mock("NVDA", "NVIDIA", 177_170_000);
        _mock("TAO", "Bittensor", 362_170_000);
        _mock("GOOGL", "Alphabet", 240_370_000);
        _mock("NEAR", "NEAR Protocol", 2_790_000);
        _mock("GLD", "SPDR Gold Shares", 334_760_000);
        _mock("COIN", "Coinbase", 323_950_000);
        _mock("CRCL", "Circle", 133_700_000);
        _mock("SOL", "Solana", 242_300_000);
        _mock("LINK", "Chainlink", 25_140_000);
        _mock("BTC", "Bitcoin", 116_101_580_000);
        _mock("SPY", "SPDR S&P 500 ETF", 657_630_000);
        _mock("QQQ", "Invesco QQQ", 584_080_000);
        _mock("RENDER", "Render", 4_030_000);
        _mock("USO", "United States Oil Fund", 73_000_000);
    }

    function _mock(string memory symbol, string memory name, uint128 priceUsdg) private {
        GatewayToken token = new GatewayToken(string.concat(name, " (testnet mock)"), symbol, 18, address(pool));
        pool.list(address(token), priceUsdg, 1e18, true);
        tokenOf[symbol] = address(token);
    }

    function _listCanonical(address admin, uint256 wethInventory) private {
        pool.list(AMD, 155_670_000, 1e18, false);
        pool.list(TSLA, 368_810_000, 1e18, false);
        pool.list(WETH, 4_715_250_000, 1e18, false);
        tokenOf["AMD"] = AMD;
        tokenOf["TSLA"] = TSLA;
        tokenOf["ETH"] = WETH;
        tokenOf["USDG"] = USDG;
        require(IERC20(AMD).transfer(address(pool), IERC20(AMD).balanceOf(admin)), "Migrate: AMD inventory");
        require(IERC20(TSLA).transfer(address(pool), IERC20(TSLA).balanceOf(admin)), "Migrate: TSLA inventory");
        IWETH(WETH).deposit{value: wethInventory}();
        require(IERC20(WETH).transfer(address(pool), wethInventory), "Migrate: WETH inventory");
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

    function _disableLegacy() private {
        for (uint32 id = 1; id <= 5; ++id) {
            (address strategy, uint96 minimum, uint16 fee, address recipient,) = BasketViewFacet(DIAMOND).strategy(id);
            AdminFacet(DIAMOND).configureStrategy(id, strategy, minimum, fee, recipient, false);
        }
    }

    struct Legs {
        address[] tokens;
        uint16[] weights;
    }

    function _legs(string[] memory symbols, uint16[] memory weights) private view returns (Legs memory legs) {
        legs.tokens = new address[](symbols.length);
        for (uint256 i; i < symbols.length; ++i) {
            legs.tokens[i] = tokenOf[symbols[i]];
            require(legs.tokens[i] != address(0), "Migrate: unknown symbol");
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
