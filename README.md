# simple-notify

Express REST API for AWS SNS Mobile Push notifications with PostgreSQL database support.

## Features

- **Node.js 20+** with Express.js
- **AWS SNS Mobile Push** using `@aws-sdk/client-sns`
- **PostgreSQL Database** via `pg` for device management
- Support for **iOS (APNS)** and **Android (FCM/GCM)** push notifications
- **Rate Limiting** to protect against abuse (100 requests per 15 minutes per IP)
- No authentication layer (as specified)
- Simple REST API with two endpoints

## Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- AWS Account with SNS configured

**OR**

- Docker and Docker Compose (for Docker installation)

## Installation

### Option 1: Docker Installation (Recommended)

The easiest way to run simple-notify is using Docker. This will automatically set up both the application and PostgreSQL database.

1. Clone the repository:
```bash
git clone https://github.com/jlippold/simple-notify.git
cd simple-notify
```

2. Create a `.env` file with your AWS credentials:
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your AWS credentials
# You can leave the database settings as-is for Docker
```

Required environment variables for Docker:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_SNS_PLATFORM_APPLICATION_ARN_IOS=arn:aws:sns:us-east-1:123456789012:app/APNS/YourIOSApp
AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID=arn:aws:sns:us-east-1:123456789012:app/GCM/YourAndroidApp
```

3. Start the application with Docker Compose:
```bash
docker compose up -d
```

This will:
- Start PostgreSQL on port **5333** (mapped from container port 5432)
- Start the Express server on port **3333**
- Automatically create the database
- Set up networking between containers

4. Run database migrations:
```bash
docker compose exec app npm run migrate
```

5. Check if the application is running:
```bash
curl http://localhost:3333/health
```

**Port Configuration:**
- The Express server runs on port **3333** (accessible at `http://localhost:3333`)
- PostgreSQL runs on port **5333** (accessible at `localhost:5333`)

**Docker Management Commands:**

```bash
# View logs
docker compose logs -f

# View app logs only
docker compose logs -f app

# Stop the application
docker compose down

# Stop and remove all data (including database)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build
```

### Option 2: Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/jlippold/simple-notify.git
cd simple-notify
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Environment Configuration

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_SNS_PLATFORM_APPLICATION_ARN_IOS=arn:aws:sns:us-east-1:123456789012:app/APNS/YourIOSApp
AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID=arn:aws:sns:us-east-1:123456789012:app/GCM/YourAndroidApp

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=simple_notify
DB_USER=postgres
DB_PASSWORD=postgres
```

## AWS SNS Configuration

### Step 1: Create IAM User

1. Go to **AWS IAM Console** → **Users** → **Add users**
2. Create a user with programmatic access
3. Attach the following policy (or create a custom policy):
   - `AmazonSNSFullAccess`
4. Save the **Access Key ID** and **Secret Access Key**

### Step 2: Configure Platform Applications for iOS (APNS)

1. Go to **AWS SNS Console** → **Mobile** → **Push notifications**
2. Click **Create platform application**
3. Configure for iOS:
   - **Application name**: YourIOSApp
   - **Push notification platform**: Apple iOS (APNS)
   - **Authentication**: Choose either:
     - **Token-based authentication** (recommended):
       - Upload your `.p8` key file from Apple Developer
       - Enter Team ID and Key ID
     - **Certificate-based authentication**:
       - Upload your `.p12` certificate
       - Enter the certificate password
   - **Application mode**: Development or Production
4. Click **Create platform application**
5. Copy the **ARN** and add it to your `.env` as `AWS_SNS_PLATFORM_APPLICATION_ARN_IOS`

#### Getting iOS Certificates:

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. For **Token-based** (recommended):
   - Go to **Keys** → Create a new key
   - Enable **Apple Push Notifications service (APNs)**
   - Download the `.p8` file (only available once)
   - Note your Team ID and Key ID
4. For **Certificate-based**:
   - Create a **Push Notification Certificate** for your app
   - Download and open in Keychain Access
   - Export as `.p12` with a password

### Step 3: Configure Platform Applications for Android (FCM)

1. Go to **AWS SNS Console** → **Mobile** → **Push notifications**
2. Click **Create platform application**
3. Configure for Android:
   - **Application name**: YourAndroidApp
   - **Push notification platform**: Google Firebase Cloud Messaging (FCM)
   - **Server key**: Your FCM server key
4. Click **Create platform application**
5. Copy the **ARN** and add it to your `.env` as `AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID`

#### Getting FCM Server Key:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select or create your project
3. Go to **Project Settings** → **Cloud Messaging**
4. Copy the **Server key** (or create a new one if using Firebase Cloud Messaging API V1)

### Step 4: Set Up IAM Permissions

Ensure your IAM user has the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:CreatePlatformEndpoint",
        "sns:DeleteEndpoint",
        "sns:GetEndpointAttributes",
        "sns:SetEndpointAttributes",
        "sns:Publish"
      ],
      "Resource": "*"
    }
  ]
}
```

## Database Schema

The application uses a single `devices` table:

```sql
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    device_token VARCHAR(500) NOT NULL UNIQUE,
    platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
    endpoint_arn VARCHAR(500),
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### 1. Register Device - `POST /push/register`

Register a device token for push notifications.

**Request Body:**
```json
{
  "device_token": "device-token-from-client",
  "platform": "ios",
  "user_id": "optional-user-identifier"
}
```

**Parameters:**
- `device_token` (required): The device token from iOS (APNS) or Android (FCM)
- `platform` (required): Either "ios" or "android"
- `user_id` (optional): An identifier to associate the device with a user

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "device": {
    "id": 1,
    "device_token": "device-token-from-client",
    "platform": "ios",
    "endpoint_arn": "arn:aws:sns:us-east-1:123456789012:endpoint/...",
    "user_id": "optional-user-identifier",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**cURL Example:**

```bash
# Register iOS device
curl -X POST http://localhost:3000/push/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "740f4707bebcf74f9b7c25d48e3358945f6aa01da5ddb387462c7eaf61bb78ad",
    "platform": "ios",
    "user_id": "user123"
  }'

# Register Android device
curl -X POST http://localhost:3000/push/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "fGvY8xK3Rq2:APA91bF...",
    "platform": "android",
    "user_id": "user123"
  }'
```

### 2. Send Push Notification - `POST /push/send`

Send a push notification to a device or all devices associated with a user.

**Request Body:**
```json
{
  "device_token": "device-token-from-client",
  "message": "Your notification message",
  "title": "Notification Title",
  "data": {
    "key": "value"
  }
}
```

**OR**

```json
{
  "user_id": "user123",
  "message": "Your notification message",
  "title": "Notification Title",
  "data": {
    "key": "value"
  }
}
```

**Parameters:**
- `device_token` OR `user_id` (required): Target device token or user ID
- `message` (required): The notification message body
- `title` (optional): The notification title (Android only in notification)
- `data` (optional): Additional data to send with the notification

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sent 1 notification(s)",
  "notifications": [
    {
      "device_token": "device-token-from-client",
      "platform": "ios",
      "message_id": "1234567890",
      "success": true
    }
  ]
}
```

**cURL Examples:**

```bash
# Send to specific device by token
curl -X POST http://localhost:3000/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "740f4707bebcf74f9b7c25d48e3358945f6aa01da5ddb387462c7eaf61bb78ad",
    "message": "Hello from simple-notify!",
    "title": "Welcome",
    "data": {
      "action": "open_screen",
      "screen": "home"
    }
  }'

# Send to all devices of a user
curl -X POST http://localhost:3000/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "message": "You have a new message!",
    "title": "New Message"
  }'

# Send with custom data
curl -X POST http://localhost:3000/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "message": "Your order has shipped",
    "title": "Order Update",
    "data": {
      "order_id": "12345",
      "tracking_number": "1Z999AA1234567890"
    }
  }'
```

### 3. Health Check - `GET /health`

Check if the server is running.

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**cURL Example:**
```bash
curl http://localhost:3000/health
```

## Testing

### Manual Testing

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Check health:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Register a test device:**
   ```bash
   curl -X POST http://localhost:3000/push/register \
     -H "Content-Type: application/json" \
     -d '{
       "device_token": "test-device-token",
       "platform": "ios",
       "user_id": "test-user"
     }'
   ```

4. **Send a test notification:**
   ```bash
   curl -X POST http://localhost:3000/push/send \
     -H "Content-Type: application/json" \
     -d '{
       "device_token": "test-device-token",
       "message": "Test notification"
     }'
   ```

### Getting Real Device Tokens

**iOS (Swift):**
```swift
import UIKit
import UserNotifications

func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
        if granted {
            DispatchQueue.main.async {
                application.registerForRemoteNotifications()
            }
        }
    }
    return true
}

func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    print("Device Token: \(token)")
    // Send this token to your server's /push/register endpoint
}
```

**Android (Kotlin):**
```kotlin
import com.google.firebase.messaging.FirebaseMessaging

FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        Log.d("FCM", "Token: $token")
        // Send this token to your server's /push/register endpoint
    }
}
```

## Troubleshooting

### Common Issues

1. **"Platform application not found"**
   - Ensure your AWS SNS Platform Application ARNs are correct in `.env`
   - Verify the platform applications exist in your AWS SNS console

2. **"Invalid device token"**
   - iOS tokens must be valid APNS tokens
   - Android tokens must be valid FCM tokens
   - Ensure tokens are from the correct environment (dev vs prod)

3. **Database connection errors**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure the database exists

4. **AWS credentials error**
   - Verify AWS credentials in `.env`
   - Ensure IAM user has SNS permissions
   - Check AWS region is correct

## Project Structure

```
simple-notify/
├── src/
│   ├── db/
│   │   └── pool.js              # PostgreSQL connection pool
│   ├── migrations/
│   │   ├── 001_create_devices_table.sql  # Database schema
│   │   └── run.js               # Migration runner
│   ├── routes/
│   │   └── push.js              # Push notification routes
│   ├── services/
│   │   └── snsService.js        # AWS SNS service wrapper
│   └── index.js                 # Express server
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## License

MIT