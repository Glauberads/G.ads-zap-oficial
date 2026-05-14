import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import ImportContactsService from "../services/WbotServices/ImportContactsService";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";
import { getWbot } from "../libs/wbot";
import Baileys from "../models/Baileys";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { whatsappId } = req.body;

  res.status(200).json({ message: "Importação iniciada", status: "started" });

  ImportContactsService(companyId, whatsappId ? Number(whatsappId) : undefined).catch(err => {
    if (err.message && err.message.includes("sincroniz")) {
      logger.warn(`ImportContacts background: Contatos não sincronizados para company ${companyId}`);
    } else {
      logger.error(`ImportContacts background: Erro para company ${companyId}: ${err.message}`);
    }
  });

  return res;
};

export const syncStatus = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  try {
    const contactsInDb = await Contact.count({ where: { companyId } });

    const companyWhatsapps = await Whatsapp.findAll({
      where: { companyId },
      order: [["id", "ASC"]]
    });

    const connectedBaileys = companyWhatsapps.find(
      (w: any) =>
        w.status === "CONNECTED" &&
        (!w.channel || w.channel === "whatsapp")
    );

    let selectedWhatsapp: any = null;

    try {
      const defaultWhatsapp = await GetDefaultWhatsApp(companyId);

      if (
        defaultWhatsapp &&
        defaultWhatsapp.status === "CONNECTED" &&
        (!defaultWhatsapp.channel || defaultWhatsapp.channel === "whatsapp")
      ) {
        selectedWhatsapp = defaultWhatsapp;
      } else if (connectedBaileys) {
        selectedWhatsapp = connectedBaileys;
      } else if (
        defaultWhatsapp &&
        defaultWhatsapp.channel &&
        defaultWhatsapp.channel !== "whatsapp"
      ) {
        return res.status(200).json({
          synced: false,
          status: "not_connected",
          message:
            "A conexão padrão está na API Oficial. Para importar contatos do telefone, conecte uma sessão WhatsApp Web/Baileys.",
          contactsInDb,
          contactsInSync: 0,
          source: "none"
        });
      }
    } catch {
      if (connectedBaileys) {
        selectedWhatsapp = connectedBaileys;
      }
    }

    if (!selectedWhatsapp) {
      return res.status(200).json({
        synced: false,
        status: "not_connected",
        message: "Nenhuma conexão WhatsApp Web/Baileys conectada encontrada.",
        contactsInDb,
        contactsInSync: 0,
        source: "none"
      });
    }

    let wbotConnected = false;
    try {
      getWbot(selectedWhatsapp.id);
      wbotConnected = true;
    } catch {
      wbotConnected = false;
    }

    const publicFolder = path.resolve(__dirname, "..", "..", "public");
    const companyFolder = path.join(publicFolder, `company${companyId}`);
    const scopedContactJsonPath = path.join(
      companyFolder,
      `contactJson-wpp${selectedWhatsapp.id}.txt`
    );

    let contactsInFile = 0;

    if (fs.existsSync(scopedContactJsonPath)) {
      try {
        const content = fs.readFileSync(scopedContactJsonPath, "utf-8").trim();
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) contactsInFile = parsed.length;
      } catch {}
    }

    let contactsInBaileys = 0;
    try {
      const baileysData = await Baileys.findOne({
        where: { whatsappId: selectedWhatsapp.id }
      });

      if (baileysData && baileysData.contacts) {
        const contacts =
          typeof baileysData.contacts === "string"
            ? JSON.parse(baileysData.contacts)
            : baileysData.contacts;

        if (Array.isArray(contacts)) contactsInBaileys = contacts.length;
      }
    } catch {}

    const contactsInSync = Math.max(contactsInFile, contactsInBaileys);
    const MIN_SYNC_CONTACTS = 2;
    const synced = contactsInSync >= MIN_SYNC_CONTACTS;

    if (!wbotConnected && selectedWhatsapp.status !== "CONNECTED" && contactsInSync === 0) {
      return res.status(200).json({
        synced: false,
        status: "not_connected",
        message: "A conexão WhatsApp Web/Baileys não está ativa no momento.",
        contactsInDb,
        contactsInSync: 0,
        source: "none"
      });
    }

    return res.status(200).json({
      synced,
      status: synced ? "ready" : "syncing",
      message: synced
        ? `Sincronização concluída. ${contactsInSync} contatos disponíveis para importação.`
        : `Aguardando sincronização dos contatos. Contatos sincronizados até agora: ${contactsInSync}.`,
      contactsInDb,
      contactsInSync,
      source: contactsInFile > 0 ? "file" : contactsInBaileys > 0 ? "baileys" : "none",
      whatsappId: selectedWhatsapp.id,
      whatsappName: selectedWhatsapp.name || null
    });
  } catch (err) {
    logger.error(`SyncStatus: Erro ao verificar status para company ${companyId}: ${err.message}`);
    return res.status(500).json({
      error: true,
      status: "not_connected",
      message: "Erro ao verificar status da sincronização."
    });
  }
};