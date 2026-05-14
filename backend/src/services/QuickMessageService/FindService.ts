import { Op } from "sequelize";
import QuickMessage from "../../models/QuickMessage";
import Company from "../../models/Company";
import QuickMessageComponent from "../../models/QuickMessageComponent";

type Params = {
  companyId: string;
  userId: string;
  isOficial: string;
  whatsappId?: string;
};

const FindService = async ({ companyId, userId, isOficial, whatsappId }: Params): Promise<QuickMessage[]> => {
  const orConditions: any[] = [{ visao: true }];

  if (userId) {
    orConditions.push({ userId });
  }

  // Regra correta:
  // - isOficial === "true": retorna apenas templates oficiais
  // - caso contrário: retorna apenas respostas rápidas normais
  const isOficialFilter = isOficial === "true";

  const notes: QuickMessage[] = await QuickMessage.findAll({
    where: {
      companyId,
      [Op.or]: orConditions,
      isOficial: isOficialFilter
    },
    include: [
      {
        model: Company,
        as: "company",
        attributes: ["id", "name"]
      },
      {
        model: QuickMessageComponent,
        as: "components",
        attributes: ["id", "type", "text", "quickMessageId", "buttons", "format", "example"],
        order: [["quickMessageId", "ASC"], ["id", "ASC"]]
      }
    ]
  });

  return notes as QuickMessage[];
};

export default FindService;