import { Request, Response } from "express";
import AppError from "../errors/AppError";
import CompleteEmbeddedSignupService from "../services/WhatsAppOficial/EmbeddedSignupServices/CompleteEmbeddedSignupService";
import OfficialConnectionHealthcheckService from "../services/WhatsAppOficial/EmbeddedSignupServices/OfficialConnectionHealthcheckService";
import SendOfficialOnboardingTestService from "../services/WhatsAppOficial/EmbeddedSignupServices/SendOfficialOnboardingTestService";
import GetEmbeddedSignupConfigService from "../services/WhatsAppOficial/EmbeddedSignupServices/GetEmbeddedSignupConfigService";
import ListOfficialOnboardingLogsService from "../services/WhatsAppOficial/EmbeddedSignupServices/ListOfficialOnboardingLogsService";
import Whatsapp from "../models/Whatsapp";

class EmbeddedSignupController {
  public async start(req: Request, res: Response): Promise<Response> {
    const companyId = Number((req as any).user?.companyId);

    if (!companyId) {
      throw new AppError("Empresa não identificada.", 401);
    }

    const mode = String(req.body.mode || "manual");

    const config = await GetEmbeddedSignupConfigService({
      companyId
    });

    return res.status(200).json({
      success: true,
      companyId,
      mode,
      appId: config.appId,
      configId: config.configId,
      apiVersion: config.apiVersion,
      requireBusinessManagement: config.requireBusinessManagement
    });
  }

  public async complete(req: Request, res: Response): Promise<Response> {
    const companyId = Number((req as any).user?.companyId);

    if (!companyId) {
      throw new AppError("Empresa não identificada.", 401);
    }

    const {
      code,
      wabaId,
      phoneNumberId,
      mode,
      name,
      number,
      testNumber
    } = req.body;

    if (!code) {
      throw new AppError("O code retornado pelo Embedded Signup é obrigatório.");
    }

    if (!wabaId) {
      throw new AppError("O wabaId retornado pelo Embedded Signup é obrigatório.");
    }

    if (!phoneNumberId) {
      throw new AppError("O phoneNumberId retornado pelo Embedded Signup é obrigatório.");
    }

    const result = await CompleteEmbeddedSignupService({
      companyId,
      code,
      wabaId,
      phoneNumberId,
      mode,
      name,
      number,
      testNumber
    });

    return res.status(200).json({
      success: true,
      message: "Onboarding da API Oficial concluído com sucesso.",
      data: result
    });
  }

  public async status(req: Request, res: Response): Promise<Response> {
    const companyId = Number((req as any).user?.companyId);
    const { whatsappId } = req.params;

    if (!companyId) {
      throw new AppError("Empresa não identificada.", 401);
    }

    const whatsapp = await Whatsapp.findOne({
      where: {
        id: Number(whatsappId),
        companyId
      }
    });

    if (!whatsapp) {
      throw new AppError("Conexão não encontrada.", 404);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: whatsapp.id,
        name: whatsapp.name,
        status: whatsapp.status,
        channel: whatsapp.channel,
        phone_number_id: whatsapp.phone_number_id,
        waba_id: whatsapp.waba_id,
        business_id: whatsapp.business_id,
        phone_number: whatsapp.phone_number,
        verified_name: (whatsapp as any).verified_name,
        officialOnboardingMode: (whatsapp as any).officialOnboardingMode,
        embeddedSignupStatus: (whatsapp as any).embeddedSignupStatus,
        embeddedSignupFinishedAt: (whatsapp as any).embeddedSignupFinishedAt,
        webhookSubscribed: (whatsapp as any).webhookSubscribed,
        webhookSubscribedAt: (whatsapp as any).webhookSubscribedAt,
        webhookLastCheckAt: (whatsapp as any).webhookLastCheckAt,
        officialHealthStatus: (whatsapp as any).officialHealthStatus,
        officialHealthDetails: (whatsapp as any).officialHealthDetails,
        officialLastError: (whatsapp as any).officialLastError
      }
    });
  }

  public async diagnostics(req: Request, res: Response): Promise<Response> {
    const companyId = Number((req as any).user?.companyId);
    const { whatsappId } = req.params;

    if (!companyId) {
      throw new AppError("Empresa não identificada.", 401);
    }

    const diagnostics = await OfficialConnectionHealthcheckService({
      whatsappId: Number(whatsappId),
      companyId,
      persist: true
    });

    return res.status(200).json({
      success: true,
      data: diagnostics
    });
  }

  public async logs(req: Request, res: Response): Promise<Response> {
    const companyId = Number((req as any).user?.companyId);
    const { whatsappId } = req.params;
    const limit = Number(req.query.limit || 100);

    if (!companyId) {
      throw new AppError("Empresa não identificada.", 401);
    }

    const logs = await ListOfficialOnboardingLogsService({
      companyId,
      whatsappId: Number(whatsappId),
      limit
    });

    return res.status(200).json({
      success: true,
      data: logs
    });
  }

  public async testSend(req: Request, res: Response): Promise<Response> {
    const companyId = Number((req as any).user?.companyId);
    const { whatsappId } = req.params;
    const {
      number,
      body,
      templateName,
      templateLanguageCode,
      templateParameters
    } = req.body;

    if (!companyId) {
      throw new AppError("Empresa não identificada.", 401);
    }

    if (!number) {
      throw new AppError("Informe o número para teste.");
    }

    const result = await SendOfficialOnboardingTestService({
      whatsappId: Number(whatsappId),
      companyId,
      number,
      body,
      templateName,
      templateLanguageCode,
      templateParameters
    });

    return res.status(200).json({
      success: true,
      message: "Mensagem de teste enviada com sucesso.",
      data: result
    });
  }

  public async reconnect(req: Request, res: Response): Promise<Response> {
    const companyId = Number((req as any).user?.companyId);
    const { whatsappId } = req.params;

    if (!companyId) {
      throw new AppError("Empresa não identificada.", 401);
    }

    const whatsapp = await Whatsapp.findOne({
      where: {
        id: Number(whatsappId),
        companyId
      }
    });

    if (!whatsapp) {
      throw new AppError("Conexão não encontrada.", 404);
    }

    (whatsapp as any).webhookSubscribed = false;
    (whatsapp as any).webhookSubscribedAt = null;
    (whatsapp as any).webhookLastCheckAt = new Date();
    (whatsapp as any).officialHealthStatus = "reconnecting";
    (whatsapp as any).officialHealthDetails =
      "Reconexão solicitada manualmente pelo usuário.";
    await whatsapp.save();

    return res.status(200).json({
      success: true,
      message: "Reconexão sinalizada com sucesso.",
      data: {
        id: whatsapp.id,
        officialHealthStatus: (whatsapp as any).officialHealthStatus,
        webhookSubscribed: (whatsapp as any).webhookSubscribed
      }
    });
  }
}

export default new EmbeddedSignupController();