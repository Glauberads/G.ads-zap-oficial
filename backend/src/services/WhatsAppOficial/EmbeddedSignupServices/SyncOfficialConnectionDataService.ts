import axios from "axios";
import AppError from "../../../errors/AppError";
import Whatsapp from "../../../models/Whatsapp";

interface Request {
  whatsappId: number;
  companyId: number;
  accessToken?: string;
  wabaId?: string;
  phoneNumberId?: string;
}

interface Response {
  whatsappId: number;
  waba_id: string;
  business_id: string;
  phone_number_id: string;
  phone_number: string;
  verified_name: string;
  rawPhoneData: any;
  rawWabaData: any;
}

const getGraphErrorMessage = (error: any): string => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Erro ao sincronizar os dados da conexão oficial."
  );
};

const onlyDigits = (value: string): string => {
  return String(value || "").replace(/\D/g, "");
};

const SyncOfficialConnectionDataService = async ({
  whatsappId,
  companyId,
  accessToken,
  wabaId,
  phoneNumberId
}: Request): Promise<Response> => {
  const graphVersion = process.env.META_SDK_VERSION || "v25.0";

  const whatsapp = await Whatsapp.findOne({
    where: {
      id: whatsappId,
      companyId
    }
  });

  if (!whatsapp) {
    throw new AppError("Conexão não encontrada.", 404);
  }

  const resolvedAccessToken =
    accessToken || whatsapp.send_token || whatsapp.tokenMeta || "";
  const resolvedWabaId = wabaId || whatsapp.waba_id || "";
  const resolvedPhoneNumberId =
    phoneNumberId || whatsapp.phone_number_id || "";

  if (!resolvedAccessToken) {
    throw new AppError("Token da API Oficial não encontrado.");
  }

  if (!resolvedWabaId) {
    throw new AppError("WABA ID não encontrado.");
  }

  if (!resolvedPhoneNumberId) {
    throw new AppError("Phone Number ID não encontrado.");
  }

  let rawPhoneData: any = {};
  let rawWabaData: any = {};

  try {
    const phoneResponse = await axios.get(
      `https://graph.facebook.com/${graphVersion}/${resolvedPhoneNumberId}`,
      {
        params: {
          fields: "id,display_phone_number,verified_name",
          access_token: resolvedAccessToken
        },
        timeout: 30000
      }
    );

    rawPhoneData = phoneResponse.data || {};
  } catch (error: any) {
    rawPhoneData = {};
  }

  try {
    const wabaResponse = await axios.get(
      `https://graph.facebook.com/${graphVersion}/${resolvedWabaId}`,
      {
        params: {
          fields: "id,name,business_id",
          access_token: resolvedAccessToken
        },
        timeout: 30000
      }
    );

    rawWabaData = wabaResponse.data || {};
  } catch (error: any) {
    rawWabaData = {};
  }

  try {
    whatsapp.waba_id = resolvedWabaId;
    whatsapp.phone_number_id = resolvedPhoneNumberId;
    whatsapp.business_id =
      rawWabaData?.business_id ||
      whatsapp.business_id ||
      "";
    whatsapp.phone_number =
      rawPhoneData?.display_phone_number ||
      whatsapp.phone_number ||
      whatsapp.number ||
      "";
    whatsapp.verified_name =
      rawPhoneData?.verified_name ||
      whatsapp.verified_name ||
      "";
    whatsapp.number =
      onlyDigits(rawPhoneData?.display_phone_number || whatsapp.number || "");
    whatsapp.channel = whatsapp.channel || "whatsapp";
    whatsapp.provider = whatsapp.provider || "cloudapi";
    whatsapp.status = whatsapp.status || "CONNECTED";
    whatsapp.officialLastError = "";
    await whatsapp.save();

    return {
      whatsappId: whatsapp.id,
      waba_id: whatsapp.waba_id,
      business_id: whatsapp.business_id,
      phone_number_id: whatsapp.phone_number_id,
      phone_number: whatsapp.phone_number,
      verified_name: whatsapp.verified_name,
      rawPhoneData,
      rawWabaData
    };
  } catch (error: any) {
    throw new AppError(getGraphErrorMessage(error), 400);
  }
};

export default SyncOfficialConnectionDataService;