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
 * @title HCS Reputation Service
 * @notice Handles reputation scoring via Hedera Consensus Service
 * @dev Uses HCS for immutable, timestamped reputation events
 */

class HCSReputationService {
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
        this.reputationScores = new Map(); // In-memory storage for demo purposes
    }

    /**
     * Creates a new HCS topic for reputation events
     * @returns {Promise<string>} The topic ID of the created topic
     */
    async createReputationTopic() {
        console.log("Creating HCS topic for reputation events...");
        
        // Create the topic
        const topicCreateTx = new TopicCreateTransaction()
            .setTopicMemo("CircleFi Reputation Events Topic")
            .setAdminKey(this.operatorKey) // Only admin can delete/update topic
            .setSubmitKey(this.operatorKey) // Only accounts with this key can submit messages
            .freezeWith(this.client);

        // Sign and execute the transaction
        const topicCreateTxSign = await topicCreateTx.sign(this.operatorKey);
        const topicCreateSubmit = await topicCreateTxSign.execute(this.client);

        // Get the receipt to retrieve the topic ID
        const topicCreateRx = await topicCreateSubmit.getReceipt(this.client);
        this.topicId = topicCreateRx.topicId;

        console.log(`✅ HCS reputation topic created with ID: ${this.topicId.toString()}`);
        
        return this.topicId.toString();
    }

    /**
     * Records a payment event to the reputation topic
     * @param {string} memberAddress - Address of the member making the payment
     * @param {number} groupId - ID of the chit group
     * @param {number} amount - Payment amount
     * @param {string} eventType - Type of event (payment_made, payment_missed, etc.)
     * @returns {Promise<string>} Transaction ID of the submitted message
     */
    async recordPaymentEvent(memberAddress, groupId, amount, eventType = "payment_made") {
        if (!this.topicId) {
            throw new Error("Reputation topic not created yet. Call createReputationTopic() first.");
        }

        console.log(`Recording ${eventType} event for member: ${memberAddress}, group: ${groupId}, amount: ${amount}`);
        
        // Prepare the payment event message
        const paymentEvent = {
            type: "payment_event",
            eventType: eventType,
            memberAddress: memberAddress,
            groupId: groupId,
            amount: amount,
            timestamp: Math.floor(Date.now() / 1000) // Unix timestamp
        };

        // Convert to JSON string
        const messageString = JSON.stringify(paymentEvent);
        
        // Submit the message to the topic
        const messageTx = new TopicMessageSubmitTransaction()
            .setTopicId(this.topicId)
            .setMessage(messageString)
            .freezeWith(this.client);

        const messageTxSign = await messageTx.sign(this.operatorKey);
        const messageTxSubmit = await messageTxSign.execute(this.client);

        console.log(`✅ Payment event recorded to topic: ${this.topicId.toString()}`);
        
        return messageTxSubmit.transactionId.toString();
    }

    /**
     * Updates reputation score based on an event
     * @param {string} memberAddress - Address of the member
     * @param {number} scoreChange - Change in reputation score (+ for positive, - for negative)
     * @param {string} reason - Reason for the score change
     * @returns {Promise<string>} Transaction ID of the submitted message
     */
    async updateReputation(memberAddress, scoreChange, reason = "") {
        if (!this.topicId) {
            throw new Error("Reputation topic not created yet. Call createReputationTopic() first.");
        }

        // Get current score
        let currentScore = this.reputationScores.get(memberAddress) || 50; // Default to 50
        let newScore = currentScore + scoreChange;
        
        // Ensure score stays within bounds [0, 100]
        newScore = Math.max(0, Math.min(100, newScore));
        
        // Update in-memory storage
        this.reputationScores.set(memberAddress, newScore);

        console.log(`Updating reputation for ${memberAddress}: ${currentScore} -> ${newScore} (${reason})`);
        
        // Prepare the reputation update message
        const reputationUpdate = {
            type: "reputation_update",
            memberAddress: memberAddress,
            oldScore: currentScore,
            newScore: newScore,
            scoreChange: scoreChange,
            reason: reason,
            timestamp: Math.floor(Date.now() / 1000) // Unix timestamp
        };

        // Convert to JSON string
        const messageString = JSON.stringify(reputationUpdate);
        
        // Submit the message to the topic
        const messageTx = new TopicMessageSubmitTransaction()
            .setTopicId(this.topicId)
            .setMessage(messageString)
            .freezeWith(this.client);

        const messageTxSign = await messageTx.sign(this.operatorKey);
        const messageTxSubmit = await messageTxSign.execute(this.client);

        console.log(`✅ Reputation update recorded to topic: ${this.topicId.toString()}`);
        
        return messageTxSubmit.transactionId.toString();
    }

    /**
     * Gets the current reputation score for a member
     * @param {string} memberAddress - Address of the member
     * @returns {number} Current reputation score
     */
    getReputationScore(memberAddress) {
        return this.reputationScores.get(memberAddress) || 50; // Default to 50
    }

    /**
     * Checks if a member meets the minimum reputation threshold
     * @param {string} memberAddress - Address of the member
     * @param {number} minScore - Minimum required score
     * @returns {boolean} Whether the member meets the threshold
     */
    meetsMinimumReputation(memberAddress, minScore = 50) {
        const score = this.getReputationScore(memberAddress);
        return score >= minScore;
    }

    /**
     * Subscribe to the reputation topic to listen for events
     * @param {function} callback - Function to call when a message is received
     */
    async subscribeToReputation(callback) {
        if (!this.topicId) {
            throw new Error("Reputation topic not created yet. Call createReputationTopic() first.");
        }

        console.log(`Subscribing to reputation topic: ${this.topicId.toString()}`);
        
        // Subscribe to the topic
        new TopicMessageQuery()
            .setTopicId(this.topicId)
            .subscribe(this.client, null, (message) => {
                const messageAsString = Buffer.from(message.contents, "utf8").toString();
                console.log(`${message.consensusTimestamp.toDate()} Received: ${messageAsString}`);
                
                try {
                    const parsedMessage = JSON.parse(messageAsString);
                    
                    // Process reputation-related messages
                    if (parsedMessage.type === "reputation_update") {
                        this.reputationScores.set(parsedMessage.memberAddress, parsedMessage.newScore);
                    }
                    
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
            throw new Error("Reputation topic not created yet. Call createReputationTopic() first.");
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

module.exports = HCSReputationService;

// Example usage:
/*
async function main() {
    const reputationService = new HCSReputationService();
    
    try {
        // Create the reputation topic
        const topicId = await reputationService.createReputationTopic();
        console.log("Created reputation topic:", topicId);
        
        // Record a payment event
        await reputationService.recordPaymentEvent(
            "0.0.12345", // member address
            1, // group ID
            1000000000000000000, // 1 HBAR in tinybars
            "payment_made"
        );
        
        // Update reputation
        await reputationService.updateReputation(
            "0.0.12345", // member address
            5, // increase by 5 points
            "Made timely payment"
        );
        
        console.log("Current reputation score:", reputationService.getReputationScore("0.0.12345"));
    } catch (error) {
        console.error("Error:", error);
    }
}

if (require.main === module) {
    main();
}
*/