// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract GameItems is ERC1155 {
	uint256 public constant GOLD = 0;
	uint256 public constant SILVER = 1;
	uint256 public constant THORS_HAMMER = 2;
	uint256 public constant SWORD = 3;
	uint256 public constant SHIELD = 4;
	uint256 public constant THORS_AXE = 5;

	mapping(uint256 => bool) public isInflationary;

	constructor() ERC1155("https://game.example/api/item/{id}.json") {
		isInflationary[GOLD] = true;
		isInflationary[SILVER] = true;
		isInflationary[SWORD] = true;
		isInflationary[SHIELD] = true;

		_mint(0xD665d08C743254B07B45FD6BC5dE2622AdaF0535, GOLD, 10**18, "");
		_mint(0xD665d08C743254B07B45FD6BC5dE2622AdaF0535, SILVER, 10**27, "");
		_mint(0xD665d08C743254B07B45FD6BC5dE2622AdaF0535, THORS_HAMMER, 1, "");
		_mint(0xD665d08C743254B07B45FD6BC5dE2622AdaF0535, SWORD, 10**9, "");
		_mint(0xD665d08C743254B07B45FD6BC5dE2622AdaF0535, SHIELD, 10**9, "");
		_mint(0xD665d08C743254B07B45FD6BC5dE2622AdaF0535, THORS_AXE, 1, "");
	}

	function mintTo(address account, uint256 id, uint256 amount) public {
		require(isInflationary[id], "Item is not inflationary");
		_mint(account, id, amount, "");
	}
}
