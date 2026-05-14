import React, { useContext, useEffect, useState } from "react";
import QRCode from "qrcode.react";
import {
  Button,
  TextField,
  Paper,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import WhatshotIcon from "@material-ui/icons/Whatshot";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import SettingsIcon from "@material-ui/icons/Settings";

import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

import {
  getWarmupConnections,
  createWarmupConnection,
  deleteWarmupConnection,
  connectWarmupConnection,
  getWarmupConfig,
  updateWarmupConfig,
  toggleWarmup,
  getWarmupStatus
} from "../../services/warmup";

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
    height: "calc(100vh - 64px)",
    overflowY: "auto",
    overflowX: "hidden",
    paddingBottom: theme.spacing(10)
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(3)
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    borderRadius: 12
  },
  title: {
    fontWeight: 700
  },
  subtitle: {
    color: "#666",
    marginBottom: theme.spacing(2)
  },
  actions: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginTop: theme.spacing(2)
  },
  card: {
    padding: theme.spacing(2),
    borderRadius: 10,
    border: "1px solid #eee",
    marginBottom: theme.spacing(2)
  },
  qrBox: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(2)
  },
  statusRow: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    flexWrap: "wrap"
  },
  online: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32"
  },
  offline: {
    backgroundColor: "#ffebee",
    color: "#c62828"
  },
  qrcode: {
    backgroundColor: "#fff8e1",
    color: "#ef6c00"
  }
}));

const Warmup = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const canUseChipWarmup = user?.company?.plan?.chipWarmup === true;

  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [online, setOnline] = useState([]);
  const [status, setStatus] = useState(null);

  const [qrCode, setQrCode] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  const [newConnection, setNewConnection] = useState({
    name: "",
    number: "",
    warmupGroup: "default"
  });

  const [config, setConfig] = useState({
    minDelay: 30000,
    maxDelay: 120000,
    messagesPerCycle: 1,
    prompt: "",
    isActive: false
  });

  const loadData = async () => {
    if (!canUseChipWarmup) return;

    try {
      const [connectionsData, configData, statusData] = await Promise.all([
        getWarmupConnections(),
        getWarmupConfig(),
        getWarmupStatus()
      ]);

      setConnections(connectionsData.connections || []);
      setOnline(connectionsData.online || []);
      setConfig(configData);
      setStatus(statusData);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    if (!canUseChipWarmup) return;

    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, [canUseChipWarmup]);

  if (!canUseChipWarmup) {
    return (
      <div className={classes.root}>
        <Paper className={classes.paper}>
          <div className={classes.header}>
            <WhatshotIcon color="primary" />
            <div>
              <Typography variant="h4" className={classes.title}>
                Aquecimento de Chips indisponível
              </Typography>
              <Typography variant="body2" className={classes.subtitle}>
                Seu plano atual não possui acesso a esta funcionalidade.
              </Typography>
            </div>
          </div>
        </Paper>
      </div>
    );
  }

  const isOnline = session => {
    return online.some(item => item.sessionId === session);
  };

  const getStatusChip = connection => {
    if (isOnline(connection.session)) {
      return <Chip size="small" label="Online" className={classes.online} />;
    }

    if (connection.status === "QRCODE") {
      return <Chip size="small" label="Aguardando QR" className={classes.qrcode} />;
    }

    return <Chip size="small" label={connection.status || "Offline"} className={classes.offline} />;
  };

  const handleCreateConnection = async () => {
    try {
      setLoading(true);

      const data = await createWarmupConnection(newConnection);

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setQrOpen(true);
      }

      setNewConnection({
        name: "",
        number: "",
        warmupGroup: "default"
      });

      await loadData();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async id => {
    try {
      setLoading(true);

      const data = await connectWarmupConnection(id);

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setQrOpen(true);
      }

      await loadData();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnection = async id => {
    try {
      setLoading(true);
      await deleteWarmupConnection(id);
      await loadData();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);

      const minDelay = Number(config.minDelay);
      const maxDelay = Number(config.maxDelay);
      const messagesPerCycle = Number(config.messagesPerCycle);

      if (!minDelay || minDelay < 1000) {
        alert("Delay mínimo precisa ser maior que 1000 ms");
        return;
      }

      if (!maxDelay || maxDelay < minDelay) {
        alert("Delay máximo precisa ser maior ou igual ao mínimo");
        return;
      }

      const updated = await updateWarmupConfig({
        minDelay,
        maxDelay,
        messagesPerCycle: messagesPerCycle || 1,
        prompt: config.prompt || ""
      });

      setConfig(updated);
      await loadData();

      alert("Configuração salva com sucesso!");
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setLoading(true);
      await toggleWarmup();
      await loadData();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <WhatshotIcon color="primary" />
        <div>
          <Typography variant="h4" className={classes.title}>
            Aquecimento de Chips
          </Typography>
          <Typography variant="body2" className={classes.subtitle}>
            Conexões isoladas para aquecimento, sem misturar com os WhatsApps padrão do sistema.
          </Typography>
        </div>
      </div>

      <Paper className={classes.paper}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography variant="h6">Status do aquecimento</Typography>
            <Typography variant="body2" color="textSecondary">
              Cluster: {status?.isRunning ? "rodando" : "parado"}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6">
              {status?.onlineConnections || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Conexões online
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(config.isActive)}
                  onChange={handleToggle}
                  color="primary"
                />
              }
              label={config.isActive ? "Aquecimento ativo" : "Aquecimento pausado"}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper className={classes.paper}>
        <div className={classes.header}>
          <SettingsIcon color="primary" />
          <Typography variant="h6">Configuração</Typography>
        </div>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Delay mínimo (ms)"
              variant="outlined"
              fullWidth
              value={config.minDelay}
              onChange={e => setConfig({ ...config, minDelay: e.target.value })}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Delay máximo (ms)"
              variant="outlined"
              fullWidth
              value={config.maxDelay}
              onChange={e => setConfig({ ...config, maxDelay: e.target.value })}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Mensagens por ciclo"
              variant="outlined"
              fullWidth
              value={config.messagesPerCycle}
              onChange={e =>
                setConfig({ ...config, messagesPerCycle: e.target.value })
              }
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Frases alternadas / prompt"
              variant="outlined"
              fullWidth
              multiline
              rows={8}
              value={config.prompt || ""}
              onChange={e =>
                setConfig({
                  ...config,
                  prompt: e.target.value
                })
              }
              helperText="Coloque uma frase por linha. O sistema vai sortear e alternar automaticamente."
              InputLabelProps={{
                shrink: true
              }}
            />
          </Grid>
        </Grid>

        <div className={classes.actions}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveConfig}
            disabled={loading}
          >
            Salvar configuração
          </Button>
        </div>
      </Paper>

      <Paper className={classes.paper}>
        <div className={classes.header}>
          <AddIcon color="primary" />
          <Typography variant="h6">Nova conexão</Typography>
        </div>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Nome"
              variant="outlined"
              fullWidth
              value={newConnection.name}
              onChange={e =>
                setNewConnection({ ...newConnection, name: e.target.value })
              }
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Número"
              variant="outlined"
              fullWidth
              value={newConnection.number}
              onChange={e =>
                setNewConnection({ ...newConnection, number: e.target.value })
              }
              helperText="Ex: 5532999999999"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Grupo"
              variant="outlined"
              fullWidth
              value={newConnection.warmupGroup}
              onChange={e =>
                setNewConnection({
                  ...newConnection,
                  warmupGroup: e.target.value
                })
              }
            />
          </Grid>
        </Grid>

        <div className={classes.actions}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateConnection}
            disabled={loading || !newConnection.name}
            startIcon={<AddIcon />}
          >
            Criar conexão / gerar QR
          </Button>

          {loading && <CircularProgress size={24} />}
        </div>
      </Paper>

      <Paper className={classes.paper}>
        <Typography variant="h6" gutterBottom>
          Conexões de aquecimento
        </Typography>

        <Divider style={{ marginBottom: 16 }} />

        {connections.map(connection => (
          <div key={connection.id} className={classes.card}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle1">
                  <strong>{connection.name}</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {connection.number || "Sem número informado"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="body2">
                  Grupo: <strong>{connection.warmupGroup}</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Sessão: {connection.session}
                </Typography>
              </Grid>

              <Grid item xs={12} md={2}>
                <div className={classes.statusRow}>
                  {getStatusChip(connection)}
                </div>
              </Grid>

              <Grid item xs={12} md={4}>
                <div className={classes.actions}>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={() => handleConnect(connection.id)}
                    startIcon={<AutorenewIcon />}
                  >
                    Gerar QR / Reconectar
                  </Button>

                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={() => handleDeleteConnection(connection.id)}
                    startIcon={<DeleteIcon />}
                  >
                    Remover
                  </Button>
                </div>
              </Grid>
            </Grid>
          </div>
        ))}

        {!connections.length && (
          <Typography color="textSecondary">
            Nenhuma conexão de aquecimento cadastrada.
          </Typography>
        )}
      </Paper>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Escaneie o QR Code</DialogTitle>

        <DialogContent>
          <div className={classes.qrBox}>
            {qrCode && <QRCode value={qrCode} size={260} />}
          </div>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setQrOpen(false)} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Warmup;