import React, { useState, useContext } from "react";
import {
  Button,
  CssBaseline,
  TextField,
  Typography,
  Paper
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Link as RouterLink } from "react-router-dom";
import { Helmet } from "react-helmet";
import ColorModeContext from "../../layout/themeContext";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100vw",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef2f7 45%, #e2e8f0 100%)",
    padding: 20,
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      width: 380,
      height: 380,
      borderRadius: "50%",
      background: "rgba(59,130,246,0.10)",
      filter: "blur(80px)",
      top: -80,
      left: -100,
      zIndex: 0
    },
    "&::after": {
      content: '""',
      position: "absolute",
      width: 320,
      height: 320,
      borderRadius: "50%",
      background: "rgba(14,165,233,0.10)",
      filter: "blur(80px)",
      bottom: -100,
      right: -80,
      zIndex: 0
    }
  },

  paper: {
    width: "100%",
    maxWidth: 430,
    padding: "34px 30px",
    borderRadius: 24,
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.10)",
    border: "1px solid rgba(255,255,255,0.75)",
    position: "relative",
    zIndex: 1,
    [theme.breakpoints.down("xs")]: {
      padding: "28px 20px",
      borderRadius: 20
    }
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(59,130,246,0.08)",
    color: theme.palette.primary.main,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 18,
    border: "1px solid rgba(59,130,246,0.12)"
  },

  title: {
    marginBottom: 8,
    fontWeight: 800,
    color: "#0f172a",
    fontSize: 28,
    lineHeight: 1.15,
    letterSpacing: "-0.02em"
  },

  subtitle: {
    marginBottom: 24,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6
  },

  form: {
    width: "100%"
  },

  textField: {
    marginBottom: 16,
    "& .MuiOutlinedInput-root": {
      borderRadius: 14,
      backgroundColor: "#ffffff",
      color: "#0f172a",
      transition: "all 0.2s ease",
      "& fieldset": {
        borderColor: "#dbe2ea"
      },
      "&:hover fieldset": {
        borderColor: "#b8c3d1"
      },
      "&.Mui-focused fieldset": {
        borderColor: theme.palette.primary.main,
        boxShadow: `0 0 0 4px ${theme.palette.primary.main}14`
      }
    },
    "& .MuiInputLabel-outlined": {
      color: "#64748b"
    },
    "& .MuiInputLabel-outlined.Mui-focused": {
      color: theme.palette.primary.main
    },
    "& .MuiInputBase-input": {
      color: "#0f172a"
    }
  },

  button: {
    marginTop: 4,
    marginBottom: 18,
    height: 48,
    borderRadius: 14,
    textTransform: "none",
    fontWeight: 800,
    fontSize: 15,
    color: "#fff",
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark || theme.palette.primary.main})`,
    boxShadow: `0 12px 24px ${theme.palette.primary.main}30`,
    "&:hover": {
      opacity: 0.96,
      boxShadow: `0 16px 28px ${theme.palette.primary.main}35`
    }
  },

  success: {
    marginTop: 4,
    marginBottom: 14,
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 500,
    lineHeight: 1.5
  },

  error: {
    marginTop: 4,
    marginBottom: 14,
    color: "#b42318",
    background: "#fef3f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 500,
    lineHeight: 1.5
  },

  bottomRow: {
    marginTop: 6,
    display: "flex",
    justifyContent: "center"
  },

  link: {
    textDecoration: "none",
    fontWeight: 700,
    color: theme.palette.primary.main,
    fontSize: 14,
    "&:hover": {
      textDecoration: "underline"
    }
  }
}));

const ForgotPassword = () => {
  const classes = useStyles();
  const { colorMode } = useContext(ColorModeContext);
  const { appName } = colorMode;

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/password-reset/request", { email });
      setMessage(data.message);
    } catch (err) {
      setError("Não foi possível processar sua solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{appName || "Sistema"} - Esqueci minha senha</title>
      </Helmet>

      <div className={classes.root}>
        <CssBaseline />

        <Paper elevation={0} className={classes.paper}>
          <div className={classes.badge}>Redefinição de acesso</div>

          <Typography variant="h4" className={classes.title}>
            Esqueceu sua senha?
          </Typography>

          <Typography variant="body2" className={classes.subtitle}>
            Digite seu e-mail abaixo para receber o link de redefinição e recuperar o acesso à sua conta.
          </Typography>

          <form onSubmit={handleSubmit} className={classes.form}>
            <TextField
              fullWidth
              variant="outlined"
              label="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={classes.textField}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              className={classes.button}
            >
              {loading ? "Enviando link..." : "Enviar link de redefinição"}
            </Button>
          </form>

          {message ? (
            <Typography variant="body2" className={classes.success}>
              {message}
            </Typography>
          ) : null}

          {error ? (
            <Typography variant="body2" className={classes.error}>
              {error}
            </Typography>
          ) : null}

          <div className={classes.bottomRow}>
            <RouterLink to="/login" className={classes.link}>
              Voltar para o login
            </RouterLink>
          </div>
        </Paper>
      </div>
    </>
  );
};

export default ForgotPassword;