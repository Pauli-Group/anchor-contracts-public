// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.1;

import "./LamportWallet.sol";
import "./LamportBase.sol";
import "../tokens/erc721/StandardNFT.sol";
import "../StringHelper.sol";

contract LamportWalletFactory is LamportBase {
    // TYPES
    event WalletCreated(address indexed walletAddress);
    event CurrencyApprovalAdded(address currencyAddress);
    event CurrencyApprovalRemoved(address currencyAddress);
    event CurrencyPriceChanged(address currencyAddress);

    struct WalletInfo {
        address walletAddress;
        uint256 blockHeight;
    }

    // STATE
    uint256 public price;
    address public PauliGroup;

    mapping(address => bool) public approvedErc20s;
    mapping(address => uint256) public erc20_to_price;

    uint256 public numberWalletsDeployed = 0;
    mapping(uint256 => WalletInfo) public wallets;
    mapping(address => uint256) public wallet_address_to_wallet_number;
    address[] public mintingAddresses;
    bool public mintingEnabled = false;
    bytes32 public version;

    // FUNCTIONS
    constructor(uint256 _initialEtherPrice, bytes32 firstPKH) {
        PauliGroup = msg.sender;
        price = _initialEtherPrice;
        init(firstPKH);
        version = keccak256(msg.data);
    }

    // TODO: TEST .. then remove this comment
    function setMintingAddress(
        address _mintingAddress,
        bytes32[2][256] calldata currentpub,
        bytes[256] calldata sig,
        bytes32 nextPKH
    )
        public
        onlyLamportOwner(
            currentpub,
            sig,
            nextPKH,
            abi.encodePacked(_mintingAddress)
        )
    {
        mintingAddresses.push(_mintingAddress);
        mintingEnabled = true;
    }

    /*
        @name getVersion
        @date November 9th 2022
        @author William Doyle
     */
    function getVersion() public view returns (bytes32) {
        return version;
    }

    /*
       @name addApprovedErc20
       @description approve an erc20 token to be used as a payment method
       @date October 31st 2022
       @author William Doyle
       @todo secure with lamport signature
    */
    function addApprovedErc20(
        address erc20,
        uint256 _price,
        bytes32[2][256] calldata currentpub,
        bytes[256] calldata sig,
        bytes32 nextPKH
    )
        public
        onlyLamportOwner(
            currentpub,
            sig,
            nextPKH,
            abi.encodePacked(erc20, _price)
        )
    {
        require(
            msg.sender == PauliGroup,
            "Only PauliGroup can add approved ERC20"
        );
        approvedErc20s[erc20] = true;
        erc20_to_price[erc20] = _price;
        emit CurrencyApprovalAdded(erc20);
    }

    /*
        @name removeApprovedErc20
        @description remove an erc20 token from the approved list
        @date October 31st 2022
        @author William Doyle
       @todo secure with lamport signature
    */
    function removeApprovedErc20(
        address erc20,
        bytes32[2][256] calldata currentpub,
        bytes[256] calldata sig,
        bytes32 nextPKH
    )
        public
        onlyLamportOwner(currentpub, sig, nextPKH, abi.encodePacked(erc20))
    {
        require(
            msg.sender == PauliGroup,
            "Only PauliGroup can remove an approved ERC20"
        );
        approvedErc20s[erc20] = false;
        erc20_to_price[erc20] = 0;
        emit CurrencyApprovalRemoved(erc20);
    }

    /*
        @name changePrice
        @description set the price of a wallet in a specific token
        @date October 31st 2022
        @author William Doyle
       @todo secure with lamport signature
    */
    function changePrice(
        address erc20,
        uint256 newPrice,
        bytes32[2][256] calldata currentpub,
        bytes[256] calldata sig,
        bytes32 nextPKH
    )
        public
        onlyLamportOwner(
            currentpub,
            sig,
            nextPKH,
            abi.encodePacked(erc20, newPrice)
        )
    {
        require(
            msg.sender == PauliGroup,
            "Only PauliGroup can change the price of a wallet"
        );
        require(
            approvedErc20s[erc20] || erc20 == address(0),
            "Cannot change the price of an unapproved ERC20"
        );

        if (erc20 == address(0)) {
            price = newPrice;
            return;
        }

        erc20_to_price[erc20] = newPrice;
        emit CurrencyPriceChanged(erc20);
    }

    /*
        @name createWalletEther
        @date October 31st 2022
        @description Create a new wallet when sent ether
        @author William Doyle
    */
    function createWalletEther(
        address _signingAddress,
        bytes32 _firstLamportPKH
    ) public payable {
        require(msg.value >= price, "Not enough ether sent");
        payable(PauliGroup).transfer(msg.value);
        createWallet(_signingAddress, _firstLamportPKH);
    }

    /*
        @name createWalletErc20
        @date October 31st 2022
        @description Create a new wallet when sent erc20 tokens
        @author William Doyle
    */
    function createWalletErc20(
        address _signingAddress,
        bytes32 _firstLamportPKH,
        address _erc20Address,
        uint256 _amount
    ) public {
        require(approvedErc20s[_erc20Address], "ERC20 not approved");
        require(
            _amount >= erc20_to_price[_erc20Address],
            "Not enough ERC20 sent"
        );
        IERC20 erc20 = IERC20(_erc20Address);
        erc20.transferFrom(msg.sender, PauliGroup, _amount);
        createWallet(_signingAddress, _firstLamportPKH);
    }

    /*
        @name createWallet
        @date October 31st 2022
        @description internal function for creating wallet
        @author William Doyle
    */
    function createWallet(address _signingAddress, bytes32 _firstLamportPKH)
        internal
    {
        LamportWallet wallet = new LamportWallet( // deploys a new wallet contract
            _signingAddress,
            _firstLamportPKH
        );

        wallets[numberWalletsDeployed] = WalletInfo( // store wallet info
            address(wallet),
            block.number
        );
        wallet_address_to_wallet_number[address(wallet)] = numberWalletsDeployed; 
        numberWalletsDeployed++;

        emit WalletCreated(address(wallet));

        if (mintingEnabled) {
            // mint a token into the new wallet
            for (uint256 i = 0; i < mintingAddresses.length; i++) {
                StandardNFT nft = StandardNFT(mintingAddresses[i]);
                nft.awardItem(address(wallet));
            }
        }
    }

    /*
        @name getAllCreatedWallets
        @date October 31st 2022
        @description get all wallets created by this factory contract
        @return array of objects describing the wallets
        @author William Doyle
    */
    function getAllCreatedWallets() public view returns (WalletInfo[] memory) {
        WalletInfo[] memory allWallets = new WalletInfo[](
            numberWalletsDeployed
        );
        for (uint256 i = 0; i < numberWalletsDeployed; i++) {
            allWallets[i] = wallets[i];
        }
        return allWallets;
    }
}
