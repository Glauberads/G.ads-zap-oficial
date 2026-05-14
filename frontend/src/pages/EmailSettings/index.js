import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Button,
  Grid,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  Box
} from "@material-ui/core";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import toastError from "../../errors/toastError";
import {
  getEmailSettings,
  updateEmailSettings
} from "../../services/emailSettings";

const EmailSettings = () => {
  const [settings, setSettings] = useState({
    provider: "sendgrid",
    sendgridApiKey: "",
    fromAddress: "",
    fromName: "",
    dailyLimit: 200,
    ratePerMinute: 5,
    isActive: false
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getEmailSettings();

        setSettings(prev => ({
          ...prev,
          ...data,
          provider: "sendgrid"
        }));
      } catch (err) {
        toastError(err);
      }
    };

    loadSettings();
  }, []);

  const handleChange = field => event => {
    const value =
      field === "isActive"
        ? event.target.checked
        : event.target.value;

    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        provider: "sendgrid",
        sendgridApiKey: settings.sendgridApiKey,
        fromAddress: settings.fromAddress,
        fromName: settings.fromName,
        dailyLimit: settings.dailyLimit ? Number(settings.dailyLimit) : 200,
        ratePerMinute: settings.ratePerMinute
          ? Number(settings.ratePerMinute)
          : 5,
        isActive: Boolean(settings.isActive)
      };

      const data = await updateEmailSettings(payload);

      setSettings(prev => ({
        ...prev,
        ...data,
        provider: "sendgrid"
      }));

      toast.success("Configurações de email salvas com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const renderProviderHelp = () => {
    return (
      <Paper
        variant="outlined"
        style={{
          marginTop: 8,
          padding: 18,
          borderLeft: "5px solid #10b981",
          background: "#f0fdf4"
        }}
      >
        <Box display="flex" alignItems="center" mb={1}>
          <InfoOutlinedIcon style={{ color: "#10b981", marginRight: 8 }} />
          <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
            Passo a passo para configurar SendGrid
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="textSecondary"
          style={{ marginBottom: 12 }}
        >
          O envio de email marketing será feito exclusivamente pela API oficial
          do SendGrid.
        </Typography>

        <Box component="ol" style={{ margin: 0, paddingLeft: 22, lineHeight: 1.9 }}>
          <li>Acesse sua conta no SendGrid.</li>
          <li>Vá em <strong>Settings → API Keys</strong>.</li>
          <li>Clique em <strong>Create API Key</strong>.</li>
          <li>Use permissão <strong>Full Access</strong> ou permissão de envio de email.</li>
          <li>Copie a API Key gerada e cole no campo <strong>SendGrid API Key</strong>.</li>
          <li>Crie e valide uma identidade de remetente no SendGrid.</li>
          <li>Use um email do domínio validado, por exemplo: <strong>contato@seudominio.com</strong>.</li>
        </Box>

        <Box
          mt={2}
          display="flex"
          alignItems="center"
          style={{ gap: 12, flexWrap: "wrap" }}
        >
          <Button
            variant="outlined"
            color="primary"
            size="small"
            href="https://app.sendgrid.com/settings/api_keys"
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon />}
          >
            Abrir API Keys do SendGrid
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="small"
            href="https://app.sendgrid.com/settings/sender_auth"
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon />}
          >
            Validar Remetente
          </Button>
        </Box>

        <Box mt={2} style={{ color: "#047857", fontSize: 13 }}>
          <CheckCircleOutlineIcon
            style={{
              fontSize: 16,
              verticalAlign: "middle",
              marginRight: 4
            }}
          />
          Recomendado: configure SPF/DKIM no domínio para melhorar a entrega e
          reduzir chance de spam.
        </Box>
      </Paper>
    );
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>Email Marketing</Title>
      </MainHeader>

      <Paper
        style={{
          padding: 24,
          maxHeight: "calc(100vh - 140px)",
          overflowY: "auto",
          overflowX: "hidden"
        }}
      >
        <Typography variant="subtitle1" style={{ marginBottom: 8, fontWeight: 600 }}>
          Configuração do Provedor
        </Typography>

        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
          O envio será feito somente via SendGrid.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              label="SendGrid API Key"
              variant="outlined"
              fullWidth
              type="password"
              value={settings.sendgridApiKey || ""}
              onChange={handleChange("sendgridApiKey")}
              placeholder="SG.xxxxxxxxxxxxxxxxx"
              helperText="Crie a API Key em Settings > API Keys no painel da SendGrid."
            />
          </Grid>

          <Grid item xs={12}>
            {renderProviderHelp()}
          </Grid>

          <Grid item xs={12}>
            <Box my={1}>
              <Divider />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Email do Remetente"
              variant="outlined"
              fullWidth
              value={settings.fromAddress || ""}
              onChange={handleChange("fromAddress")}
              placeholder="contato@seudominio.com"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Nome do Remetente"
              variant="outlined"
              fullWidth
              value={settings.fromName || ""}
              onChange={handleChange("fromName")}
              placeholder="Multizap"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Limite diário"
              type="number"
              variant="outlined"
              fullWidth
              value={settings.dailyLimit || 200}
              onChange={handleChange("dailyLimit")}
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Emails por minuto"
              type="number"
              variant="outlined"
              fullWidth
              value={settings.ratePerMinute || 5}
              onChange={handleChange("ratePerMinute")}
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(settings.isActive)}
                  onChange={handleChange("isActive")}
                  color="primary"
                />
              }
              label="Ativar envio de email marketing"
            />
          </Grid>

          <Grid item xs={12} style={{ textAlign: "right" }}>
            <Button variant="contained" color="primary" onClick={handleSave}>
              Salvar Configurações
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </MainContainer>
  );
};

export default EmailSettings;