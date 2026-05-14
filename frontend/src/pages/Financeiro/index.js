import React, { useState, useEffect, useReducer, useContext, useMemo } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import Chip from "@material-ui/core/Chip";
import Divider from "@material-ui/core/Divider";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Snackbar from "@material-ui/core/Snackbar";
import IconButton from "@material-ui/core/IconButton";
import LinearProgress from "@material-ui/core/LinearProgress";
import Tooltip from "@material-ui/core/Tooltip";
import Fade from "@material-ui/core/Fade";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import SubscriptionModal from "../../components/SubscriptionModal";
import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

import PaymentIcon from "@material-ui/icons/Payment";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import RefreshIcon from "@material-ui/icons/Refresh";
import CloseIcon from "@material-ui/icons/Close";
import ReceiptIcon from "@material-ui/icons/Receipt";

import moment from "moment";

const PENDING_PAYMENT_STORAGE_KEY = "financeiro_pending_payment";

const getStoredPendingPayment = () => {
  try {
    const stored = sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
};

const clearStoredPendingPayment = () => {
  try {
    sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
  } catch (error) {}
};

const reducer = (state, action) => {
  if (action.type === "LOAD_INVOICES") {
    const invoices = action.payload.invoices || action.payload || [];
    const currentState = [...state];
    const newInvoices = [];

    invoices.forEach((invoice) => {
      const invoiceIndex = currentState.findIndex((i) => i.id === invoice.id);
      if (invoiceIndex !== -1) {
        currentState[invoiceIndex] = invoice;
      } else {
        newInvoices.push(invoice);
      }
    });

    return [...currentState, ...newInvoices];
  }

  if (action.type === "UPDATE_INVOICES") {
    const invoice = action.payload;
    const invoiceIndex = state.findIndex((i) => i.id === invoice.id);

    if (invoiceIndex !== -1) {
      const newState = [...state];
      newState[invoiceIndex] = invoice;
      return newState;
    }

    return [invoice, ...state];
  }

  if (action.type === "DELETE_INVOICE") {
    const invoiceId = action.payload;
    return state.filter((i) => i.id !== invoiceId);
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

const isInvoicePaid = (invoice) => invoice?.status === "paid";

const isInvoiceOverdue = (invoice) => {
  if (!invoice || isInvoicePaid(invoice)) return false;
  return moment().startOf("day").isAfter(moment(invoice.dueDate).endOf("day"));
};

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString("pt-br", {
    style: "currency",
    currency: "BRL",
  });
};

const useStyles = makeStyles((theme) => ({
  mainWrapper: {
    gap: theme.spacing(2),
  },

  headerBlock: {
    width: "100%",
  },

  summaryGrid: {
    marginBottom: theme.spacing(2),
  },

  summaryCard: {
    height: "100%",
    borderRadius: 14,
    border: "1px solid #e8edf3",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    background: "#fff",
  },

  summaryCardPrimary: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#fff",
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.18)",
  },

  summaryLabel: {
    fontSize: 13,
    fontWeight: 600,
    opacity: 0.85,
    marginBottom: theme.spacing(1),
  },

  summaryValue: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.1,
  },

  summarySubValue: {
    marginTop: theme.spacing(1),
    fontSize: 13,
    opacity: 0.85,
  },

  alertBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
    padding: theme.spacing(2),
    borderRadius: 14,
    marginBottom: theme.spacing(2),
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
  },

  alertDanger: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
  },

  alertInfo: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
  },

  alertSuccess: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
  },

  alertContent: {
    flex: 1,
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginTop: theme.spacing(1),
  },

  pageTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    gap: theme.spacing(2),
    flexWrap: "wrap",
  },

  mainPaper: {
    flex: 1,
    padding: theme.spacing(0),
    overflowY: "auto",
    borderRadius: 16,
    border: "1px solid #e8edf3",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
    ...theme.scrollbarStyles,
  },

  tableHead: {
    backgroundColor: "#f8fafc",
  },

  tableHeadCell: {
    fontWeight: 700,
    color: "#334155",
    borderBottom: "1px solid #e2e8f0",
  },

  invoiceRow: {
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#f8fafc",
    },
  },

  overdueRow: {
    backgroundColor: "#fff7f7",
  },

  processingRow: {
    backgroundColor: "#fffbeb",
  },

  detailCell: {
    minWidth: 220,
  },

  detailTitle: {
    fontWeight: 700,
    color: "#0f172a",
  },

  detailSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },

  strongValue: {
    fontWeight: 700,
    color: "#0f172a",
  },

  actionButton: {
    borderRadius: 10,
    fontWeight: 700,
    minWidth: 110,
    boxShadow: "none",
  },

  paidButton: {
    borderRadius: 10,
    fontWeight: 700,
    minWidth: 110,
  },

  chip: {
    fontWeight: 700,
    minWidth: 115,
  },

  chipPaid: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },

  chipOpen: {
    backgroundColor: "#e0f2fe",
    color: "#075985",
  },

  chipOverdue: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },

  chipProcessing: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },

  dialogTitle: {
    fontWeight: 700,
    paddingBottom: theme.spacing(1),
  },

  dialogText: {
    color: "#475569",
    lineHeight: 1.6,
  },

  processingBox: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  emptyState: {
    padding: theme.spacing(5),
    textAlign: "center",
    color: "#64748b",
  },

  divider: {
    margin: `${theme.spacing(2)}px 0`,
  },
}));

const Invoices = () => {
  const classes = useStyles();
  const { user, socket } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [invoices, dispatch] = useReducer(reducer, []);
  const [storagePlans, setStoragePlans] = React.useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [isCompanyExpired, setIsCompanyExpired] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(() => getStoredPendingPayment());
  const [processingDialogOpen, setProcessingDialogOpen] = useState(() => !!getStoredPendingPayment());
  const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);

  useEffect(() => {
    if (user && user.company) {
      const hoje = moment();
      const vencimento = moment(user.company.dueDate).endOf("day");
      const isExpired = hoje.isAfter(vencimento);
      setIsCompanyExpired(isExpired);
    }
  }, [user]);

  useEffect(() => {
    const syncPending = () => {
      const stored = getStoredPendingPayment();
      setPendingPayment(stored);
    };

    syncPending();

    const interval = setInterval(syncPending, 2000);
    window.addEventListener("focus", syncPending);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", syncPending);
    };
  }, []);

  useEffect(() => {
    const companyId = user?.companyId || user?.company?.id;

    if (!socket || !companyId) return;

    const eventName = `company-${companyId}-payment`;

    const handleCompanyPayment = () => {
      clearStoredPendingPayment();
      setPendingPayment(null);
      setProcessingDialogOpen(false);
      setSuccessSnackbarOpen(true);
      setRefreshTrigger((prev) => prev + 1);
    };

    socket.on(eventName, handleCompanyPayment);

    return () => {
      if (socket.off) {
        socket.off(eventName, handleCompanyPayment);
      } else if (socket.removeListener) {
        socket.removeListener(eventName, handleCompanyPayment);
      }
    };
  }, [socket, user]);

  const handleOpenContactModal = (invoice) => {
    setStoragePlans(invoice);
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);

    const stored = getStoredPendingPayment();
    setPendingPayment(stored);

    if (stored) {
      setProcessingDialogOpen(true);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleDismissPendingPayment = () => {
    setPendingPayment(null);
    clearStoredPendingPayment();
    setProcessingDialogOpen(false);
  };

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);

    const delayDebounceFn = setTimeout(() => {
      const fetchInvoices = async () => {
        try {
          const { data } = await api.get("/invoices/all", {
            params: { searchParam, pageNumber },
          });

          const invoicePayload = data?.invoices || data || [];
          dispatch({ type: "LOAD_INVOICES", payload: invoicePayload });
          setHasMore(Boolean(data?.hasMore));
        } catch (err) {
          toastError(err);
        } finally {
          setLoading(false);
        }
      };

      fetchInvoices();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, refreshTrigger]);

  useEffect(() => {
    if (!pendingPayment) return;

    const createdAt = moment(pendingPayment.createdAt);
    const minutesFromStart = moment().diff(createdAt, "minutes", true);

    if (minutesFromStart > 15) return;

    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 15000);

    return () => clearInterval(interval);
  }, [pendingPayment]);

  useEffect(() => {
    if (!pendingPayment || !invoices.length) return;

    const pendingInvoice = invoices.find(
      (invoice) => String(invoice.id) === String(pendingPayment.invoiceId)
    );

    if (!pendingInvoice) return;

    if (pendingInvoice.status === "paid") {
      clearStoredPendingPayment();
      setPendingPayment(null);
      setProcessingDialogOpen(false);
      setSuccessSnackbarOpen(true);
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [invoices, pendingPayment]);

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const getInvoiceStatus = (record) => {
    const isPending =
      pendingPayment &&
      String(pendingPayment.invoiceId) === String(record.id) &&
      record.status !== "paid";

    if (isPending) return "Processando";
    if (record.status === "paid") return "Pago";
    if (isInvoiceOverdue(record)) return "Vencido";
    return "Em Aberto";
  };

  const getStatusChipClass = (status) => {
    if (status === "Pago") return classes.chipPaid;
    if (status === "Vencido") return classes.chipOverdue;
    if (status === "Processando") return classes.chipProcessing;
    return classes.chipOpen;
  };

  const getRowClassName = (record) => {
    const status = getInvoiceStatus(record);

    if (status === "Vencido") return `${classes.invoiceRow} ${classes.overdueRow}`;
    if (status === "Processando") return `${classes.invoiceRow} ${classes.processingRow}`;
    return classes.invoiceRow;
  };

  const getDueDateHint = (record) => {
    const due = moment(record.dueDate).startOf("day");
    const today = moment().startOf("day");
    const diffDays = due.diff(today, "days");

    if (record.status === "paid") return "Pagamento confirmado";
    if (diffDays === 0) return "Vence hoje";
    if (diffDays > 0) return `Faltam ${diffDays} dia(s)`;
    return `Atrasado há ${Math.abs(diffDays)} dia(s)`;
  };

  const pendingMinutes = useMemo(() => {
    if (!pendingPayment?.createdAt) return 0;
    return Math.max(0, moment().diff(moment(pendingPayment.createdAt), "minutes"));
  }, [pendingPayment, refreshTrigger]);

  const summary = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter((invoice) => invoice.status === "paid").length;
    const overdue = invoices.filter((invoice) => isInvoiceOverdue(invoice)).length;
    const processing = invoices.filter(
      (invoice) =>
        pendingPayment &&
        String(pendingPayment.invoiceId) === String(invoice.id) &&
        invoice.status !== "paid"
    ).length;
    const open = total - paid - overdue - processing;

    return {
      total,
      paid,
      overdue,
      processing,
      open: open < 0 ? 0 : open,
    };
  }, [invoices, pendingPayment]);

  return (
    <MainContainer>
      <SubscriptionModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        Invoice={storagePlans}
        contactId={selectedContactId}
      />

      <Dialog
        open={processingDialogOpen && !!pendingPayment}
        onClose={() => setProcessingDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle className={classes.dialogTitle}>
          Pagamento em processamento
        </DialogTitle>

        <DialogContent>
          <Typography className={classes.dialogText}>
            Identificamos um pagamento recente da sua assinatura. Após a confirmação do provedor,
            a atualização pode levar em média de 5 a 10 minutos.
          </Typography>

          <div className={classes.processingBox}>
            <Typography variant="body2" style={{ fontWeight: 700, marginBottom: 8 }}>
              O que acontece agora?
            </Typography>

            <Typography variant="body2" className={classes.dialogText}>
              Assim que a confirmação for concluída, a tela será atualizada automaticamente.
              Você pode permanecer nesta página e acompanhar o status.
            </Typography>

            <Divider className={classes.divider} />

            <Typography variant="body2" style={{ marginBottom: 6 }}>
              <strong>Fatura:</strong> #{pendingPayment?.invoiceId}
            </Typography>
            <Typography variant="body2" style={{ marginBottom: 6 }}>
              <strong>Valor:</strong> {formatCurrency(pendingPayment?.value)}
            </Typography>
            <Typography variant="body2">
              <strong>Tempo aguardando:</strong> {pendingMinutes} minuto(s)
            </Typography>

            <div style={{ marginTop: 16 }}>
              <LinearProgress />
            </div>
          </div>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            color="primary"
            variant="outlined"
          >
            Atualizar agora
          </Button>
          <Button
            onClick={() => setProcessingDialogOpen(false)}
            color="primary"
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={successSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSuccessSnackbarOpen(false)}
        message="Pagamento confirmado com sucesso. A assinatura foi atualizada."
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setSuccessSnackbarOpen(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      <div className={classes.headerBlock}>
        <MainHeader>
          <div className={classes.pageTitleRow}>
            <div>
              <Title>Financeiro</Title>
              <Typography variant="body2" style={{ color: "#64748b", marginTop: 4 }}>
                Acompanhe suas faturas, vencimentos e pagamentos em um só lugar.
              </Typography>
            </div>

            <div className={classes.headerActions}>
              <Tooltip title="Atualizar agora">
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={() => setRefreshTrigger((prev) => prev + 1)}
                >
                  Atualizar
                </Button>
              </Tooltip>

              {pendingPayment && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AccessTimeIcon />}
                  onClick={() => setProcessingDialogOpen(true)}
                >
                  Ver pagamento em processamento
                </Button>
              )}
            </div>
          </div>
        </MainHeader>

        <Grid container spacing={2} className={classes.summaryGrid}>
          <Grid item xs={12} md={4}>
            <Card className={classes.summaryCardPrimary}>
              <CardContent>
                <Typography className={classes.summaryLabel}>
                  Situação da assinatura
                </Typography>
                <Typography className={classes.summaryValue}>
                  {isCompanyExpired ? "Vencida" : "Ativa"}
                </Typography>
                <Typography className={classes.summarySubValue}>
                  Vencimento atual:{" "}
                  {user?.company?.dueDate
                    ? moment(user.company.dueDate).format("DD/MM/YYYY")
                    : "--"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Card className={classes.summaryCard}>
              <CardContent>
                <Typography className={classes.summaryLabel}>Faturas</Typography>
                <Typography className={classes.summaryValue}>{summary.total}</Typography>
                <Typography className={classes.summarySubValue}>
                  Total registrado
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Card className={classes.summaryCard}>
              <CardContent>
                <Typography className={classes.summaryLabel}>Em aberto</Typography>
                <Typography className={classes.summaryValue}>{summary.open}</Typography>
                <Typography className={classes.summarySubValue}>
                  Aguardando pagamento
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Card className={classes.summaryCard}>
              <CardContent>
                <Typography className={classes.summaryLabel}>Processando</Typography>
                <Typography className={classes.summaryValue}>{summary.processing}</Typography>
                <Typography className={classes.summarySubValue}>
                  Confirmação em andamento
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Card className={classes.summaryCard}>
              <CardContent>
                <Typography className={classes.summaryLabel}>Pagas</Typography>
                <Typography className={classes.summaryValue}>{summary.paid}</Typography>
                <Typography className={classes.summarySubValue}>
                  Já confirmadas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {isCompanyExpired && (
          <Fade in>
            <div className={`${classes.alertBanner} ${classes.alertDanger}`}>
              <ErrorOutlineIcon style={{ color: "#dc2626", marginTop: 2 }} />
              <div className={classes.alertContent}>
                <Typography variant="body1" style={{ fontWeight: 700 }}>
                  Sua assinatura está vencida
                </Typography>
                <Typography variant="body2" style={{ color: "#7f1d1d", marginTop: 4 }}>
                  Regularize o pagamento para manter o sistema em pleno funcionamento.
                </Typography>
              </div>
            </div>
          </Fade>
        )}

        {pendingPayment && (
          <Fade in>
            <div className={`${classes.alertBanner} ${classes.alertInfo}`}>
              <AccessTimeIcon style={{ color: "#2563eb", marginTop: 2 }} />
              <div className={classes.alertContent}>
                <Typography variant="body1" style={{ fontWeight: 700 }}>
                  Pagamento em processamento
                </Typography>
                <Typography variant="body2" style={{ color: "#1e3a8a", marginTop: 4 }}>
                  Se você já concluiu o pagamento, a confirmação pode levar de 5 a 10 minutos.
                  Esta tela será atualizada automaticamente.
                </Typography>

                <div className={classes.headerActions}>
                  <Button
                    size="small"
                    color="primary"
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => setRefreshTrigger((prev) => prev + 1)}
                  >
                    Atualizar agora
                  </Button>

                  <Button
                    size="small"
                    onClick={handleDismissPendingPayment}
                  >
                    Ainda não paguei
                  </Button>
                </div>
              </div>
            </div>
          </Fade>
        )}

        {!isCompanyExpired && !pendingPayment && (
          <Fade in>
            <div className={`${classes.alertBanner} ${classes.alertSuccess}`}>
              <CheckCircleIcon style={{ color: "#16a34a", marginTop: 2 }} />
              <div className={classes.alertContent}>
                <Typography variant="body1" style={{ fontWeight: 700 }}>
                  Área financeira organizada
                </Typography>
                <Typography variant="body2" style={{ color: "#166534", marginTop: 4 }}>
                  Consulte as faturas, acompanhe vencimentos e realize pagamentos com mais clareza.
                </Typography>
              </div>
            </div>
          </Fade>
        )}
      </div>

      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead className={classes.tableHead}>
            <TableRow>
              <TableCell className={classes.tableHeadCell} align="left">
                Detalhes
              </TableCell>
              <TableCell className={classes.tableHeadCell} align="center">
                Usuários
              </TableCell>
              <TableCell className={classes.tableHeadCell} align="center">
                Conexões
              </TableCell>
              <TableCell className={classes.tableHeadCell} align="center">
                Filas
              </TableCell>
              <TableCell className={classes.tableHeadCell} align="center">
                Valor
              </TableCell>
              <TableCell className={classes.tableHeadCell} align="center">
                Vencimento
              </TableCell>
              <TableCell className={classes.tableHeadCell} align="center">
                Status
              </TableCell>
              <TableCell className={classes.tableHeadCell} align="center">
                Ação
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            <>
              {invoices.map((invoice) => {
                const status = getInvoiceStatus(invoice);

                return (
                  <TableRow className={getRowClassName(invoice)} key={invoice.id}>
                    <TableCell className={classes.detailCell} align="left">
                      <div>
                        <Typography variant="body2" className={classes.detailTitle}>
                          {invoice.detail || "Fatura de assinatura"}
                        </Typography>
                        <Typography className={classes.detailSub}>
                          <ReceiptIcon style={{ fontSize: 14, verticalAlign: "middle", marginRight: 4 }} />
                          Fatura #{invoice.id}
                        </Typography>
                      </div>
                    </TableCell>

                    <TableCell align="center">{invoice.users}</TableCell>
                    <TableCell align="center">{invoice.connections}</TableCell>
                    <TableCell align="center">{invoice.queues}</TableCell>

                    <TableCell align="center" className={classes.strongValue}>
                      {formatCurrency(invoice.value)}
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2" style={{ fontWeight: 700, color: "#0f172a" }}>
                        {moment(invoice.dueDate).format("DD/MM/YYYY")}
                      </Typography>
                      <Typography variant="caption" style={{ color: "#64748b" }}>
                        {getDueDateHint(invoice)}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={status}
                        size="small"
                        className={`${classes.chip} ${getStatusChipClass(status)}`}
                      />
                    </TableCell>

                    <TableCell align="center">
                      {status !== "Pago" ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          className={classes.actionButton}
                          startIcon={<PaymentIcon />}
                          onClick={() => handleOpenContactModal(invoice)}
                        >
                          PAGAR
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          className={classes.paidButton}
                          startIcon={<CheckCircleIcon />}
                          disabled
                        >
                          PAGO
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className={classes.emptyState}>
                      <Typography variant="h6" style={{ marginBottom: 8 }}>
                        Nenhuma fatura encontrada
                      </Typography>
                      <Typography variant="body2">
                        Assim que houver lançamentos financeiros, eles aparecerão aqui.
                      </Typography>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {loading && <TableRowSkeleton columns={8} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Invoices;