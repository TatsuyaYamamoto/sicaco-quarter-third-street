/**
 * @file レイヤー（Platform Adapter・MessageResolver・Agent）の間でやり取りする型
 *
 * @see docs/design.md の「3 つのレイヤーに分ける」
 */

/** `Person` の `Role`。オーナーが設定する */
export const ROLES = ["master", "assistant2"] as const;

export type Role = (typeof ROLES)[number];

/** メッセージの中身。`Platform` に依存しない */
export type MessageContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "sticker";
      /** スタンプに設定されたキーワード。設定されていなければ空 */
      keywords: string[];
    };

/** `PlatformMessage` のうち、`Platform` に依存しない部分 */
interface PlatformMessageBase {
  conversation: {
    type: "group" | "dm";
  };
  message: MessageContent;
  /** 送信日時（ISO 8601） */
  sentAt: string;
}

/** LINE で会話に投稿された 1 件のメッセージ */
interface LinePlatformMessage extends PlatformMessageBase {
  platform: "line";
  conversation: PlatformMessageBase["conversation"] & {
    /** グループなら groupId、DM なら相手の userId */
    platformConversationId: string;
  };
  sender: {
    /** userId */
    platformUserId: string;
  };
  message: PlatformMessageBase["message"] & {
    platformMessageId: string;
    /** 元の Webhook のイベント */
    payloadJson: string;
  };
}

/**
 * Platform Adapter が MessageResolver に渡すメッセージ。`Platform` に依存しない形にそろえるが、中身の ID は `Platform` のもの
 *
 * 返信の送り方に関わる情報（LINE の replyToken など）は、Platform Adapter だけが持ち、ここには入れない。
 * `Platform` が増えたら union にする。
 */
export type PlatformMessage = LinePlatformMessage;

/** MessageResolver が Agent に渡すメッセージ。`Account`・`Person`・会話の場を解決し、保存したもの */
export interface ResolvedMessage {
  conversation: {
    id: string;
    type: "group" | "dm";
  };
  sender: {
    accountId: string;
    personId: string;
    /** `Role` を持たない `Person` は null */
    role: Role | null;
  };
  message: MessageContent & {
    id: string;
  };
  /** 送信日時（ISO 8601） */
  sentAt: string;
}

/** Agent が返す返信の内容。返信しないときは返さない（undefined） */
export interface Reply {
  type: "text";
  text: string;
}
