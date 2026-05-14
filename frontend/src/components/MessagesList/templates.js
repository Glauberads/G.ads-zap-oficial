import { Divider } from "@material-ui/core";
import { FileCopyOutlined, Language, Phone } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import MarkdownWrapper from "../MarkdownWrapper";

const useStyles = makeStyles((theme) => ({
  buttonTemplate: {
    backgroundColor: "transparent",
    border: "none",
    color: "#0CADE3",
    cursor: "pointer",
    padding: "8px 0",
    fontSize: "14px",
    fontWeight: 500,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    borderRadius: 6,
    "&:hover": {
      backgroundColor: "rgba(12, 173, 227, 0.08)",
    },
  },
  media: {
    maxWidth: "100%",
    height: "auto",
    borderRadius: 8,
    marginBottom: 8
  }
}));

const Template = ({ message }) => {
  const classes = useStyles();

  const parseJsonSafe = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;

    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  };

  const parseJsonDeep = (value, maxDepth = 3) => {
    let current = value;
    let depth = 0;

    while (typeof current === "string" && depth < maxDepth) {
      const parsed = parseJsonSafe(current);
      if (parsed === null) break;
      current = parsed;
      depth += 1;
    }

    return current;
  };

  const parseDataJson = () => {
    try {
      if (!message?.dataJson) return {};
      return parseJsonDeep(message.dataJson) || {};
    } catch (error) {
      return {};
    }
  };

  const splitBodyAndButtons = (value) => {
    const raw = String(value || "");
    const separatorIndex = raw.lastIndexOf("||||");

    if (separatorIndex === -1) {
      return {
        body: raw,
        buttonsPart: null
      };
    }

    return {
      body: raw.substring(0, separatorIndex),
      buttonsPart: raw.substring(separatorIndex + 4)
    };
  };

  const flattenButtons = (input) => {
    const result = [];

    const walk = (value) => {
      const parsedValue = parseJsonDeep(value);

      if (parsedValue == null) return;

      if (Array.isArray(parsedValue)) {
        parsedValue.forEach(walk);
        return;
      }

      if (typeof parsedValue === "object") {
        result.push(parsedValue);
      }
    };

    walk(input);

    return result;
  };

  const extractButtonsFromTemplateComponents = (template) => {
    const components = Array.isArray(template?.components) ? template.components : [];

    return components
      .filter((component) => String(component?.type || "").toUpperCase() === "BUTTON")
      .map((component, index) => {
        const firstParam = Array.isArray(component?.parameters) ? component.parameters[0] || {} : {};

        return {
          type: String(component?.sub_type || component?.type || "").toUpperCase(),
          text:
            firstParam?.text ||
            firstParam?.button_text ||
            firstParam?.payload ||
            component?.text ||
            `Botão ${index + 1}`,
          url:
            firstParam?.url ||
            firstParam?.link ||
            component?.url ||
            null,
          phone_number:
            firstParam?.phone_number ||
            firstParam?.phoneNumber ||
            component?.phone_number ||
            component?.phoneNumber ||
            null,
          payload:
            firstParam?.payload ||
            component?.payload ||
            null,
          example: Array.isArray(firstParam?.example)
            ? firstParam.example
            : firstParam?.example
              ? [firstParam.example]
              : []
        };
      });
  };

  const normalizeButtons = (rawButtons, template) => {
    let buttons = flattenButtons(rawButtons);

    if (!buttons.length) {
      buttons = extractButtonsFromTemplateComponents(template);
    }

    return buttons.map((button, index) => {
      const rawType = String(
        button?.type ||
        (button?.url ? "URL" : button?.phone_number ? "PHONE_NUMBER" : button?.example ? "COPY_CODE" : "QUICK_REPLY")
      ).toUpperCase();

      let normalizedType = rawType;

      if (rawType === "QUICK_REPLY" || rawType === "QUICK_REPLY_BUTTON") {
        normalizedType = "QUICK_REPLY";
      } else if (rawType === "URL" || rawType === "MPM" || rawType === "CTA_URL") {
        normalizedType = "URL";
      } else if (rawType === "PHONE_NUMBER" || rawType === "CTA_CALL") {
        normalizedType = "PHONE_NUMBER";
      } else if (rawType === "COPY_CODE" || rawType === "COUPON_CODE") {
        normalizedType = "COPY_CODE";
      }

      return {
        type: normalizedType,
        text:
          button?.text ||
          button?.label ||
          button?.display_text ||
          button?.title ||
          button?.payload ||
          `Botão ${index + 1}`,
        url: button?.url || button?.link || null,
        payload: button?.payload || null,
        phone_number: button?.phone_number || button?.phoneNumber || null,
        example: Array.isArray(button?.example)
          ? button.example
          : button?.example
            ? [button.example]
            : []
      };
    });
  };

  const removeMediaUrlFromText = (content, url) => {
    if (!content || !url) return String(content || "").trim();

    const escapedUrl = String(url).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return String(content).replace(new RegExp(escapedUrl, "g"), "").trim();
  };

  const dataJson = parseDataJson();

  const rawBody = String(message?.body || "");
  const bodySource = typeof dataJson?.body === "string" && dataJson.body
    ? dataJson.body
    : rawBody;

  const { body: cleanBodyFromSource, buttonsPart } = splitBodyAndButtons(bodySource);

  const mediaUrl =
    dataJson?.mediaUrl ||
    message?.mediaUrl ||
    null;

  const textWithoutMediaUrl = removeMediaUrlFromText(cleanBodyFromSource, mediaUrl);

  const buttons = normalizeButtons(
    dataJson?.templateButtons || buttonsPart,
    dataJson?.template
  );

  const isImage = (url) => /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
  const isVideo = (url) => /\.(mp4|webm|ogg)$/i.test(url);

  const copyToClipboard = async (text) => {
    const safeText = String(text || "").trim();
    if (!safeText) return;

    try {
      await navigator.clipboard.writeText(safeText);
    } catch (error) {}
  };

  const handleCopyCode = async (button) => {
    const code =
      Array.isArray(button?.example) && button.example[0]
        ? button.example[0]
        : button?.payload || button?.text || "";

    await copyToClipboard(code);
  };

  const handleQuickReply = async (button) => {
    await copyToClipboard(button?.payload || button?.text || "");
  };

  const renderButtonIcon = (buttonType) => {
    if (buttonType === "URL") return <Language fontSize="small" />;
    if (buttonType === "PHONE_NUMBER") return <Phone fontSize="small" />;
    return <FileCopyOutlined fontSize="small" />;
  };

  const ButtonRenderer = ({ buttons: normalizedButtons }) => {
    return (
      <div
        style={{
          marginTop: "10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "2px"
        }}
      >
        {normalizedButtons.map((button, index) => {
          if (button.type === "URL" && button.url) {
            return (
              <button
                key={index}
                onClick={() => window.open(button.url, "_blank")}
                className={classes.buttonTemplate}
              >
                {renderButtonIcon(button.type)}
                {button.text}
              </button>
            );
          }

          if (button.type === "PHONE_NUMBER" && button.phone_number) {
            return (
              <button
                key={index}
                onClick={() =>
                  window.open(
                    `https://wa.me/${String(button.phone_number).replace(/\D/g, "")}`,
                    "_blank"
                  )
                }
                className={classes.buttonTemplate}
              >
                {renderButtonIcon(button.type)}
                {button.text}
              </button>
            );
          }

          if (button.type === "COPY_CODE") {
            return (
              <button
                key={index}
                onClick={() => handleCopyCode(button)}
                className={classes.buttonTemplate}
              >
                {renderButtonIcon(button.type)}
                {button.text}
              </button>
            );
          }

          if (button.type === "QUICK_REPLY") {
            return (
              <button
                key={index}
                onClick={() => handleQuickReply(button)}
                className={classes.buttonTemplate}
              >
                {renderButtonIcon(button.type)}
                {button.text}
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => handleQuickReply(button)}
              className={classes.buttonTemplate}
            >
              {renderButtonIcon(button.type)}
              {button.text}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {mediaUrl && (
        <>
          {isImage(mediaUrl) ? (
            <img src={mediaUrl} alt="media content" className={classes.media} />
          ) : isVideo(mediaUrl) ? (
            <video src={mediaUrl} controls className={classes.media} />
          ) : null}
        </>
      )}

      <div>
        {textWithoutMediaUrl && (
          <MarkdownWrapper>{textWithoutMediaUrl}</MarkdownWrapper>
        )}

        {buttons.length > 0 && (
          <>
            <Divider />
            <ButtonRenderer buttons={buttons} />
          </>
        )}
      </div>
    </>
  );
};

export default Template;