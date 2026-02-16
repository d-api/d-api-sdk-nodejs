# D-API Lib

Complete NodeJS SDK for D-API WhatsApp integration. Works on both server (Node.js) and client (browser) environments.

## Installation

```bash
npm install d-api-lib
# or
yarn add d-api-lib
# or
pnpm add d-api-lib
```

## Quick Start

```typescript
import { DApi } from 'd-api-lib';

const dapi = new DApi({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.d-api.cloud', // optional
});

// Create a session
const session = await dapi.sessions.create({
  sessionId: 'my-session',
  connectionMode: 'qr',
});

// Get QR code
const qr = await dapi.sessions.getQRCode('my-session');
console.log(qr.qrCodeImage); // base64 image

// Send a text message
await dapi.messages.sendText({
  sessionId: 'my-session',
  to: '5511999999999',
  text: 'Hello from D-API!',
});
```

## Modules

### Sessions

Manage WhatsApp sessions.

```typescript
// Create session
await dapi.sessions.create({
  sessionId: 'my-session',
  connectionMode: 'qr', // or 'pair'
  webhookUrl: 'https://example.com/webhook',
});

// List sessions
const sessions = await dapi.sessions.list();

// Get session
const session = await dapi.sessions.get('my-session');

// Get QR code
const qr = await dapi.sessions.getQRCode('my-session');

// Get pair code (for phone number pairing)
const pair = await dapi.sessions.getPairCode('my-session');

// Connect/reconnect session
await dapi.sessions.connect('my-session');

// Disconnect session
await dapi.sessions.disconnect('my-session');

// Delete session
await dapi.sessions.delete('my-session');

// Update webhook
await dapi.sessions.updateWebhook('my-session', {
  webhookUrl: 'https://new-webhook.com',
});

// Update ignore settings
await dapi.sessions.updateIgnoreSettings('my-session', {
  ignoreGroups: true,
  ignoreStatus: true,
});
```

### Messages

Send various types of messages.

```typescript
// Text message
await dapi.messages.sendText({
  sessionId: 'my-session',
  to: '5511999999999',
  text: 'Hello!',
});

// Image
await dapi.messages.sendImage({
  sessionId: 'my-session',
  to: '5511999999999',
  image: 'https://example.com/image.jpg',
  caption: 'Check this out!',
});

// Video
await dapi.messages.sendVideo({
  sessionId: 'my-session',
  to: '5511999999999',
  video: 'https://example.com/video.mp4',
  caption: 'Video caption',
  ptv: false, // video note
  gifPlayback: false,
});

// Audio / Voice note
await dapi.messages.sendAudio({
  sessionId: 'my-session',
  to: '5511999999999',
  audio: 'https://example.com/audio.mp3',
  ptt: true, // voice note
});

// Document
await dapi.messages.sendDocument({
  sessionId: 'my-session',
  to: '5511999999999',
  document: 'https://example.com/file.pdf',
  fileName: 'document.pdf',
  mimetype: 'application/pdf',
});

// Location
await dapi.messages.sendLocation({
  sessionId: 'my-session',
  to: '5511999999999',
  latitude: -23.5505,
  longitude: -46.6333,
  name: 'Sao Paulo',
  address: 'Sao Paulo, Brazil',
});

// Contact
await dapi.messages.sendContact({
  sessionId: 'my-session',
  to: '5511999999999',
  contactName: 'John Doe',
  contactPhone: '5511888888888',
});

// Poll
await dapi.messages.sendPoll({
  sessionId: 'my-session',
  to: '5511999999999',
  question: 'What is your favorite color?',
  options: ['Red', 'Blue', 'Green'],
  multipleAnswers: false,
});

// Reaction
await dapi.messages.sendReaction({
  sessionId: 'my-session',
  to: '5511999999999',
  messageId: 'BAE5C3F2E3D4',
  emoji: '👍',
});

// Album
await dapi.messages.sendAlbum({
  sessionId: 'my-session',
  to: '5511999999999',
  media: [
    { type: 'image', url: 'https://example.com/1.jpg' },
    { type: 'image', url: 'https://example.com/2.jpg' },
  ],
});

// Edit message
await dapi.messages.edit('messageId', {
  sessionId: 'my-session',
  to: '5511999999999',
  text: 'Edited message',
});
```

### Interactive Messages

Send interactive messages (lists, carousels, templates).

```typescript
// List message
await dapi.interactive.sendList({
  sessionId: 'my-session',
  to: '5511999999999',
  title: 'Menu',
  description: 'Choose an option',
  buttonText: 'Options',
  sections: [
    {
      title: 'Products',
      rows: [
        { rowId: '1', title: 'Product 1', description: 'Description 1' },
        { rowId: '2', title: 'Product 2', description: 'Description 2' },
      ],
    },
  ],
});

// Carousel
await dapi.interactive.sendCarousel({
  sessionId: 'my-session',
  to: '5511999999999',
  cards: [
    {
      header: { type: 'image', media: 'https://example.com/1.jpg' },
      body: 'Card 1 body',
      footer: 'Card 1 footer',
      buttons: [
        { type: 'quick_reply', title: 'Select', id: 'select-1' },
      ],
    },
  ],
});

// Template with CTA buttons
await dapi.interactive.sendTemplate({
  sessionId: 'my-session',
  to: '5511999999999',
  title: 'Welcome',
  content: 'Welcome to our service!',
  buttons: [
    { type: 'url', title: 'Visit site', url: 'https://example.com' },
    { type: 'call', title: 'Call us', phone: '5511999999999' },
  ],
});

// PIX payment button
await dapi.interactive.sendPix({
  sessionId: 'my-session',
  to: '5511999999999',
  content: 'Pay with PIX',
  pixKey: 'your-pix-key',
  pixAmount: 100.0,
});
```

### Groups

Manage WhatsApp groups.

```typescript
// List groups
const groups = await dapi.groups.list({
  sessionId: 'my-session',
  participants: true,
});

// Create group
await dapi.groups.create({
  sessionId: 'my-session',
  name: 'My Group',
  participants: ['5511999999999', '5511888888888'],
});

// Add participants
await dapi.groups.manageParticipants('groupId', {
  sessionId: 'my-session',
  participants: ['5511777777777'],
  action: 'add',
});

// Remove participants
await dapi.groups.manageParticipants('groupId', {
  sessionId: 'my-session',
  participants: ['5511777777777'],
  action: 'remove',
});

// Promote to admin
await dapi.groups.manageParticipants('groupId', {
  sessionId: 'my-session',
  participants: ['5511777777777'],
  action: 'promote',
});

// Set group settings
await dapi.groups.setSettings('groupId', {
  sessionId: 'my-session',
  announce: true, // only admins can send messages
  locked: true, // only admins can edit info
});

// Get invite link
const invite = await dapi.groups.getInviteLink('groupId', 'my-session');
```

### Chats

Manage chats and messages.

```typescript
// List chats
const chats = await dapi.chats.list({
  sessionId: 'my-session',
  limit: 20,
  page: 1,
});

// List messages
const messages = await dapi.chats.listMessages('chatId', {
  sessionId: 'my-session',
  limit: 50,
});

// Send typing presence
await dapi.chats.sendPresence({
  sessionId: 'my-session',
  to: '5511999999999',
  presence: 'typing',
  durationMs: 3000,
});

// Mark as read
await dapi.chats.markAsRead({
  sessionId: 'my-session',
  to: '5511999999999',
  messageIds: ['msg1', 'msg2'],
});

// Delete message
await dapi.chats.deleteMessage('messageId', {
  sessionId: 'my-session',
  to: '5511999999999',
  forEveryone: true,
});
```

### Contacts

Manage contacts and blocklist.

```typescript
// List contacts
const contacts = await dapi.contacts.list({
  sessionId: 'my-session',
});

// Check if numbers are on WhatsApp
const results = await dapi.contacts.checkNumbers({
  sessionId: 'my-session',
  numbers: ['5511999999999', '5511888888888'],
});

// Get avatar
const avatar = await dapi.contacts.getAvatar('5511999999999', {
  sessionId: 'my-session',
});

// Block contact
await dapi.contacts.updateBlocklist({
  sessionId: 'my-session',
  phone: '5511999999999',
  action: 'block',
});

// Get blocklist
const blocklist = await dapi.contacts.getBlocklist('my-session');
```

### Labels

Manage WhatsApp labels.

```typescript
// List labels
const labels = await dapi.labels.list({
  sessionId: 'my-session',
});

// Create/update label
await dapi.labels.upsert({
  sessionId: 'my-session',
  label_id: 1,
  name: 'VIP',
  color: 0,
});

// Attach label to chat
await dapi.labels.attach({
  sessionId: 'my-session',
  phone: '5511999999999',
  label_id: 1,
  labeled: true,
});
```

### Media

Download media files.

```typescript
// Download media (returns S3 URL or base64)
const media = await dapi.media.download({
  sessionId: 'my-session',
  media_key: 'media-key-from-webhook',
  mimetype: 'image/jpeg',
  url: 'whatsapp-media-url',
  base64: false, // set true for base64 response
});
```

### History

Sync message history.

```typescript
// Full history sync
await dapi.history.fullSync({
  sessionId: 'my-session',
});

// On-demand sync
await dapi.history.onDemandSync({
  sessionId: 'my-session',
  count: 100, // number of messages
});
```

### Integrations

Manage S3 and RabbitMQ integrations.

```typescript
// Create S3 integration
await dapi.integrations.create({
  integrationName: 'My S3',
  integrationType: 'S3',
  config: {
    endpoint: 'https://s3.amazonaws.com',
    region: 'us-east-1',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
    bucket: 'my-bucket',
  },
});

// Test S3 connection
await dapi.integrations.testS3Connection({
  endpoint: 'https://s3.amazonaws.com',
  region: 'us-east-1',
  accessKeyId: 'access-key',
  secretAccessKey: 'secret-key',
  bucket: 'my-bucket',
});

// Test RabbitMQ connection
await dapi.integrations.testRabbitMQConnection({
  host: 'localhost',
  port: 5672,
  username: 'guest',
  password: 'guest',
});
```

## Configuration

```typescript
const dapi = new DApi({
  apiKey: 'your-api-key', // required
  baseUrl: 'https://api.d-api.cloud', // optional, default
  timeout: 30000, // optional, request timeout in ms
});
```

## Error Handling

```typescript
import { DApi, DApiError } from 'd-api-lib';

try {
  await dapi.messages.sendText({ ... });
} catch (error) {
  if ((error as DApiError).status === 404) {
    console.error('Session not found');
  } else {
    console.error('Error:', error);
  }
}
```

## TypeScript Support

This library is written in TypeScript and includes full type definitions for all methods and responses.

```typescript
import type {
  Session,
  SendTextOptions,
  MessageResponse,
  Group,
  Chat,
  Contact,
} from 'd-api-lib';
```

## Browser Support

This library works in both Node.js and browser environments. It uses the native `fetch` API which is available in modern browsers and Node.js 18+.

## License

MIT
