const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting CircleFi Smart Contract Deployment...\n");

  const CircleFi = await ethers.getContractFactory("CircleFi");
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contract with account: ${deployer.address}`);

  const balance = await deployer.provider.getBalance(deployer.address);
  const balanceInHBAR = ethers.formatEther(balance);
  console.log(`💰 Account balance: ${balanceInHBAR} HBAR\n`);

  console.log("⏳ Deploying CircleFi contract to Hedera Testnet...");
  const circleFi = await CircleFi.deploy({
    gasLimit: 7000000,
  });
  await circleFi.waitForDeployment();

  const contractAddress = await circleFi.getAddress();
  console.log(`✅ CircleFi contract deployed successfully!`);
  console.log(`📍 Contract Address: ${contractAddress}\n`);

  // ethers v6 - get receipt this way
  const deployTx = await circleFi.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`🔗 Transaction Hash: ${receipt.hash}\n`);

  const deploymentData = {
    contractName: "CircleFi",
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    network: "hederaTestnet",
    chainId: 296,
    deploymentTimestamp: new Date().toISOString(),
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };

  const deployedFilePath = path.join(__dirname, '..', 'deployed.json');
  fs.writeFileSync(deployedFilePath, JSON.stringify(deploymentData, null, 2));
  console.log(`💾 Deployment details saved to deployed.json\n`);

  console.log("=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:           Hedera Testnet (Chain ID: 296)`);
  console.log(`Contract Address:  ${contractAddress}`);
  console.log(`Deployer Address:  ${deployer.address}`);
  console.log(`Deployment Time:   ${deploymentData.deploymentTimestamp}`);
  console.log(`Block Number:      ${receipt.blockNumber}`);
  console.log(`Transaction Hash:  ${receipt.hash}`);
  console.log("=".repeat(60));
  console.log(`\n✨ Next steps:`);
  console.log(`1. Update frontend/.env with:`);
  console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`2. Run: npm run dev (in frontend directory)\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });