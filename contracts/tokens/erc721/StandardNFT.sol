// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// import "./StringHelper.sol";

/* 
    @name StandardNFT
    @description nft contract, an NFT is minted buy the LamportWalletFactory when the user buys a wallet
    @author William Doyle
*/

contract StandardNFT is ERC721Enumerable, AccessControl {
	using Counters for Counters.Counter;
	Counters.Counter private _tokenIds;
	string base_uri;

	bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
	bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

	constructor(
		string memory name,
		string memory symbol,
		string memory uriBase
	) ERC721(name, symbol) {
		_grantRole(OWNER_ROLE, msg.sender);
		base_uri = uriBase;
	}

	function awardItem(address recipient) public onlyRole(MINTER_ROLE) returns (uint256) {
		uint256 newItemId = _tokenIds.current();
		_tokenIds.increment();
		_mint(recipient, newItemId);
		return newItemId;
	}

	function addMinter(address newMinter) public onlyRole(OWNER_ROLE) {
		_grantRole(MINTER_ROLE, newMinter);
	}

	function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
		_requireMinted(tokenId);
		return string(abi.encodePacked(base_uri, Strings.toString(block.chainid), "/", (address(this)), "/", Strings.toString(tokenId)));
	}

	// TODO: test this
	function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC721Enumerable) returns (bool) {
		return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
	}
}
