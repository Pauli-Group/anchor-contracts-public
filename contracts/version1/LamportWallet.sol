// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "../EIP1271SignatureValidation.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "./LamportBase.sol";
import "../Base.sol";

contract LamportWallet is
    EIP1271SignatureValidation,
    ReentrancyGuard,
    Base,
    LamportBase
{
    constructor(address signingAddress, bytes32 firstLamportPKH)
        EIP1271SignatureValidation(signingAddress)
        ReentrancyGuard()
    {
        init(firstLamportPKH);
        state._supportedInterfaces[type(IERC165).interfaceId] = true;
        state._supportedInterfaces[type(IERC1271).interfaceId] = true;
    }

    receive() external payable 
    // nonReentrant 
    {}

    fallback() external payable nonReentrant {}

    /*
        execute
        William Doyle
        October 25th 2022
        Execute a function on another contract
        Arguments:
            cdata              - the data in a custom format (needs to be included in the signed message)
            currentpub         - the current public key (must match previously posted public key hash)
            nextPKH            - the next public key hash (needs to be included in the signed message)
            sig                - the lamport signature used to authenticate this call
    */
    function execute(
        bytes calldata cdata,
        bytes32[2][256] calldata currentpub,
        bytes32 nextPKH,
        bytes[256] calldata sig
    )
        public
        nonReentrant
        onlyLamportOwner(currentpub, sig, nextPKH, cdata)
        returns (bytes memory)
    {
        (address caddrs, bytes memory _data, uint256 _value, uint256 _gas) = abi
            .decode(cdata, (address, bytes, uint256, uint256));

        (bool success, bytes memory data) = caddrs.call{
            value: _value,
            gas: _gas
        }(_data);

        require(success, "LamportWallet::execute::Transaction failed");
        return data;
    }

    /**
        sendEther
        October 24th 2022
        allow user to send ether to another address
        William Doyle
        Arguments: 
            to              - the address to send ether to (needs to be included in the signed message)
            amount          - the amount of ether to send (needs to be included in the signed message)
            currentpub      - the current public key (must match previously posted public key hash)
            nextPKH         - the next public key hash (needs to be included in the signed message)
            sig             - the lamport signature used to authenticate this call
    */
    function sendEther(
        address payable to,
        uint256 amount,
        bytes32[2][256] calldata currentpub,
        bytes32 nextPKH,
        bytes[256] calldata sig
    )
        public
        nonReentrant
        onlyLamportOwner(currentpub, sig, nextPKH, abi.encodePacked(to, amount))
    {
        to.transfer(amount);
    }
}
