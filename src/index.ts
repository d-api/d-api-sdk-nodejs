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
} from './modules';

// Type exports
export * from './types';

// Default export for convenience
export { DApi as default } from './dapi';
