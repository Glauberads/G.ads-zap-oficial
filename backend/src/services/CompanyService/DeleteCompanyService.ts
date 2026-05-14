import { Op } from "sequelize";
import sequelize from "../../database";
import Company from "../../models/Company";
import Queue from "../../models/Queue";
import Prompt from "../../models/Prompt";
import AppError from "../../errors/AppError";

const DeleteCompanyService = async (id: string): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const company = await Company.findOne({
      where: { id },
      transaction
    });

    if (!company) {
      throw new AppError("ERR_NO_COMPANY_FOUND", 404);
    }

    const queues = await Queue.findAll({
      where: { companyId: id },
      attributes: ["id"],
      transaction
    });

    const queueIds = queues.map(queue => queue.id);

    if (queueIds.length > 0) {
      await Prompt.destroy({
        where: {
          [Op.or]: [
            { companyId: id },
            { queueId: { [Op.in]: queueIds } }
          ]
        },
        transaction
      });

      await Queue.destroy({
        where: {
          id: {
            [Op.in]: queueIds
          }
        },
        transaction
      });
    } else {
      await Prompt.destroy({
        where: { companyId: id },
        transaction
      });
    }

    await company.destroy({ transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export default DeleteCompanyService;