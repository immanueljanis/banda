// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Testnet stand-in for an asset that has no canonical token on Robinhood Chain testnet.
/// @dev Full ERC-20 so balances show in explorers and basket accounts; only the gateway pool mints or burns.
contract GatewayToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    address public immutable pool;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint8 decimals_, address pool_) {
        require(pool_ != address(0), "Gateway: pool required");
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        pool = pool_;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == pool, "Gateway: not pool");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(uint256 amount) external {
        require(msg.sender == pool && balanceOf[msg.sender] >= amount, "Gateway: burn failed");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "Gateway: allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0) && balanceOf[from] >= amount, "Gateway: balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
