import api from "./api";

export const getEmailSettings = async () => {
  const { data } = await api.get("/email-settings");
  return data;
};

export const updateEmailSettings = async values => {
  const { data } = await api.put("/email-settings", values);
  return data;
};