import React, { useContext, useState, useEffect, useMemo } from "react";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Divider,
} from "@material-ui/core";
import { Formik, Form } from "formik";

import AddressForm from "./Forms/AddressForm";
import PaymentForm from "./Forms/PaymentForm";
import ReviewOrder from "./ReviewOrder";
import CheckoutSuccess from "./CheckoutSuccess";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";

import validationSchema from "./FormModel/validationSchema";
import checkoutFormModel from "./FormModel/checkoutFormModel";
import formInitialValues from "./FormModel/formInitialValues";

import useStyles from "./styles";

const PENDING_PAYMENT_STORAGE_KEY = "financeiro_pending_payment";

const savePendingPayment = (payload) => {
  try {
    sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {}
};

const clearPendingPayment = () => {
  try {
    sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
  } catch (error) {}
};

export default function CheckoutPage(props) {
  const steps = ["Dados", "Personalizar", "Revisar"];
  const { formId, formField } = checkoutFormModel;

  const classes = useStyles();
  const [activeStep, setActiveStep] = useState(1);
  const [datePayment, setDatePayment] = useState(null);
  const [invoiceId, setinvoiceId] = useState(props.Invoice.id);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const currentValidationSchema = validationSchema[activeStep];
  const isLastStep = activeStep === steps.length - 1;
  const { user, socket } = useContext(AuthContext);

  const companySocketEvent = useMemo(() => {
    const companyId = user?.companyId || user?.company?.id;
    return companyId ? `company-${companyId}-payment` : null;
  }, [user]);

  useEffect(() => {
    if (props.Invoice?.id) {
      setinvoiceId(props.Invoice.id);
      setPaymentConfirmed(false);
    }
  }, [props.Invoice]);

  useEffect(() => {
    if (!socket || !companySocketEvent) return;

    const handleCompanyPayment = (payload) => {
      if (payload?.action === "CONCLUIDA") {
        setPaymentConfirmed(true);
        clearPendingPayment();
        toast.success("Pagamento confirmado com sucesso! A assinatura foi atualizada.");
      }
    };

    socket.on(companySocketEvent, handleCompanyPayment);

    return () => {
      if (socket.off) {
        socket.off(companySocketEvent, handleCompanyPayment);
      } else if (socket.removeListener) {
        socket.removeListener(companySocketEvent, handleCompanyPayment);
      }
    };
  }, [socket, companySocketEvent]);

  function _renderStepContent(step, setFieldValue, setActiveStep, values) {
    switch (step) {
      case 0:
        return <AddressForm formField={formField} values={values} setFieldValue={setFieldValue} />;
      case 1:
        return (
          <PaymentForm
            formField={formField}
            setFieldValue={setFieldValue}
            setActiveStep={setActiveStep}
            activeStep={step}
            invoiceId={invoiceId}
            values={values}
          />
        );
      case 2:
        return <ReviewOrder />;
      default:
        return <div>Not Found</div>;
    }
  }

  async function _submitForm(values, actions) {
    try {
      const plan = JSON.parse(values.plan);

      const newValues = {
        firstName: values.firstName,
        lastName: values.lastName,
        address2: values.address2,
        city: values.city,
        state: values.state,
        zipcode: values.zipcode,
        country: values.country,
        useAddressForPaymentDetails: values.useAddressForPaymentDetails,
        nameOnCard: values.nameOnCard,
        cardNumber: values.cardNumber,
        cvv: values.cvv,
        plan: values.plan,
        price: plan.price,
        users: plan.users,
        connections: plan.connections,
        invoiceId: invoiceId
      };

      const { data } = await api.post("/subscription", newValues);

      const provider = data?.mercadopagoURL
        ? "mercadopago"
        : data?.asaasURL
          ? "asaas"
          : data?.stripeURL
            ? "stripe"
            : data?.qrcode
              ? "pix"
              : "outro";

      const pendingPayload = {
        invoiceId,
        detail: props?.Invoice?.detail || `Fatura #${invoiceId}`,
        value: plan.price,
        provider,
        createdAt: new Date().toISOString(),
      };

      savePendingPayment(pendingPayload);
      setPaymentConfirmed(false);
      setDatePayment({
        ...data,
        pendingPayment: pendingPayload,
      });

      actions.setSubmitting(false);
      setActiveStep((prevStep) => prevStep + 1);

      toast.success("Cobrança gerada com sucesso! Após o pagamento, a confirmação pode levar de 5 a 10 minutos.");
    } catch (err) {
      actions.setSubmitting(false);
      toastError(err);
    }
  }

  function _handleSubmit(values, actions) {
    if (isLastStep) {
      _submitForm(values, actions);
    } else {
      setActiveStep((prevStep) => prevStep + 1);
      actions.setTouched({});
      actions.setSubmitting(false);
    }
  }

  function _handleBack() {
    setActiveStep((prevStep) => prevStep - 1);
  }

  return (
    <React.Fragment>
      <div style={{ marginBottom: 20 }}>
        <Typography component="h1" variant="h4" align="center" style={{ fontWeight: 700 }}>
          Finalize sua renovação
        </Typography>
        <Typography
          variant="body2"
          align="center"
          style={{ marginTop: 8, color: "#64748b" }}
        >
          Gere sua cobrança com segurança e acompanhe a confirmação do pagamento pelo sistema.
        </Typography>
      </div>

      <Paper
        elevation={0}
        style={{
          padding: 16,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          background: "#fff",
          marginBottom: 20,
        }}
      >
        <Stepper activeStep={activeStep} className={classes.stepper}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <React.Fragment>
        {activeStep === steps.length ? (
          <React.Fragment>
            <Paper
              elevation={0}
              style={{
                padding: 16,
                borderRadius: 12,
                border: paymentConfirmed ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
                background: paymentConfirmed ? "#f0fdf4" : "#eff6ff",
                marginBottom: 20,
              }}
            >
              <Typography
                variant="body1"
                style={{
                  fontWeight: 700,
                  color: paymentConfirmed ? "#166534" : "#1d4ed8",
                  marginBottom: 6,
                }}
              >
                {paymentConfirmed
                  ? "Pagamento confirmado"
                  : "Pagamento em processamento"}
              </Typography>

              <Typography
                variant="body2"
                style={{
                  color: paymentConfirmed ? "#166534" : "#1e3a8a",
                  lineHeight: 1.6,
                }}
              >
                {paymentConfirmed
                  ? "Recebemos a confirmação do pagamento e a assinatura já foi atualizada."
                  : "Após concluir o pagamento, a confirmação pode levar em média de 5 a 10 minutos. A atualização será feita automaticamente."}
              </Typography>

              <Divider style={{ margin: "12px 0" }} />

              <Typography variant="body2" style={{ color: "#475569" }}>
                <strong>Fatura:</strong> #{invoiceId}
              </Typography>
            </Paper>

            <CheckoutSuccess pix={datePayment} paymentConfirmed={paymentConfirmed} />
          </React.Fragment>
        ) : (
          <Formik
            initialValues={{
              ...user,
              ...formInitialValues
            }}
            validationSchema={currentValidationSchema}
            onSubmit={_handleSubmit}
          >
            {({ isSubmitting, setFieldValue, values }) => (
              <Form id={formId}>
                {_renderStepContent(activeStep, setFieldValue, setActiveStep, values)}

                <div className={classes.buttons}>
                  {activeStep !== 1 && activeStep !== 0 && (
                    <Button onClick={_handleBack} className={classes.button}>
                      VOLTAR
                    </Button>
                  )}

                  <div className={classes.wrapper}>
                    {activeStep !== 1 && (
                      <Button
                        disabled={isSubmitting}
                        type="submit"
                        variant="contained"
                        color="primary"
                        className={classes.button}
                      >
                        {isLastStep ? "GERAR PAGAMENTO" : "PRÓXIMO"}
                      </Button>
                    )}

                    {isSubmitting && (
                      <CircularProgress
                        size={24}
                        className={classes.buttonProgress}
                      />
                    )}
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </React.Fragment>
    </React.Fragment>
  );
}