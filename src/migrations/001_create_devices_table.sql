-- Create devices table to store registered device tokens
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_token VARCHAR(500) NOT NULL UNIQUE,
    platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
    endpoint_arn VARCHAR(500),
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on device_token for faster lookups
CREATE INDEX idx_devices_token ON devices(device_token);

-- Create index on user_id for user-specific queries
CREATE INDEX idx_devices_user_id ON devices(user_id);

-- Create index on platform for platform-specific queries
CREATE INDEX idx_devices_platform ON devices(platform);
