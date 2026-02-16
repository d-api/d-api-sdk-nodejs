export interface ListRow {
  rowId: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title?: string;
  rows: ListRow[];
}

export interface SendListOptions {
  sessionId: string;
  to: string;
  title?: string;
  description: string;
  buttonText: string;
  footerText?: string;
  sections: ListSection[];
  mentionAll?: boolean;
}

export type CarouselButtonType = 'quick_reply' | 'url' | 'call';

export interface CarouselButton {
  type: CarouselButtonType;
  title: string;
  id?: string;
  url?: string;
  phone?: string;
}

export interface CarouselCardHeader {
  type: string;
  title?: string;
  media: string;
}

export interface CarouselCard {
  header?: CarouselCardHeader;
  body: string;
  footer?: string;
  buttons?: CarouselButton[];
}

export interface SendCarouselOptions {
  sessionId: string;
  to: string;
  cards: CarouselCard[];
  mentionAll?: boolean;
}

export type TemplateButtonType = 'url' | 'call';

export interface TemplateButton {
  type: TemplateButtonType;
  title: string;
  url?: string;
  phone?: string;
}

export interface SendTemplateOptions {
  sessionId: string;
  to: string;
  title?: string;
  content: string;
  footer?: string;
  buttons: TemplateButton[];
  imageUrl?: string;
  mentionAll?: boolean;
}

export type NativeFlowButtonType = 'quick_reply' | 'url' | 'call' | 'copy';

export interface NativeFlowButton {
  type: NativeFlowButtonType;
  title: string;
  id?: string;
  url?: string;
  phone?: string;
  copy_code?: string;
}

export interface SendNativeFlowOptions {
  sessionId: string;
  to: string;
  title: string;
  body: string;
  footer?: string;
  buttons: NativeFlowButton[];
  imageUrl?: string;
  mentionAll?: boolean;
}

export interface SendPixOptions {
  sessionId: string;
  to: string;
  content: string;
  footer?: string;
  pixKey: string;
  pixAmount?: number;
  pixMessage?: string;
  mentionAll?: boolean;
}

export interface InteractiveResponse {
  success?: boolean;
  message?: string;
  messageId?: string;
  timestamp?: number;
}
