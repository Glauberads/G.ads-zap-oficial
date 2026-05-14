import React, { useContext, useState, useEffect, useRef, useCallback } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import MicIcon from "@material-ui/icons/Mic";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import IconButton from "@material-ui/core/IconButton";
import { i18n } from "../../translate/i18n";
import { head } from "lodash";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import MessageVariablesPicker from "../MessageVariablesPicker";
import { DataGrid } from "@material-ui/data-grid";
import AudioRecorder from "../AudioRecorder";

import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Box,
  Typography,
  Chip,
  Divider
} from "@material-ui/core";
import ConfirmationModal from "../ConfirmationModal";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  multFieldLine: {
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },

  btnWrapper: {
    position: "relative",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  colorAdorment: {
    width: 20,
    height: 20,
  },
  mediaContainer: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
  },
  mediaOptions: {
    display: "flex",
    gap: theme.spacing(1),
    justifyContent: "center",
    flexWrap: "wrap",
  },
  mediaInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1),
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
  },
  existingMediaActions: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
  },
  mediaPreview: {
    maxWidth: "100%",
    maxHeight: 200,
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1),
  },
}));

const QuickeMessageSchema = Yup.object().shape({
  shortcode: Yup.string().trim().required("Obrigatório"),
});

const QuickMessageDialog = ({
  open,
  onClose,
  quickemessageId,
  reload,
  resetPagination
}) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const messageInputRef = useRef();
  const attachmentFile = useRef(null);

  const initialState = {
    shortcode: "",
    message: "",
    geral: true,
    visao: true,
    isOficial: false,
    status: "",
    language: "",
    category: "",
    metaID: "",
    components: [],
    mediaPath: null,
    mediaName: null,
    mediaType: null,
  };

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [quickemessage, setQuickemessage] = useState(initialState);
  const [attachment, setAttachment] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [mediaMode, setMediaMode] = useState(null);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);

  const refreshList = useCallback(() => {
    if (typeof reload === "function") {
      reload();
      return;
    }

    if (typeof resetPagination === "function") {
      resetPagination();
    }
  }, [reload, resetPagination]);

  const normalizeShortcode = useCallback((value) => {
    if (!value || typeof value !== "string") return "";

    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\//g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");
  }, []);

  const resetDialogState = useCallback(() => {
    setQuickemessage(initialState);
    setAttachment(null);
    setAudioBlob(null);
    setMediaMode(null);
    setIsEditingMedia(false);
    setTabIndex(0);
    setConfirmationOpen(false);

    if (attachmentFile.current) {
      attachmentFile.current.value = null;
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadQuickMessage = async () => {
      if (!open) {
        return;
      }

      if (!quickemessageId) {
        if (!isCancelled) {
          setQuickemessage(initialState);
          setIsEditingMedia(false);
          setMediaMode(null);
          setLoadingMessage(false);
        }
        return;
      }

      try {
        setLoadingMessage(true);
        const { data } = await api.get(`/quick-messages/${quickemessageId}`);

        if (!isCancelled) {
          setQuickemessage((prevState) => ({
            ...prevState,
            ...data,
            geral: typeof data?.geral === "boolean" ? data.geral : true,
            visao: typeof data?.visao === "boolean" ? data.visao : true,
            components: Array.isArray(data?.components) ? data.components : [],
          }));
          setIsEditingMedia(false);
          setMediaMode(null);
        }
      } catch (err) {
        if (!isCancelled) {
          toastError(err);
        }
      } finally {
        if (!isCancelled) {
          setLoadingMessage(false);
        }
      }
    };

    loadQuickMessage();

    return () => {
      isCancelled = true;
    };
  }, [quickemessageId, open]);

  const handleClose = () => {
    resetDialogState();
    onClose();
  };

  const handleAttachmentFile = (e) => {
    const file = head(e.target.files);

    if (file) {
      setAttachment(file);
      setAudioBlob(null);
      setMediaMode("file");
      setIsEditingMedia(true);
    }
  };

  const handleAudioRecorded = (blob) => {
    setAudioBlob(blob);
    setAttachment(null);
    setMediaMode("audio");
    setIsEditingMedia(true);
  };

  const handleAudioDeleted = () => {
    setAudioBlob(null);
    setMediaMode(null);
    setIsEditingMedia(false);
  };

  const handleCancelEdit = () => {
    setAttachment(null);
    setAudioBlob(null);
    setMediaMode(null);
    setIsEditingMedia(false);

    if (attachmentFile.current) {
      attachmentFile.current.value = null;
    }
  };

  const handleEditExistingMedia = () => {
    setIsEditingMedia(true);
    setMediaMode("edit");
  };

  const getBasename = (filepath) => {
    if (!filepath) return "";

    const cleanPath = filepath.split("?")[0].split("#")[0];
    const segments = cleanPath.split("/");

    return segments[segments.length - 1];
  };

  const hasExistingMedia = Boolean(quickemessage.mediaPath && !isEditingMedia);
  const hasNewMedia = Boolean(attachment || audioBlob);
  const hasAnyMedia = hasExistingMedia || hasNewMedia;

  const validateMessageBeforeSave = (values) => {
    const message = typeof values.message === "string" ? values.message.trim() : "";
    const keepsExistingMedia = Boolean(quickemessage.mediaPath && !isEditingMedia);
    const hasMediaToSave = Boolean(attachment || audioBlob || keepsExistingMedia);

    if (!message && !hasMediaToSave) {
      toast.error("Informe uma mensagem ou anexe uma mídia.");
      return false;
    }

    return true;
  };

  const uploadSelectedMedia = async (messageId) => {
    if (attachment) {
      const formData = new FormData();
      formData.append("typeArch", "quickMessage");
      formData.append("file", attachment);

      await api.post(`/quick-messages/${messageId}/media-upload`, formData);
      return;
    }

    if (audioBlob) {
      const formData = new FormData();
      formData.append("typeArch", "quickMessage");
      formData.append("audio", audioBlob, `audio_${Date.now()}.webm`);

      await api.post(`/quick-messages/${messageId}/audio-upload`, formData);
    }
  };

  const handleSaveQuickeMessage = async (values) => {
    if (!validateMessageBeforeSave(values)) {
      return false;
    }

    const normalizedShortcode = normalizeShortcode(values.shortcode);

    const quickemessageData = {
      ...values,
      shortcode: normalizedShortcode,
      geral: Boolean(values.geral),
      visao: Boolean(values.visao),
      isMedia: !!(
        attachment ||
        audioBlob ||
        (quickemessage.mediaPath && !isEditingMedia)
      ),
      mediaPath: attachment
        ? String(attachment.name).replace(/ /g, "_")
        : values.mediaPath
          ? getBasename(values.mediaPath).replace(/ /g, "_")
          : null,
      isOficial: quickemessageId ? values.isOficial : false,
    };

    try {
      let quickMessageRecord;

      if (quickemessageId) {
        quickMessageRecord = await api.put(
          `/quick-messages/${quickemessageId}`,
          quickemessageData
        );
      } else {
        const { data } = await api.post("/quick-messages", quickemessageData);
        quickMessageRecord = { data };
      }

      const messageId = quickemessageId || quickMessageRecord.data.id;

      if (attachment || audioBlob) {
        await uploadSelectedMedia(messageId);
      }

      toast.success(i18n.t("quickMessages.toasts.success"));
      refreshList();
      handleClose();
      return true;
    } catch (err) {
      console.error("❌ Erro ao salvar quick message:", err);
      toastError(err);
      return false;
    }
  };

  const rowsWithIds = (quickemessage?.components || []).map((component, index) => ({
    id: index,
    ...component,
  }));

  const deleteMedia = async () => {
    try {
      if (attachment) {
        setAttachment(null);
      }

      if (audioBlob) {
        setAudioBlob(null);
      }

      if (attachmentFile.current) {
        attachmentFile.current.value = null;
      }

      if (quickemessage.mediaPath && quickemessage.id) {
        await api.delete(`/quick-messages/${quickemessage.id}/media-upload`);

        setQuickemessage((prev) => ({
          ...prev,
          mediaPath: null,
          mediaName: null,
          mediaType: null,
        }));

        toast.success(i18n.t("quickMessages.toasts.deleted"));
        refreshList();
      }

      setMediaMode(null);
      setIsEditingMedia(false);
    } catch (err) {
      toastError(err);
    } finally {
      setConfirmationOpen(false);
    }
  };

  const handleClickMsgVar = async (msgVar, setValueFunc) => {
    const el = messageInputRef.current;

    if (!el) return;

    const firstHalfText = el.value.substring(0, el.selectionStart);
    const secondHalfText = el.value.substring(el.selectionEnd);
    const newCursorPos = el.selectionStart + msgVar.length;

    setValueFunc("message", `${firstHalfText}${msgVar}${secondHalfText}`);

    await new Promise((r) => setTimeout(r, 100));

    if (messageInputRef.current) {
      messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const getMediaTypeIcon = (mediaType) => {
    switch (mediaType) {
      case "audio":
        return "🎵";
      case "image":
        return "🖼️";
      case "video":
        return "🎥";
      default:
        return "📎";
    }
  };

  const getMediaPreview = (quickmessage) => {
    if (!quickmessage.mediaPath) return null;

    const mediaUrl = `${process.env.REACT_APP_BACKEND_URL || "http://localhost:8080"}/public/company${user.companyId}/quickMessage/${quickmessage.mediaName}`;

    if (quickmessage.mediaType === "image") {
      return (
        <img
          src={mediaUrl}
          alt={quickmessage.mediaName}
          className={classes.mediaPreview}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      );
    }

    if (quickmessage.mediaType === "audio") {
      return (
        <audio controls className={classes.mediaPreview} src={mediaUrl}>
          Seu navegador não suporta o elemento de áudio.
        </audio>
      );
    }

    if (quickmessage.mediaType === "video") {
      return (
        <video controls className={classes.mediaPreview} src={mediaUrl}>
          Seu navegador não suporta o elemento de vídeo.
        </video>
      );
    }

    return null;
  };

  return (
    <div className={classes.root}>
      <ConfirmationModal
        title={i18n.t("quickMessages.confirmationModal.deleteTitle")}
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={deleteMedia}
      >
        {i18n.t("quickMessages.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xl"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {quickemessageId
            ? i18n.t("quickMessages.dialog.edit")
            : i18n.t("quickMessages.dialog.add")}
        </DialogTitle>

        <div style={{ display: "none" }}>
          <input
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            ref={attachmentFile}
            onChange={handleAttachmentFile}
          />
        </div>

        <Formik
          initialValues={quickemessage}
          enableReinitialize
          validationSchema={QuickeMessageSchema}
          onSubmit={async (values, actions) => {
            try {
              await handleSaveQuickeMessage(values);
            } finally {
              actions.setSubmitting(false);
            }
          }}
        >
          {({ touched, errors, isSubmitting, setFieldValue, values }) => {
            const isDisabled =
              quickemessageId &&
              values.visao &&
              !values.geral &&
              values.userId !== user.id;

            return (
              <Form>
                <DialogContent dividers>
                  {loadingMessage ? (
                    <Box display="flex" justifyContent="center" py={3}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      <Tabs
                        value={tabIndex}
                        onChange={handleTabChange}
                        indicatorColor="primary"
                        textColor="primary"
                        centered
                      >
                        <Tab label={i18n.t("quickMessages.dialog.general")} />
                        {values.isOficial && <Tab label="Oficial" />}
                      </Tabs>

                      {tabIndex === 0 && (
                        <Grid spacing={2} container>
                          <Grid xs={12} item>
                            <Field
                              as={TextField}
                              autoFocus
                              label={i18n.t("quickMessages.dialog.shortcode")}
                              name="shortcode"
                              disabled={isDisabled}
                              error={touched.shortcode && Boolean(errors.shortcode)}
                              helperText={
                                (touched.shortcode && errors.shortcode) ||
                                "Ex.: boas-vindas"
                              }
                              variant="outlined"
                              margin="dense"
                              fullWidth
                              onChange={(e) => {
                                setFieldValue(
                                  "shortcode",
                                  normalizeShortcode(e.target.value)
                                );
                              }}
                            />
                          </Grid>

                          <Grid xs={12} item>
                            <Field
                              as={TextField}
                              label={i18n.t("quickMessages.dialog.message")}
                              name="message"
                              inputRef={messageInputRef}
                              error={touched.message && Boolean(errors.message)}
                              helperText={touched.message && errors.message}
                              variant="outlined"
                              margin="dense"
                              disabled={isDisabled}
                              multiline
                              rows={7}
                              fullWidth
                            />
                          </Grid>

                          <Grid item xs={12} md={12} xl={12}>
                            <MessageVariablesPicker
                              disabled={isSubmitting || isDisabled}
                              showSchedulingVars={true}
                              onClick={(value) =>
                                handleClickMsgVar(value, setFieldValue)
                              }
                            />
                          </Grid>

                          <Grid xs={12} item>
                            <Box className={classes.mediaContainer}>
                              <Typography variant="h6" gutterBottom>
                                Anexar Mídia
                              </Typography>

                              {hasExistingMedia && (
                                <>
                                  <Box className={classes.mediaInfo}>
                                    <Box display="flex" alignItems="center" gridGap={8}>
                                      <span>{getMediaTypeIcon(quickemessage.mediaType)}</span>
                                      <Typography variant="body2">
                                        {quickemessage.mediaName}
                                      </Typography>
                                      {quickemessage.mediaType && (
                                        <Chip
                                          size="small"
                                          label={quickemessage.mediaType}
                                          variant="outlined"
                                        />
                                      )}
                                    </Box>

                                    <Box className={classes.existingMediaActions}>
                                      <IconButton
                                        onClick={handleEditExistingMedia}
                                        color="primary"
                                        size="small"
                                        title="Editar mídia"
                                        disabled={isDisabled}
                                      >
                                        <EditIcon />
                                      </IconButton>

                                      <IconButton
                                        onClick={() => setConfirmationOpen(true)}
                                        color="secondary"
                                        size="small"
                                        title="Remover mídia"
                                        disabled={isDisabled}
                                      >
                                        <DeleteOutlineIcon />
                                      </IconButton>
                                    </Box>
                                  </Box>

                                  {getMediaPreview(quickemessage)}
                                </>
                              )}

                              {attachment && (
                                <Box className={classes.mediaInfo}>
                                  <Box display="flex" alignItems="center" gridGap={8}>
                                    <AttachFileIcon />
                                    <Typography variant="body2">
                                      {attachment.name}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label="Novo Arquivo"
                                      color="primary"
                                    />
                                  </Box>

                                  <IconButton
                                    onClick={() => {
                                      setAttachment(null);
                                      setMediaMode(null);
                                      setIsEditingMedia(false);

                                      if (attachmentFile.current) {
                                        attachmentFile.current.value = null;
                                      }
                                    }}
                                    color="secondary"
                                    size="small"
                                  >
                                    <DeleteOutlineIcon />
                                  </IconButton>
                                </Box>
                              )}

                              {audioBlob && (
                                <Box className={classes.mediaInfo}>
                                  <Box display="flex" alignItems="center" gridGap={8}>
                                    <MicIcon />
                                    <Typography variant="body2">
                                      Novo áudio gravado
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label="Novo Áudio"
                                      color="secondary"
                                    />
                                  </Box>

                                  <IconButton
                                    onClick={handleAudioDeleted}
                                    color="secondary"
                                    size="small"
                                  >
                                    <DeleteOutlineIcon />
                                  </IconButton>
                                </Box>
                              )}

                              {(!hasAnyMedia || isEditingMedia) && (
                                <>
                                  {isEditingMedia && quickemessage.mediaPath && (
                                    <>
                                      <Divider />
                                      <Typography
                                        variant="body2"
                                        color="textSecondary"
                                        align="center"
                                      >
                                        Escolha uma nova mídia para substituir:
                                      </Typography>
                                    </>
                                  )}

                                  {!hasAnyMedia && (
                                    <Typography
                                      variant="body2"
                                      color="textSecondary"
                                      align="center"
                                    >
                                      Escolha uma opção para anexar mídia:
                                    </Typography>
                                  )}

                                  <Box className={classes.mediaOptions}>
                                    <Button
                                      variant="outlined"
                                      startIcon={<AttachFileIcon />}
                                      onClick={() => attachmentFile.current.click()}
                                      disabled={isSubmitting || isDisabled}
                                    >
                                      Anexar Arquivo
                                    </Button>

                                    <Button
                                      variant="outlined"
                                      startIcon={<MicIcon />}
                                      onClick={() => setMediaMode("audio")}
                                      disabled={isSubmitting || isDisabled}
                                    >
                                      Gravar Áudio
                                    </Button>

                                    {isEditingMedia && (
                                      <Button
                                        variant="outlined"
                                        color="secondary"
                                        onClick={handleCancelEdit}
                                        disabled={isSubmitting}
                                      >
                                        Cancelar Edição
                                      </Button>
                                    )}
                                  </Box>
                                </>
                              )}

                              {mediaMode === "audio" && !audioBlob && (
                                <AudioRecorder
                                  onAudioRecorded={handleAudioRecorded}
                                  onAudioDeleted={handleAudioDeleted}
                                  disabled={isSubmitting || isDisabled}
                                />
                              )}
                            </Box>
                          </Grid>

                          <Grid xs={12} item>
                            <FormControl variant="outlined" margin="dense" fullWidth>
                              <InputLabel id="visao-selection-label">
                                {i18n.t("quickMessages.dialog.visao")}
                              </InputLabel>

                              <Field
                                as={Select}
                                label={i18n.t("quickMessages.dialog.visao")}
                                labelId="visao-selection-label"
                                id="visao"
                                disabled={isDisabled}
                                name="visao"
                                onChange={(e) => {
                                  setFieldValue("visao", e.target.value === "true");
                                }}
                                error={touched.visao && Boolean(errors.visao)}
                                value={values.visao ? "true" : "false"}
                              >
                                <MenuItem value="true">
                                  {i18n.t("announcements.active")}
                                </MenuItem>
                                <MenuItem value="false">
                                  {i18n.t("announcements.inactive")}
                                </MenuItem>
                              </Field>
                            </FormControl>

                            {values.visao === true && (
                              <FormControl variant="outlined" margin="dense" fullWidth>
                                <InputLabel id="geral-selection-label">
                                  {i18n.t("quickMessages.dialog.geral")}
                                </InputLabel>

                                <Field
                                  as={Select}
                                  label={i18n.t("quickMessages.dialog.geral")}
                                  labelId="geral-selection-label"
                                  id="geral"
                                  name="geral"
                                  disabled={isDisabled}
                                  value={values.geral ? "true" : "false"}
                                  onChange={(e) => {
                                    setFieldValue("geral", e.target.value === "true");
                                  }}
                                  error={touched.geral && Boolean(errors.geral)}
                                >
                                  <MenuItem value="true">
                                    {i18n.t("announcements.active")}
                                  </MenuItem>
                                  <MenuItem value="false">
                                    {i18n.t("announcements.inactive")}
                                  </MenuItem>
                                </Field>
                              </FormControl>
                            )}
                          </Grid>
                        </Grid>
                      )}

                      {tabIndex === 1 && (
                        <>
                          <Grid xs={12} item>
                            <DataGrid
                              rows={rowsWithIds}
                              columns={[
                                { field: "type", headerName: "Tipo", width: 150 },
                                { field: "text", headerName: "Valor", width: 400 },
                              ]}
                              pageSize={5}
                              disableSelectionOnClick
                              autoHeight
                            />
                          </Grid>

                          <Grid container spacing={2}>
                            <Grid xl={6} md={6} sm={12} xs={12} item>
                              <Field
                                as={TextField}
                                label={i18n.t("quickMessages.dialog.status")}
                                name="status"
                                disabled={values.isOficial}
                                error={touched.status && Boolean(errors.status)}
                                helperText={touched.status && errors.status}
                                variant="outlined"
                                margin="dense"
                                fullWidth
                              />
                            </Grid>

                            <Grid xl={6} md={6} sm={12} xs={12} item>
                              <Field
                                as={TextField}
                                label={i18n.t("quickMessages.dialog.language")}
                                name="language"
                                disabled={values.isOficial}
                                error={touched.language && Boolean(errors.language)}
                                helperText={touched.language && errors.language}
                                variant="outlined"
                                margin="dense"
                                fullWidth
                              />
                            </Grid>

                            <Grid xl={6} md={6} sm={12} xs={12} item>
                              <Field
                                as={TextField}
                                label={i18n.t("quickMessages.dialog.category")}
                                name="category"
                                disabled={values.isOficial}
                                error={touched.category && Boolean(errors.category)}
                                helperText={touched.category && errors.category}
                                variant="outlined"
                                margin="dense"
                                fullWidth
                              />
                            </Grid>

                            <Grid xl={6} md={6} sm={12} xs={12} item>
                              <Field
                                as={TextField}
                                label={i18n.t("quickMessages.dialog.metaID")}
                                name="metaID"
                                disabled={values.isOficial}
                                error={touched.metaID && Boolean(errors.metaID)}
                                helperText={touched.metaID && errors.metaID}
                                variant="outlined"
                                margin="dense"
                                fullWidth
                              />
                            </Grid>
                          </Grid>
                        </>
                      )}
                    </>
                  )}
                </DialogContent>

                <DialogActions>
                  <Button
                    onClick={handleClose}
                    color="secondary"
                    disabled={isSubmitting}
                    variant="outlined"
                  >
                    {i18n.t("quickMessages.buttons.cancel")}
                  </Button>

                  <Button
                    type="submit"
                    color="primary"
                    disabled={isSubmitting || isDisabled || loadingMessage}
                    variant="contained"
                    className={classes.btnWrapper}
                  >
                    {quickemessageId
                      ? i18n.t("quickMessages.buttons.edit")
                      : i18n.t("quickMessages.buttons.add")}

                    {isSubmitting && (
                      <CircularProgress
                        size={24}
                        className={classes.buttonProgress}
                      />
                    )}
                  </Button>
                </DialogActions>
              </Form>
            );
          }}
        </Formik>
      </Dialog>
    </div>
  );
};

export default QuickMessageDialog;