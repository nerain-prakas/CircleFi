const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CircleFi", function () {
  let circleFi;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const CircleFi = await ethers.getContractFactory("CircleFi");
    circleFi = await CircleFi.deploy();
    await circleFi.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await circleFi.owner()).to.equal(owner.address);
    });
  });

  describe("Create Chit Group", function () {
    it("Should create a new chit group", async function () {
      const tx = await circleFi.connect(owner).createChitGroup(3, ethers.parseEther("1"), 6);
      await tx.wait();
      
      const group = await circleFi.chitGroups(0);
      expect(group.memberCount).to.equal(3);
      expect(group.monthlyContribution).to.equal(ethers.parseEther("1"));
      expect(group.duration).to.equal(6);
      expect(group.isActive).to.be.true;
    });

    it("Should fail to create group with less than 2 members", async function () {
      await expect(
        circleFi.connect(owner).createChitGroup(1, ethers.parseEther("1"), 6)
      ).to.be.revertedWith("Must have at least 2 members");
    });
  });

  describe("Join Chit Group", function () {
    beforeEach(async function () {
      // Create a group first
      await circleFi.connect(owner).createChitGroup(3, ethers.parseEther("1"), 6);
    });

    it("Should allow a member to join a chit group", async function () {
      await circleFi.connect(addr1).joinChitGroup(0);
      
      const group = await circleFi.chitGroups(0);
      expect(group.members.length).to.equal(1);
      expect(group.members[0]).to.equal(addr1.address);
    });

    it("Should fail if member tries to join twice", async function () {
      await circleFi.connect(addr1).joinChitGroup(0);
      
      await expect(
        circleFi.connect(addr1).joinChitGroup(0)
      ).to.be.revertedWith("Already joined this group");
    });
  });

  describe("Contribute", function () {
    beforeEach(async function () {
      // Create a group and add members
      await circleFi.connect(owner).createChitGroup(3, ethers.parseEther("1"), 6);
      await circleFi.connect(addr1).joinChitGroup(0);
      await circleFi.connect(addr2).joinChitGroup(0);
    });

    it("Should accept contributions", async function () {
      const contributionAmount = ethers.parseEther("1");
      
      await expect(() => 
        circleFi.connect(addr1).contribute(0, { value: contributionAmount })
      ).to.changeEtherBalance(addr1, -contributionAmount);
      
      expect(await circleFi.getCurrentPot(0)).to.equal(contributionAmount);
    });

    it("Should fail if contribution amount is incorrect", async function () {
      const wrongAmount = ethers.parseEther("0.5");
      
      await expect(
        circleFi.connect(addr1).contribute(0, { value: wrongAmount })
      ).to.be.revertedWith("Incorrect contribution amount");
    });
  });

  describe("Bid Submission and Reveal", function () {
    beforeEach(async function () {
      // Create a group and add members
      await circleFi.connect(owner).createChitGroup(2, ethers.parseEther("1"), 6);
      await circleFi.connect(addr1).joinChitGroup(0);
      await circleFi.connect(addr2).joinChitGroup(0);
    });

    it("Should allow bid submission", async function () {
      const bidAmount = ethers.parseEther("0.8");
      const salt = ethers.id("random_salt");
      const sealedBid = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes32"], [bidAmount, salt]));
      
      await circleFi.connect(addr1).submitBid(0, sealedBid);
      
      // We can't easily check the bid was stored due to the structure, 
      // but the transaction should succeed without reverting
    });

    it("Should allow bid revelation", async function () {
      const bidAmount = ethers.parseEther("0.8");
      const salt = ethers.id("random_salt");
      const sealedBid = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes32"], [bidAmount, salt]));
      
      await circleFi.connect(addr1).submitBid(0, sealedBid);
      await circleFi.connect(addr1).revealBid(0, bidAmount, salt);
      
      // The bid should be revealed successfully
    });
  });

  describe("Pause/Unpause", function () {
    it("Should allow owner to pause and unpause", async function () {
      await circleFi.connect(owner).pause();
      expect(await circleFi.paused()).to.be.true;
      
      await circleFi.connect(owner).unpause();
      expect(await circleFi.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        circleFi.connect(addr1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});