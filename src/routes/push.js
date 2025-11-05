const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const snsService = require('../services/snsService');

// POST /push/register - Register a device for push notifications
router.post('/register', async (req, res) => {
  try {
    const { device_token, platform, user_id } = req.body;

    // Validate input
    if (!device_token || !platform) {
      return res.status(400).json({
        error: 'device_token and platform are required',
      });
    }

    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({
        error: 'platform must be either "ios" or "android"',
      });
    }

    // Register device with AWS SNS
    const endpointArn = await snsService.registerDevice(device_token, platform);

    // Store or update device in database
    const query = `
      INSERT INTO devices (device_token, platform, endpoint_arn, user_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (device_token)
      DO UPDATE SET
        platform = EXCLUDED.platform,
        endpoint_arn = EXCLUDED.endpoint_arn,
        user_id = EXCLUDED.user_id,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await pool.query(query, [
      device_token,
      platform,
      endpointArn,
      user_id || null,
    ]);

    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      device: result.rows[0],
    });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({
      error: 'Failed to register device',
      details: error.message,
    });
  }
});

// POST /push/send - Send a push notification
router.post('/send', async (req, res) => {
  try {
    const { device_token, user_id, message, title, data } = req.body;

    // Validate input
    if (!message) {
      return res.status(400).json({
        error: 'message is required',
      });
    }

    if (!device_token && !user_id) {
      return res.status(400).json({
        error: 'Either device_token or user_id is required',
      });
    }

    // Find devices to send to
    let query;
    let params;

    if (device_token) {
      query = 'SELECT * FROM devices WHERE device_token = $1';
      params = [device_token];
    } else {
      query = 'SELECT * FROM devices WHERE user_id = $1';
      params = [user_id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No devices found',
      });
    }

    // Send notifications to all found devices
    const notifications = [];
    const errors = [];

    for (const device of result.rows) {
      try {
        const messageId = await snsService.sendPushNotification(
          device.endpoint_arn,
          message,
          { title, ...data }
        );
        notifications.push({
          device_token: device.device_token,
          platform: device.platform,
          message_id: messageId,
          success: true,
        });
      } catch (error) {
        errors.push({
          device_token: device.device_token,
          platform: device.platform,
          error: error.message,
          success: false,
        });
      }
    }

    const response = {
      success: errors.length === 0,
      message: `Sent ${notifications.length} notification(s)`,
      notifications,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({
      error: 'Failed to send push notification',
      details: error.message,
    });
  }
});

module.exports = router;
