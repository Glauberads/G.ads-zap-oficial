import React, { useState, useEffect, useContext } from "react";
import qs from "query-string";
import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";

import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Helmet } from "react-helmet";

import { openApi } from "../../services/api";
import toastError from "../../errors/toastError";
import useSettings from "../../hooks/useSettings";
import ColorModeContext from "../../layout/themeContext";
import { getBackendUrl } from "../../config";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
    root: {
        width: "100vw",
        height: "100vh",
        display: "flex",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(135deg, #f6f8fb 0%, #e5ebf1 100%)",
        [theme.breakpoints.down("md")]: {
            flexDirection: "column"
        }
    },

    leftSide: {
        width: "58%",
        minWidth: 0,
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        padding: "28px",
        boxSizing: "border-box",
        [theme.breakpoints.down("md")]: {
            width: "100%",
            height: "34%",
            paddingBottom: "14px"
        },
        [theme.breakpoints.down("sm")]: {
            height: "240px",
            padding: "14px"
        }
    },

    bannerShell: {
        width: "100%",
        height: "100%",
        position: "relative",
        borderRadius: "28px",
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch"
    },

    bannerImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center",
        display: "block"
    },

    bannerOverlay: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)",
        zIndex: 1
    },

    bannerContent: {
        position: "absolute",
        inset: 0,
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "34px",
        boxSizing: "border-box",
        [theme.breakpoints.down("sm")]: { padding: "20px" }
    },

    bannerTopRow: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16
    },

    brandChip: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.2)",
        border: "1px solid rgba(255,255,255,0.3)",
        color: "#ffffff",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
        backdropFilter: "blur(10px)"
    },

    bannerBottom: {
        maxWidth: "680px"
    },

    bannerTitle: {
        fontSize: 42,
        lineHeight: 1.05,
        fontWeight: 800,
        color: "#ffffff",
        letterSpacing: "-0.02em",
        marginBottom: 14,
        textShadow: "0 8px 30px rgba(0,0,0,0.28)",
        [theme.breakpoints.down("lg")]: { fontSize: 34 },
        [theme.breakpoints.down("sm")]: { fontSize: 24 }
    },

    bannerText: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 15,
        lineHeight: 1.6,
        maxWidth: 560,
        [theme.breakpoints.down("sm")]: { fontSize: 13 }
    },

    bannerBadges: {
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 22
    },

    bannerBadge: {
        padding: "9px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.2)",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "#ffffff",
        fontSize: 12,
        fontWeight: 600,
        backdropFilter: "blur(10px)"
    },

    bannerFallback: {
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "40px",
        boxSizing: "border-box",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        "& $bannerTitle": { color: "#0f172a", textShadow: "none" },
        "& $bannerText": { color: "#475569" },
        "& $brandChip": {
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#1e293b"
        },
        "& $bannerBadge": {
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#475569"
        },
        [theme.breakpoints.down("sm")]: { padding: "22px" }
    },

    rightSide: {
        width: "42%",
        minWidth: 0,
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px",
        boxSizing: "border-box",
        position: "relative",
        [theme.breakpoints.down("md")]: {
            width: "100%",
            height: "66%",
            paddingTop: 0
        },
        [theme.breakpoints.down("sm")]: {
            height: "calc(100% - 240px)",
            padding: "14px"
        }
    },

    formSide: {
        width: "100%",
        maxWidth: "520px",
        minWidth: 0,
        maxHeight: "calc(100vh - 56px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        padding: "34px 30px",
        boxSizing: "border-box",
        overflowY: "auto",
        position: "relative",
        borderRadius: "26px",
        zIndex: 2,
        border: "1px solid #ffffff",
        boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
        [theme.breakpoints.down("sm")]: {
            maxWidth: "100%",
            maxHeight: "100%",
            padding: "26px 20px",
            borderRadius: "22px"
        }
    },

    formGlow: {
        position: "absolute",
        width: 220,
        height: 220,
        top: -90,
        right: -90,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)",
        pointerEvents: "none"
    },

    formGlow2: {
        position: "absolute",
        width: 180,
        height: 180,
        bottom: -70,
        left: -60,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,197,94,0.06), transparent 70%)",
        pointerEvents: "none"
    },

    formContent: {
        width: "100%",
        maxWidth: "420px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        zIndex: 2
    },

    logoWrap: {
        width: "100%",
        display: "flex",
        justifyContent: "center",
        marginBottom: 20
    },

    logoImg: {
        maxWidth: "210px",
        maxHeight: "64px",
        display: "block",
        objectFit: "contain"
    },

    formTitle: {
        width: "100%",
        textAlign: "center",
        fontSize: 28,
        fontWeight: 800,
        color: "#1e293b",
        marginBottom: 6,
        letterSpacing: "-0.02em"
    },

    subtitle: {
        fontSize: "13px",
        color: "#64748b",
        marginBottom: "22px",
        textAlign: "center",
        lineHeight: 1.6
    },

    tabsWrapper: {
        display: "flex",
        backgroundColor: "#f1f5f9",
        borderRadius: "12px",
        padding: "4px",
        width: "100%",
        marginBottom: "20px",
        border: "1px solid #e2e8f0"
    },

    tab: {
        flex: 1,
        padding: "10px 0",
        border: "none",
        background: "transparent",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: 700,
        cursor: "pointer",
        color: "#64748b",
        transition: "all 0.2s ease"
    },

    tabActive: {
        background: "#ffffff",
        color: "#0f172a",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
    },

    sectionBlock: {
        width: "100%"
    },

    sectionTitle: {
        width: "100%",
        textAlign: "center",
        fontSize: 22,
        fontWeight: 800,
        color: "#1e293b",
        marginBottom: 6,
        letterSpacing: "-0.02em"
    },

    sectionSubtitle: {
        fontSize: "13px",
        color: "#64748b",
        marginBottom: "18px",
        textAlign: "center",
        lineHeight: 1.6
    },

    plansWrap: {
        width: "100%",
        maxHeight: "340px",
        overflowY: "auto",
        paddingRight: "4px"
    },

    planCard: {
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "12px",
        width: "100%",
        boxSizing: "border-box",
        cursor: "pointer",
        transition: "all 0.2s ease",
        background: "#ffffff",
        "&:hover": {
            borderColor: theme.palette.primary.main,
            boxShadow: "0 8px 20px rgba(0,0,0,0.04)"
        }
    },

    planCardSelected: {
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}0D`,
        boxShadow: `0 0 0 3px ${theme.palette.primary.main}14`
    },

    planTop: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 8
    },

    planName: {
        fontSize: "15px",
        fontWeight: 800,
        color: "#0f172a"
    },

    planPrice: {
        fontSize: "15px",
        fontWeight: 800,
        color: "#0f172a",
        whiteSpace: "nowrap"
    },

    planBadge: {
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 700,
        color: theme.palette.primary.main,
        marginBottom: "8px"
    },

    planChips: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6
    },

    planChip: {
        display: "inline-block",
        background: "#f8fafc",
        borderRadius: "999px",
        padding: "5px 9px",
        fontSize: "11px",
        color: "#475569",
        border: "1px solid #e2e8f0"
    },

    planMeta: {
        fontSize: "12px",
        color: "#64748b",
        marginTop: "10px"
    },

    selectedPlanBox: {
        width: "100%",
        padding: "14px 16px",
        borderRadius: "14px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        marginBottom: "16px",
        boxSizing: "border-box"
    },

    selectedPlanLabel: {
        fontSize: "11px",
        fontWeight: 700,
        color: theme.palette.primary.main,
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5
    },

    selectedPlanName: {
        fontSize: "15px",
        fontWeight: 800,
        color: "#0f172a"
    },

    selectedPlanMeta: {
        fontSize: "12px",
        color: "#64748b",
        marginTop: 4
    },

    inputLabel: {
        fontSize: "13px",
        fontWeight: 700,
        color: "#475569",
        marginBottom: "6px",
        display: "block",
        textAlign: "left",
        width: "100%"
    },

    textField: {
        marginBottom: "12px",
        "& .MuiOutlinedInput-root": {
            borderRadius: "10px",
            fontSize: "14px",
            backgroundColor: "#ffffff",
            color: "#1e293b",
            transition: "all 0.2s ease",
            "& fieldset": {
                borderColor: "#cbd5e1"
            },
            "&:hover fieldset": {
                borderColor: "#94a3b8"
            },
            "&.Mui-focused": {
                backgroundColor: "#ffffff"
            },
            "&.Mui-focused fieldset": {
                borderColor: theme.palette.primary.main,
                borderWidth: "1.5px",
                boxShadow: `0 0 0 3px ${theme.palette.primary.main}1A`
            }
        },
        "& .MuiInputBase-input": {
            color: "#1e293b",
            "&::placeholder": {
                color: "#94a3b8",
                opacity: 1
            }
        },
        "& .MuiFormHelperText-root": {
            marginLeft: 2
        }
    },

    formActions: {
        width: "100%",
        display: "flex",
        gap: 10,
        marginTop: 6
    },

    backButton: {
        flex: 1,
        padding: "13px 0",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: 700,
        textTransform: "none",
        background: "#ffffff",
        color: "#475569",
        border: "1px solid #cbd5e1",
        boxShadow: "none",
        "&:hover": {
            background: "#f8fafc",
            boxShadow: "none"
        }
    },

    submitButton: {
        width: "100%",
        padding: "13px 0",
        borderRadius: "10px",
        fontSize: "15px",
        fontWeight: 800,
        textTransform: "none",
        color: "#fff",
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark || theme.palette.primary.main
            })`,
        boxShadow: `0 8px 20px ${theme.palette.primary.main}35`,
        border: "none",
        marginTop: "10px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
            opacity: 0.95,
            transform: "translateY(-1px)",
            boxShadow: `0 12px 24px ${theme.palette.primary.main}45`
        }
    },

    continueButton: {
        marginTop: "8px"
    },

    loginLink: {
        marginTop: "16px",
        fontSize: "13px",
        color: "#64748b",
        textAlign: "center",
        width: "100%",
        "& a": {
            color: theme.palette.primary.main,
            fontWeight: 700,
            textDecoration: "none",
            "&:hover": {
                textDecoration: "underline"
            }
        }
    },

    supportRow: {
        width: "100%",
        marginTop: 18,
        paddingTop: 16,
        borderTop: "1px solid #f1f5f9",
        display: "flex",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
        color: "#64748b",
        fontSize: 12
    },

    supportHighlight: {
        color: "#0f172a",
        fontWeight: 700
    },

    footer: {
        marginTop: "22px",
        textAlign: "center",
        fontSize: "12px",
        color: "#94a3b8",
        width: "100%",
        lineHeight: 1.7
    },

    emptyPlans: {
        width: "100%",
        padding: "20px 16px",
        border: "1px dashed #cbd5e1",
        borderRadius: "14px",
        textAlign: "center",
        color: "#64748b",
        background: "#f8fafc",
        boxSizing: "border-box"
    }
}));

const STEP_PLAN = "plan";
const STEP_FORM = "form";
const STEP_VERIFY = "verify";

const SignUp = () => {
    const classes = useStyles();
    const history = useHistory();
    const { colorMode } = useContext(ColorModeContext);
    const { appLogoFavicon, appName, appLogoDark, appLogoLight, mode } = colorMode;
    const { getPublicSetting } = useSettings();

    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [validatingCnpj, setValidatingCnpj] = useState(false);
    const [lastValidatedDocument, setLastValidatedDocument] = useState("");
    const [step, setStep] = useState(STEP_PLAN);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [requireDocument, setRequireDocument] = useState(false);
    const [signingUp, setSigningUp] = useState(false);
    const [pendingEmail, setPendingEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [resendingCode, setResendingCode] = useState(false);

    const [uploadedBackgroundBannerUrl, setUploadedBackgroundBannerUrl] = useState("");
    const [uploadedLoginBannerUrl, setUploadedLoginBannerUrl] = useState("");
    const [loginBannerExternalUrl, setLoginBannerExternalUrl] = useState("");
    const [loginBannerMode, setLoginBannerMode] = useState("upload");

    const [loginBannerTitle, setLoginBannerTitle] = useState(" ");
    const [loginBannerSubtitle, setLoginBannerSubtitle] = useState(
        "Use este banner para divulgar planos, campanhas, novidades, diferenciais do produto ou qualquer comunicação visual forte da sua empresa."
    );
    const [loginBannerBadge1, setLoginBannerBadge1] = useState("Banner promocional");
    const [loginBannerBadge2, setLoginBannerBadge2] = useState("Divulgação da marca");
    const [loginBannerBadge3, setLoginBannerBadge3] = useState("Campanhas e ofertas");

    const [loginLogoUploadUrl, setLoginLogoUploadUrl] = useState("");
    const [loginLogoExternalUrl, setLoginLogoExternalUrl] = useState("");

    const [assetVersion, setAssetVersion] = useState("1");
    const [bannerLoadError, setBannerLoadError] = useState(false);
    const [logoLoadError, setLogoLoadError] = useState(false);

    const getCompanyIdFromUrl = () => {
        const params = qs.parse(window.location.search);
        const rawCompanyId = params.companyId;

        if (Array.isArray(rawCompanyId)) {
            const parsed = parseInt(rawCompanyId[0], 10);
            return Number.isNaN(parsed) ? null : parsed;
        }

        if (rawCompanyId === undefined || rawCompanyId === null || rawCompanyId === "") {
            return null;
        }

        const parsed = parseInt(rawCompanyId, 10);
        return Number.isNaN(parsed) ? null : parsed;
    };

    const companyId = getCompanyIdFromUrl();

    const appendAssetVersion = (value, version) => {
        if (!value || String(value).startsWith("data:")) return value;
        const separator = String(value).includes("?") ? "&" : "?";
        return `${value}${separator}v=${version}`;
    };

    const buildPublicAssetUrl = (value, companyIdFromParam = null) => {
        if (!value) return "";

        if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
            return String(value).trim();
        }

        let raw = String(value).trim().replace(/\\/g, "/");

        const publicMarker = "/public/";
        const publicIndex = raw.lastIndexOf(publicMarker);

        if (publicIndex !== -1) {
            raw = raw.slice(publicIndex + publicMarker.length);
        }

        raw = raw.replace(/^\/+/, "").replace(/^public\//, "");

        const resolvedCompanyId = companyIdFromParam || companyId || 1;

        if (!/^company\d+\//i.test(raw)) {
            raw = `company${resolvedCompanyId}/${raw}`;
        }

        return `${getBackendUrl()}/public/${raw}`;
    };

    const requestWithTimeout = (promise, timeout = 12000) =>
        Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("TIMEOUT_FETCH_PLANS")), timeout)
            )
        ]);

    const normalizePlanList = (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.plans)) return response.plans;
        if (Array.isArray(response?.data?.plans)) return response.data.plans;
        return [];
    };

    const fetchPublicPlans = async () => {
        const candidates = [
            { url: "/plans/", params: { companyId, listPublic: "true" } },
            { url: "/plans", params: { companyId, listPublic: "true" } },
            { url: "/plans/list", params: { companyId, listPublic: "true" } },
            { url: "/plans/", params: { companyId, listPublic: "false" } },
            { url: "/plans", params: { companyId, listPublic: "false" } },
            { url: "/plans/list", params: { companyId, listPublic: "false" } }
        ];

        let lastError = null;

        for (const candidate of candidates) {
            try {
                const response = await requestWithTimeout(
                    openApi.get(candidate.url, { params: candidate.params }),
                    12000
                );

                const list = normalizePlanList(response);

                console.log(
                    "[SIGNUP][PLANS] endpoint:",
                    candidate.url,
                    "params:",
                    candidate.params,
                    "result:",
                    response?.data
                );

                if (Array.isArray(list) && list.length) {
                    return list;
                }
            } catch (err) {
                lastError = err;
                console.log("[SIGNUP][PLANS][ERROR]", candidate.url, candidate.params, err);
            }
        }

        if (lastError) {
            throw lastError;
        }

        return [];
    };

    const initialState = {
        name: "",
        email: "",
        password: "",
        phone: "",
        companyId,
        companyName: "",
        document: "",
        planId: ""
    };

    const [user] = useState(initialState);

    const validationSchema = Yup.object().shape({
        name: Yup.string().min(2).max(50).required("Obrigatório"),
        companyName: Yup.string().min(2).max(50).required("Obrigatório"),
        document: requireDocument
            ? Yup.string().min(3).required("Obrigatório")
            : Yup.string().notRequired(),
        password: Yup.string().min(5).max(50).required("Obrigatório"),
        email: Yup.string().email("E-mail inválido").required("Obrigatório"),
        phone: Yup.string().required("Obrigatório")
    });

    useEffect(() => {
        let isMounted = true;

        const preloadImage = (src) =>
            new Promise((resolve) => {
                if (!src) {
                    resolve("");
                    return;
                }

                const img = new Image();
                img.onload = () => resolve(src);
                img.onerror = () => resolve(src);
                img.src = src;
            });

        const loadPublicSettings = async () => {

            if (isMounted) {
                setBannerLoadError(false);
                setLogoLoadError(false);
            }

            const bgKey =
                mode === "light" ? "appLogoBackgroundLight" : "appLogoBackgroundDark";

            const [
                userCreationResult,
                requireDocumentResult,
                bgResult,
                loginBannerImageResult,
                loginBannerImageUrlResult,
                loginBannerModeResult,
                loginBannerTitleResult,
                loginBannerSubtitleResult,
                loginBannerBadge1Result,
                loginBannerBadge2Result,
                loginBannerBadge3Result,
                loginLogoResult,
                loginLogoUrlResult
            ] = await Promise.allSettled([
                getPublicSetting("userCreation", companyId),
                getPublicSetting("requireDocument", companyId),
                getPublicSetting(bgKey, companyId),
                getPublicSetting("loginBannerImage", companyId),
                getPublicSetting("loginBannerImageUrl", companyId),
                getPublicSetting("loginBannerMode", companyId),
                getPublicSetting("loginBannerTitle", companyId),
                getPublicSetting("loginBannerSubtitle", companyId),
                getPublicSetting("loginBannerBadge1", companyId),
                getPublicSetting("loginBannerBadge2", companyId),
                getPublicSetting("loginBannerBadge3", companyId),
                getPublicSetting("loginLogo", companyId),
                getPublicSetting("loginLogoUrl", companyId)
            ]);

            if (!isMounted) return;

            const userCreation =
                userCreationResult.status === "fulfilled" ? userCreationResult.value : null;

            if (userCreation === "disabled") {
                toast.error(i18n.t("signup.toasts.disabled"));
                history.push("/login");
                return;
            }

            const requireDocumentValue =
                requireDocumentResult.status === "fulfilled"
                    ? requireDocumentResult.value
                    : null;

            setRequireDocument(requireDocumentValue === "enabled");

            const bgValue = bgResult.status === "fulfilled" ? bgResult.value : "";
            const loginBannerImageValue =
                loginBannerImageResult.status === "fulfilled"
                    ? loginBannerImageResult.value
                    : "";
            const loginBannerImageUrlValue =
                loginBannerImageUrlResult.status === "fulfilled"
                    ? loginBannerImageUrlResult.value
                    : "";
            const loginBannerModeValue =
                loginBannerModeResult.status === "fulfilled"
                    ? loginBannerModeResult.value || "upload"
                    : "upload";

            const loginLogoValue =
                loginLogoResult.status === "fulfilled" ? loginLogoResult.value : "";
            const loginLogoUrlValue =
                loginLogoUrlResult.status === "fulfilled" ? loginLogoUrlResult.value : "";

            const backgroundBannerBuilt = bgValue
                ? buildPublicAssetUrl(bgValue, companyId)
                : "";

            const loginBannerBuilt = loginBannerImageValue
                ? buildPublicAssetUrl(loginBannerImageValue, companyId)
                : "";

            const loginBannerExternalBuilt = loginBannerImageUrlValue
                ? String(loginBannerImageUrlValue).trim()
                : "";

            const loginLogoBuilt = loginLogoValue
                ? buildPublicAssetUrl(loginLogoValue, companyId)
                : "";

            const loginLogoExternalBuilt = loginLogoUrlValue
                ? buildPublicAssetUrl(loginLogoUrlValue, companyId)
                : "";

            const firstBannerCandidate =
                loginBannerModeValue === "url"
                    ? loginBannerExternalBuilt || loginBannerBuilt || backgroundBannerBuilt
                    : loginBannerBuilt || backgroundBannerBuilt || loginBannerExternalBuilt;

            const firstLogoCandidate =
                loginLogoBuilt || loginLogoExternalBuilt || appLogoDark || appLogoLight || "";

            await Promise.all([
                preloadImage(firstBannerCandidate),
                preloadImage(firstLogoCandidate)
            ]);

            if (!isMounted) return;

            setUploadedBackgroundBannerUrl(backgroundBannerBuilt);
            setUploadedLoginBannerUrl(loginBannerBuilt);
            setLoginBannerExternalUrl(loginBannerExternalBuilt);
            setLoginBannerMode(loginBannerModeValue);

            setLoginBannerTitle(
                loginBannerTitleResult.status === "fulfilled"
                    ? loginBannerTitleResult.value || " "
                    : " "
            );

            setLoginBannerSubtitle(
                loginBannerSubtitleResult.status === "fulfilled"
                    ? loginBannerSubtitleResult.value ||
                    "Use este banner para divulgar planos, campanhas, novidades, diferenciais do produto ou qualquer comunicação visual forte da sua empresa."
                    : "Use este banner para divulgar planos, campanhas, novidades, diferenciais do produto ou qualquer comunicação visual forte da sua empresa."
            );

            setLoginBannerBadge1(
                loginBannerBadge1Result.status === "fulfilled"
                    ? loginBannerBadge1Result.value || "Banner promocional"
                    : "Banner promocional"
            );

            setLoginBannerBadge2(
                loginBannerBadge2Result.status === "fulfilled"
                    ? loginBannerBadge2Result.value || "Divulgação da marca"
                    : "Divulgação da marca"
            );

            setLoginBannerBadge3(
                loginBannerBadge3Result.status === "fulfilled"
                    ? loginBannerBadge3Result.value || "Campanhas e ofertas"
                    : "Campanhas e ofertas"
            );

            setLoginLogoUploadUrl(loginLogoBuilt);
            setLoginLogoExternalUrl(loginLogoExternalBuilt);
        };

        loadPublicSettings();

        return () => {
            isMounted = false;
        };
    }, [companyId, getPublicSetting, history, mode, appLogoDark, appLogoLight]);

    useEffect(() => {
        let isMounted = true;

        const loadPlans = async () => {
            setLoadingPlans(true);

            try {
                const result = await fetchPublicPlans();

                if (isMounted) {
                    setPlans(result);
                }
            } catch (err) {
                console.log("[SIGNUP][PLANS][FINAL_ERROR]", err);

                if (isMounted) {
                    setPlans([]);
                }
            } finally {
                if (isMounted) {
                    setLoadingPlans(false);
                }
            }
        };

        loadPlans();

        return () => {
            isMounted = false;
        };
    }, [companyId]);

    const formatDocument = (value) => {
        if (/[a-zA-Z]/.test(value)) return value;

        const n = String(value || "").replace(/\D/g, "");

        if (n.length <= 11) {
            if (n.length <= 3) return n;
            if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
            if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
            return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`;
        }

        const m = n.slice(0, 14);

        if (m.length <= 2) return m;
        if (m.length <= 5) return `${m.slice(0, 2)}.${m.slice(2)}`;
        if (m.length <= 8) return `${m.slice(0, 2)}.${m.slice(2, 5)}.${m.slice(5)}`;
        if (m.length <= 12) return `${m.slice(0, 2)}.${m.slice(2, 5)}.${m.slice(5, 8)}/${m.slice(8)}`;
        return `${m.slice(0, 2)}.${m.slice(2, 5)}.${m.slice(5, 8)}/${m.slice(8, 12)}-${m.slice(12)}`;
    };

    const validateDocument = async (document, setFieldValue) => {
        if (!document || !String(document).trim()) return true;

        const clean = String(document).replace(/\D/g, "");
        const hasLetters = /[a-zA-Z]/.test(String(document).trim());
        const isForeign =
            hasLetters ||
            (clean.length !== 11 && clean.length !== 14 && String(document).trim().length > 0);

        if (isForeign) {
            return true;
        }

        if (lastValidatedDocument === clean) return true;
        setLastValidatedDocument(clean);

        if (clean.length === 11) {
            toast.success("CPF válido!");
            return true;
        }

        if (clean.length === 14) {
            setValidatingCnpj(true);
            try {
                const res = await openApi.post("/auth/validate-cnpj", { cnpj: clean });
                setValidatingCnpj(false);

                if (res?.data?.valid && res?.data?.data?.nome) {
                    setFieldValue("companyName", res.data.data.nome);
                    toast.success("CNPJ válido! Nome preenchido automaticamente.");
                    return true;
                }

                toast.error("Documento inválido.");
                return false;
            } catch (_) {
                setValidatingCnpj(false);
                toast.error("Erro ao validar documento.");
                return false;
            }
        }

        return true;
    };

    const handleSignUp = async (values, actions) => {
        if (signingUp) return;

        setSigningUp(true);

        try {
            const payload = {
                ...values,
                companyId,
                planId: selectedPlan?.id || values.planId || ""
            };

            const response = await openApi.post("/auth/signup", payload);
            const responseEmail = response?.data?.email || values.email;

            setPendingEmail(responseEmail);
            setVerificationCode("");
            setStep(STEP_VERIFY);

            toast.success("Cadastro realizado com sucesso. Enviamos um código para o seu e-mail.");
        } catch (err) {
            toastError(err);
            if (actions) actions.setSubmitting(false);
        } finally {
            setSigningUp(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!pendingEmail) {
            toast.error("E-mail não encontrado para confirmação.");
            return;
        }

        if (!verificationCode || String(verificationCode).trim().length === 0) {
            toast.error("Digite o código de verificação.");
            return;
        }

        setVerifyingEmail(true);

        try {
            await openApi.post("/users/verify-email", {
                email: pendingEmail,
                code: String(verificationCode).trim()
            });

            toast.success("E-mail confirmado com sucesso. Agora você já pode entrar.");
            history.push("/login");
        } catch (err) {
            toastError(err);
        } finally {
            setVerifyingEmail(false);
        }
    };

    const handleResendVerificationCode = async () => {
        if (!pendingEmail) {
            toast.error("E-mail não encontrado para reenvio.");
            return;
        }

        setResendingCode(true);

        try {
            await openApi.post("/users/resend-verification-code", {
                email: pendingEmail
            });

            toast.success("Código reenviado com sucesso.");
        } catch (err) {
            toastError(err);
        } finally {
            setResendingCode(false);
        }
    };

    const getPlanFeatures = (plan) => {
        const features = [];

        if (plan.useWhatsapp) features.push("WhatsApp");
        if (plan.useFacebook) features.push("Facebook");
        if (plan.useInstagram) features.push("Instagram");
        if (plan.useCampaigns) features.push("Campanhas");
        if (plan.useSchedules) features.push("Agendamentos");
        if (plan.useInternalChat) features.push("Chat Interno");
        if (plan.useExternalApi) features.push("API Externa");
        if (plan.useIntegrations) features.push("Integrações");
        if (plan.useOpenAi) features.push("OpenAI");
        if (plan.useKanban) features.push("Kanban");

        return features;
    };

    const defaultLogoToShow = appLogoDark || appLogoLight;

    const uploadedBannerUrl = uploadedLoginBannerUrl || uploadedBackgroundBannerUrl;

    const primaryBannerRaw =
        loginBannerMode === "url"
            ? loginBannerExternalUrl || uploadedBannerUrl
            : uploadedBannerUrl || loginBannerExternalUrl;

    const secondaryBannerRaw =
        loginBannerMode === "url" ? uploadedBannerUrl : loginBannerExternalUrl;

    const bannerUrlToShow =
        bannerLoadError && secondaryBannerRaw && secondaryBannerRaw !== primaryBannerRaw
            ? secondaryBannerRaw
            : primaryBannerRaw;

    const finalBannerUrl = bannerUrlToShow
        ? appendAssetVersion(bannerUrlToShow, assetVersion)
        : "";

    const primaryLogoRaw = loginLogoUploadUrl || loginLogoExternalUrl || defaultLogoToShow;
    const fallbackLogoRaw = defaultLogoToShow || "";

    const logoUrlToShow =
        logoLoadError && fallbackLogoRaw && fallbackLogoRaw !== primaryLogoRaw
            ? fallbackLogoRaw
            : primaryLogoRaw;

    const finalLogoToShow = logoUrlToShow
        ? appendAssetVersion(logoUrlToShow, assetVersion)
        : "";

    return (
        <React.Fragment>
            <Helmet>
                <title>{appName || "Multizap - Cadastro"}</title>
                <link rel="icon" href={appLogoFavicon || "/default-favicon.ico"} />
            </Helmet>

            <div className={classes.root}>
                <CssBaseline />

                <div className={classes.leftSide}>
                    <div className={classes.bannerShell}>
                        {!!finalBannerUrl ? (
                            <>
                                <img
                                    key={finalBannerUrl}
                                    src={finalBannerUrl}
                                    alt="banner"
                                    className={classes.bannerImage}
                                    onError={() => {
                                        if (
                                            !bannerLoadError &&
                                            secondaryBannerRaw &&
                                            secondaryBannerRaw !== primaryBannerRaw
                                        ) {
                                            setBannerLoadError(true);
                                            return;
                                        }

                                        setBannerLoadError(true);
                                    }}
                                />
                                <div className={classes.bannerOverlay} />

                                <div className={classes.bannerContent}>
                                    <div className={classes.bannerTopRow}>
                                        <div className={classes.brandChip}>
                                            {appName || "Seu Produto"}
                                        </div>
                                    </div>

                                    <div className={classes.bannerBottom}>
                                        <Typography className={classes.bannerTitle}>
                                            {loginBannerTitle}
                                        </Typography>

                                        <Typography className={classes.bannerText}>
                                            {loginBannerSubtitle}
                                        </Typography>

                                        <div className={classes.bannerBadges}>
                                            {!!loginBannerBadge1 && (
                                                <div className={classes.bannerBadge}>{loginBannerBadge1}</div>
                                            )}
                                            {!!loginBannerBadge2 && (
                                                <div className={classes.bannerBadge}>{loginBannerBadge2}</div>
                                            )}
                                            {!!loginBannerBadge3 && (
                                                <div className={classes.bannerBadge}>{loginBannerBadge3}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={classes.bannerFallback}>
                                <div>
                                    <div className={classes.brandChip}>
                                        {appName || "Seu Produto"}
                                    </div>
                                </div>

                                <div>
                                    <Typography className={classes.bannerTitle}>
                                        {loginBannerTitle ||
                                            "Sua marca merece uma entrada forte, bonita e profissional."}
                                    </Typography>

                                    <Typography className={classes.bannerText}>
                                        {loginBannerSubtitle ||
                                            "Configure um banner institucional ou promocional para transformar a tela de cadastro em uma vitrine do seu produto."}
                                    </Typography>

                                    <div className={classes.bannerBadges}>
                                        {!!loginBannerBadge1 && (
                                            <div className={classes.bannerBadge}>{loginBannerBadge1}</div>
                                        )}
                                        {!!loginBannerBadge2 && (
                                            <div className={classes.bannerBadge}>{loginBannerBadge2}</div>
                                        )}
                                        {!!loginBannerBadge3 && (
                                            <div className={classes.bannerBadge}>{loginBannerBadge3}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={classes.rightSide}>
                    <div className={classes.formSide}>
                        <div className={classes.formGlow} />
                        <div className={classes.formGlow2} />

                        <div className={classes.formContent}>
                            <div className={classes.logoWrap}>
                                {!!finalLogoToShow && (
                                    <img
                                        key={finalLogoToShow}
                                        className={classes.logoImg}
                                        src={finalLogoToShow}
                                        alt={appName || "Logo"}
                                        onError={() => {
                                            if (
                                                !logoLoadError &&
                                                fallbackLogoRaw &&
                                                fallbackLogoRaw !== primaryLogoRaw
                                            ) {
                                                setLogoLoadError(true);
                                                return;
                                            }

                                            setLogoLoadError(true);
                                        }}
                                    />
                                )}
                            </div>

                            <Typography className={classes.formTitle}>
                                Criar conta
                            </Typography>

                            <Typography className={classes.subtitle}>
                                Escolha um plano e finalize seu cadastro para começar a usar o sistema.
                            </Typography>

                            <div className={classes.tabsWrapper}>
                                <button
                                    type="button"
                                    className={classes.tab}
                                    onClick={() => history.push("/login")}
                                >
                                    {i18n.t("login.buttons.submit") || "Login"}
                                </button>

                                <button
                                    type="button"
                                    className={`${classes.tab} ${classes.tabActive}`}
                                >
                                    Cadastre-se
                                </button>
                            </div>

                            {step === STEP_PLAN && (
                                <div className={classes.sectionBlock}>
                                    <Typography className={classes.sectionTitle}>
                                        Escolha seu plano
                                    </Typography>

                                    <Typography className={classes.sectionSubtitle}>
                                        Selecione a opção ideal para a sua empresa.
                                    </Typography>

                                    {loadingPlans ? (
                                        <div style={{ width: "100%", textAlign: "center", padding: "24px 0" }}>
                                            <CircularProgress size={28} />
                                        </div>
                                    ) : plans.length ? (
                                        <div className={classes.plansWrap}>
                                            {plans.map((plan) => {
                                                const features = getPlanFeatures(plan);
                                                const isSelected = selectedPlan?.id === plan.id;

                                                return (
                                                    <div
                                                        key={plan.id}
                                                        className={`${classes.planCard} ${isSelected ? classes.planCardSelected : ""
                                                            }`}
                                                        onClick={() => setSelectedPlan(plan)}
                                                    >
                                                        <div className={classes.planTop}>
                                                            <span className={classes.planName}>{plan.name}</span>
                                                            <span className={classes.planPrice}>
                                                                R$ {parseFloat(plan.amount || 0).toFixed(2).replace(".", ",")}/mês
                                                            </span>
                                                        </div>

                                                        <div className={classes.planBadge}>
                                                            Ideal para sua empresa
                                                        </div>

                                                        <div className={classes.planChips}>
                                                            {features.map((feature) => (
                                                                <span key={feature} className={classes.planChip}>
                                                                    {feature}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        <div className={classes.planMeta}>
                                                            Até {plan.users || "?"} usuários · Até {plan.connections || "?"} conexões
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className={classes.emptyPlans}>
                                            Nenhum plano disponível no momento.
                                        </div>
                                    )}

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color="primary"
                                        className={`${classes.submitButton} ${classes.continueButton}`}
                                        disabled={!selectedPlan}
                                        onClick={() => setStep(STEP_FORM)}
                                    >
                                        Continuar
                                    </Button>

                                    <div className={classes.loginLink}>
                                        Já tem uma conta?{" "}
                                        <a
                                            href="/login"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                history.push("/login");
                                            }}
                                        >
                                            Entrar
                                        </a>
                                    </div>
                                </div>
                            )}

                            {step === STEP_FORM && (
                                <div className={classes.sectionBlock}>
                                    <Typography className={classes.sectionTitle}>
                                        Preencha seus dados
                                    </Typography>

                                    <Typography className={classes.sectionSubtitle}>
                                        Informe os dados da sua empresa para concluir o cadastro.
                                    </Typography>

                                    {!!selectedPlan && (
                                        <div className={classes.selectedPlanBox}>
                                            <div className={classes.selectedPlanLabel}>Plano selecionado</div>
                                            <div className={classes.selectedPlanName}>{selectedPlan.name}</div>
                                            <div className={classes.selectedPlanMeta}>
                                                R$ {parseFloat(selectedPlan.amount || 0).toFixed(2).replace(".", ",")}/mês
                                            </div>
                                        </div>
                                    )}

                                    <Formik
                                        initialValues={{
                                            ...user,
                                            planId: selectedPlan?.id || ""
                                        }}
                                        enableReinitialize
                                        validationSchema={validationSchema}
                                        onSubmit={async (values, actions) => {
                                            actions.setSubmitting(true);
                                            await handleSignUp(values, actions);
                                        }}
                                    >
                                        {({ touched, errors, isSubmitting, setFieldValue, values }) => (
                                            <Form style={{ width: "100%" }}>
                                                <Grid container spacing={1}>
                                                    <Grid item xs={12} sm={6}>
                                                        <label className={classes.inputLabel}>Nome</label>
                                                        <Field
                                                            as={TextField}
                                                            variant="outlined"
                                                            fullWidth
                                                            size="small"
                                                            placeholder="Digite seu nome"
                                                            name="name"
                                                            className={classes.textField}
                                                            error={touched.name && Boolean(errors.name)}
                                                            helperText={touched.name && errors.name}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} sm={6}>
                                                        <label className={classes.inputLabel}>Empresa</label>
                                                        <Field
                                                            as={TextField}
                                                            variant="outlined"
                                                            fullWidth
                                                            size="small"
                                                            placeholder="Nome da empresa"
                                                            name="companyName"
                                                            className={classes.textField}
                                                            error={touched.companyName && Boolean(errors.companyName)}
                                                            helperText={touched.companyName && errors.companyName}
                                                        />
                                                    </Grid>

                                                    {requireDocument && (
                                                        <Grid item xs={12} sm={6}>
                                                            <label className={classes.inputLabel}>
                                                                CPF / CNPJ / Documento
                                                            </label>
                                                            <Field
                                                                as={TextField}
                                                                variant="outlined"
                                                                fullWidth
                                                                size="small"
                                                                placeholder="Digite o documento"
                                                                name="document"
                                                                className={classes.textField}
                                                                error={touched.document && Boolean(errors.document)}
                                                                helperText={touched.document && errors.document}
                                                                onChange={(e) =>
                                                                    setFieldValue("document", formatDocument(e.target.value))
                                                                }
                                                                onBlur={() =>
                                                                    validateDocument(values.document, setFieldValue)
                                                                }
                                                                InputProps={{
                                                                    endAdornment: validatingCnpj ? (
                                                                        <CircularProgress size={16} />
                                                                    ) : null
                                                                }}
                                                            />
                                                        </Grid>
                                                    )}

                                                    <Grid item xs={12} sm={requireDocument ? 6 : 12}>
                                                        <label className={classes.inputLabel}>Telefone</label>
                                                        <Field
                                                            as={TextField}
                                                            variant="outlined"
                                                            fullWidth
                                                            size="small"
                                                            placeholder="Digite seu telefone"
                                                            name="phone"
                                                            className={classes.textField}
                                                            error={touched.phone && Boolean(errors.phone)}
                                                            helperText={touched.phone && errors.phone}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12}>
                                                        <label className={classes.inputLabel}>E-mail</label>
                                                        <Field
                                                            as={TextField}
                                                            variant="outlined"
                                                            fullWidth
                                                            size="small"
                                                            placeholder="Digite seu e-mail"
                                                            name="email"
                                                            className={classes.textField}
                                                            error={touched.email && Boolean(errors.email)}
                                                            helperText={touched.email && errors.email}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12}>
                                                        <label className={classes.inputLabel}>Senha</label>
                                                        <Field
                                                            as={TextField}
                                                            variant="outlined"
                                                            fullWidth
                                                            size="small"
                                                            placeholder="Crie uma senha"
                                                            type="password"
                                                            name="password"
                                                            className={classes.textField}
                                                            error={touched.password && Boolean(errors.password)}
                                                            helperText={touched.password && errors.password}
                                                        />
                                                    </Grid>
                                                </Grid>

                                                <div className={classes.formActions}>
                                                    <Button
                                                        variant="contained"
                                                        className={classes.backButton}
                                                        onClick={() => setStep(STEP_PLAN)}
                                                    >
                                                        Voltar
                                                    </Button>

                                                    <Button
                                                        type="submit"
                                                        variant="contained"
                                                        color="primary"
                                                        disabled={isSubmitting || signingUp}
                                                        className={classes.submitButton}
                                                        style={{ flex: 2, marginTop: 0 }}
                                                    >
                                                        {isSubmitting || signingUp ? (
                                                            <CircularProgress size={20} color="inherit" />
                                                        ) : (
                                                            "Criar conta"
                                                        )}
                                                    </Button>
                                                </div>
                                            </Form>
                                        )}
                                    </Formik>

                                    <div className={classes.loginLink}>
                                        Já tem uma conta?{" "}
                                        <a
                                            href="/login"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                history.push("/login");
                                            }}
                                        >
                                            Entrar
                                        </a>
                                    </div>
                                </div>
                            )}

                            {step === STEP_VERIFY && (
                                <div className={classes.sectionBlock}>
                                    <Typography className={classes.sectionTitle}>
                                        Confirmar e-mail
                                    </Typography>

                                    <Typography className={classes.sectionSubtitle}>
                                        Enviamos um código de confirmação para <strong>{pendingEmail}</strong>.
                                        Digite o código abaixo para liberar seu acesso.
                                    </Typography>

                                    {!!selectedPlan && (
                                        <div className={classes.selectedPlanBox}>
                                            <div className={classes.selectedPlanLabel}>Plano selecionado</div>
                                            <div className={classes.selectedPlanName}>{selectedPlan.name}</div>
                                            <div className={classes.selectedPlanMeta}>
                                                Conta criada com sucesso. Falta apenas confirmar o e-mail.
                                            </div>
                                        </div>
                                    )}

                                    <label className={classes.inputLabel}>Código de verificação</label>
                                    <TextField
                                        variant="outlined"
                                        fullWidth
                                        size="small"
                                        placeholder="Digite o código recebido"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        className={classes.textField}
                                    />

                                    <div className={classes.formActions}>
                                        <Button
                                            variant="contained"
                                            className={classes.backButton}
                                            onClick={() => setStep(STEP_FORM)}
                                            disabled={verifyingEmail || resendingCode}
                                        >
                                            Voltar
                                        </Button>

                                        <Button
                                            variant="contained"
                                            color="primary"
                                            disabled={verifyingEmail}
                                            className={classes.submitButton}
                                            style={{ flex: 2, marginTop: 0 }}
                                            onClick={handleVerifyEmail}
                                        >
                                            {verifyingEmail ? (
                                                <CircularProgress size={20} color="inherit" />
                                            ) : (
                                                "Confirmar código"
                                            )}
                                        </Button>
                                    </div>

                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        className={classes.backButton}
                                        style={{ marginTop: 12 }}
                                        onClick={handleResendVerificationCode}
                                        disabled={resendingCode || verifyingEmail}
                                    >
                                        {resendingCode ? (
                                            <CircularProgress size={20} color="inherit" />
                                        ) : (
                                            "Reenviar código"
                                        )}
                                    </Button>

                                    <div className={classes.loginLink}>
                                        Já confirmou seu e-mail?{" "}
                                        <a
                                            href="/login"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                history.push("/login");
                                            }}
                                        >
                                            Entrar
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className={classes.supportRow}>
                                <span>Cadastro seguro</span>
                                <span>•</span>
                                <span className={classes.supportHighlight}>
                                    {appName || "Sistema"}
                                </span>
                                <span>•</span>
                                <span>Ativação simplificada</span>
                            </div>

                            <div className={classes.footer}>
                                © {new Date().getFullYear()} {appName || "Sistema"}. Todos os direitos reservados.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
};

export default SignUp;