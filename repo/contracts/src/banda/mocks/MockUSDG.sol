// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockUSDG {
    string public constant name = "Test USDG";
    string public constant symbol = "tUSDG";
    uint8 public constant decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public rejectsTransfersTo;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function setRejectRecipient(address recipient, bool value) external {
        rejectsTransfersTo[recipient] = value;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "ERC20: allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(!rejectsTransfersTo[to], "ERC20: recipient rejected");
        require(balanceOf[from] >= amount, "ERC20: balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}
