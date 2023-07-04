// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../../StringHelper.sol";

/* 
    @name StandardSingleMinterNFT
    @description nft contract, an NFT is minted buy the LamportWalletFactory when the user buys a wallet
    @author William Doyle
*/
contract StandardSingleMinterNFT is ERC721Enumerable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    string base_uri;
    address minter;

    modifier onlyMinter() {
        require(msg.sender == minter, "Only minter can call this function.");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory uriBase,
        address _minter
    ) ERC721(name, symbol) {
        minter = _minter;
        base_uri = uriBase;
    }

    function awardItem(address recipient) public onlyMinter returns (uint256) {
        uint256 newItemId = _tokenIds.current();
        _tokenIds.increment();
        _mint(recipient, newItemId);
        return newItemId;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        _requireMinted(tokenId);
        return "pauli.group";
            // StringHelper.appendString(
            //     base_uri,
            //     Strings.toString(block.chainid),
            //     "_",
            //     StringHelper.toAsciiString(address(this)),
            //     "_",
            //     Strings.toString(tokenId),
            //     ".json",
            //     "",
            //     ""
            // );
    }

    // TODO: test this
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(
            ERC721Enumerable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
