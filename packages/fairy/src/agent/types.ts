/**
 * @file プラットフォームの受け口と Agent の間でやり取りする型。Agent はプラットフォームに依存しないので、ここにはプラットフォーム固有の情報（LINE の replyToken など）を入れない
 */

/** 会話に投稿された 1 件のメッセージ */
export type IncomingMessage = {
  platform: "line";
  conversation: {
    /** LINE のグループなら groupId、DM なら相手の userId */
    platformConversationId: string;
    type: "group" | "dm";
  };
  sender: {
    platformUserId: string;
  };
  message: {
    platformMessageId: string;
    type: "text" | "sticker";
    /** 本文。スタンプはキーワードを入れる（キーワードがなければ null） */
    text: string | null;
    /** 元のイベント */
    payloadJson: string;
  };
  /** 送信日時（ISO 8601） */
  sentAt: string;
};

/** Agent が返す返信の内容。null は「返信なし」 */
export type Reply = { text: string } | null;
