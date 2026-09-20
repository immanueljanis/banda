// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface Vm {
    function createSelectFork(string calldata, uint256) external returns (uint256);
    function envOr(string calldata, string calldata) external returns (string memory);
    function deal(address, uint256) external;
}

interface Token {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function deposit() external payable;
}

interface Quoter {
    struct Params {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }
    function quoteExactInputSingle(Params calldata) external returns (uint256, uint160, uint32, uint256);
}

interface Router {
    struct Params {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(Params calldata) external payable returns (uint256);
}

/// @dev Fork-only contract taker: no signing keys and no public transactions.
contract RobinhoodSwapTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address constant ROUTER = 0xCaf681a66D020601342297493863E78C959E5cb2;
    address constant QUOTER = 0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7;
    uint256 constant FORK_BLOCK = 63794454;
    event BalanceEvidence(
        string leg, uint256 inputBefore, uint256 inputAfter, uint256 outputBefore, uint256 outputAfter, uint256 quote
    );

    function setUp() public {
        vm.createSelectFork(vm.envOr("ROBINHOOD_RPC_URL", "https://rpc.mainnet.chain.robinhood.com"), FORK_BLOCK);
        require(block.chainid == 4663, "wrong chain");
        require(ROUTER.code.length > 0 && QUOTER.code.length > 0, "missing deployment");
        // Only native gas is seeded. Actual deployed WETH mints through deposit;
        // USDG is obtained through an actual pool swap, never storage injection.
        vm.deal(address(this), 1 ether);
        Token(WETH).deposit{value: 0.1 ether}();
    }

    function swap(address input, address output, uint256 amount, string memory label)
        internal
        returns (uint256 received)
    {
        (uint256 quoted,,,) = Quoter(QUOTER).quoteExactInputSingle(Quoter.Params(input, output, amount, 500, 0));
        require(quoted > 0, "no quote");
        uint256 beforeIn = Token(input).balanceOf(address(this));
        uint256 beforeOut = Token(output).balanceOf(address(this));
        require(Token(input).approve(ROUTER, amount), "approval failed");
        received = Router(ROUTER)
            .exactInputSingle(Router.Params(input, output, 500, address(this), amount, quoted * 99 / 100, 0));
        uint256 afterIn = Token(input).balanceOf(address(this));
        uint256 afterOut = Token(output).balanceOf(address(this));
        require(beforeIn - afterIn == amount, "incorrect debit");
        require(afterOut - beforeOut == received && received == quoted, "incorrect credit/quote");
        require(Token(input).approve(ROUTER, 0), "revoke failed");
        emit BalanceEvidence(label, beforeIn, afterIn, beforeOut, afterOut, quoted);
    }

    function testContractTakerWethUsdgWethRoundtrip() public {
        uint256 usdg = swap(WETH, USDG, 0.01 ether, "WETH->USDG");
        uint256 weth = swap(USDG, WETH, usdg, "USDG->WETH");
        require(weth < 0.01 ether && weth > 0.0098 ether, "unexpected roundtrip cost");
    }

    function testContractTakerUsdgWethUsdgRoundtrip() public {
        uint256 seed = swap(WETH, USDG, 0.05 ether, "seed USDG via real swap");
        uint256 input = seed / 2;
        uint256 weth = swap(USDG, WETH, input, "USDG->WETH");
        uint256 usdg = swap(WETH, USDG, weth, "WETH->USDG");
        require(usdg < input && usdg > input * 98 / 100, "unexpected roundtrip cost");
    }

    function testMissingAllowanceRevertsWithoutBalanceChange() public {
        uint256 beforeIn = Token(WETH).balanceOf(address(this));
        uint256 beforeOut = Token(USDG).balanceOf(address(this));
        (bool ok,) = ROUTER.call(
            abi.encodeCall(Router.exactInputSingle, (Router.Params(WETH, USDG, 500, address(this), 0.01 ether, 1, 0)))
        );
        require(!ok, "missing allowance accepted");
        require(
            Token(WETH).balanceOf(address(this)) == beforeIn && Token(USDG).balanceOf(address(this)) == beforeOut,
            "failed swap moved funds"
        );
    }

    function testImpossibleMinimumRevertsWithoutBalanceChange() public {
        require(Token(WETH).approve(ROUTER, 0.01 ether), "approval failed");
        uint256 beforeIn = Token(WETH).balanceOf(address(this));
        uint256 beforeOut = Token(USDG).balanceOf(address(this));
        (bool ok,) = ROUTER.call(
            abi.encodeCall(
                Router.exactInputSingle,
                (Router.Params(WETH, USDG, 500, address(this), 0.01 ether, type(uint256).max, 0))
            )
        );
        require(!ok, "minOut ignored");
        require(
            Token(WETH).balanceOf(address(this)) == beforeIn && Token(USDG).balanceOf(address(this)) == beforeOut,
            "failed swap moved funds"
        );
    }
}
