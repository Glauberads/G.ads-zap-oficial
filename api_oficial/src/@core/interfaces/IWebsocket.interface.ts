export interface IReceivedWhatsppOficial {
  token: string;
  fromNumber: string;
  nameContact: string;
  companyId: number;
  message: IMessageReceived;
}

export interface IReceivedWhatsppOficialRead {
  messageId: string;
  companyId: number;
  token: string;
}

export interface IMessageLocationReceived {
  latitude: number;
  longitude: number;
  name?: string | null;
  address?: string | null;
  url?: string | null;
}

export interface IMessageReceived {
  type:
    | "text"
    | "image"
    | "audio"
    | "document"
    | "video"
    | "location"
    | "contacts"
    | "order"
    | "interactive"
    | "referral"
    | "sticker";
  timestamp: number;
  idMessage: string;
  text?: string;
  file?: string;
  mimeType?: string;
  idFile?: string;
  quoteMessageId?: string;
  fileUrl?: string;
  fileSize?: number;
  location?: IMessageLocationReceived;
  fileName?: string | null;
  filePath?: string | null;
  fileExtension?: string | null;
  isAnimatedSticker?: boolean;
  mediaType?: string | null;
  referral?: {
    sourceId: string | null;
    sourceUrl: string | null;
    sourceType: string | null;
    headline: string | null;
    body: string | null;
    imageUrl: string | null;
    mediaType: string | null;
    ctwaClid: string | null;
  } | null;
}