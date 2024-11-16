export interface CozeMessage {
  role: 'user' | 'assistant';
  content: string;
  content_type: 'text';
}

export interface CozeUsage {
  token_count: number;
  output_count: number;
  input_count: number;
}

export interface CozeResponse {
  data: {
    id: string;
    conversation_id: string;
    bot_id: string;
    created_at: number;
    completed_at: number;
    last_error: string | null;
    meta_data: Record<string, any>;
    status: 'completed' | 'failed';
    usage: CozeUsage;
  };
  code: number;
  msg: string;
}

export interface ComponentResponse {
  content: string;
  error?: string;
  usage?: CozeUsage;
  conversation_id?: string;
}

type ChatStatus =
  | 'created'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'requires_action'
  | 'canceled';

interface ChatRetrieveResponse {
  code: number;
  data: {
    bot_id: string;
    completed_at: number;
    conversation_id: string;
    created_at: number;
    id: string;
    status: ChatStatus;
    usage: CozeUsage;
  };
  msg: string;
}

interface ChatMessageResponse {
  code: number;
  data: Array<{
    bot_id: string;
    content: string;
    content_type: string;
    conversation_id: string;
    id: string;
    role: 'assistant' | 'user';
    type: 'answer' | 'verbose';
  }>;
  msg: string;
}

export class CozeService {
  private static instance: CozeService;
  private readonly baseUrl = 'https://api.coze.cn/v3/chat';
  private readonly botId = process.env.REACT_APP_COZE_BOT_ID;
  private readonly token = process.env.REACT_APP_COZE_API_KEY;

  private constructor() {}

  static getInstance(): CozeService {
    if (!CozeService.instance) {
      CozeService.instance = new CozeService();
    }
    return CozeService.instance;
  }

  private async checkStatus(
    chatId: string,
    conversationId: string
  ): Promise<ChatRetrieveResponse> {
    const response = await fetch(
      `${this.baseUrl}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private isTerminalStatus(status: ChatStatus): boolean {
    return ['completed', 'failed', 'canceled'].includes(status);
  }

  private async getMessageDetails(
    chatId: string,
    conversationId: string
  ): Promise<ChatMessageResponse> {
    const response = await fetch(
      `${this.baseUrl}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async generateComponent(
    prompt: string,
    conversation_id?: string
  ): Promise<ComponentResponse> {
    try {
      // 发送初始请求
      const response = await fetch(
        conversation_id
          ? `${this.baseUrl}?conversation_id=${conversation_id}`
          : this.baseUrl,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bot_id: this.botId,
            user_id: '123456789',
            stream: false,
            auto_save_history: true,
            additional_messages: [
              {
                role: 'user',
                content: prompt,
                content_type: 'text',
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const initialResult: CozeResponse = await response.json();

      if (initialResult.code !== 0) {
        throw new Error(initialResult.msg || 'API returned an error');
      }

      const chatId = initialResult.data.id;
      const conversationId = initialResult.data.conversation_id;

      // 轮询检查状态
      let status: ChatRetrieveResponse;
      let retryCount = 0;
      const maxRetries = 30; // 最��等待30秒

      console.log('chatId>>>>>>>', chatId);
      console.log('conversationId>>>>>>>', conversationId);

      do {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
        status = await this.checkStatus(chatId, conversationId);
        console.log('status>>>>>>>', status);
        retryCount++;

        // 处理不同状态
        switch (status.data.status) {
          case 'requires_action':
            throw new Error('Chat requires additional action');
          case 'canceled':
            throw new Error('Chat was canceled');
          case 'failed':
            throw new Error('Chat processing failed');
          case 'created':
          case 'in_progress':
            if (retryCount >= maxRetries) {
              throw new Error('Chat processing timeout');
            }
            continue;
        }
      } while (
        !this.isTerminalStatus(status.data.status) &&
        retryCount < maxRetries
      );

      if (status.data.status !== 'completed') {
        throw new Error(`Chat ended with status: ${status.data.status}`);
      }

      // 获取详细消息
      const messages = await this.getMessageDetails(chatId, conversationId);
      console.log('messages>>>>>>>', messages);
      // 找到类型为 'answer' 的响应消息
      const answerMessage = messages.data.find(
        (msg) => msg.type === 'answer' && msg.role === 'assistant'
      );

      if (!answerMessage) {
        throw new Error('No answer message found in response');
      }

      return {
        content: answerMessage.content,
        usage: status.data.usage,
        conversation_id: conversationId,
        error: undefined,
      };
    } catch (error) {
      return {
        content: '',
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const cozeService = CozeService.getInstance();
