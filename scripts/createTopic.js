const {
  Client,
  PrivateKey,
  TopicCreateTransaction,
  AccountId,
} = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log("🚀 Creating HCS Topic for CircleFi Sealed Bids...\n");

  // Load environment variables
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKeyString = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKeyString) {
    throw new Error(
      "❌ Missing environment variables: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env"
    );
  }

  console.log(`📝 Using account: ${accountId}`);

  // Parse private key
  const privateKey = PrivateKey.fromStringECDSA(
    privateKeyString.replace('0x', '').trim()
  );

  // Create Hedera testnet client
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  try {
    // Create the topic
    console.log("⏳ Creating topic with memo 'CircleFi Sealed Bids'...");
    
    const topicCreateTx = await new TopicCreateTransaction()
      .setTopicMemo("CircleFi Sealed Bids")
      .execute(client);

    // Get the receipt to retrieve topic ID
    const receipt = topicCreateTx.getReceipt(client);
    const topicId = (await receipt).topicId;

    console.log(`✅ Topic created successfully!`);
    console.log(`📍 Topic ID: ${topicId}\n`);

    // Load existing deployed.json if it exists
    const deployedFilePath = path.join(__dirname, '..', 'deployed.json');
    let deploymentData = {};

    if (fs.existsSync(deployedFilePath)) {
      const existingData = fs.readFileSync(deployedFilePath, 'utf8');
      deploymentData = JSON.parse(existingData);
      console.log(`📂 Merged with existing deployed.json`);
    }

    // Add topic ID to deployment data
    deploymentData.hcsTopicId = topicId.toString();
    deploymentData.hcsTopicMemo = "CircleFi Sealed Bids";
    deploymentData.topicCreationTimestamp = new Date().toISOString();

    // Save updated deployment data
    fs.writeFileSync(deployedFilePath, JSON.stringify(deploymentData, null, 2));
    console.log(`💾 Deployment details updated in deployed.json\n`);

    // Display summary
    console.log("=".repeat(60));
    console.log("HCS TOPIC CREATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Network:           Hedera Testnet`);
    console.log(`Topic ID:          ${topicId}`);
    console.log(`Topic Memo:        CircleFi Sealed Bids`);
    console.log(`Creation Time:     ${deploymentData.topicCreationTimestamp}`);
    console.log("=".repeat(60));
    console.log(`\n✨ Next steps:`);
    console.log(`1. Update frontend/.env with:`);
    console.log(`   VITE_HCS_TOPIC_ID=${topicId}`);
    console.log(`2. Contract address (if deployed):`);
    if (deploymentData.contractAddress) {
      console.log(`   VITE_CONTRACT_ADDRESS=${deploymentData.contractAddress}`);
    } else {
      console.log(`   VITE_CONTRACT_ADDRESS=<run deploy.js first>`);
    }
    console.log(`3. Restart frontend: npm run dev (in frontend directory)\n`);

    // Close the client
    await client.close();
  } catch (error) {
    console.error("❌ Topic creation failed:", error.message);
    process.exit(1);
  }
}

main();
