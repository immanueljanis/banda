// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev Test-only canonical asset with a single gateway pool minter/burner.
contract MockCanonicalAsset {
    string public constant name = "Test Wrapped Bitcoin";
    string public constant symbol = "tWBTC";
    uint8 public constant decimals = 8;
    address public minter;
    mapping(address => uint256) public balanceOf;

    function setMinter(address minter_) external {
        require(minter == address(0), "tWBTC: minter set");
        minter = minter_;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "tWBTC: not minter");
        balanceOf[to] += amount;
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == minter && balanceOf[from] >= amount, "tWBTC: burn failed");
        balanceOf[from] -= amount;
    }
}
