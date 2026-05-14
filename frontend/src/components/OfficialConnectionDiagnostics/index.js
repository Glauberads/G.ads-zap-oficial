import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  root: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    padding: 16,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.03)" : "#fff",
  },
  title: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: theme.palette.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: "0.8rem",
    color: theme.palette.text.secondary,
    marginBottom: 12,
    lineHeight: 1.4,
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 16,
  },
  field: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
    },
  },
  chipOk: {
    fontWeight: 700,
    color: "#2e7d32",
  },
  chipWarn: {
    fontWeight: 700,
    color: "#ed6c02",
  },
  chipError: {
    fontWeight: 700,
    color: "#d32f2f",
  },
}));

const OfficialConnectionDiagnostics = ({
  whatsappId,
  embeddedStatus,
  initialNumber = "",
}) => {
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [sendingTextTest, setSendingTextTest] = useState(false);
  const [sendingTemplateTest, setSendingTemplateTest] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [testNumber, setTestNumber] = useState(initialNumber || "");
  const [textBody, setTextBody] = useState(
    "Teste de ativação da API Oficial realizado com sucesso."
  );
  const [templateName, setTemplateName] = useState("");
  const [templateLanguageCode, setTemplateLanguageCode] = useState("pt_BR");
  const [templateParametersRaw, setTemplateParametersRaw] = useState("");
  const [diagnostics, setDiagnostics] = useState(null);

  const getStatusClass = (status) => {
    if (status === "healthy") return classes.chipOk;
    if (status === "warning") return classes.chipWarn;
    return classes.chipError;
  };

  const parseTemplateParameters = () => {
    return String(templateParametersRaw || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const loadDiagnostics = useCallback(async () => {
    if (!whatsappId) return;

    try {
      setLoading(true);
      const { data } = await api.get(
        `/embedded-signup/diagnostics/${whatsappId}`
      );
      setDiagnostics(data?.data || null);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [whatsappId]);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

  const handleReconnect = async () => {
    if (!whatsappId) return;

    try {
      setReconnecting(true);
      await api.post(`/embedded-signup/reconnect/${whatsappId}`);
      toast.success("Reconexão solicitada com sucesso.");
      await loadDiagnostics();
    } catch (err) {
      toastError(err);
    } finally {
      setReconnecting(false);
    }
  };

  const handleTestSendText = async () => {
    if (!whatsappId) return;

    if (!testNumber) {
      toast.error("Informe o número para teste.");
      return;
    }

    try {
      setSendingTextTest(true);
      await api.post(`/embedded-signup/test-send/${whatsappId}`, {
        number: testNumber,
        body: textBody,
      });
      toast.success("Mensagem de teste em texto enviada com sucesso.");
      await loadDiagnostics();
    } catch (err) {
      toastError(err);
    } finally {
      setSendingTextTest(false);
    }
  };

  const handleTestSendTemplate = async () => {
    if (!whatsappId) return;

    if (!testNumber) {
      toast.error("Informe o número para teste.");
      return;
    }

    if (!templateName) {
      toast.error("Informe o nome do template.");
      return;
    }

    try {
      setSendingTemplateTest(true);
      await api.post(`/embedded-signup/test-send/${whatsappId}`, {
        number: testNumber,
        templateName,
        templateLanguageCode,
        templateParameters: parseTemplateParameters(),
      });
      toast.success("Mensagem de teste com template enviada com sucesso.");
      await loadDiagnostics();
    } catch (err) {
      toastError(err);
    } finally {
      setSendingTemplateTest(false);
    }
  };

  return (
    <Paper elevation={0} className={classes.root}>
      <Typography className={classes.title}>
        Diagnóstico da API Oficial
      </Typography>

      <Typography className={classes.subtitle}>
        Valida token, número, inscrição do app, webhook e permite reconectar ou
        testar envio.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Status do onboarding"
            variant="outlined"
            fullWidth
            value={embeddedStatus || "none"}
            InputProps={{ readOnly: true }}
            className={classes.field}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Saúde da conexão"
            variant="outlined"
            fullWidth
            value={diagnostics?.status || "unknown"}
            InputProps={{ readOnly: true }}
            className={classes.field}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Número para teste"
            variant="outlined"
            fullWidth
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            className={classes.field}
          />
        </Grid>
      </Grid>

      <Divider style={{ marginTop: 16, marginBottom: 16 }} />

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={2}>
          <CircularProgress size={26} />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                Token presente:{" "}
                <span
                  className={
                    diagnostics?.checks?.hasToken
                      ? classes.chipOk
                      : classes.chipError
                  }
                >
                  {diagnostics?.checks?.hasToken ? "Sim" : "Não"}
                </span>
              </Typography>
              <Typography variant="body2">
                Token válido:{" "}
                <span
                  className={
                    diagnostics?.checks?.tokenValid
                      ? classes.chipOk
                      : classes.chipError
                  }
                >
                  {diagnostics?.checks?.tokenValid ? "Sim" : "Não"}
                </span>
              </Typography>
              <Typography variant="body2">
                WABA ID presente:{" "}
                <span
                  className={
                    diagnostics?.checks?.hasWabaId
                      ? classes.chipOk
                      : classes.chipError
                  }
                >
                  {diagnostics?.checks?.hasWabaId ? "Sim" : "Não"}
                </span>
              </Typography>
              <Typography variant="body2">
                Phone Number ID presente:{" "}
                <span
                  className={
                    diagnostics?.checks?.hasPhoneNumberId
                      ? classes.chipOk
                      : classes.chipError
                  }
                >
                  {diagnostics?.checks?.hasPhoneNumberId ? "Sim" : "Não"}
                </span>
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                Número acessível:{" "}
                <span
                  className={
                    diagnostics?.checks?.phoneReachable
                      ? classes.chipOk
                      : classes.chipError
                  }
                >
                  {diagnostics?.checks?.phoneReachable ? "Sim" : "Não"}
                </span>
              </Typography>
              <Typography variant="body2">
                Webhook assinado:{" "}
                <span
                  className={
                    diagnostics?.checks?.webhookSubscribed
                      ? classes.chipOk
                      : classes.chipError
                  }
                >
                  {diagnostics?.checks?.webhookSubscribed ? "Sim" : "Não"}
                </span>
              </Typography>
              <Typography variant="body2">
                App inscrito na WABA:{" "}
                <span
                  className={
                    diagnostics?.checks?.appSubscribed
                      ? classes.chipOk
                      : classes.chipError
                  }
                >
                  {diagnostics?.checks?.appSubscribed ? "Sim" : "Não"}
                </span>
              </Typography>
              <Typography variant="body2">
                Status final:{" "}
                <span className={getStatusClass(diagnostics?.status)}>
                  {diagnostics?.status || "unknown"}
                </span>
              </Typography>
            </Grid>
          </Grid>

          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              {diagnostics?.details || "Sem detalhes de diagnóstico."}
            </Typography>

            {!!diagnostics?.lastError && (
              <Typography
                variant="body2"
                style={{ color: "#d32f2f", marginTop: 8 }}
              >
                Último erro: {diagnostics.lastError}
              </Typography>
            )}
          </Box>
        </>
      )}

      <Divider style={{ marginTop: 16, marginBottom: 16 }} />

      <Typography className={classes.title}>
        Teste em texto
      </Typography>
      <Typography className={classes.subtitle}>
        Use quando houver janela aberta de 24 horas com o contato.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Mensagem de teste"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            className={classes.field}
          />
        </Grid>
      </Grid>

      <div className={classes.actions}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleTestSendText}
          disabled={
            loading || reconnecting || sendingTextTest || sendingTemplateTest
          }
        >
          {sendingTextTest ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            "Enviar teste em texto"
          )}
        </Button>
      </div>

      <Divider style={{ marginTop: 16, marginBottom: 16 }} />

      <Typography className={classes.title}>
        Teste com template
      </Typography>
      <Typography className={classes.subtitle}>
        Use fora da janela de 24 horas, com template aprovado na Meta.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Nome do template"
            variant="outlined"
            fullWidth
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Ex.: teste_onboarding"
            className={classes.field}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Idioma do template"
            variant="outlined"
            fullWidth
            value={templateLanguageCode}
            onChange={(e) => setTemplateLanguageCode(e.target.value)}
            placeholder="Ex.: pt_BR"
            className={classes.field}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Parâmetros do template"
            variant="outlined"
            fullWidth
            value={templateParametersRaw}
            onChange={(e) => setTemplateParametersRaw(e.target.value)}
            placeholder="Ex.: João, Multizap, 15/04/2026"
            helperText="Separe os parâmetros por vírgula, na mesma ordem do template."
            className={classes.field}
          />
        </Grid>
      </Grid>

      <div className={classes.actions}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleTestSendTemplate}
          disabled={
            loading || reconnecting || sendingTextTest || sendingTemplateTest
          }
        >
          {sendingTemplateTest ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            "Enviar teste com template"
          )}
        </Button>

        <Button
          variant="outlined"
          color="primary"
          onClick={loadDiagnostics}
          disabled={
            loading || reconnecting || sendingTextTest || sendingTemplateTest
          }
        >
          Atualizar diagnóstico
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={handleReconnect}
          disabled={
            loading || reconnecting || sendingTextTest || sendingTemplateTest
          }
        >
          {reconnecting ? (
            <CircularProgress size={18} />
          ) : (
            "Reconectar"
          )}
        </Button>
      </div>
    </Paper>
  );
};

export default OfficialConnectionDiagnostics;