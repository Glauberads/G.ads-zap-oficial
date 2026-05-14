import AppError from "../../errors/AppError";
import EmailSetting from "../../models/EmailSetting";
import SendGridProvider from "./providers/SendGridProvider";

interface SendData {
  to: string;
  subject: string;
  html: string;
}

class EmailMarketingService {
  async send(
    setting: EmailSetting,
    data: SendData
  ): Promise<void> {

    // Segurança extra:
    // impede qualquer tentativa de usar SMTP manualmente
    if (setting.provider !== "sendgrid") {
      throw new AppError(
        "Somente SendGrid é permitido para Email Marketing.",
        403
      );
    }

    return new SendGridProvider().send(setting, data);
  }
}

export default new EmailMarketingService();