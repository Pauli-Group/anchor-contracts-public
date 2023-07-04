// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/*
    a test erc20 token with a bit of extra logic for testing various things
*/

contract Dollar is ERC20 {
	constructor() ERC20("Dollar", "$") {
		_mint(msg.sender, 100000000000000000000);
	}

	function mint() public {
		_mint(msg.sender, 1 ether);
	}

	function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
		return interfaceId == type(IERC20).interfaceId;
	}

	event Stub(address indexed caller, uint256 indexed i, uint256 indexed k, uint256 value, uint256 gas);

	address lastCaller;
	uint256 lastI;
	uint256 lastK;

	function stub(uint256 i, uint256 k) public payable returns (uint256) {
		emit Stub(msg.sender, i, k, msg.value, gasleft());
		// emit Stub(msg.sender, i, k, msg.value, 0);
		lastCaller = msg.sender;
		lastI = i;
		lastK = k;

		return i * k;
	}

	function getLastDetails()
		public
		view
		returns (
			address,
			uint256,
			uint256
		)
	{
		return (lastCaller, lastI, lastK);
	}

	function hash256(bytes calldata data) public pure returns (bytes32) {
		return keccak256(data);
	}

	// investigation
	function hash512(bytes calldata data) public pure returns (bytes32) {
		return keccak256(data);
	}
}
