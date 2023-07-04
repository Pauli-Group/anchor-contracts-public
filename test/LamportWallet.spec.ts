declare var artifacts: any
declare var contract: any

import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
import { ethers } from 'ethers';
import { loremIpsum } from "lorem-ipsum"
import LamportWalletManager from 'lamportwalletmanager/src'
import { hash, hash_b, mk_key_pair, sign_hash, verify_signed_hash, KeyTracker, LamportKeyPair } from 'lamportwalletmanager/src/index'

const LamportWallet = artifacts.require('LamportWallet')
const Dollar = artifacts.require('Dollar')
const UniqueAsset = artifacts.require('UniqueAsset')
const StandardSingleMinterNFT = artifacts.require('StandardSingleMinterNFT')

const LamportWalletFactory = artifacts.require('LamportWalletFactory')

/**
 * @name buildCallData
 * @author William Doyle 
 * @date October 25th 2022
 * @description A function to construct the data bundle to be passed to SimpleWallet::execute
 * @param abi 
 * @param functionSignature 
 * @param args 
 * @param address 
 * @param value 
 * @param gas 
 * @returns string  
 */
function buildCallData(abi: any, functionSignature: string, args: any[], address: string, value: string = '0', gas: string = '100000'): string {
    const encoder: ethers.utils.AbiCoder = new ethers.utils.AbiCoder()
    const iface = new ethers.utils.Interface(abi)
    const _funSig = iface.encodeFunctionData(functionSignature, args)
    const _data = encoder.encode(['address', 'bytes', 'uint256', 'uint256'], [address, _funSig, value, gas])
    return _data
}

function lamport_getCurrentAndNextKeyData(k: KeyTracker): ({
    current_keys: LamportKeyPair;
    next_keys: LamportKeyPair;
    nextpkh: string;
    currentpkh: string;
}) {
    const current_keys: LamportKeyPair = JSON.parse(JSON.stringify(k.currentKeyPair()))
    const next_keys: LamportKeyPair = JSON.parse(JSON.stringify(k.getNextKeyPair()))
    const nextpkh = KeyTracker.pkhFromPublicKey(next_keys.pub)
    const currentpkh = KeyTracker.pkhFromPublicKey(current_keys.pub)

    return {
        current_keys,
        next_keys,
        nextpkh,
        currentpkh
    }
}

function buildExecuteArguments(k: KeyTracker, functionName: string, abi: any, address: string, args: any[], value: string = '0', gas: string = '100000'): any[] {
    const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(k)
    const _data = buildCallData(abi, functionName, args, address, value, gas)
    const packed = ethers.utils.solidityPack(['bytes', 'bytes32'], [_data, nextpkh])
    const callhash = hash_b(packed)
    const sig = sign_hash(callhash, current_keys.pri)
    const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
    if (!is_valid_sig)
        throw new Error(`Invalid Lamport Signature`)
    return [_data, current_keys.pub, nextpkh, sig.map(s => `0x${s}`)]
}

contract('Can Receive And Transfer Ether And ERC-20 tokens', (accounts: string[]) => {
    it('Receive and send', async () => {
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract

        const balance1 = await web3.eth.getBalance(contract.address)    // check balance of contract
        expect(balance1).to.equal(`0`)

        // someone sends monero to contract 
        await web3.eth.sendTransaction({ from: accounts[1], to: contract.address, value: `1000000000000000000` })
        const balance2 = await web3.eth.getBalance(contract.address)  // check balance of contract
        expect(balance2).to.equal(`1000000000000000000`)

        // owner commands contract to send funds to another address
        const acc2b1 = await web3.eth.getBalance(accounts[2]) // check balance of account 2 before transfer from scw

        const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(k)

        const packed = (() => {
            const temp = ethers.utils.solidityPack(['address', 'uint256'], [accounts[2], `1000000000000000000`])
            return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
        })()

        const callhash = hash_b(packed)
        const sig = sign_hash(callhash, current_keys.pri)

        const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
        expect(is_valid_sig).to.be.true

        await contract.sendEther(
            accounts[2],
            `1000000000000000000`,
            current_keys.pub,
            nextpkh,
            sig.map(s => `0x${s}`),
        )

        const acc2b2 = await web3.eth.getBalance(accounts[2]) // check balance of account 2 after transfer from scw
        const expectedNum: ethers.BigNumber = ethers.BigNumber.from(acc2b1).add(ethers.BigNumber.from(`1000000000000000000`))
        expect(acc2b2).to.equal(expectedNum.toString()) // check balance against expected balance
    })

    it('Cannot send more than have', async () => {
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract

        const balance1 = await web3.eth.getBalance(contract.address)    // check balance of contract
        expect(balance1).to.equal(`0`)

        // someone sends monero to contract 
        await web3.eth.sendTransaction({ from: accounts[1], to: contract.address, value: `1000000000000000000` })
        const balance2 = await web3.eth.getBalance(contract.address)  // check balance of contract
        expect(balance2).to.equal(`1000000000000000000`)

        const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(k)

        const packed = (() => {
            const temp = ethers.utils.solidityPack(['address', 'uint256'], [accounts[2], `1000000000000000001`])
            return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
        })()

        const callhash = hash_b(packed)
        const sig = sign_hash(callhash, current_keys.pri)

        const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
        expect(is_valid_sig).to.be.true

        let failed = false
        await contract.sendEther(
            accounts[2],
            `1000000000000000001`,
            current_keys.pub,
            nextpkh,
            sig.map(s => `0x${s}`),

        )
            .catch((err: any) => failed = true)
        expect(failed).to.equal(true)
    })

    it('execute a function on another contract, but as a Smart Contract Wallet', async () => {
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract
        const dollar: ethers.Contract = await Dollar.new()

        // fund contract
        await web3.eth.sendTransaction({ from: accounts[1], to: contract.address, value: `1000000000000000000` })

        const ld1 = await dollar.getLastDetails()
        expect(ld1[0]).to.equal(`0x0000000000000000000000000000000000000000`)
        expect(ld1[1].toString()).to.equal(`0`)
        expect(ld1[2].toString()).to.equal(`0`)

        const pkh1: string = k.pkh

        await contract.execute(...buildExecuteArguments(k, "stub(uint256,uint256)", dollar.abi, dollar.address, [13, 14], '123'))
        const pkh2: string = k.pkh
        expect(pkh1).to.not.equal(pkh2) // pkh has changed (javascript passed objects by reference)

        const ld2 = await dollar.getLastDetails()
        expect(ld2[0]).to.equal(contract.address)
        expect(ld2[1].toString()).to.equal(`13`)
        expect(ld2[2].toString()).to.equal(`14`)
    })

    it('send erc20 via execute function', async () => {
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract
        const dollar: ethers.Contract = await Dollar.new()  // deploy contract

        // send all dollars to account 3
        await dollar.transfer(accounts[3], await dollar.balanceOf(accounts[0]))

        // address 3 sends 100 dollars to contract
        const b1 = await dollar.balanceOf(contract.address)
        expect(b1.toString()).to.equal(`0`)
        await dollar.transfer(contract.address, `100`, { from: accounts[3] })
        const b2 = await dollar.balanceOf(contract.address)

        expect(b2.toString()).to.equal(`100`)

        // the scw sends 50 dollars to account 4
        const acc4b1dollar = await dollar.balanceOf(accounts[4])
        expect(acc4b1dollar.toString()).to.equal(`0`)

        const alice = accounts[4]
        const alice_b1 = await dollar.balanceOf(alice)
        expect(alice_b1.toString()).to.equal(`0`)

        await contract.execute(...buildExecuteArguments(k, "transfer(address,uint256)", dollar.abi, dollar.address, [alice, '50']))

        const acc4b2dollar = await dollar.balanceOf(accounts[4])
        expect(acc4b2dollar.toString()).to.equal(`50`)
    })

    it('Try to reuse a public key', async () => {
        const alice = accounts[4]
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract
        const dollar: ethers.Contract = await Dollar.new()

        // send all dollars to account 3
        await dollar.transfer(accounts[3], await dollar.balanceOf(accounts[0]))
        // send some to LamportWallet
        await dollar.transfer(contract.address, `100`, { from: accounts[3] })

        await contract.execute(...buildExecuteArguments(k, "stub(uint256,uint256)", dollar.abi, dollar.address, [13, 14]))
        await contract.execute(...buildExecuteArguments(k, "transfer(address,uint256)", dollar.abi, dollar.address, [alice, '50']))

        function buildExecuteArguments_bad(k: KeyTracker, functionName: string, abi: any, address: string, args: any[]): any[] {
            const { current_keys, next_keys, currentpkh } = lamport_getCurrentAndNextKeyData(k)

            const nextpkh = KeyTracker.pkhFromPublicKey(k.publicKeys[0]) // reuse the first public key.. for a test
            const _data = buildCallData(abi, functionName, args, address)
            const packed = ethers.utils.solidityPack(['bytes', 'bytes32'], [_data, nextpkh])
            const callhash = hash_b(packed)
            const sig = sign_hash(callhash, current_keys.pri)
            const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
            if (!is_valid_sig)
                throw new Error(`Invalid Lamport Signature`)
            return [_data, current_keys.pub, nextpkh, sig.map(s => `0x${s}`)]
        }
        let failed = false
        await contract.execute(...buildExecuteArguments_bad(k, "stub(uint256,uint256)", dollar.abi, dollar.address, [13, 14]))
            .catch(() => failed = true)
        expect(failed).to.equal(true)
    })

    it('Do a bunch of stuff in a row', async () => {
        const alice = accounts[4]
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract
        const dollar: ethers.Contract = await Dollar.new()

        // fund contract
        await web3.eth.sendTransaction({ from: accounts[1], to: contract.address, value: `1000000000000000000` })

        // send all dollars to account 3
        await dollar.transfer(accounts[3], await dollar.balanceOf(accounts[0]))
        // send some to LamportWallet
        await dollar.transfer(contract.address, `100`, { from: accounts[3] })

        const pkh_history: string[] = []
        function add_pkh_history() {
            const pkh = k.pkh
            if (pkh_history.includes(pkh))
                throw new Error(`pkh already in history`)
            pkh_history.push(pkh)
        }

        add_pkh_history()

        await contract.execute(...buildExecuteArguments(k, "stub(uint256,uint256)", dollar.abi, dollar.address, [13, 14], '321', '123456'))
        add_pkh_history()

        await contract.execute(...buildExecuteArguments(k, "transfer(address,uint256)", dollar.abi, dollar.address, [alice, '50']))
        add_pkh_history()

        await contract.execute(...buildExecuteArguments(k, "stub(uint256,uint256)", dollar.abi, dollar.address, [13, 14], '321', '214365'))
        add_pkh_history()

        { // transfer an erc721
            // setup
            const uniqueAsset = await UniqueAsset.new()
            await uniqueAsset.transferFrom(accounts[0], contract.address, `1`, { from: accounts[0] })

            const o1 = await uniqueAsset.ownerOf(`1`)
            expect(o1).to.equal(contract.address)
            await contract.execute(...buildExecuteArguments(k, "transferFrom(address,address,uint256)", uniqueAsset.abi, uniqueAsset.address, [contract.address, accounts[5], `1`]))

            const o2 = await uniqueAsset.ownerOf(`1`)
            expect(o2).to.equal(accounts[5])
            add_pkh_history()
        }
    })

    const fsigToInterfaceId = (fsig: string) => hash(fsig).slice(0, 10)

    it('supports expected interfaces', async () => {
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract

        const expectedInterfaces: string[] = [
            fsigToInterfaceId('supportsInterface(bytes4)'),
            fsigToInterfaceId('isValidSignature(bytes32,bytes)'),
        ]

        for (const iface of expectedInterfaces) {
            const supports = await contract.supportsInterface(iface)
            expect(supports).to.equal(true)
        }
    })
})

contract('EIP 1271 Signature Validation', (accounts: string[]) => {
    it('Can validate signatures', async () => {
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract

        const message = loremIpsum()
        const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message))

        const flatSig: string = await signingWallet.signMessage(ethers.utils.arrayify(messageHash));

        const isValid = await contract.isValidSignature(messageHash, flatSig)
        expect(isValid).to.equal(`0x1626ba7e`)
    })

    it('Validation fails on invalid signature... provide wrong hash', async () => {
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract

        const message = loremIpsum()
        const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message))

        const flatSig: string = await signingWallet.signMessage(ethers.utils.arrayify(messageHash));

        const isValid = await contract.isValidSignature(ethers.utils.keccak256(messageHash), flatSig) //: hash twice: should cause function to return the 'false' flag (0xffffffff)
        expect(isValid).to.equal(`0xffffffff`)
    })

    it('fails if signed with wrong wallet', async () => {
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract

        const message = loremIpsum()
        const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message))

        const wrongWallet = ethers.Wallet.createRandom()
        const flatSig: string = await wrongWallet.signMessage(ethers.utils.arrayify(messageHash));

        const isValid = await contract.isValidSignature(messageHash, flatSig)
        expect(isValid).to.equal(`0xffffffff`)
    })
})

/**
 *  @name setup
 *  @description setup factory and nft contract for use in test
 *  @author William Doyle
 *  @date November 23rd 2022  
 */
async function setup(): Promise<{ factory: ethers.Contract, kf: KeyTracker, stdnft: ethers.Contract }> {
    // KEY TRACKER FOR USE WITH FACTORY
    const kf: KeyTracker = new KeyTracker()

    // DEPLOY FACTORY AND NFT CONTRACT
    const factory: ethers.Contract = await LamportWalletFactory.new(ethers.utils.parseEther(`0.01`), kf.pkh,)
    const stdnft = await StandardSingleMinterNFT.new('Lucky Coin', 'LUCKY', 'https://based.com/', factory.address)

    // BUILD SIGNATURE TO ADD NFT CONTRACT TO FACTORY
    const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(kf)
    const packed = (() => {
        const temp = ethers.utils.solidityPack(['address'], [stdnft.address])
        return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
    })()
    const callhash = hash_b(packed)
    const sig = sign_hash(callhash, current_keys.pri)
    const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)

    expect(is_valid_sig).to.equal(true)

    // ADD NFT CONTRACT TO FACTORY
    await factory.setMintingAddress(stdnft.address, current_keys.pub, sig.map(s => `0x${s}`), nextpkh)

    return {
        factory,
        kf,
        stdnft
    }
}


async function setup_multipleMinting(): Promise<{ factory: ethers.Contract, kf: KeyTracker, stdnfts: ethers.Contract[] }> {
    // KEY TRACKER FOR USE WITH FACTORY
    const kf: KeyTracker = new KeyTracker()

    // DEPLOY FACTORY AND NFT CONTRACT
    const factory: ethers.Contract = await LamportWalletFactory.new(ethers.utils.parseEther(`0.01`), kf.pkh,)
    const stdnfts = await Promise.all(Array.from({ length: 3 }).map(async (_, i) => {
        return await StandardSingleMinterNFT.new(loremIpsum(), `Ipsum ${i.toString().repeat(3)}`, 'https://based.com/', factory.address)
    }))

    // BUILD SIGNATURE TO ADD NFT CONTRACT TO FACTORY
    for (let i = 0; i < stdnfts.length; i++) {

        const stdnft = stdnfts[i]

        const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(kf)
        const packed = (() => {
            const temp = ethers.utils.solidityPack(['address'], [stdnft.address])
            return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
        })()
        const callhash = hash_b(packed)
        const sig = sign_hash(callhash, current_keys.pri)
        const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)

        expect(is_valid_sig).to.equal(true)

        // ADD NFT CONTRACT TO FACTORY
        await factory.setMintingAddress(stdnft.address, current_keys.pub, sig.map(s => `0x${s}`), nextpkh)
    }

    return {
        factory,
        kf,
        stdnfts
    }
}



/**
 *  @name setup_withoutMinting
 *  @description setup factory 
 *  @author William Doyle
 *  @date November 23rd 2022  
 */
async function setup_withoutMinting(): Promise<{ factory: ethers.Contract, kf: KeyTracker }> {
    // KEY TRACKER FOR USE WITH FACTORY
    const kf: KeyTracker = new KeyTracker()

    // DEPLOY FACTORY AND NFT CONTRACT
    const factory: ethers.Contract = await LamportWalletFactory.new(ethers.utils.parseEther(`0.01`), kf.pkh,)

    return {
        factory,
        kf,
    }
}

contract('Lamport Wallet Factory', (accounts: string[]) => {
    it('can use factory to create new wallets', async () => {
        const { factory } = await setup()

        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()

        await factory.createWalletEther(signingWallet.address, k.pkh, {
            value: ethers.utils.parseEther(`0.01`)
        })

        const allWallets = await factory.getAllCreatedWallets()
        expect(allWallets.length).to.equal(1)
    })

    it('can create and use wallets', async () => {
        const { factory } = await setup()

        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        await factory.createWalletEther(signingWallet.address, k.pkh, {
            value: ethers.utils.parseEther(`0.01`)
        })

        const allWallets = await factory.getAllCreatedWallets()
        const contract = new web3.eth.Contract(LamportWallet.abi, allWallets[0].walletAddress,)

        const balance1 = await web3.eth.getBalance(contract.options.address)    // check balance of contract
        expect(balance1).to.equal(`0`)

        // someone sends money to contract 
        await web3.eth.sendTransaction({ from: accounts[1], to: contract.options.address, value: `1000000000000000000` })
        const balance2 = await web3.eth.getBalance(contract.options.address)  // check balance of contract
        expect(balance2).to.equal(`1000000000000000000`)

        // owner commands contract to send funds to another address
        const acc2b1 = await web3.eth.getBalance(accounts[2]) // check balance of account 2 before transfer from scw

        const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(k)

        const packed = (() => {
            const temp = ethers.utils.solidityPack(['address', 'uint256'], [accounts[2], `1000000000000000000`])
            return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
        })()

        const callhash = hash_b(packed)
        const sig = sign_hash(callhash, current_keys.pri)

        const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
        expect(is_valid_sig).to.be.true

        const tx = await contract.methods.sendEther(
            accounts[2],
            `1000000000000000000`,
            current_keys.pub,
            nextpkh,
            sig.map(s => `0x${s}`),
        )

        await tx.send({ from: accounts[1], gas: 1000000 })

        const acc2b2 = await web3.eth.getBalance(accounts[2]) // check balance of account 2 after transfer from scw

        const expectedNum: ethers.BigNumber = ethers.BigNumber.from(acc2b1).add(ethers.BigNumber.from(`1000000000000000000`))
        expect(acc2b2).to.equal(expectedNum.toString()) // check balance against expected balance
    })

    it('can pay for new wallet with erc20', async () => {
        const { factory, kf } = await setup()

        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()

        const canadianDollar = await Dollar.new()

        {// approve the use of these currencies on our contract
            const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(kf)
            const packed = (() => {
                const temp = ethers.utils.solidityPack(['address', 'uint256'], [canadianDollar.address, '7'])
                return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
            })()
            const callhash = hash_b(packed)
            const sig = sign_hash(callhash, current_keys.pri)
            const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
            expect(is_valid_sig).to.be.true
            console.log(`sig is valid`)

            await factory.addApprovedErc20(canadianDollar.address, '7', current_keys.pub, sig.map(s => `0x${s}`), nextpkh)
        }

        // approve the factory to spend our currency
        await canadianDollar.approve(factory.address, '7')

        await factory.createWalletErc20(signingWallet.address, k.pkh, canadianDollar.address, '7')
        const allWallets = await factory.getAllCreatedWallets()
        expect(allWallets.length).to.equal(1)
        console.log(allWallets)
    })

    it('change price', async () => {
        const { factory, kf } = await setup()
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()

        const canadianDollar = await Dollar.new()

        {    // approve the use of these currencies on our contract
            const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(kf)
            const packed = (() => {
                const temp = ethers.utils.solidityPack(['address', 'uint256'], [canadianDollar.address, '7'])
                return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
            })()
            const callhash = hash_b(packed)
            const sig = sign_hash(callhash, current_keys.pri)
            const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
            expect(is_valid_sig).to.be.true

            await factory.addApprovedErc20(canadianDollar.address, '7', current_keys.pub, sig.map(s => `0x${s}`), nextpkh)
        }
        // approve the factory to spend our currency
        await canadianDollar.approve(factory.address, '7')
        await factory.createWalletErc20(signingWallet.address, k.pkh, canadianDollar.address, '7')

        {
            const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(kf)
            const packed = (() => {
                const temp = ethers.utils.solidityPack(['address', 'uint256'], [canadianDollar.address, '8'])
                return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
            })()
            const callhash = hash_b(packed)
            const sig = sign_hash(callhash, current_keys.pri)
            const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
            expect(is_valid_sig).to.be.true

            await factory.changePrice(canadianDollar.address, '8', current_keys.pub, sig.map(s => `0x${s}`), nextpkh)
        }

        {
            let failed = false
            await canadianDollar.approve(factory.address, '7')
            await factory.createWalletErc20(signingWallet.address, k.pkh, canadianDollar.address, '7')
                .catch(() => failed = true)
            expect(failed).to.be.true
        }

        {   // change price in eth
            {
                const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(kf)
                const packed = (() => {
                    const temp = ethers.utils.solidityPack(['address', 'uint256'], [ethers.constants.AddressZero, ethers.utils.parseEther(`0.02`)])
                    return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
                })()
                const callhash = hash_b(packed)
                const sig = sign_hash(callhash, current_keys.pri)
                const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
                expect(is_valid_sig).to.be.true
                console.log(`sig is valid`)

                await factory.changePrice(ethers.constants.AddressZero, ethers.utils.parseEther(`0.02`), current_keys.pub, sig.map(s => `0x${s}`), nextpkh)
            }

            let failed = false
            await factory.createWalletEther(signingWallet.address, k.pkh)
                .catch(() => failed = true)
            expect(failed).to.be.true
        }

        const allWallets = await factory.getAllCreatedWallets()
        expect(allWallets.length).to.equal(1)
    })

    it('remove currencies', async () => {
        const { factory, kf } = await setup()
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()

        const canadianDollar = await Dollar.new()

        {
            // approve the use of these currencies on our contract
            const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(kf)
            const packed = (() => {
                const temp = ethers.utils.solidityPack(['address', 'uint256'], [canadianDollar.address, '7'])
                return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
            })()
            const callhash = hash_b(packed)
            const sig = sign_hash(callhash, current_keys.pri)
            const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
            expect(is_valid_sig).to.be.true

            await factory.addApprovedErc20(canadianDollar.address, '7', current_keys.pub, sig.map(s => `0x${s}`), nextpkh)
        }
        // approve the factory to spend our currency
        await canadianDollar.approve(factory.address, '7')
        await factory.createWalletErc20(signingWallet.address, k.pkh, canadianDollar.address, '7')

        const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(kf)
        const packed = (() => {
            const temp = ethers.utils.solidityPack(['address'], [canadianDollar.address])
            return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
        })()

        const callhash = hash_b(packed)
        const sig = sign_hash(callhash, current_keys.pri)
        const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
        expect(is_valid_sig).to.be.true

        await factory.removeApprovedErc20(canadianDollar.address, current_keys.pub, sig.map(s => `0x${s}`), nextpkh)

        {
            let failed = false
            await canadianDollar.approve(factory.address, '7')
            await factory.createWalletErc20(signingWallet.address, k.pkh, canadianDollar.address, '7')
                .catch(() => failed = true)
            expect(failed).to.be.true
        }

        const allWallets = await factory.getAllCreatedWallets()
        expect(allWallets.length).to.equal(1)
    })

    it('Check Special NFT from factory', async () => {
        console.log(`STUB: begin test`)
        const { factory, kf, stdnft } = await setup()
        console.log(stdnft)
        console.log(`STUB: after setup`)

        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()

        // total supply of stdnft should be 0  to begin
        expect((await stdnft.totalSupply()).toString()).to.equal('0')

        console.log(`STUB: total supply as expected`)

        // create a wallet
        await factory.createWalletEther(signingWallet.address, k.pkh, {
            value: ethers.utils.parseEther(`0.01`)
        })


        const allWallets = await factory.getAllCreatedWallets()
        console.log(`allwallets length is ${allWallets.length}`)
        // const wallet = new web3.eth.Contract(LamportWallet.abi, allWallets[0].walletAddress,)

        // total supply of stdnft should be 1
        expect((await stdnft.totalSupply()).toString()).to.equal('1')


        console.log(`STUB: total supply as expected`)

        // owner of nft should be the wallet
        expect(await stdnft.ownerOf(0)).to.equal(allWallets[0].walletAddress)

        console.log(`STUB: owner of nft as expected`)
        const balance = await stdnft.balanceOf(allWallets[0].walletAddress)
        console.log(`STUB balance is ${balance}`)

        const tokenURI = await stdnft.tokenURI('0')
        console.log(`tokenURI is ${tokenURI}`)
    })
})

contract('check recovery', async () => {
    it('can post recovery public key hashes and can use them to recover a wallet', async () => {
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom() // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()
        const contract: ethers.Contract = await LamportWallet.new(signingWallet.address, k.pkh)  // deploy contract

        const tenKeys = Array.from({ length: 10 }, mk_key_pair)
        {
            const tenPKHs: string[] = tenKeys.map(pair => KeyTracker.pkhFromPublicKey(pair.pub))

            const { current_keys, next_keys, nextpkh, currentpkh } = lamport_getCurrentAndNextKeyData(k)

            const packed = (() => {
                const temp = ethers.utils.solidityPack(['bytes32[]'], [tenPKHs])
                return ethers.utils.solidityPack(['bytes', 'bytes32'], [temp, nextpkh])
            })()
            const callhash = hash_b(packed)
            const sig = sign_hash(callhash, current_keys.pri)
            const is_valid_sig = verify_signed_hash(callhash, sig, current_keys.pub)
            if (!is_valid_sig)
                throw new Error(`Invalid Lamport Signature`)

            await contract.setTenRecoveryPKHs(tenPKHs, current_keys.pub, sig.map(s => `0x${s}`), nextpkh)

            const fromChain = await contract.getRecoveryPKHs()
            expect(fromChain).to.deep.equal(tenPKHs)
        }
        {
            // OH NO! We lost our keys. We can recover our wallet with the recovery keys
            // 1. get our recovery keys from the contract
            const recoveryOptions = await contract.getRecoveryPKHs()

            // 2. pick one of the recovery keys
            const recoveryKeyPair = tenKeys.find(pair => KeyTracker.pkhFromPublicKey(pair.pub) === recoveryOptions[0])

            if (recoveryKeyPair === undefined)
                throw new Error(`Could not find recovery key pair`)

            const k2: KeyTracker = new KeyTracker()

            const packed = ethers.utils.solidityPack(['bytes32'], [k2.pkh])
            const callhash = hash_b(packed)
            const sig = sign_hash(callhash, recoveryKeyPair.pri)
            const is_valid_sig = verify_signed_hash(callhash, sig, recoveryKeyPair.pub)

            if (!is_valid_sig)
                throw new Error(`Invalid Lamport Signature`)

            await contract.recover(k2.pkh, recoveryKeyPair.pub, sig.map(s => `0x${s}`))

            expect(await contract.getPKH()).to.equal(k2.pkh)
        }
    })
})


contract('additional minting addresses', async () => {
    it('Works without minting address', async () => {
        const { factory, kf } = await setup_withoutMinting()
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom()       // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()

        await factory.createWalletEther(signingWallet.address, k.pkh, {         // create a wallet
            value: ethers.utils.parseEther(`0.01`)
        })

        const allWallets = await factory.getAllCreatedWallets()
        console.log(`allwallets length is ${allWallets.length}`)
        expect(allWallets.length).to.equal(1)
    })

    it('Works with multiple address', async () => {
        const { factory, kf, stdnfts } = await setup_multipleMinting()
        const signingWallet: ethers.Wallet = ethers.Wallet.createRandom()       // messages signed with this wallet are indications of approval/endorsment on behalf of the contract... seperate from ownership because this allows us to only use this wallet for signing... it should never have any Ether
        const k: KeyTracker = new KeyTracker()


        await factory.createWalletEther(signingWallet.address, k.pkh, {         // create a wallet
            value: ethers.utils.parseEther(`0.01`)
        })

        console.log(`STUB BEGIN LOOP`)
        for (let i = 0; i < stdnfts.length; i++) {
            const stdnft = stdnfts[i]
            expect((await stdnft.totalSupply()).toString()).to.equal('1'.toString())

            const allWallets = await factory.getAllCreatedWallets()
            console.log(`allwallets length is ${allWallets.length}`)

            expect((await stdnft.totalSupply()).toString()).to.equal('1')           // total supply of stdnft should be 1
            expect(await stdnft.ownerOf(0)).to.equal(allWallets[0].walletAddress)   // owner of nft should be the wallet

            const tokenURI = await stdnft.tokenURI('0')
            console.log(`tokenURI is ${tokenURI}`)
        }
    })
})