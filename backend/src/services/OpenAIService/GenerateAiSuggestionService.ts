import axios from "axios";

import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Setting from "../../models/Setting";
import User from "../../models/User";

interface Request {
  ticketId: string | number;
  companyId: number;
  userId: number;
}

const getSettingValue = async (
  key: string,
  companyId: number
): Promise<string> => {
  const setting = await Setting.findOne({
    where: {
      key,
      companyId
    }
  });

  return setting?.value || "";
};

const sanitizeLimit = (value: string): number => {
  const parsed = Number(value);

  if (!parsed || Number.isNaN(parsed)) return 15;
  if (parsed < 5) return 5;
  if (parsed > 50) return 50;

  return parsed;
};

const GenerateAiSuggestionService = async ({
  ticketId,
  companyId,
  userId
}: Request): Promise<string> => {
  const user = await User.findOne({
    where: {
      id: userId,
      companyId
    }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  if (user.allowAiSuggestions !== "enabled") {
    throw new AppError("Usuário sem permissão para usar sugestões de IA.", 403);
  }

  const enableAiSuggestions = await getSettingValue(
    "enableAiSuggestions",
    companyId
  );

  if (
    enableAiSuggestions !== "enabled" &&
    enableAiSuggestions !== "true"
  ) {
    throw new AppError("As sugestões de IA estão desativadas.", 403);
  }

  const aiApiKey = await getSettingValue("aiApiKey", companyId);

  if (!aiApiKey) {
    throw new AppError("Chave da IA não configurada.", 400);
  }

  const ticketIdString = String(ticketId);

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      ticketIdString
    );

  const ticketWhere = isUuid
    ? {
        uuid: ticketIdString,
        companyId
      }
    : {
        id: Number(ticketIdString),
        companyId
      };

  const ticket = await Ticket.findOne({
    where: ticketWhere
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const model =
    (await getSettingValue("aiSuggestionModel", companyId)) ||
    "gpt-4o-mini";

  const prompt =
    (await getSettingValue("aiSuggestionPrompt", companyId)) ||
    `Você é um atendente profissional de WhatsApp.

Sua função é sugerir respostas curtas, naturais, educadas e úteis com base no histórico da conversa.

REGRAS IMPORTANTES:
- Nunca invente informações.
- Nunca prometa algo que não esteja confirmado.
- Nunca diga que é uma IA.
- Use linguagem humana e natural.
- Responda no mesmo idioma do cliente.
- Evite respostas muito longas.
- Se o cliente estiver irritado, responda com empatia.
- Se faltar informação, peça mais detalhes.
- Não utilize markdown.
- Não use emojis excessivos.
- Retorne apenas a mensagem sugerida.`;

  const limit = sanitizeLimit(
    await getSettingValue("aiSuggestionMessagesLimit", companyId)
  );

  const messages = await Message.findAll({
    where: {
      ticketId: ticket.id,
      companyId,
      isDeleted: false,
      isPrivate: false
    },
    order: [["createdAt", "DESC"]],
    limit
  });

  if (!messages.length) {
    throw new AppError("Não há mensagens suficientes para sugerir resposta.", 400);
  }

  const conversation = messages
    .reverse()
    .map(message => {
      const author = message.fromMe ? "ATENDENTE" : "CLIENTE";
      const body = String(message.body || "").trim();

      if (body) {
        return `${author}: ${body}`;
      }

      if (message.mediaType) {
        return `${author}: [mensagem de ${message.mediaType}]`;
      }

      return `${author}: [mensagem sem texto]`;
    })
    .join("\n");

  try {
    const { data } = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content: prompt
          },
          {
            role: "user",
            content: `Histórico da conversa:\n${conversation}\n\nSugira a próxima resposta do atendente.`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${aiApiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const suggestion = data?.choices?.[0]?.message?.content?.trim();

    if (!suggestion) {
      throw new AppError("A IA não retornou sugestão.", 500);
    }

    return suggestion;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Erro ao gerar sugestão com IA.", 500);
  }
};

export default GenerateAiSuggestionService;