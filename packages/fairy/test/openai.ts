/**
 * @file OpenAI の API を fetch のモックで受けるテストで使うヘルパー
 */

/** OpenAI の Responses API のレスポンス。output_text に構造化出力の JSON を入れる */
export const openaiResponse = (output: { should_reply: boolean; reply: string | null }): Response =>
  Response.json({
    id: "resp_1",
    created_at: 0,
    model: "gpt-6-luna",
    output: [
      {
        type: "message",
        role: "assistant",
        id: "msg_1",
        content: [{ type: "output_text", text: JSON.stringify(output), annotations: [] }],
      },
    ],
    usage: { input_tokens: 1, output_tokens: 1 },
  });
