const { SNSClient, CreatePlatformEndpointCommand, PublishCommand } = require('@aws-sdk/client-sns');
require('dotenv').config();

class SNSService {
  constructor() {
    this.client = new SNSClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    this.platformApplicationArns = {
      ios: process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS,
      android: process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID,
    };
  }

  async registerDevice(deviceToken, platform) {
    const platformApplicationArn = this.platformApplicationArns[platform];
    
    if (!platformApplicationArn) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    try {
      const command = new CreatePlatformEndpointCommand({
        PlatformApplicationArn: platformApplicationArn,
        Token: deviceToken,
      });

      const response = await this.client.send(command);
      return response.EndpointArn;
    } catch (error) {
      console.error('Error registering device with SNS:', error);
      throw error;
    }
  }

  async sendPushNotification(endpointArn, message, data = {}) {
    try {
      // Format the message for both iOS and Android
      const payload = {
        default: message,
        APNS: JSON.stringify({
          aps: {
            alert: message,
            sound: 'default',
          },
          ...data,
        }),
        APNS_SANDBOX: JSON.stringify({
          aps: {
            alert: message,
            sound: 'default',
          },
          ...data,
        }),
        GCM: JSON.stringify({
          notification: {
            title: data.title || 'Notification',
            body: message,
            sound: 'default',
          },
          data: data,
        }),
      };

      const command = new PublishCommand({
        TargetArn: endpointArn,
        Message: JSON.stringify(payload),
        MessageStructure: 'json',
      });

      const response = await this.client.send(command);
      return response.MessageId;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }
}

module.exports = new SNSService();
