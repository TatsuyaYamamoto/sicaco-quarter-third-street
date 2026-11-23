/**
 * @file プラットフォームの受け口と Agent の間でやり取りする型
 *
 * Agent はプラットフォームに依存しないので、受け口は入力を Agent 向けに解釈した値（プラットフォームに依存しない部分）にして渡す。
 * プラットフォームの値をそのまま持つもの（ID や元のイベント）は、Agent は保存や照合にだけ使い、中身は解釈しない。
 * 返信の送り方に関わる情報（LINE の replyToken など）は、受け口だけが持ち、Agent には渡さない。
 */

/** 会話に投稿された 1 件のメッセージのうち、プラットフォームに依存しない部分 */
interface IncomingMessageBase {
  conversation: {
    type: "group" | "dm";
  };
  message:
    | {
        type: "text";
        text: string;
      }
    | {
        type: "sticker";
        /** スタンプに設定されたキーワード。設定されていなければ空 */
        keywords: string[];
      };
  /** 送信日時（ISO 8601） */
  sentAt: string;
}

/** LINE で会話に投稿された 1 件のメッセージ */
interface LineIncomingMessage extends IncomingMessageBase {
  platform: "line";
  conversation: IncomingMessageBase["conversation"] & {
    /** グループなら groupId、DM なら相手の userId */
    platformConversationId: string;
  };
  sender: {
    /** userId */
    platformUserId: string;
  };
  message: IncomingMessageBase["message"] & {
    platformMessageId: string;
    /** 元の Webhook のイベント */
    payloadJson: string;
  };
}

/** 会話に投稿された 1 件のメッセージ。プラットフォームが増えたら union にする */
export type IncomingMessage = LineIncomingMessage;

/** Agent が返す返信の内容。返信しないときは、Agent は Reply を返さない（undefined を返す） */
export type Reply =
  /** テキストで返信する */
  { type: "text"; text: string };
