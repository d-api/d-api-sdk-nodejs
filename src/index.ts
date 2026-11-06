// Main SDK export
export { DApi, type DApiConfig } from './dapi';

// Client exports (for advanced use cases)
export { DApiClient, type DApiClientConfig, type RequestOptions, type DApiError } from './client';

// Module exports (for direct access if needed)
export {
  SessionsModule,
  MessagesModule,
  InteractiveModule,
  GroupsModule,
  ChatsModule,
  ContactsModule,
  LabelsModule,
  MediaModule,
  HistoryModule,
  IntegrationsModule,
  VoiceModule,
  SmsModule,
  AccountWebhooksModule,
  CallsModule,
} from './modules';

// Live call media (WebSocket or WebRTC)
export { LiveCall, type LiveCallEvents } from './calls/live-call';
export { IncomingCalls, type IncomingCall, type IncomingCallsEvents } from './calls/incoming';

// Type exports
export * from './types';

// Default export for convenience
export { DApi as default } from './dapi';

// Browser-only Embedded Signup helper (also available via the d-api-sdk/connect entry point)
export { DApiConnect } from './connect';
export type { DApiConnectConfig, StartOptions, StartResult } from './connect';
