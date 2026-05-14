import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";
import Queue from "../../models/Queue";
import { zonedTimeToUtc } from "date-fns-tz";

interface Data {
  name: string;
  status: string;
  confirmation: boolean;
  scheduledAt: string;
  companyId: number;
  contactListId?: number;
  message1?: string;
  message2?: string;
  message3?: string;
  message4?: string;
  message5?: string;
  confirmationMessage1?: string;
  confirmationMessage2?: string;
  confirmationMessage3?: string;
  confirmationMessage4?: string;
  confirmationMessage5?: string;
  userId?: number | string;
  queueId?: number | string;
  statusTicket: string;
  openTicket: string;
  whatsappId?: number | null;
  isRecurring?: boolean;
  recurrenceType?: string;
  recurrenceInterval?: number;
  recurrenceDaysOfWeek?: string;
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: string;
  maxExecutions?: number;
  templateId?: number;
  // Novos campos de email
  campaignType?: string;
  emailSubject?: string;
  emailHtml?: string;
  emailFromName?: string;
  emailFromAddress?: string;
  emailTotal?: number;
  emailSent?: number;
  emailFailed?: number;
  emailOpened?: number;
  emailClicked?: number;
  emailBounced?: number;
  emailUnsubscribed?: number;
  emailRatePerMinute?: number;
  emailProvider?: string;
}

const CreateService = async (data: Data): Promise<Campaign> => {
  const { name } = data;

  const ticketnoteSchema = Yup.object().shape({
    name: Yup.string()
      .min(3, "ERR_CAMPAIGN_INVALID_NAME")
      .required("ERR_CAMPAIGN_REQUIRED")
  });

  try {
    await ticketnoteSchema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const createData: any = { ...data };

  if (createData.scheduledAt != null && createData.scheduledAt !== "") {
    createData.status = "PROGRAMADA";

    try {
      let userTimezone = "America/Sao_Paulo";

      if (createData.userId) {
        const user = await User.findByPk(Number(createData.userId), {
          attributes: ["id", "timezone"]
        });

        if (user?.timezone) {
          userTimezone = user.timezone;
        }
      }

      createData.scheduledAt = zonedTimeToUtc(
        createData.scheduledAt,
        userTimezone
      );
    } catch (error) {
      createData.scheduledAt = new Date(createData.scheduledAt);
    }
  }

  // Inicializar campos de email com valores padrão se for campanha de email
  if (createData.campaignType === "email") {
    createData.emailTotal = createData.emailTotal || 0;
    createData.emailSent = createData.emailSent || 0;
    createData.emailFailed = createData.emailFailed || 0;
    createData.emailOpened = createData.emailOpened || 0;
    createData.emailClicked = createData.emailClicked || 0;
    createData.emailBounced = createData.emailBounced || 0;
    createData.emailUnsubscribed = createData.emailUnsubscribed || 0;
    createData.emailRatePerMinute = createData.emailRatePerMinute || 5;
    createData.emailProvider = createData.emailProvider || "sendgrid";
  }

  const record = await Campaign.create(createData);

  await record.reload({
    include: [
      { model: ContactList },
      { model: Whatsapp, attributes: ["id", "name", "color"] },
      { model: User, attributes: ["id", "name"] },
      { model: Queue, attributes: ["id", "name", "color"] },
    ]
  });

  return record;
};

export default CreateService;