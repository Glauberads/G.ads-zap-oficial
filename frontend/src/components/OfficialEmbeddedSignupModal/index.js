import React, { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import {
  launchEmbeddedSignup,
  extractEmbeddedSignupData
} from "../../services/metaEmbeddedSignup";

const useStyles = makeStyles((theme) => ({
  root: {},
  dialogContent: {
    minWidth: 720,
    paddingTop: theme.spacing(2)
  },
  paperOption: {
    padding: theme.spacing(2),
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)"
  },
  sectionTitle: {
    fontWeight: 700,
    marginBottom: theme.spacing(1)
  },
  helperText: {
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary
  },
  actionsLeft: {
    marginRight: "auto"
  },
  statusBox: {
    padding: theme.spacing(2),
    borderRadius: 12,
    background: theme.palette.background.default,
    border: "1px solid rgba(0,0,0,0.08)",
    marginTop: theme.spacing(2)
  },
  fieldSpacing: {
    marginTop: theme.spacing(2)
  },
  stepper: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    marginBottom: theme.spacing(2)
  }
}));

const steps = [
  "Tipo de conexão",
  "Conectar com Meta",
  "Concluir"
];

const OfficialEmbeddedSignupModal = ({
  open,
  onClose,
  onSave,
  initialName = "",
  initialTestNumber = ""
}) => {
  const classes = useStyles();

  const [activeStep, setActiveStep] = useState(0);
  const [mode, setMode] = useState("cloudapi_new");
  const [connectionName, setConnectionName] = useState(initialName);
  const [testNumber, setTestNumber] = useState(initialTestNumber);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [embeddedData, setEmbeddedData] = useState(null);
  const [result, setResult] = useState(null);

  const resetState = useCallback(() => {
    setActiveStep(0);
    setMode("cloudapi_new");
    setConnectionName(initialName || "");
    setTestNumber(initialTestNumber || "");
    setLoading(false);
    setMetaLoading(false);
    setConfig(null);
    setEmbeddedData(null);
    setResult(null);
  }, [initialName, initialTestNumber]);

  const handleClose = useCallback(() => {
    if (loading || metaLoading) {
      return;
    }

    resetState();

    if (onClose) {
      onClose();
    }
  }, [loading, metaLoading, onClose, resetState]);

  const modeLabel = useMemo(() => {
    return mode === "coexistence"
      ? "Usar número atual do WhatsApp Business"
      : "Novo número / conexão Cloud API";
  }, [mode]);

  const startEmbeddedSignup = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.post("/embedded-signup/start", {
        mode
      });

      const responseConfig = data?.config || data || {};
      const normalizedConfig = {
        appId: responseConfig.appId || data?.appId || "",
        configId: responseConfig.configId || data?.configId || "",
        apiVersion: responseConfig.apiVersion || data?.apiVersion || "v25.0",
        mode: responseConfig.mode || data?.mode || mode
      };

      if (!normalizedConfig.appId) {
        throw new Error("META_APP_ID não configurado no backend.");
      }

      if (!normalizedConfig.configId) {
        throw new Error("META_EMBEDDED_SIGNUP_CONFIG_ID não configurado no backend.");
      }

      setConfig(normalizedConfig);
      setLoading(false);
      setMetaLoading(true);

      const launchResult = await launchEmbeddedSignup({
        appId: normalizedConfig.appId,
        configId: normalizedConfig.configId,
        apiVersion: normalizedConfig.apiVersion,
        mode: normalizedConfig.mode
      });

      const extracted = extractEmbeddedSignupData(launchResult);

      if (!extracted.code) {
        throw new Error("A Meta não retornou o code do onboarding.");
      }

      if (!extracted.wabaId) {
        throw new Error("A Meta não retornou o WABA ID do onboarding.");
      }

      if (!extracted.phoneNumberId) {
        throw new Error("A Meta não retornou o Phone Number ID do onboarding.");
      }

      setEmbeddedData(extracted);
      setActiveStep(1);
      setMetaLoading(false);
      toast.success("Retorno da Meta capturado com sucesso.");
    } catch (error) {
      setLoading(false);
      setMetaLoading(false);
      toastError(error);
    }
  }, [mode]);

  const completeEmbeddedSignup = useCallback(async () => {
    try {
      if (!embeddedData?.code || !embeddedData?.wabaId || !embeddedData?.phoneNumberId) {
        toast.error("Dados do Embedded Signup incompletos.");
        return;
      }

      setLoading(true);

      const payload = {
        code: embeddedData.code,
        wabaId: embeddedData.wabaId,
        phoneNumberId: embeddedData.phoneNumberId,
        mode,
        name: connectionName,
        number: "",
        testNumber
      };

      const { data } = await api.post("/embedded-signup/complete", payload);

      const finalData = data?.data || data;
      setResult(finalData);
      setActiveStep(2);
      setLoading(false);

      toast.success("Onboarding da API Oficial concluído com sucesso.");

      if (onSave) {
        onSave(finalData);
      }
    } catch (error) {
      setLoading(false);
      toastError(error);
    }
  }, [embeddedData, mode, connectionName, testNumber, onSave]);

  const renderStepContent = () => {
    if (activeStep === 0) {
      return (
        <>
          <Typography className={classes.sectionTitle}>
            Escolha o tipo de conexão
          </Typography>

          <RadioGroup
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <Paper className={classes.paperOption} elevation={0}>
              <FormControlLabel
                value="cloudapi_new"
                control={<Radio color="primary" />}
                label="Novo número / conexão nova na API Oficial"
              />
              <Typography variant="body2" className={classes.helperText}>
                Ideal para ativar um número novo diretamente pelo fluxo da Meta.
              </Typography>
            </Paper>

            <div style={{ height: 12 }} />

            <Paper className={classes.paperOption} elevation={0}>
              <FormControlLabel
                value="coexistence"
                control={<Radio color="primary" />}
                label="Usar meu número atual do WhatsApp Business"
              />
              <Typography variant="body2" className={classes.helperText}>
                Fluxo de coexistência para contas elegíveis no WhatsApp Business App.
              </Typography>
            </Paper>
          </RadioGroup>

          <TextField
            className={classes.fieldSpacing}
            label="Nome da conexão"
            variant="outlined"
            fullWidth
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder="Ex.: API Oficial Comercial"
          />

          <TextField
            className={classes.fieldSpacing}
            label="Número para teste final"
            variant="outlined"
            fullWidth
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            placeholder="Ex.: 5532999999999"
          />

          <div className={classes.statusBox}>
            <Typography variant="subtitle2">
              Modo selecionado: {modeLabel}
            </Typography>
            <Typography variant="body2" className={classes.helperText}>
              Ao continuar, o sistema abrirá o onboarding da Meta para autorizar,
              vincular o número e concluir a conexão.
            </Typography>
          </div>
        </>
      );
    }

    if (activeStep === 1) {
      return (
        <>
          <Typography className={classes.sectionTitle}>
            Dados capturados do onboarding
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="WABA ID"
                variant="outlined"
                fullWidth
                value={embeddedData?.wabaId || ""}
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Phone Number ID"
                variant="outlined"
                fullWidth
                value={embeddedData?.phoneNumberId || ""}
                InputProps={{ readOnly: true }}
              />
            </Grid>
          </Grid>

          <TextField
            className={classes.fieldSpacing}
            label="Code retornado pela Meta"
            variant="outlined"
            fullWidth
            value={embeddedData?.code || ""}
            InputProps={{ readOnly: true }}
          />

          <div className={classes.statusBox}>
            <Typography variant="subtitle2">
              Próxima etapa
            </Typography>
            <Typography variant="body2" className={classes.helperText}>
              O backend vai trocar o code por token, sincronizar os dados da WABA,
              assinar webhook, validar a conexão e tentar enviar a mensagem de teste.
            </Typography>
          </div>
        </>
      );
    }

    return (
      <>
        <Typography className={classes.sectionTitle}>
          Conexão criada com sucesso
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="ID da conexão"
              variant="outlined"
              fullWidth
              value={result?.whatsappId || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Status do onboarding"
              variant="outlined"
              fullWidth
              value={result?.embeddedSignupStatus || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="WABA ID"
              variant="outlined"
              fullWidth
              value={result?.waba_id || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Phone Number ID"
              variant="outlined"
              fullWidth
              value={result?.phone_number_id || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Número exibido"
              variant="outlined"
              fullWidth
              value={result?.phone_number || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Nome verificado"
              variant="outlined"
              fullWidth
              value={result?.verified_name || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>
        </Grid>

        <Divider className={classes.fieldSpacing} />

        <div className={classes.statusBox}>
          <Typography variant="subtitle2">
            Diagnóstico
          </Typography>
          <Typography variant="body2" className={classes.helperText}>
            Status: {result?.diagnostics?.status || "N/D"}
          </Typography>
          <Typography variant="body2" className={classes.helperText}>
            Detalhes: {result?.diagnostics?.details || "Sem detalhes"}
          </Typography>
          <Typography variant="body2" className={classes.helperText}>
            Webhook assinado: {result?.webhookSubscribed ? "Sim" : "Não"}
          </Typography>
        </div>
      </>
    );
  };

  const primaryButtonLabel = useMemo(() => {
    if (metaLoading) {
      return "Aguardando Meta...";
    }

    if (loading) {
      return "Processando...";
    }

    if (activeStep === 0) {
      return "Conectar com Meta";
    }

    if (activeStep === 1) {
      return "Concluir onboarding";
    }

    return "Fechar";
  }, [activeStep, loading, metaLoading]);

  const handlePrimaryAction = async () => {
    if (activeStep === 0) {
      await startEmbeddedSignup();
      return;
    }

    if (activeStep === 1) {
      await completeEmbeddedSignup();
      return;
    }

    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="official-embedded-signup-dialog"
    >
      <DialogTitle id="official-embedded-signup-dialog">
        Onboarding self-service da API Oficial
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <Stepper activeStep={activeStep} alternativeLabel className={classes.stepper}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <div className={classes.actionsLeft}>
          {(loading || metaLoading) && <CircularProgress size={24} />}
        </div>

        <Button
          onClick={handleClose}
          disabled={loading || metaLoading}
        >
          Cancelar
        </Button>

        {activeStep === 1 && (
          <Button
            onClick={() => setActiveStep(0)}
            disabled={loading || metaLoading}
          >
            Voltar
          </Button>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handlePrimaryAction}
          disabled={loading || metaLoading}
        >
          {primaryButtonLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OfficialEmbeddedSignupModal;