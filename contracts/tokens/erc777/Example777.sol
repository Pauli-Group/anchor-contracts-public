// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

// minimal example of erc 777

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";

contract Example777 is ERC777 {
    constructor() ERC777("Example777", "EX7", new address[](0)) {
        _mint(msg.sender, 100 ether, "", "");
    }
}