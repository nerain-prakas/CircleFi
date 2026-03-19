const { 
    Client, 
    PrivateKey, 
    AccountId, 
    TopicCreateTransaction, 
    TopicMessageSubmitTransaction, 
    TopicMessageQuery,
    TopicInfoQuery
} = require("@hashgraph/sdk");
require("dotenv").config();

/**
 * @title HCS Blind Auction Service
 * @notice Handles blind auction bidding via Hedera Consensus Service
 * @dev Uses HCS for timestamped, ordered messages for the blind auction
 */

class HCSBlindAuction {
    constructor() {
        // Configure Hedera client
        this.client = Client.forName("testnet");
        
        // Load account info from environment
        if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
            throw new Error("HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env file");
        }
        
        this.operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
        this.operatorKey = PrivateKey.fromStringECDSA(
            process.env.HEDERA_PRIVATE_KEY.replace('0x', '').trim()
        );
        
        this.client.setOperator(this.operatorId, this.operatorKey);
        
        this.topicId = null;
    }

    /**
     * Creates a new HCS topic for the blind auction
     * @returns {Promise<string>} The topic ID of the created topic
     */
    async createAuctionTopic() {
        console.log("Creating HCS topic for blind auction...");
        
        // Create the topic
        const topicCreateTx = new TopicCreateTransaction()
            .setTopicMemo("CircleFi Blind Auction Topic")
            .setAdminKey(this.operatorKey) // Only admin can delete/update topic
            .setSubmitKey(this.operatorKey) // Only accounts with this key can submit messages
            .freezeWith(this.client);

        // Sign and execute the transaction
        const topicCreateTxSign = await topicCreateTx.sign(this.operatorKey);
        const topicCreateSubmit = await topicCreateTxSign.execute(this.client);

        // Get the receipt to retrieve the topic ID
        const topicCreateRx = await topicCreateSubmit.getReceipt(this.client);
        this.topicId = topicCreateRx.topicId;

        console.log(`✅ HCS topic created with ID: ${this.topicId.toString()}`);
        
        return this.topicId.toString();
    }

    /**
     * Submits a sealed bid to the auction topic
     * @param {string} sealedBidHash - Hash of the bid amount + salt (as a string)
     * @param {string} bidderAddress - Address of the bidder
     * @param {number} groupId - ID of the chit group
     * @param {number} month - Month of the auction
     * @returns {Promise<string>} Transaction ID of the submitted message
     */
    async submitSealedBid(sealedBidHash, bidderAddress, groupId, month) {
        if (!this.topicId) {
            throw new Error("Auction topic not created yet. Call createAuctionTopic() first.");
        }

        console.log(`Submitting sealed bid for bidder: ${bidderAddress}, group: ${groupId}, month: ${month}`);
        
        // Prepare the bid message
        const bidMessage = {
            type: "sealed_bid",
            sealedBidHash: sealedBidHash,
            bidderAddress: bidderAddress,
            groupId: groupId,
            month: month,
            timestamp: Math.floor(Date.now() / 1000) // Unix timestamp
        };

        // Convert to JSON string
        const messageString = JSON.stringify(bidMessage);
        
        // Submit the message to the topic
        const messageTx = new TopicMessageSubmitTransaction()
            .setTopicId(this.topicId)
            .setMessage(messageString)
            .freezeWith(this.client);

        const messageTxSign = await messageTx.sign(this.operatorKey);
        const messageTxSubmit = await messageTxSign.execute(this.client);

        console.log(`✅ Sealed bid submitted to topic: ${this.topicId.toString()}`);
        
        return messageTxSubmit.transactionId.toString();
    }

    /**
     * Submits a bid revelation to the auction topic
     * @param {number} bidAmount - The actual bid amount
     * @param {string} salt - The salt used to create the sealed bid
     * @param {string} bidderAddress - Address of the bidder
     * @param {number} groupId - ID of the chit group
     * @param {number} month - Month of the auction
     * @returns {Promise<string>} Transaction ID of the submitted message
     */
    async revealBid(bidAmount, salt, bidderAddress, groupId, month) {
        if (!this.topicId) {
            throw new Error("Auction topic not created yet. Call createAuctionTopic() first.");
        }

        console.log(`Revealing bid for bidder: ${bidderAddress}, amount: ${bidAmount}`);
        
        // Prepare the reveal message
        const revealMessage = {
            type: "bid_revelation",
            bidAmount: bidAmount,
            salt: salt,
            bidderAddress: bidderAddress,
            groupId: groupId,
            month: month,
            timestamp: Math.floor(Date.now() / 1000) // Unix timestamp
        };

        // Convert to JSON string
        const messageString = JSON.stringify(revealMessage);
        
        // Submit the message to the topic
        const messageTx = new TopicMessageSubmitTransaction()
            .setTopicId(this.topicId)
            .setMessage(messageString)
            .freezeWith(this.client);

        const messageTxSign = await messageTx.sign(this.operatorKey);
        const messageTxSubmit = await messageTxSign.execute(this.client);

        console.log(`✅ Bid revelation submitted to topic: ${this.topicId.toString()}`);
        
        return messageTxSubmit.transactionId.toString();
    }

    /**
     * Submits an auction result to the topic
     * @param {number} groupId - ID of the chit group
     * @param {number} month - Month of the auction
     * @param {string} winnerAddress - Address of the winning bidder
     * @param {number} winningAmount - The winning bid amount
     * @returns {Promise<string>} Transaction ID of the submitted message
     */
    async submitAuctionResult(groupId, month, winnerAddress, winningAmount) {
        if (!this.topicId) {
            throw new Error("Auction topic not created yet. Call createAuctionTopic() first.");
        }

        console.log(`Submitting auction result - Group: ${groupId}, Month: ${month}, Winner: ${winnerAddress}, Amount: ${winningAmount}`);
        
        // Prepare the result message
        const resultMessage = {
            type: "auction_result",
            groupId: groupId,
            month: month,
            winnerAddress: winnerAddress,
            winningAmount: winningAmount,
            timestamp: Math.floor(Date.now() / 1000) // Unix timestamp
        };

        // Convert to JSON string
        const messageString = JSON.stringify(resultMessage);
        
        // Submit the message to the topic
        const messageTx = new TopicMessageSubmitTransaction()
            .setTopicId(this.topicId)
            .setMessage(messageString)
            .freezeWith(this.client);

        const messageTxSign = await messageTx.sign(this.operatorKey);
        const messageTxSubmit = await messageTxSign.execute(this.client);

        console.log(`✅ Auction result submitted to topic: ${this.topicId.toString()}`);
        
        return messageTxSubmit.transactionId.toString();
    }

    /**
     * Subscribe to the auction topic to listen for messages
     * @param {function} callback - Function to call when a message is received
     */
    async subscribeToAuction(callback) {
        if (!this.topicId) {
            throw new Error("Auction topic not created yet. Call createAuctionTopic() first.");
        }

        console.log(`Subscribing to auction topic: ${this.topicId.toString()}`);
        
        // Subscribe to the topic
        new TopicMessageQuery()
            .setTopicId(this.topicId)
            .subscribe(this.client, null, (message) => {
                const messageAsString = Buffer.from(message.contents, "utf8").toString();
                console.log(`${message.consensusTimestamp.toDate()} Received: ${messageAsString}`);
                
                try {
                    const parsedMessage = JSON.parse(messageAsString);
                    callback(parsedMessage, message.consensusTimestamp);
                } catch (error) {
                    console.error("Error parsing message:", error);
                    callback(null, message.consensusTimestamp);
                }
            });
    }

    /**
     * Gets the topic info
     * @returns {Promise<Object>} Topic information
     */
    async getTopicInfo() {
        if (!this.topicId) {
            throw new Error("Auction topic not created yet. Call createAuctionTopic() first.");
        }

        const topicInfo = await new TopicInfoQuery()
            .setTopicId(this.topicId)
            .execute(this.client);

        return {
            topicId: topicInfo.topicId.toString(),
            topicMemo: topicInfo.topicMemo,
            runningHash: topicInfo.runningHash,
            sequenceNumber: topicInfo.sequenceNumber.toString(),
            expirationTime: topicInfo.expirationTime.toString(),
            adminKey: topicInfo.adminKey,
            submitKey: topicInfo.submitKey
        };
    }
}

module.exports = HCSBlindAuction;

// Example usage:
/*
async function main() {
    const auctionService = new HCSBlindAuction();
    
    try {
        // Create the auction topic
        const topicId = await auctionService.createAuctionTopic();
        console.log("Created topic:", topicId);
        
        // Example of submitting a sealed bid
        // In practice, the sealed bid hash would be computed as keccak256(abi.encodePacked(bidAmount, salt))
        const sealedBidHash = "0x1234567890abcdef"; // This would be a real hash
        await auctionService.submitSealedBid(
            sealedBidHash,
            "0.0.12345", // bidder address
            1, // group ID
            1  // month
        );
        
        // Example of revealing a bid
        await auctionService.revealBid(
            1000000000000000000, // 1 HBAR in tinybars
            "random_salt_value",
            "0.0.12345", // bidder address
            1, // group ID
            1  // month
        );
    } catch (error) {
        console.error("Error:", error);
    }
}

if (require.main === module) {
    main();
}
*/