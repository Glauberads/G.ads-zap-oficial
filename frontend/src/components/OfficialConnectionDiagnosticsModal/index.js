import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import OfficialConnectionDiagnostics from "../OfficialConnectionDiagnostics";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  dialogTitle: {
    fontWeight: 700,
    fontSize: 18,
    padding: "20px 24px 12px",
  },
  dialogContent: {
    padding: "8px 24px 20px",
  },
  dialogActions: {
    padding: "12px 24px 20px",
    gap: 8,
  },
  closeButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600,
    padding: "8px 20px",
  },
}));

const OfficialConnectionDiagnosticsModal = ({
  open,
  onClose,
  whatsappId,
  connectionName,
  embeddedStatus,
  initialNumber,
}) => {
  const classes = useStyles();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle className={classes.dialogTitle}>
        Diagnóstico da API Oficial
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <Typography
          variant="body2"
          style={{ marginBottom: 16, opacity: 0.8 }}
        >
          {connectionName
            ? `Conexão: ${connectionName}`
            : "Validação da conexão oficial"}
        </Typography>

        <OfficialConnectionDiagnostics
          whatsappId={whatsappId}
          embeddedStatus={embeddedStatus}
          initialNumber={initialNumber}
        />
      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button
          onClick={onClose}
          className={classes.closeButton}
          variant="outlined"
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OfficialConnectionDiagnosticsModal;