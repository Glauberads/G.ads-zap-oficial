import { Request, Response } from "express";
import * as Yup from "yup";

import EmailSetting from "../models/EmailSetting";
import AppError from "../errors/AppError";

const maskSensitiveFields = (setting: EmailSetting) => {
  const safeSetting: any = setting.toJSON();

  if (safeSetting.sendgridApiKey) {
    safeSetting.sendgridApiKey = "********";
  }

  if (safeSetting.smtpPass) {
    safeSetting.smtpPass = "********";
  }

  if (safeSetting.sesSecretKey) {
    safeSetting.sesSecretKey = "********";
  }

  return safeSetting;
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  let setting = await EmailSetting.findOne({
    where: { companyId }
  });

  if (!setting) {
    setting = await EmailSetting.create({
      companyId,
      provider: "sendgrid",
      dailyLimit: 200,
      ratePerMinute: 5,
      isActive: false,
      smtpSecure: false
    });
  }

  return res.status(200).json(maskSensitiveFields(setting));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    provider: Yup.string().oneOf(["sendgrid", "smtp"]).required(),

    sendgridApiKey: Yup.string().nullable(),

    smtpHost: Yup.string().nullable(),
    smtpPort: Yup.number().nullable(),
    smtpUser: Yup.string().nullable(),
    smtpPass: Yup.string().nullable(),
    smtpSecure: Yup.boolean().nullable(),

    fromAddress: Yup.string().email("Email do remetente inválido").nullable(),
    fromName: Yup.string().nullable(),

    dailyLimit: Yup.number().min(1).required(),
    ratePerMinute: Yup.number().min(1).required(),
    isActive: Yup.boolean().required()
  });

  await schema.validate(req.body).catch(err => {
    throw new AppError(err.message);
  });

  const current = await EmailSetting.findOne({
    where: { companyId }
  });

  const data: any = { ...req.body };

  if (data.sendgridApiKey === "********") {
    delete data.sendgridApiKey;
  }

  if (data.smtpPass === "********") {
    delete data.smtpPass;
  }

  if (data.sesSecretKey === "********") {
    delete data.sesSecretKey;
  }

  data.smtpSecure = Boolean(data.smtpSecure);

  let setting: EmailSetting;

  if (current) {
    await current.update(data);
    setting = current;
  } else {
    setting = await EmailSetting.create({
      ...data,
      companyId
    });
  }

  return res.status(200).json(maskSensitiveFields(setting));
};