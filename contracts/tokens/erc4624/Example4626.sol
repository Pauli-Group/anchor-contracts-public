// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

// minimal example of erc 4626
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract Example4626 is ERC4626 {
	constructor(IERC20Metadata underlyingAsset) ERC4626(underlyingAsset) ERC20(string(abi.encodePacked("Shares of ", underlyingAsset.name())), string(abi.encodePacked(underlyingAsset.symbol(), "S"))) {}
}
