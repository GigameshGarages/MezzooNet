// imports
const {defaultAbiCoder} = require("@ethersproject/abi");
const {expect} = require("chai");
const { ethers } = require("hardhat");
const {waffle} = require("hardhat");
const zeroaddress = "0x0000000000000000000000000000000000000000";
const {BigNumber} = require('@ethersproject/bignumber');
const provider = waffle.provider;

const encoder = defaultAbiCoder

// test suite for Alchemy
describe("Test buyout", function () {

    // variable to store the deployed smart contract
    let governorAlphaImplementation;
    let alchemyImplementation;
    let timelockImplementation;
    let alchemyFactory;
    let stakingRewards;
    let alchemyRouter;
    let alc;
    let minty;

    let owner, addr1, addr2, addr3, addr4;
    const deploy = async (name, ...args) => (await ethers.getContractFactory(name)).deploy(...args);

    it('CloneLibrary works', async () => {
        const test = await deploy('TestClone');
        await test.deployed();
    })

    // initial deployment of Conjure Factory
    before(async function () {
        [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

        governorAlphaImplementation = await deploy('GovernorAlpha');
        alchemyImplementation = await deploy('Alchemy');
        timelockImplementation = await deploy('Timelock');

        // deploy alc token
        alc = await deploy('ALCH', owner.address, owner.address, Date.now());

        // deploy alchemy factory
        alchemyFactory = await deploy(
            'AlchemyFactory',
            alchemyImplementation.address,
            governorAlphaImplementation.address,
            timelockImplementation.address,
            owner.address
        );

        // deploy staking rewards
        stakingRewards = await deploy('StakingRewards', owner.address, owner.address, alc.address);

        // deploy router
        alchemyRouter = await deploy('AlchemyRouter', stakingRewards.address, owner.address);

        // deploy minty
        minty = await deploy(
            'Minty',
            "MIN",
            "TY",
            "www.example.com",
            owner.address
        );
    })

    describe('Implementations locked', () => {
        it('Alchemy', async () => {
            expect(await alchemyImplementation._factoryContract()).to.eq(`0x${'00'.repeat(19)}01`);
        })

        it('GovernorAlpha', async () => {
            expect(await governorAlphaImplementation.nft()).to.eq(`0x${'00'.repeat(19)}01`);
        })

        it('Timelock', async () => {
            expect(await timelockImplementation.admin()).to.eq(`0x${'00'.repeat(19)}01`);
        })
    })

    it("Set up staking distribution", async function () {
        await stakingRewards.setRewardsDistribution(alchemyRouter.address);
    });

    it("Set up factory owner", async function () {
        //await alchemyFactory.newFactoryOwner(alchemyRouter.address);
        await alchemyFactory.newAlchemyRouter(alchemyRouter.address)
    });

    it("Enter staking pool", async function () {
        await alc.approve(stakingRewards.address, "50000000000000000000");
        await stakingRewards.stake("50000000000000000000");
    });

    describe('NFTDaoMint()', async () => {
        let alchemy, governor, timelock;

        it('Should deploy alchemy contract', async () => {
            await minty.approve(alchemyFactory.address, 0);

            const tx = await alchemyFactory.NFTDAOMint(
                [minty.address],
                owner.address,
                [0],
                1000000,
                "TEST",
                "CASE",
                "500000000000000000",
                5,
                0
            );
            const { events, cumulativeGasUsed, gasUsed } = await tx.wait();
            console.log(`Cumulative: ${cumulativeGasUsed.toNumber()}`);
            console.log(`Gas: ${gasUsed.toNumber()}`)
            const [event] = events.filter(e => e.event === "NewAlchemy");
            alchemy = await ethers.getContractAt("Alchemy", event.args.alchemy);
            governor = await ethers.getContractAt("GovernorAlpha", event.args.governor);
            timelock = await ethers.getContractAt("Timelock", event.args.timelock);
        })

        // test proposals
        it("Delegate votes", async function () {
            await ethers.provider.send("evm_mine")      // mine the next block
            await alchemy.delegate(owner.address)
        });


        it("Should be possible to make a proposal to add a nft", async function () {

            const goveroraddress = await alchemy._governor();
            const govcontract = await ethers.getContractAt("GovernorAlpha", goveroraddress);

            let parameters = encoder.encode(
                ["address","uint256"],
                [minty.address,1]
            )

            await govcontract.propose(
                [alchemy.address],
                [0],
                ["addNft(address,uint256)"],
                [parameters],
                "Test proposal to add nft"
            );

            await ethers.provider.send("evm_mine")      // mine the next block
            await govcontract.castVote(1, true);

            await ethers.provider.send("evm_increaseTime", [60*60*5])
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block

            await govcontract.queue(1)

            await ethers.provider.send("evm_mine")      // mine the next block


            let shares = await alchemy._nftCount()
            expect (shares).to.be.equal(1)

            await minty.approve(alchemy.address,1);
            await minty.transferFrom(owner.address, alchemy.address,1);

            await govcontract.execute(1)

            console.log(await minty.ownerOf(1))
            console.log(alchemy.address)

            shares = await alchemy._nftCount()
            expect (shares).to.be.equal(2)
        });
        it("Should be possible to make a proposal to add a nft", async function () {

            const goveroraddress = await alchemy._governor();
            const govcontract = await ethers.getContractAt("GovernorAlpha", goveroraddress);

            let parameters = encoder.encode(
                ["address","uint256"],
                [minty.address,2]
            )

            await govcontract.propose(
                [alchemy.address],
                [0],
                ["addNft(address,uint256)"],
                [parameters],
                "Test proposal to add nft"
            );

            await ethers.provider.send("evm_mine")      // mine the next block
            await govcontract.castVote(2, true);

            await ethers.provider.send("evm_increaseTime", [60*60*5])
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block

            await govcontract.queue(2)

            await ethers.provider.send("evm_mine")      // mine the next block


            let shares = await alchemy._nftCount()
            expect (shares).to.be.equal(2)

            await minty.approve(alchemy.address,2);
            await minty.transferFrom(owner.address, alchemy.address,2);

            await govcontract.execute(2)

            console.log(await minty.ownerOf(2))
            console.log(alchemy.address)

            shares = await alchemy._nftCount()
            expect (shares).to.be.equal(3)
        });

        it("Should be possible to make a proposal to buy a specific nft", async function () {
            const goveroraddress = await alchemy._governor();
            const govcontract = await ethers.getContractAt("GovernorAlpha", goveroraddress);

            // send 1 eth
            let overrides = {
                value: "1000000000000000000"
            };

            await expect(alchemy.buySingleNft(1, overrides)).to.be.reverted;

            let parameters = encoder.encode(
                ["uint256","uint256","bool"],
                [1, "1000000000000000000", true]
            )

            await govcontract.propose(
                [alchemy.address],
                [0],
                ["setNftSale(uint256,uint256,bool)"],
                [parameters],
                "Test proposal to sell a single nft"
            );

            await ethers.provider.send("evm_mine")      // mine the next block
            await govcontract.castVote(3, true);

            await ethers.provider.send("evm_increaseTime", [60*60*5])
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block
            await ethers.provider.send("evm_mine")      // mine the next block

            await govcontract.queue(3)

            await ethers.provider.send("evm_mine")      // mine the next block


            await govcontract.execute(3)

            await alchemy.buySingleNft(1, overrides);

            console.log(await minty.ownerOf(1))
            console.log(alchemy.address)

            let shares = await alchemy._nftCount()
            expect (shares).to.be.equal(2)
        });

        it("Should be possible to buyout", async function () {

            let buyoutPrice = await alchemy._buyoutPrice()

            let overrides = {
                value: buyoutPrice
            };

            await alchemy.connect(addr1).buyout(overrides)

            let ow = await minty.ownerOf(0)
            //expect(ow).to.be.equal(addr1.address)

            console.log(await minty.ownerOf(0))
            console.log(await minty.ownerOf(1))
        });

        it("Should not  possible to buyout", async function () {

            let buyoutPrice = await alchemy._buyoutPrice()

            let overrides = {
                value: buyoutPrice
            };

            await expect(alchemy.connect(addr1).buyout(overrides)).to.be.revertedWith("ALC:Already bought out");
        });

        it("Should not  possible to buy single after", async function () {

            let buyoutPrice = await alchemy._buyoutPrice()

            let overrides = {
                value: buyoutPrice
            };

            await expect(alchemy.connect(addr1).buySingleNft(1,overrides)).to.be.revertedWith("ALC:Already bought out");
        });

        it("Should not be possible to call buyout transfer by not the buyer", async function () {
            await expect(alchemy.buyoutWithdraw([0])).to.be.revertedWith("can only be called by the buyer");
        });

        it("Should be able to call buyout withdraw", async function () {

            console.log(await minty.ownerOf(0))
            console.log(await minty.ownerOf(2))
            console.log(await alchemy._nftCount())
            console.log(await alchemy._raisedNftArray(0))
            console.log(await alchemy._raisedNftArray(1))

            await alchemy.connect(addr1).buyoutWithdraw([0,1]);

            console.log(await minty.ownerOf(0))
            console.log(await minty.ownerOf(2))
        });

    })


});
